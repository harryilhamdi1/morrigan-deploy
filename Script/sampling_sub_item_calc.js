const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// Load CSV Data
const wavePath = path.join(__dirname, 'CSV', 'Wave 3 2024.csv');
const weightPath = path.join(__dirname, 'CSV', 'Section Weight.csv');

console.log('Loading data...');
const waveRecords = parse(fs.readFileSync(wavePath, 'utf8'), {
    delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true
});

const weightRecords = parse(fs.readFileSync(weightPath, 'utf8'), {
    delimiter: ',', columns: true, skip_empty_lines: true, trim: true
});
const sectionWeights = {};
weightRecords.forEach(r => {
    // Extract letter from Section name (e.g. "A. Tampilan..." -> "A")
    const match = r.Section.match(/^([A-K])\./);
    if (match) sectionWeights[match[1]] = parseFloat(r['Bobot (100%)']);
});

console.log('Section Weights:', sectionWeights);

// Function to classify an item answer
function getScore(val) {
    if (!val) return null; // Empty
    const clean = val.trim();
    if (clean === '' || clean === '-') return null;

    // Direct matches
    if (clean.toLowerCase().startsWith('yes')) return 1;
    if (clean.toLowerCase().startsWith('no')) return 0;
    if (clean.toLowerCase() === 'n/a' || clean.toLowerCase() === 'na') return null;

    // Pattern matches in text
    // Look for (1/1) or (100.00)
    if (clean.includes('(1/1)') || clean.includes('100.00')) return 1;
    // Look for (0/1) or (0.00)
    if (clean.includes('(0/1)') || clean.includes('0.00')) return 0;

    return null; // Pure text / N/A
}

// Map sections to their columns (dynamically find start)
const headers = Object.keys(waveRecords[0]);
const sectionMap = {}; // 'A' -> { cols: [indices...], weight: 4 }

// Locate section boundaries by finding the aggregate columns "F. ", "G. ", etc.
const secCols = {};
['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].forEach(let => {
    const colName = headers.find(h => h.includes(`(Section) ${let}.`));
    if (colName) secCols[let] = headers.indexOf(colName);
});

// Define item ranges based on our previous deep dive (approximate but robust)
// Based on Scorecard:
// A: 759139 - 759144
// B: 759152 - 759155
// C: 759156 - 759167
// D: 759168 - 759174
// E: 759190 - 759207
// F: 759220 - 759228
// G: 759231 - 759240
// H: 759244 - 759266
// I: 759267 - 759274
// J: 759280 - 759284
// K: 759287 - 759289

// Note: This mapping needs to be flexible to catch the "Text with Score" columns
// We will scan ALL columns between known sections.

function getItemsForSection(letter, row, headers) {
    // We'll use a hardcoded map of question codes based on the Sample Scoring we saw
    // Or we scan for codes. Let's scan for relevant question codes based on Scorecard ranges
    const ranges = {
        'A': [759139, 759150], // Wide range to catch all
        'B': [759151, 759155],
        'C': [759156, 759167],
        'D': [759168, 759179],
        'E': [759180, 759218],
        'F': [759219, 759230],
        'G': [759231, 759243],
        'H': [759244, 759266],
        'I': [759267, 759279],
        'J': [759280, 759286],
        'K': [759287, 759290]
    };

    const [min, max] = ranges[letter] || [0, 0];
    const items = [];

    headers.forEach((h, idx) => {
        // Extract code (XXXXXX)
        const codeMatch = h.match(/\((\d{6})\)/);
        if (codeMatch) {
            const code = parseInt(codeMatch[1]);
            if (code >= min && code <= max) {
                // Ignore "Text" columns if they don't have a score, BUT...
                // CRITICAL: Some "Text" columns HAVE the score!
                // So we check the value of the cell.
                const val = row[h];
                const score = getScore(val);

                // If it has a score (0 or 1), we include it
                if (score !== null) {
                    items.push({ code, val, score, colName: h });
                }
            }
        }
    });
    return items;
}

// Process 5 sample stores
const samples = [0, 4, 8, 12, 16]; // Pick first 5 distinct stores

console.log('\n=== CALCULATION SAMPLING ===\n');

samples.forEach(idx => {
    if (idx >= waveRecords.length) return;
    const row = waveRecords[idx];
    const storeName = row['Site Name'] || 'Unknown';

    console.log(`STORE: ${storeName} (Row ${idx + 1})`);

    let totalWeightedScore = 0;
    let totalMaxWeight = 0;

    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].forEach(sec => {
        const items = getItemsForSection(sec, row, headers);

        let yes = 0;
        let no = 0;
        items.forEach(i => {
            if (i.score === 1) yes++;
            else if (i.score === 0) no++;
        });

        const total = yes + no;
        let myScore = 0;
        if (total > 0) {
            myScore = (yes / total) * 100;
        }

        // Get CSV official score for comparison
        const csvCol = headers.find(h => h.includes(`(Section) ${sec}.`));
        const csvVal = parseFloat(row[csvCol] || '0');
        const weight = sectionWeights[sec] || 0;

        const isDiff = Math.abs(myScore - csvVal) > 0.1;

        // Add to final calculation if section is active (csvVal is not empty/null in source logic)
        // Actually, if total items > 0, section is active.
        if (total > 0) {
            totalWeightedScore += (myScore / 100) * weight;
            totalMaxWeight += weight;
        }

        console.log(`  Sec ${sec}: MyCalc ${myScore.toFixed(2)}% (${yes}/${total}) vs CSV ${csvVal.toFixed(2)}% ${isDiff ? '❌ MISMATCH' : '✅'}`);

        if (isDiff) {
            // Debug the mismatch
            console.log(`     Items found: ${total}`);
            items.forEach(i => console.log(`       - (${i.code}) ${i.val.substring(0, 30)}... -> ${i.score}`));
        }
    });

    const finalScore = totalMaxWeight > 0 ? (totalWeightedScore / totalMaxWeight) * 100 : 0;
    const csvFinal = parseFloat(row['Final Score'] || '0');

    console.log(`  FINAL CHECK: MyCalc ${finalScore.toFixed(2)} vs CSV ${csvFinal.toFixed(2)}`);
    console.log('------------------------------------------------');
});
