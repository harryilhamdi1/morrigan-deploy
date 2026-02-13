const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const scoreFile = path.join(__dirname, 'CSV', 'Scorecard.csv');
const waveFile = path.join(__dirname, 'CSV', 'Wave 3 2024.csv');

// 1. Load Scorecard Questions
const scoreData = parse(fs.readFileSync(scoreFile, 'utf8'), {
    delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true
});
const scoreQuestions = scoreData.map(r => r.Journey).filter(q => q && q.length > 5);

console.log(`Loaded ${scoreQuestions.length} questions from Scorecard.`);
console.log("Sample Scorecard Question 1:", scoreQuestions[0]);

// 2. Load Wave Headers
const waveData = parse(fs.readFileSync(waveFile, 'utf8'), {
    delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true, to: 1
});
const waveHeaders = Object.keys(waveData[0]);

console.log(`Loaded ${waveHeaders.length} columns from Wave Data.`);

// 3. Exact Match Check
let exactMatches = 0;
let partialMatches = 0;
let missing = [];

scoreQuestions.forEach(q => {
    if (waveHeaders.includes(q)) {
        exactMatches++;
    } else {
        // Try fuzzy match (e.g. maybe code matches?)
        // Extract code like (759166)
        const codeMatch = q.match(/\(\d+\)/);
        if (codeMatch) {
            const code = codeMatch[0];
            const found = waveHeaders.find(h => h.includes(code));
            if (found) {
                partialMatches++;
                // console.log(`[PARTIAL] Scorecard: "${q}"  ->  Wave: "${found}"`);
            } else {
                missing.push(q);
            }
        } else {
            // No code, text search
            const found = waveHeaders.find(h => h.includes(q.substring(0, 20))); // First 20 chars
            if (found) partialMatches++;
            else missing.push(q);
        }
    }
});

console.log("\n=== MATCHING RESULTS ===");
console.log(`Exact Matches: ${exactMatches}`);
console.log(`Partial/Code Matches: ${partialMatches}`);
console.log(`Missing Columns: ${missing.length}`);

if (missing.length > 0) {
    console.log("\nMISSING QUESTIONS (Not found in Wave Data):");
    missing.forEach(m => console.log(`- ${m}`));
} else {
    console.log("\n✅ All questions in Scorecard found in Wave Data!");
}

// 4. Value Check (If matches found, check content)
if (missing.length === 0) {
    console.log("\n=== VALUE CHECK (Scanning first 50 rows) ===");
    const waveFull = parse(fs.readFileSync(waveFile, 'utf8'), {
        delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true, to: 50
    });

    let suspiciousCols = [];

    scoreQuestions.forEach(q => {
        // Find the actual header used in Wave
        let header = waveHeaders.find(h => h === q);
        if (!header) {
            const codeMatch = q.match(/\(\d+\)/);
            if (codeMatch) header = waveHeaders.find(h => h.includes(codeMatch[0]));
            if (!header) header = waveHeaders.find(h => h.includes(q.substring(0, 20)));
        }

        if (header) {
            // Check values
            let hasValue = false;
            let sampleVal = "";
            for (let i = 0; i < waveFull.length; i++) {
                const val = waveFull[i][header];
                if (val && val.trim() !== '') {
                    hasValue = true;
                    sampleVal = val;
                    break;
                }
            }
            if (!hasValue) {
                suspiciousCols.push({ q: q, header: header, status: "ALWAYS EMPTY (in first 50 rows)" });
            } else if (!['Yes', 'No', 'N/A', '0', '1'].some(v => sampleVal.includes(v))) {
                // Just info, maybe score value
                // console.log(`Info: Column "${header}" has value "${sampleVal}"`);
            }
        }
    });

    if (suspiciousCols.length > 0) {
        console.log(`⚠️ FOUND ${suspiciousCols.length} COLUMNS WITH NO DATA:`);
        suspiciousCols.forEach(s => console.log(`- "${s.header}" seems empty.`));
    } else {
        console.log("✅ Data check passed: All matched columns have data.");
    }
}
