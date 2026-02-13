const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const scoreFile = path.join(__dirname, 'CSV', 'Scorecard.csv');
const waveFile = path.join(__dirname, 'CSV', 'Wave 3 2024.csv');

// 1. Load Scorecard question codes
const scoreData = parse(fs.readFileSync(scoreFile, 'utf8'), {
    delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true
});
const knownCodes = new Set();
const scorecardBySection = {};
scoreData.forEach(r => {
    if (r.Journey) {
        const m = r.Journey.match(/\((\d+)\)/);
        if (m) {
            knownCodes.add(m[1]);
            const sec = r.Section.replace('(Section) ', '').trim();
            if (!scorecardBySection[sec]) scorecardBySection[sec] = [];
            scorecardBySection[sec].push(m[1]);
        }
    }
});

// 2. Load Wave Data
const waveContent = fs.readFileSync(waveFile, 'utf8');
const waveRecords = parse(waveContent, {
    delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true
});
const headers = Object.keys(waveRecords[0]);

// 3. Get Section positions
const sectionPositions = [];
headers.forEach((h, idx) => {
    if (h.includes('(Section)')) {
        sectionPositions.push({ name: h.replace('(Section) ', '').trim(), index: idx });
    }
});

function findSectionForCol(colIndex) {
    let best = 'Unknown';
    for (let i = sectionPositions.length - 1; i >= 0; i--) {
        if (colIndex > sectionPositions[i].index) { best = sectionPositions[i].name; break; }
    }
    return best;
}

// 4. Find ALL columns with question codes NOT in Scorecard (no Yes/No filter)
const extraCols = [];
headers.forEach((h, idx) => {
    if (h.includes('(Section)')) return;
    if (h.endsWith('- Text')) return;
    if (['Review number', 'Site Code', 'Site Name', 'Branch', 'Regional', 'Final Score'].includes(h)) return;

    const codeMatch = h.match(/\((\d+)\)/);
    if (!codeMatch) return;

    if (knownCodes.has(codeMatch[1])) return; // Skip known

    const section = findSectionForCol(idx);

    // Get sample values to understand data type
    const samples = [];
    for (let i = 0; i < Math.min(3, waveRecords.length); i++) {
        samples.push(waveRecords[i][h] || '(empty)');
    }

    extraCols.push({ code: codeMatch[1], header: h, section, samples });
});

console.log(`Known Scorecard Codes: ${knownCodes.size}`);
console.log(`\n=== ALL EXTRA COLUMNS IN WAVE (Not in Scorecard) ===`);
console.log(`Found: ${extraCols.length} columns\n`);

// Group by section
const grouped = {};
extraCols.forEach(q => {
    if (!grouped[q.section]) grouped[q.section] = [];
    grouped[q.section].push(q);
});

Object.keys(grouped).sort().forEach(sec => {
    console.log(`--- Section: ${sec} (${grouped[sec].length} extra columns) ---`);
    grouped[sec].forEach(q => {
        console.log(`  (${q.code}) ${q.header.substring(0, 80)}`);
        console.log(`    Samples: ${q.samples.map(s => `"${s.substring(0, 40)}"`).join(' | ')}`);
    });
    console.log('');
});

// 5. Also count how many Scorecard items per section vs Wave items per section
console.log(`\n=== ITEM COUNT PER SECTION: Scorecard vs Wave ===`);
sectionPositions.forEach((sec, i) => {
    const nextIdx = (i < sectionPositions.length - 1) ? sectionPositions[i + 1].index : headers.length;

    // Count question columns in this section range (in Wave)
    let waveCount = 0;
    for (let j = sec.index + 1; j < nextIdx; j++) {
        const h = headers[j];
        if (h.includes('(Section)')) continue;
        if (h.endsWith('- Text')) continue;
        const cm = h.match(/\((\d+)\)/);
        if (cm) waveCount++;
    }

    const scCount = scorecardBySection[sec.name] ? scorecardBySection[sec.name].length : 0;
    const diff = waveCount - scCount;
    const flag = diff !== 0 ? ` <<<< DIFF ${diff > 0 ? '+' : ''}${diff}` : '';

    console.log(`  ${sec.name.substring(0, 45).padEnd(45)} | Scorecard: ${String(scCount).padStart(2)} | Wave: ${String(waveCount).padStart(2)}${flag}`);
});
