const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// Load CSV Data
const wavePath = path.join(__dirname, 'CSV', 'Wave 3 2024.csv');
const weightPath = path.join(__dirname, 'CSV', 'Section Weight.csv');

// Function to classify an item answer
function getScore(val) {
    if (val === undefined || val === null) return null; // Safe check
    const clean = String(val).trim();
    if (clean === '' || clean === '-') return null;

    // Direct matches
    const lower = clean.toLowerCase();
    if (lower.startsWith('yes')) return 1;
    if (lower.startsWith('no')) return 0;
    if (lower === 'n/a' || lower === 'na') return null;

    // Pattern matches in text
    // Look for (1/1) or 100.00
    if (clean.includes('(1/1)') || clean.includes('100.00')) return 1;
    // Look for (0/1) or 0.00
    if (clean.includes('(0/1)') || clean.includes('0.00')) return 0;

    return null; // Pure text / N/A
}

// Check weights
let sectionWeights = {};
try {
    const weightRecords = parse(fs.readFileSync(weightPath, 'utf8'), {
        delimiter: ',', columns: true, skip_empty_lines: true, trim: true
    });
    weightRecords.forEach(r => {
        const match = r.Section.match(/^([A-K])\./);
        if (match) sectionWeights[match[1]] = parseFloat(r['Bobot (100%)']);
    });
} catch (e) {
    console.error('Error reading weights:', e.message);
    sectionWeights = { A: 4, B: 9, C: 8, D: 5, E: 20, F: 11, G: 15, H: 14, I: 5, J: 4, K: 5 }; // Default fallback
}

console.log('Using Section Weights:', JSON.stringify(sectionWeights));

// Load Wave Data
let waveRecords = [];
try {
    waveRecords = parse(fs.readFileSync(wavePath, 'utf8'), {
        delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true
    });
} catch (e) {
    console.error('Error reading Wave CSV:', e.message);
    process.exit(1);
}

if (waveRecords.length === 0) {
    console.log('No records found in Wave CSV');
    process.exit(0);
}

const headers = Object.keys(waveRecords[0]);

// Find CSV columns for Section Scores
const sectionScoreCols = {};
['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].forEach(sec => {
    // Look for "(Section) X."
    const colName = headers.find(h => h.includes(`(Section) ${sec}.`));
    if (colName) sectionScoreCols[sec] = colName;
});

// Define precise item ranges based on Scorecard + known gaps
const sectionRanges = {
    'A': { min: 759139, max: 759150 },
    'B': { min: 759151, max: 759155 },
    'C': { min: 759156, max: 759167 },
    'D': { min: 759168, max: 759179 }, // Extended to verify gap
    'E': { min: 759180, max: 759218 },
    'F': { min: 759219, max: 759230 },
    'G': { min: 759231, max: 759243 },
    'H': { min: 759244, max: 759266 },
    'I': { min: 759267, max: 759279 },
    'J': { min: 759280, max: 759286 },
    'K': { min: 759287, max: 759290 }
};

// Sampling function
const sampleIndices = [0, 4, 9, 14, 19].filter(i => i < waveRecords.length); // 5 samples

console.log(`\n=== PROCESSING ${sampleIndices.length} SAMPLE STORES ===`);

sampleIndices.forEach(idx => {
    const row = waveRecords[idx];
    const storeName = row['Site Name'] || `Row ${idx + 1}`;

    console.log(`\n--- STORE: ${storeName} ---`);

    let totalMaxPoints = 0;
    let totalEarnedPoints = 0;

    // Process each section
    Object.keys(sectionRanges).forEach(sec => {
        const range = sectionRanges[sec];
        const weight = sectionWeights[sec] || 0;
        const csvColName = sectionScoreCols[sec];
        const csvScore = csvColName ? parseFloat(row[csvColName] || '0') : 0;

        // Find items in this section
        let yesCount = 0;
        let noCount = 0;
        const debugItems = [];

        headers.forEach(h => {
            // Check if column is an item code in range
            const codeMatch = h.match(/\((\d{6})\)/);
            if (codeMatch) {
                const code = parseInt(codeMatch[1]);
                if (code >= range.min && code <= range.max) {
                    const val = row[h];
                    const score = getScore(val);

                    if (score !== null) {
                        if (score === 1) yesCount++;
                        else noCount++;
                        debugItems.push({ code, val: String(val).substring(0, 20), score });
                    }
                }
            }
        });

        const totalItems = yesCount + noCount;
        let myScore = 0;
        if (totalItems > 0) {
            myScore = (yesCount / totalItems) * 100;
        }

        // Compare with CSV
        const diff = Math.abs(myScore - csvScore);
        const match = diff < 0.1;

        // Accumulate final score items
        // Logic: if section has items (totalItems > 0), it contributes to final score
        if (totalItems > 0) {
            totalMaxPoints += weight;
            totalEarnedPoints += (myScore / 100) * weight;
        }

        console.log(`  [${sec}] My: ${myScore.toFixed(2)}% (${yesCount}/${totalItems}) vs CSV: ${csvScore.toFixed(2)}%  ${match ? '✓' : '❌'}`);

        if (!match) {
            console.log(`      Items causing mismatch:`);
            debugItems.forEach(i => console.log(`        - (${i.code}) ${i.val} -> ${i.score}`));
        }
    });

    // Final Score Check
    const myFinal = totalMaxPoints > 0 ? (totalEarnedPoints / totalMaxPoints) * 100 : 0;
    let csvFinal = 0;
    // Try column Q or find "Final Score"
    if (row['Final Score']) csvFinal = parseFloat(row['Final Score']);
    else {
        // Find column index 16 (Q is 17th letter, index 16)
        const keys = Object.keys(row);
        if (keys.length > 16) csvFinal = parseFloat(row[keys[16]] || '0');
    }

    console.log(`  FINAL SCORE: My ${myFinal.toFixed(2)} vs CSV ${csvFinal.toFixed(2)}  ${Math.abs(myFinal - csvFinal) < 0.1 ? '✅ MATCH' : '❌ MISMATCH'}`);
});
