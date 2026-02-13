const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const scorecardFile = path.join(__dirname, 'CSV', 'Scorecard.csv');
const waveFile = path.join(__dirname, 'CSV', 'Wave 3 2024.csv');

// 1. Read Scorecard
const scorecardContent = fs.readFileSync(scorecardFile, 'utf8');
const scorecardData = parse(scorecardContent, {
    delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true
});

// Extract UNIQUE Sections
const uniqueScorecardSections = [...new Set(scorecardData.map(r => r.Section || r['(Section)']).filter(s => s))];
uniqueScorecardSections.sort();

// 2. Read Wave Data Header
const waveContent = fs.readFileSync(waveFile, 'utf8');
const waveData = parse(waveContent, {
    delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true, to: 1
});
const waveHeaders = Object.keys(waveData[0]);
const waveSections = waveHeaders.filter(h => h.includes('(Section)')).sort();

// 3. Compare
console.log("\n=== SECTION COMPARISON ===");
console.log(`Scorecard Unique Sections: ${uniqueScorecardSections.length}`);
console.log(`Wave Data Section Columns: ${waveSections.length}`);

const missing = uniqueScorecardSections.filter(s => !waveSections.includes(s));
const extra = waveSections.filter(s => !uniqueScorecardSections.includes(s));

if (missing.length === 0 && extra.length === 0) {
    console.log("✅ PERFECT MATCH! Scorecard Structure aligns with Wave Data.");
} else {
    if (missing.length) {
        console.log("❌ MISSING in Wave Data:", missing);
    }
    if (extra.length) {
        console.log("⚠️ EXTRA in Wave Data:", extra);
    }
}
