const fs = require('fs');
const { parse } = require('csv-parse/sync');

const records = parse(fs.readFileSync('CSV/Wave 3 2024.csv', 'utf8'), {
    delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true
});
const headers = Object.keys(records[0]);
const row = records[0]; // Store 2189 Rangkas Bitung

const out = [];
function log(msg) { out.push(msg); }

log(`STORE: ${row['Site Name']}`);

// ============================================================
// SECTION F DEEP DIVE
// ============================================================
const colF = headers.find(h => h.includes('(Section) F.'));
log(`\n${'═'.repeat(80)}`);
log(`SECTION F: CSV Score = ${row[colF]}`);
log(`CSV says: 87.50% → implies 7/8 (since 7/8 = 87.50)`);
log(`Our calc: 7/9 = 77.78%`);
log(`QUESTION: Which item is being EXCLUDED from the denominator?`);
log(`${'═'.repeat(80)}`);

// Find ALL columns with codes 759220-759228
for (let code = 759220; code <= 759228; code++) {
    // Find main column and text column
    const mainCol = headers.find(h => h.startsWith(`(${code})`) && !h.endsWith('- Text'));
    const textCol = headers.find(h => h.startsWith(`(${code})`) && h.endsWith('- Text'));

    if (mainCol) {
        const val = (row[mainCol] || '').trim();
        const textVal = textCol ? (row[textCol] || '').trim() : '';

        let scoring = '';
        if (val.toLowerCase().startsWith('yes')) scoring = '→ YES (1 point)';
        else if (val.toLowerCase().startsWith('no')) scoring = '→ NO (0 points)';
        else if (val.toLowerCase() === 'n/a') scoring = '→ N/A (excluded)';
        else scoring = `→ TEXT/OTHER`;

        log(`\n  (${code}) ${mainCol.substring(8, 70)}...`);
        log(`    Main Value : "${val}"`);
        if (textVal) log(`    Text Value : "${textVal.substring(0, 60)}"`);
        log(`    Scoring    : ${scoring}`);
    }
}

// Now check the "Menawarkan bantuan" item specifically
log(`\n  💡 ANALYSIS:`);
log(`  We found 9 items: 759220-759228`);
log(`  CSV Score 87.50 = 7/8`);
log(`  So 1 item must be excluded from denominator.`);
log(`  Let's check which one could be a "sub-item" or "dependent"...`);

// Check if 759221 might be conditional on 759220
const v220 = (row[headers.find(h => h.startsWith('(759220)'))] || '');
const v221 = (row[headers.find(h => h.startsWith('(759221)') && !h.endsWith('Text'))] || '');
const v222 = (row[headers.find(h => h.startsWith('(759222)') && !h.endsWith('Text'))] || '');
log(`  759220 (menawarkan mencoba): "${v220}"`);
log(`  759221 (menawarkan bantuan): "${v221}"`);
log(`  759222 (memberikan tanggapan): "${v222}"`);
log(`  → If 759220 = No, then 759221 might be skipped (conditional)`);
log(`  → Or 759220+759221+759222 are grouped into 1 "Calculated Result"`);

// ============================================================
// SECTION G DEEP DIVE
// ============================================================
const colG = headers.find(h => h.includes('(Section) G.'));
log(`\n${'═'.repeat(80)}`);
log(`SECTION G: CSV Score = ${row[colG]}`);
log(`${'═'.repeat(80)}`);

// Find ALL columns in G range (759231-759243 + 759569)
const gCodes = [];
for (let code = 759231; code <= 759243; code++) {
    const col = headers.find(h => h.startsWith(`(${code})`) && !h.endsWith('- Text'));
    if (col) gCodes.push(code);
}
// Also check 759569 (multi-choice)
const col569 = headers.find(h => h.startsWith('(759569)') && !h.endsWith('- Text'));
if (col569) gCodes.push(759569);

// Also check 759565
const col565 = headers.find(h => h.startsWith('(759565)') && !h.endsWith('- Text'));
if (col565) gCodes.push(759565);

let gYes = 0, gNo = 0, gNA = 0, gOther = 0;
gCodes.forEach(code => {
    const col = headers.find(h => h.startsWith(`(${code})`) && !h.endsWith('- Text'));
    const val = (row[col] || '').trim();
    const textCol = headers.find(h => h.startsWith(`(${code})`) && h.endsWith('- Text'));
    const textVal = textCol ? (row[textCol] || '').trim() : '';

    let scoring = '';
    if (val.toLowerCase().startsWith('yes')) { scoring = '→ YES'; gYes++; }
    else if (val.toLowerCase().startsWith('no')) { scoring = '→ NO'; gNo++; }
    else if (val.toLowerCase() === 'n/a' || val.toLowerCase() === 'na') { scoring = '→ N/A'; gNA++; }
    else if (val) { scoring = `→ OTHER`; gOther++; }
    else scoring = '→ EMPTY';

    log(`\n  (${code}) ${col ? col.substring(8, 70) : '???'}...`);
    log(`    Value  : "${val.substring(0, 60)}"`);
    if (textVal) log(`    Text   : "${textVal.substring(0, 60)}"`);
    log(`    Scoring: ${scoring}`);
});

