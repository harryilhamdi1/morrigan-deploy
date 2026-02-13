const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const waveRecords = parse(fs.readFileSync(path.join(__dirname, 'CSV', 'Wave 3 2024.csv'), 'utf8'), {
    delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true
});
const headers = Object.keys(waveRecords[0]);
const row = waveRecords[0];

const out = [];
function log(msg) { out.push(msg); }

// Find section column indices
const secIdx = {};
headers.forEach((h, idx) => {
    if (h.includes('(Section) F.')) secIdx.F = idx;
    if (h.includes('(Section) G.')) secIdx.G = idx;
    if (h.includes('(Section) J.')) secIdx.J = idx;
    if (h.includes('(Section) K.')) secIdx.K = idx;
    if (h.includes('(Section) H.')) secIdx.H = idx;
    if (h.includes('(Section) I.')) secIdx.I = idx;
    if (h.includes('(Section) E.')) secIdx.E = idx;
});

log('Section column positions:');
Object.entries(secIdx).sort((a, b) => a[1] - b[1]).forEach(([k, v]) => log(`  Section ${k}: col index ${v} = ${headers[v].substring(0, 50)}`));

// Show ALL columns between Section E and Section G (this covers F items)
log(`\n=== ALL COLUMNS BETWEEN Section E (idx ${secIdx.E}) and Section G (idx ${secIdx.G}) ===`);
log(`This covers Section F items\n`);

for (let i = secIdx.E + 1; i < secIdx.G; i++) {
    const h = headers[i];
    if (h.includes('(Section)')) { log(`  [SEC] ${h}`); continue; }
    const rawVal = (row[h] || '').trim();
    const lower = rawVal.toLowerCase();
    let tag = '';
    if (lower.startsWith('yes')) tag = ' [YES]';
    else if (lower.startsWith('no')) tag = ' [NO]';
    else if (lower === 'n/a' || lower === 'na') tag = ' [N/A]';
    else if (!rawVal) tag = ' [EMPTY]';
    else tag = ' [TEXT]';

    log(`  Col ${i}: ${h.substring(0, 70)}${tag}`);
    log(`           Value: "${rawVal.substring(0, 60)}"`);
}

// Show ALL columns between Section I and Section K (this covers J items)
log(`\n\n=== ALL COLUMNS BETWEEN Section I (idx ${secIdx.I}) and Section K (idx ${secIdx.K}) ===`);
log(`This covers Section J items\n`);

for (let i = secIdx.I + 1; i < secIdx.K; i++) {
    const h = headers[i];
    if (h.includes('(Section)')) { log(`  [SEC] ${h}`); continue; }
    const rawVal = (row[h] || '').trim();
    const lower = rawVal.toLowerCase();
    let tag = '';
    if (lower.startsWith('yes')) tag = ' [YES]';
    else if (lower.startsWith('no')) tag = ' [NO]';
    else if (lower === 'n/a' || lower === 'na') tag = ' [N/A]';
    else if (!rawVal) tag = ' [EMPTY]';
    else tag = ' [TEXT]';

    log(`  Col ${i}: ${h.substring(0, 70)}${tag}`);
    log(`           Value: "${rawVal.substring(0, 60)}"`);
}

// Also check between D and E for Section E items
log(`\n\n=== ALL COLUMNS BETWEEN Section D (idx ${secIdx.E > 0 ? secIdx.E - 20 : 0}) and Section E ===`);

// Actually, the columns might be IN DIFFERENT ORDER. Let me just dump ALL columns for Section F items range
// Let's find the actual item columns by looking for known section F codes
log(`\n\n=== SEARCHING FOR ALL COLUMNS WITH "759220" through "759228" (Section F known range) ===`);
for (let code = 759220; code <= 759230; code++) {
    const col = headers.find(h => h.includes(`(${code})`));
    if (col) {
        const idx = headers.indexOf(col);
        log(`  Found (${code}) at col ${idx}: ${col.substring(0, 70)}`);
        // Check columns just after this for Text variants
        if (idx + 1 < headers.length) {
            const next = headers[idx + 1];
            if (next.endsWith('- Text')) {
                log(`    -> Next col is TEXT: ${next.substring(0, 70)}`);
            }
        }
    }
}

log(`\n=== SEARCHING FOR ALL COLUMNS WITH "759280" through "759290" (Section J known range) ===`);
for (let code = 759278; code <= 759290; code++) {
    const col = headers.find(h => h.includes(`(${code})`));
    if (col) {
        const idx = headers.indexOf(col);
        const rawVal = (row[col] || '').trim();
        log(`  Found (${code}) at col ${idx}: ${rawVal.substring(0, 30).padEnd(32)} | ${col.substring(0, 60)}`);
    }
}

fs.writeFileSync(path.join(__dirname, 'deep_column_map.txt'), out.join('\n'), 'utf8');
console.log(`Done! ${out.length} lines`);
