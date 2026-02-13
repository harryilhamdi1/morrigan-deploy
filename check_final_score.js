const fs = require('fs');
const { parse } = require('csv-parse/sync');

const waveRaw = fs.readFileSync('CSV/Wave 3 2024.csv', 'utf8');
const records = parse(waveRaw, { delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true });
const headers = Object.keys(records[0]);

// Load weights - key = full column name including "(Section) "
const weightRaw = fs.readFileSync('CSV/Section Weight.csv', 'utf8');
const weightRecords = parse(weightRaw, { delimiter: ';', columns: true, skip_empty_lines: true, bom: true });
const WEIGHTS = {};
weightRecords.forEach(r => {
    const v = Object.values(r);
    const name = v[0].trim();
    const w = parseInt(v[1]);
    if (name && w) WEIGHTS[name] = w;
});

// Get all section columns from CSV
const secCols = headers.filter(h => h.startsWith('(Section)'));

// Build weight map: section column name -> weight
const SEC_WEIGHTS = {};
secCols.forEach(col => {
    // Try exact match first
    if (WEIGHTS[col]) { SEC_WEIGHTS[col] = WEIGHTS[col]; return; }
    // Try with trim
    const trimmed = col.trim();
    if (WEIGHTS[trimmed]) { SEC_WEIGHTS[col] = WEIGHTS[trimmed]; return; }
    // Fallback: fuzzy match by letter
    const letter = col.match(/\)\s*([A-K])\./);
    if (letter) {
        const key = Object.keys(WEIGHTS).find(k => k.includes(`) ${letter[1]}.`));
        if (key) SEC_WEIGHTS[col] = WEIGHTS[key];
    }
});

console.log('Section Weights Found:');
secCols.forEach(c => console.log(`  ${c.substring(0, 50)} => W=${SEC_WEIGHTS[c] || 'MISS'}`));

// Now calculate Final Score for first 5 stores
console.log('\n=== FINAL SCORE VALIDATION ===');
for (let i = 0; i < 10; i++) {
    const row = records[i];
    const csvFinal = parseFloat(row['Final Score']);

    let earnedPts = 0, activeWeight = 0;

    secCols.forEach(col => {
        const grade = parseFloat(row[col]);
        const weight = SEC_WEIGHTS[col] || 0;

        if (!isNaN(grade) && weight > 0) {
            earnedPts += (grade / 100) * weight;
            activeWeight += weight;
        }
    });

    const myFinal = activeWeight > 0 ? (earnedPts / activeWeight) * 100 : 0;
    const diff = Math.abs(myFinal - csvFinal);

    console.log(`Store ${i}: My=${myFinal.toFixed(2)} CSV=${csvFinal} Diff=${diff.toFixed(2)} ${diff < 0.1 ? '✅' : '❌'} (E=${earnedPts.toFixed(2)}/${activeWeight})`);
}
