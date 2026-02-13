const fs = require('fs');
const { parse } = require('csv-parse/sync');

const waveRaw = fs.readFileSync('CSV/Wave 3 2024.csv', 'utf8');
const records = parse(waveRaw, {
    delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true
});
const headers = Object.keys(records[0]);

// Helper to find col by code
const findCol = (code) => headers.find(h => h.includes(`(${code})`) && !h.endsWith('- Text'));

// Helper to parse score from value
function getScore(val) {
    if (!val) return null;
    const s = String(val).toLowerCase();
    if (s.startsWith('yes') || s.includes('(1/1)') || s.includes('100.00')) return 1;
    if (s.startsWith('no') || s.includes('(0/1)') || s.includes('0.00')) return 0;
    return null; // N/A or text
}

// Define Section Items (Codes)
// Based on our deep dive:
const sectionDefs = {
    'A': [759166, 759167, 759168, 759169, 759170, 759171], // 6 items
    'F': [759220, 759221, 759222, 759223, 759224, 759225, 759226, 759227, 759228], // 9 items total
    'G': [759231, 759233, 759235, 759236, 759237, 759569], // Added 759569 (Multi-choice)
    'J': [
        759280, 759281, 759282, 759283, 759284, // Toilet basic
        759287, 759288, 759289 // Salam Penutup (moved from K to J based on hypothesis)
    ]
};

// Sampling
const samples = [0, 4, 8]; // Rangkas, Sidoarjo, Cirebon

console.log('=== SMART SAMPLING VALIDATION ===');

samples.forEach(idx => {
    const row = records[idx];
    console.log(`\nSTORE: ${row['Site Name']}`);

    // --- SECTION F LOGIC ---
    // Rule: If 759220 (Menawarkan coba) is YES, exclude 759221 (Menawarkan bantuan)
    let fYes = 0, fNo = 0;
    const fCodes = sectionDefs['F'];

    // Check 759220 first
    const val220 = row[findCol(759220)];
    const score220 = getScore(val220);
    const exclude221 = (score220 === 1);

    fCodes.forEach(code => {
        if (code === 759221 && exclude221) return; // SKIP CONDITIONAL

        const val = row[findCol(code)];
        const score = getScore(val);
        if (score === 1) fYes++;
        else if (score === 0) fNo++;
    });

    const fTotal = fYes + fNo;
    const fCalc = fTotal > 0 ? (fYes / fTotal) * 100 : 0;
    const fCsv = parseFloat(row[headers.find(h => h.includes('(Section) F.'))] || 0);

    console.log(`  [F] Logic: Exclude 221? ${exclude221 ? 'YES' : 'NO'}`);
    console.log(`      My: ${fCalc.toFixed(2)}% (${fYes}/${fTotal}) vs CSV: ${fCsv.toFixed(2)}% ${Math.abs(fCalc - fCsv) < 0.1 ? '✅ MATCH' : '❌'}`);


    // --- SECTION G LOGIC ---
    // Just parse correct items including multi-choice
    let gYes = 0, gNo = 0;
    sectionDefs['G'].forEach(code => {
        const val = row[findCol(code)];
        const score = getScore(val);
        if (score === 1) gYes++;
        else if (score === 0) gNo++;
    });
    const gTotal = gYes + gNo;
    const gCalc = gTotal > 0 ? (gYes / gTotal) * 100 : 0;
    const gCsv = parseFloat(row[headers.find(h => h.includes('(Section) G.'))] || 0);

    console.log(`  [G] Logic: Include 759569? YES`);
    console.log(`      My: ${gCalc.toFixed(2)}% (${gYes}/${gTotal}) vs CSV: ${gCsv.toFixed(2)}% ${Math.abs(gCalc - gCsv) < 0.1 ? '✅ MATCH' : '❌'}`);


    // --- SECTION J LOGIC ---
    // Include Salam Penutup items
    let jYes = 0, jNo = 0;
    sectionDefs['J'].forEach(code => {
        const val = row[findCol(code)];
        const score = getScore(val);
        if (score === 1) jYes++;
        else if (score === 0) jNo++;
    });
    const jTotal = jYes + jNo;
    const jCalc = jTotal > 0 ? (jYes / jTotal) * 100 : 0;
    const jCsv = parseFloat(row[headers.find(h => h.includes('(Section) J.'))] || 0);

    console.log(`  [J] Logic: Include Salam Penutup (287-289)? YES`);
    console.log(`      My: ${jCalc.toFixed(2)}% (${jYes}/${jTotal}) vs CSV: ${jCsv.toFixed(2)}% ${Math.abs(jCalc - jCsv) < 0.1 ? '✅ MATCH' : '❌'}`);

});
