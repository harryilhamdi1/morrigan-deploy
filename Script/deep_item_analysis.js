const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// Load scorecard for question->section mapping
const scoreData = parse(fs.readFileSync(path.join(__dirname, 'CSV', 'Scorecard.csv'), 'utf8'), {
    delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true
});
const qMap = {}; // code -> section
scoreData.forEach(r => {
    if (!r.Journey) return;
    const m = r.Journey.match(/\((\d+)\)/);
    if (m) qMap[m[1]] = r.Section.replace('(Section) ', '').trim();
});

// Load wave data
const waveRecords = parse(fs.readFileSync(path.join(__dirname, 'CSV', 'Wave 3 2024.csv'), 'utf8'), {
    delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true
});
const headers = Object.keys(waveRecords[0]);

// Build section column groups
const sectionColPositions = [];
headers.forEach((h, idx) => {
    if (h.includes('(Section)')) {
        sectionColPositions.push({ name: h.replace('(Section) ', '').trim(), fullHeader: h, index: idx });
    }
});

// For each section, find ALL columns between this section header and the next
function getColumnsForSection(secIdx) {
    const sec = sectionColPositions[secIdx];
    // All item columns come BEFORE section aggregates in this CSV
    // Actually let's check: are item columns before or after the section column?
    return null; // We'll use a different approach
}

// Better approach: use Scorecard to map items to sections, then find ALL columns
// that belong to each section by checking if the column code is in the scorecard
// For columns NOT in scorecard, try to infer section from context

const out = [];
function log(msg) { out.push(msg); }

// Focus on mismatch sections: E, F, G, J
const focusSections = [
    'E. Pelayanan Penjualan & Pengetahuan Produk',
    'F. Pengalaman Mencoba Produk',
    'G. Rekomendasi untuk Membeli Produk',
    'J. Toilet (Khusus Store yang memiliki toilet )'
];

// Get all columns with numeric codes, and their raw values for store 0
const row = waveRecords[0]; // First store
const storeCode = row['Site Code'];
log(`=== DEEP ITEM ANALYSIS FOR STORE ${storeCode} ===\n`);

// Find ALL question columns (have code in parens, not section aggregates, not text columns)
const allQuestionCols = [];
headers.forEach((h, idx) => {
    if (h.includes('(Section)')) return;
    if (h.endsWith('- Text')) return;
    if (['Review number', 'Site Code', 'Site Name', 'Branch', 'Regional', 'Final Score'].includes(h)) return;
    const m = h.match(/\((\d+)\)/);
    if (m) {
        const code = m[1];
        const section = qMap[code] || 'UNKNOWN';
        allQuestionCols.push({ code, header: h, index: idx, section });
    }
});

