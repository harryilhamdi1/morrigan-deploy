const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const file = path.join(__dirname, 'CSV', 'Wave 3 2024.csv');
const content = fs.readFileSync(file, 'utf8');

const records = parse(content, {
    delimiter: ';',
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true
});

console.log(`Total Records: ${records.length}`);

// Identify Section Columns (F-P usually index 5-15)
// We look for keys starting with "(Section)"
const headers = Object.keys(records[0]);
const sectionKeys = headers.filter(h => h.includes('(Section)'));

console.log(`Found ${sectionKeys.length} Section Columns to check.`);

let emptyCount = 0;
let emptyDetails = {};

records.forEach((row, index) => {
    sectionKeys.forEach(key => {
        const val = row[key];
        if (val === undefined || val === null || val.trim() === '') {
            emptyCount++;

            if (!emptyDetails[key]) emptyDetails[key] = 0;
            emptyDetails[key]++;

            // Log first 3 examples
            if (emptyCount <= 3) {
                console.log(`[EMPTY FOUND] Row ${index + 2}: Store ${row['Site Code']} - Column: "${key}" is empty.`);
            }
        }
    });
});

console.log("\n=== SUMMARY OF EMPTY VALUES ===");
if (emptyCount === 0) {
    console.log("✅ No empty values found in Section columns!");
} else {
    console.log(`⚠️ Found ${emptyCount} empty cells total.`);
    console.log("Breakdown by Section:");
    Object.keys(emptyDetails).forEach(k => {
        console.log(`- ${k}: ${emptyDetails[k]} missing values`);
    });
}
