const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const file = path.join(__dirname, 'CSV', 'Scorecard.csv');
const content = fs.readFileSync(file, 'utf8');
const data = parse(content, {
    delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true
});

console.log("=== SCORECARD DETAIL ANALYSIS ===");
const headers = Object.keys(data[0]);
console.log("Headers Found:", headers);

// Check potential weight columns
const weightCols = headers.filter(h => h.toLowerCase().includes('weight') || h.toLowerCase().includes('bobot') || h.toLowerCase().includes('score'));
if (weightCols.length > 0) {
    console.log("Potential Weight/Score Columns:", weightCols);
    // Show sample values
    console.log("Sample Data (First 3 Rows):");
    data.slice(0, 3).forEach((r, i) => {
        console.log(`Row ${i + 1}:`);
        weightCols.forEach(w => console.log(`  - ${w}: ${r[w]}`));
    });
} else {
    console.log("⚠️ NO obvious Weight/Score columns found in Scorecard. Assumptions: Equal Weight?");
}
