const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const scoreFile = path.join(__dirname, 'CSV', 'Scorecard.csv');
const waveFile = path.join(__dirname, 'CSV', 'Wave 3 2024.csv');

// 1. Load Scorecard Questions (To exclude them)
const scoreData = parse(fs.readFileSync(scoreFile, 'utf8'), {
    delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true
});

// Normalize Scorecard Questions for comparison (remove spaces, lowercase)
const knownQuestions = new Set();
scoreData.forEach(r => {
    if (r.Journey) {
        knownQuestions.add(r.Journey.trim().toLowerCase());
        // Also add just the code if present ex: (759166)
        const code = r.Journey.match(/\(\d+\)/);
        if (code) knownQuestions.add(code[0]);
    }
});

console.log(`Loaded ${knownQuestions.size} known questions/codes from Scorecard.`);

// 2. Load Wave Data (Headers + Content)
// We need content to check if values are Yes/No/NA
const waveContent = fs.readFileSync(waveFile, 'utf8');
const waveRecords = parse(waveContent, {
    delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true, to: 50 // Scan first 50 rows
});

const headers = Object.keys(waveRecords[0]);
const potentialExtras = [];

// Helper to check if a value looks like Yes/No/NA
function isYesNoNA(val) {
    if (!val) return true; // Empty is neutral
    const v = val.trim().toLowerCase();
    // Check for exact yes/no/na or variations
    return ['yes', 'no', 'n/a', 'na', 'ya', 'tidak'].includes(v) ||
        v.startsWith('yes (') || v.startsWith('no (') || // Handle "Yes (10.00)" format
        (!isNaN(parseFloat(v)) && (parseFloat(v) === 0 || parseFloat(v) === 1 || parseFloat(v) === 10)); // Sometimes 0/1/10 is used
}

// 3. Scan Columns
headers.forEach(h => {
    // Skip known metadata columns and Section aggregates
    if (['Review number', 'Site Code', 'Site Name', 'Branch', 'Regional', 'City', 'Province', 'Wave', 'Year', 'Final Score'].includes(h)) return;
    if (h.includes('(Section)')) return;
    if (h.endsWith('- Text')) return; // Skip comment columns

    // Skip if already in Scorecard
    const hNorm = h.trim().toLowerCase();
    const hCode = h.match(/\(\d+\)/);

    let isKnown = knownQuestions.has(hNorm);
    if (!isKnown && hCode) {
        isKnown = knownQuestions.has(hCode[0]);
    }

    if (isKnown) return;

    // 4. Content Check (Is it Yes/No/NA?)
    let yesNoCount = 0;
    let otherCount = 0;
    let emptyCount = 0;

    for (const row of waveRecords) {
        const val = row[h];
        if (!val || val.trim() === '') {
            emptyCount++;
            continue;
        }

        if (isYesNoNA(val)) {
            yesNoCount++;
        } else {
            otherCount++;
        }
    }

    // Heuristics: If mostly Yes/No/NA and some empty, it's a candidate
    // Must have minimal 'other' values (allow some noise, maybe 1-2 weird values)
    if (yesNoCount > 0 && otherCount <= 2) {
        potentialExtras.push(h);
    }
});

console.log(`\n=== EXTRA QUESTIONS FOUND IN WAVE DATA ===`);
console.log(`(Not present in Scorecard, but seemingly Yes/No/NA type)`);
console.log(`Found: ${potentialExtras.length} items.\n`);

if (potentialExtras.length > 0) {
    potentialExtras.forEach(e => console.log(`- ${e}`));
} else {
    console.log("None! All Yes/No/NA columns in Wave Data are already in the Scorecard.");
}
