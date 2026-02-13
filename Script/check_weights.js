const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const file = path.join(__dirname, 'CSV', 'Section Weight.csv');
const content = fs.readFileSync(file, 'utf8');
const data = parse(content, {
    delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true
});

console.log(`Loaded ${data.length} weight entries.`);
let totalWeight = 0;

data.forEach(r => {
    const w = parseFloat(r.Weight);
    console.log(`- ${r.Section}: ${w}`);
    if (!isNaN(w)) totalWeight += w;
});

console.log(`\nTOTAL WEIGHT: ${totalWeight}`);
if (Math.abs(totalWeight - 100) > 0.1) {
    console.warn("⚠️ Warning: Total weight is not 100!");
} else {
    console.log("✅ Total weight is 100.");
}
