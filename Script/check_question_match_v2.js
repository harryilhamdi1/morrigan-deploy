const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const scoreFile = path.join(__dirname, 'CSV', 'Scorecard.csv');
const waveFile = path.join(__dirname, 'CSV', 'Wave 3 2024.csv');

try {
    // 1. Load Scorecard Questions
    const scoreData = parse(fs.readFileSync(scoreFile, 'utf8'), {
        delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true
    });
    const scoreQuestions = scoreData.map(r => r.Journey).filter(q => q && q.length > 5);

    console.log(`Scorecard Questions: ${scoreQuestions.length}`);

    // 2. Load Wave Headers
    const waveContent = fs.readFileSync(waveFile, 'utf8');
    const waveData = parse(waveContent, {
        delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true, to: 1
    });
    const waveHeaders = Object.keys(waveData[0]);

    console.log(`Wave Data Columns: ${waveHeaders.length}`);

    // 3. Exact Match Check
    let foundCount = 0;
    let missingInfo = [];

    scoreQuestions.forEach(q => {
        // Try strict match first
        let found = waveHeaders.includes(q);

        if (!found) {
            // Try fuzzy match by Code (numeric in parens)
            const codeMatch = q.match(/\((\d+)\)/);
            if (codeMatch) {
                const code = codeMatch[1];
                found = waveHeaders.some(h => h.includes(`(${code})`));
            } else {
                // Try text match (first 15 chars)
                const snippet = q.substring(0, 15);
                found = waveHeaders.some(h => h.includes(snippet));
            }
        }

        if (found) {
            foundCount++;
        } else {
            missingInfo.push(q);
        }
    });

    console.log(`\nMATCH RESULT: Found ${foundCount} / ${scoreQuestions.length} questions in Wave Data.`);

    if (missingInfo.length > 0) {
        console.log("❌ MISSING QUESTIONS (Example 5):");
        missingInfo.slice(0, 5).forEach(m => console.log(`- ${m}`));
        console.log(`... and ${missingInfo.length - 5} more.`);
    } else {
        console.log("✅ ALL Scorecard questions exist in Wave Data.");
    }

} catch (err) {
    console.error("Error:", err.message);
}
