const fs = require('fs');
const { parse } = require('csv-parse/sync');

const waveRaw = fs.readFileSync('CSV/Wave 3 2024.csv', 'utf8');
const records = parse(waveRaw, {
    delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true
});
const headers = Object.keys(records[0]);

// Updated Parsing Logic
function getScore(val) {
    if (!val) return null;
    const s = String(val).toLowerCase();

    // Strict Parsing: Look for embedded score FIRST
    if (s.includes('(1.00)') || s.includes('(1/1)') || s.includes('100.00')) return 1;
    if (s.includes('(0.00)') || s.includes('(0/1)') || s.includes('0.00')) return 0;

    // Fallback for simple Yes/No if no score embedded (rare but possible)
    if (s.startsWith('yes')) return 1;
    if (s.startsWith('no')) return 0;

    return null;
}

// Helper to find col
const findCol = (code) => headers.find(h => h.includes(`(${code})`) && !h.endsWith('- Text'));

// Final Hypothesis Mappings
const sectionConfigs = {
    'F': {
        items: [759220, 759221, 759222, 759223, 759224, 759225, 759226, 759227, 759228],
        exclude: [759221] // "Menawarkan bantuan"
    },
    'G': {
        items: [759231, 759233, 759235, 759236, 759569], // Include multi-choice
        exclude: []
    },
    'J': {
        items: [759280, 759281, 759282, 759283, 759284],
        exclude: [759283] // "Tisue toilet" - assumed descriptive text only
    }
};

const samples = [12, 25, 38]; // Random new stores

console.log('=== STRICT VALIDATION (FINAL HYPOTHESIS) ===');

samples.forEach(idx => {
    const row = records[idx];
    console.log(`\nSTORE: ${row['Site Name']}`);

    ['F', 'G', 'J'].forEach(sec => {
        const config = sectionConfigs[sec];
        let yes = 0, no = 0;
        let details = [];

        config.items.forEach(code => {
            if (config.exclude.includes(code)) return; // FORCE EXCLUDE

            const col = findCol(code);
            const val = row[col];
            const score = getScore(val);

            /// Log specific item for debugging J
            if (sec === 'J') {
                // details.push(`${code}: ${score} (${val.substring(0,10)})`);
            }

            if (score === 1) yes++;
            else if (score === 0) no++;
        });

        const total = yes + no;
        const myScore = total > 0 ? (yes / total) * 100 : 0;
        const csvScore = parseFloat(row[headers.find(h => h.includes(`(Section) ${sec}.`))] || 0);

        const match = Math.abs(myScore - csvScore) < 0.1;

        console.log(`  [${sec}] My: ${myScore.toFixed(2)}% (${yes}/${total}) vs CSV: ${csvScore.toFixed(2)}% ${match ? '✅ MATCH' : '❌'}`);
        if (!match && sec === 'J') {
            // console.log(`      Details: ${details.join(', ')}`);
        }
    });
});