log(`\n  G Summary: ${gYes} Yes, ${gNo} No, ${gNA} N/A, ${gOther} Other`);
log(`  Simple calc: ${gYes}/(${gYes}+${gNo}) = ${(gYes / (gYes + gNo) * 100).toFixed(2)}%`);
log(`  CSV Score: ${row[colG]}`);

// Check if the "OTHER" items contain embedded scores
gCodes.forEach(code => {
    const col = headers.find(h => h.startsWith(`(${code})`) && !h.endsWith('- Text'));
    const val = (row[col] || '').trim();
    if (!val.toLowerCase().startsWith('yes') && !val.toLowerCase().startsWith('no') && val.length > 0 && val.toLowerCase() !== 'n/a') {
        log(`\n  🔍 INSPECTING OTHER VALUE (${code}):`);
        log(`    Full text: "${val}"`);

        // Check for score patterns
        if (val.includes('100.00')) log(`    → Contains "100.00" → Should be YES!`);
        if (val.includes('0.00')) log(`    → Contains "0.00" → Should be NO!`);
        if (val.includes('(1/1)')) log(`    → Contains "(1/1)" → Should be YES!`);
        if (val.includes('(0/1)')) log(`    → Contains "(0/1)" → Should be NO!`);

        // Extract embedded score
        const scoreMatch = val.match(/\((\d+\.?\d*)\)/);
        if (scoreMatch) log(`    → Embedded score: ${scoreMatch[1]}`);
    }
});

// ============================================================
// SECTION J DEEP DIVE
// ============================================================
const colJ = headers.find(h => h.includes('(Section) J.'));
log(`\n${'═'.repeat(80)}`);
log(`SECTION J: CSV Score = ${row[colJ]}`);
log(`CSV says: 33.33% → implies ?/? items`);
log(`If 1/3 = 33.33, or 2/6 = 33.33, or 3/9 = 33.33`);
log(`${'═'.repeat(80)}`);

for (let code = 759280; code <= 759286; code++) {
    const col = headers.find(h => h.startsWith(`(${code})`) && !h.endsWith('- Text'));
    if (!col) continue;
    const val = (row[col] || '').trim();
    const textCol = headers.find(h => h.startsWith(`(${code})`) && h.endsWith('- Text'));
    const textVal = textCol ? (row[textCol] || '').trim() : '';

    let scoring = '';
    if (val.toLowerCase().startsWith('yes')) scoring = '→ YES';
    else if (val.toLowerCase().startsWith('no')) scoring = '→ NO';
    else scoring = '→ OTHER';

    log(`\n  (${code}) ${col.substring(8, 70)}...`);
    log(`    Value  : "${val}"`);
    if (textVal) log(`    Text   : "${textVal.substring(0, 60)}"`);
    log(`    Scoring: ${scoring}`);
}

// Now let's check ALL columns BETWEEN Section J marker and Section K marker
const idxJ = headers.indexOf(colJ);
const colK = headers.find(h => h.includes('(Section) K.'));
const idxK = headers.indexOf(colK);

log(`\n  --- ALL COLUMNS near Toilet area (pos ${idxJ} to ${idxK}) ---`);

// Actually scan around toilet items in the 190-210 range
for (let i = 191; i <= 210; i++) {
    const h = headers[i];
    const val = (row[h] || '').trim();
    if (!val) continue;

    const codeMatch = h.match(/\((\d+)\)/);
    const code = codeMatch ? codeMatch[1] : '?';

    let tag = '';
    if (val.toLowerCase().startsWith('yes')) tag = '[YES]';
    else if (val.toLowerCase().startsWith('no')) tag = '[NO]';
    else if (val.toLowerCase() === 'n/a') tag = '[N/A]';
    else tag = '[TEXT]';

    log(`  Col ${i} (${code}): ${tag} "${val.substring(0, 40)}"`);
    log(`    Header: ${h.substring(0, 70)}`);
}

// ============================================================
// FINAL QUESTION: Does the HTML report show different items?
// ============================================================
log(`\n${'═'.repeat(80)}`);
log(`KEY FINDINGS:`);
log(`${'═'.repeat(80)}`);
log(`For Section F (87.50 vs 77.78):`);
log(`  HTML Report shows 8 scored items (Grade 62.50 for that specific store).`);
log(`  But the CSV has 9 items in range 759220-759228.`);
log(`  So 1 of the 9 items is being SKIPPED in Morrigan's scoring.`);
log(`  Most likely: items 759220+759221+759222 are grouped (3 items → 2 scored items)`);
log(``);
log(`For Section G (80.00 vs our various calcs):`);
log(`  Item 759569 is a multi-choice with text answer.`);
log(`  It contains embedded score but we may not be parsing it correctly.`);
log(``);
log(`For Section J (33.33 vs 60.00):`);
log(`  CSV only exports 5 items but Morrigan scores 9.`);
log(`  The 4 hidden items are internal to the surveyor system.`);
log(`  We CANNOT reconstruct Section J from CSV data alone.`);

fs.writeFileSync('deep_dive_mismatch.txt', out.join('\n'));
console.log(`Done! ${out.length} lines written.`);
