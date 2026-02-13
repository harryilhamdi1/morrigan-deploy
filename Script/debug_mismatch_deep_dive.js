const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const wavePath = path.join(__dirname, 'CSV', 'Wave 3 2024.csv');
const raw = fs.readFileSync(wavePath, 'utf8');
const records = parse(raw, {
    delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true
});

// Find "EIGER Adventure Store Cibinong" or use index 4
const storeIdx = 4;
const row = records[storeIdx];
const storeName = row['Site Name'];
console.log(`DEBUGGING STORE: ${storeName} (Row ${storeIdx + 1})`);

const headers = Object.keys(row);

// Helper to check range
function inRange(code, min, max) {
    return code >= min && code <= max;
}

// SECTION A DEBUG (759139 - 759150)
console.log('\n=== SECTION A RAW DATA (759139 - 759150) ===');
let foundA = 0;
headers.forEach((h, i) => {
    const match = h.match(/\((\d{6})\)/);
    if (match) {
        const code = parseInt(match[1]);
        if (inRange(code, 759139, 759150)) {
            console.log(`[${i}] ${code}: ${h.substring(0, 40)}...`);
            console.log(`    Value: "${row[h]}"`);
            foundA++;
        }
    }
});
if (foundA === 0) console.log('⚠️  NO COLUMNS FOUND IN RANGE FOR SECTION A!');


// SECTION B DEBUG (759151 - 759155)
console.log('\n=== SECTION B RAW DATA (759151 - 759155) ===');
headers.forEach((h, i) => {
    const match = h.match(/\((\d{6})\)/);
    if (match) {
        const code = parseInt(match[1]);
        if (inRange(code, 759151, 759155)) {
            console.log(`[${i}] ${code}: ${h.substring(0, 40)}...`);
            console.log(`    Value: "${row[h]}"`);
        }
    }
});

// SECTION F DEBUG (759219 - 759230)
console.log('\n=== SECTION F RAW DATA (759219 - 759230) ===');
// CSV Score F
const colF = headers.find(h => h.includes('(Section) F.'));
console.log(`CSV SECTION F SCORE: ${row[colF]}`);

let yesF = 0, noF = 0;
headers.forEach((h, i) => {
    const match = h.match(/\((\d{6})\)/);
    if (match) {
        const code = parseInt(match[1]);
        if (inRange(code, 759219, 759230)) {
            const val = row[h];
            let tag = '';
            if (val.includes('Yes') || val.includes('100.00')) { tag = ' [YES]'; yesF++; }
            else if (val.includes('No') || val.includes('0.00')) { tag = ' [NO]'; noF++; }
            else tag = ' [OTHER]';

            console.log(`[${i}] ${code}: ${h.substring(0, 40)}...`);
            console.log(`    Value: "${val.substring(0, 50)}"${tag}`);
        }
    }
});

console.log(`My Count: ${yesF} Yes, ${noF} No. Total ${yesF + noF}. Ratio: ${(yesF / (yesF + noF) * 100).toFixed(2)}%`);
