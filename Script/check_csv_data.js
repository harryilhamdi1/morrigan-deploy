const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const file = path.join(__dirname, 'CSV', 'Wave 3 2024.csv');
const data = fs.readFileSync(file, 'utf8');

const records = parse(data, {
    delimiter: ';',
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true
});

const first = records[0];
const keys = Object.keys(first);

console.log("=== HEADER ANALYSIS ===");
// F is index 5, P is index 15 (0-indexed)
// Let's check keys from index 5 to 20 just to be safe

// Note: 'columns' option creates an array of objects.
// If using 'columns: false', we'd see raw array. Let's stick with object keys.

console.log("KEY LIST (Index 5 to 16/17):");
keys.slice(5, 18).forEach((k, i) => {
    console.log(`[${String.fromCharCode(70 + i)}] Key: "${k}"`);
    console.log(`    Value: "${first[k]}"`);
});

console.log("\nTOTAL COLUMNS:", keys.length);