// For each focus section, show ALL items with their raw values
focusSections.forEach(secName => {
    // Get CSV section score
    const secCol = sectionColPositions.find(s => s.name === secName);
    const csvScore = secCol ? parseFloat(row[secCol.fullHeader]) : null;

    log(`\n${'━'.repeat(80)}`);
    log(`SECTION: ${secName}`);
    log(`CSV Section Score: ${csvScore !== null && !isNaN(csvScore) ? csvScore.toFixed(2) : 'N/A'}`);
    log(`${'━'.repeat(80)}`);

    // Get items that belong to this section (from Scorecard)
    const sectionItems = allQuestionCols.filter(c => c.section === secName);

    let yesCount = 0, noCount = 0, naCount = 0;
    let totalScoreSum = 0, totalScoredItems = 0;

    sectionItems.forEach(item => {
        const rawVal = row[item.header] || '';
        const trimVal = rawVal.trim();
        const lower = trimVal.toLowerCase();

        let answerType = 'OTHER';
        let score = null;

        if (!trimVal) { answerType = 'EMPTY'; }
        else if (lower === 'n/a' || lower === 'na') { answerType = 'NA'; }
        else if (lower.startsWith('yes')) { answerType = 'YES'; score = 100; yesCount++; }
        else if (lower.startsWith('no')) { answerType = 'NO'; score = 0; noCount++; }
        else {
            // Try to extract numeric score from text  
            const numMatch = trimVal.match(/\((\d+\.?\d*)\)/);
            if (numMatch) score = parseFloat(numMatch[1]);
            // or just parse the value
            else {
                const num = parseFloat(trimVal.replace(',', '.'));
                if (!isNaN(num)) score = num;
            }
        }

        if (answerType === 'NA' || answerType === 'EMPTY') naCount++;

        if (score !== null) {
            totalScoreSum += score;
            totalScoredItems++;
        }

        const shortQ = item.header.substring(0, 70);
        log(`  (${item.code}) [${answerType.padEnd(5)}] Score: ${score !== null ? score.toString().padStart(6) : '  N/A '} | ${shortQ}`);
        if (answerType === 'OTHER') {
            log(`           RAW VALUE: "${trimVal.substring(0, 80)}"`);
        }
    });

    const validItems = yesCount + noCount;
    const simpleCalc = validItems > 0 ? (yesCount / validItems) * 100 : null;
    const avgCalc = totalScoredItems > 0 ? totalScoreSum / totalScoredItems : null;

    log(`\n  Summary:`);
    log(`    Items in Scorecard: ${sectionItems.length}`);
    log(`    Yes: ${yesCount}, No: ${noCount}, N/A: ${naCount}, Other: ${sectionItems.length - yesCount - noCount - naCount}`);
    log(`    Simple Calc (Yes/Total): ${simpleCalc !== null ? simpleCalc.toFixed(2) : 'N/A'}`);
    log(`    Average Score Calc:      ${avgCalc !== null ? avgCalc.toFixed(2) : 'N/A'}`);
    log(`    CSV Section Score:       ${csvScore !== null && !isNaN(csvScore) ? csvScore.toFixed(2) : 'N/A'}`);

    if (csvScore !== null && !isNaN(csvScore)) {
        // Reverse engineer: what denominator gives this score?
        // csvScore = (yesCount / X) * 100  => X = yesCount * 100 / csvScore
        if (csvScore > 0) {
            const impliedDenom = (yesCount * 100) / csvScore;
            log(`    Implied denominator from CSV score: ${impliedDenom.toFixed(2)}`);
        }

        // Also check: are there columns NOT in scorecard that might contribute?
        // Look for adjacent columns using the same section prefix
    }
});

// Now search for columns NOT in scorecard but possibly belonging to mismatch sections
log(`\n\n${'═'.repeat(80)}`);
log(`COLUMNS NOT IN SCORECARD (potential hidden scoring items)`);
log(`${'═'.repeat(80)}`);

const unknownCols = allQuestionCols.filter(c => c.section === 'UNKNOWN');
unknownCols.forEach(col => {
    const rawVal = row[col.header] || '';
    const trimVal = rawVal.trim();
    const lower = trimVal.toLowerCase();

    let answerType = 'TEXT';
    if (!trimVal) answerType = 'EMPTY';
    else if (lower === 'n/a' || lower === 'na') answerType = 'NA';
    else if (lower.startsWith('yes')) answerType = 'YES';
    else if (lower.startsWith('no')) answerType = 'NO';

    // Check first 10 rows to understand data pattern
    let patterns = {};
    for (let i = 0; i < Math.min(10, waveRecords.length); i++) {
        const v = (waveRecords[i][col.header] || '').trim().toLowerCase();
        const type = !v ? 'empty' : v.startsWith('yes') ? 'yes' : v.startsWith('no') ? 'no' : (v === 'n/a' || v === 'na') ? 'na' : 'text';
        patterns[type] = (patterns[type] || 0) + 1;
    }

    const hasYesNo = (patterns.yes || 0) + (patterns.no || 0) > 0;
    const tag = hasYesNo ? ' ★ SCORING ITEM?' : '';

    log(`  (${col.code}) ${col.header.substring(0, 70)}${tag}`);
    log(`    Sample: "${trimVal.substring(0, 60)}"`);
    log(`    Pattern (10 rows): ${JSON.stringify(patterns)}`);
});

// Write output
fs.writeFileSync(path.join(__dirname, 'deep_item_analysis.txt'), out.join('\n'), 'utf8');
console.log(`Done! ${out.length} lines written to deep_item_analysis.txt`);
