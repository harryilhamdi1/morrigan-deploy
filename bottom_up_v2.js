const fs = require('fs');
const { parse } = require('csv-parse/sync');

const waveRaw = fs.readFileSync('CSV/Wave 3 2024.csv', 'utf8');
const records = parse(waveRaw, { delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true });
const headers = Object.keys(records[0]);

const weightRaw = fs.readFileSync('CSV/Section Weight.csv', 'utf8');
const weightRecords = parse(weightRaw, { delimiter: ';', columns: true, skip_empty_lines: true, bom: true });
const WEIGHTS = {};
weightRecords.forEach(r => { const v = Object.values(r); if (v[0] && parseInt(v[1])) WEIGHTS[v[0]] = parseInt(v[1]); });

function parseScore(val) {
    if (!val) return null;
    const s = String(val);
    if (s.includes('(1/1)') || s.includes('100.00')) return 1;
    if (s.includes('(0/1)') || s.includes('0.00')) return 0;
    return null;
}

const getCol = (code) => headers.find(h => h.includes(`(${code})`) && !h.endsWith('- Text'));

// CORRECT MAPPING from actual CSV column dump
const SECTIONS = {
    'A': { codes: [759166, 759167, 759168, 759169, 759170, 759171], exclude: [] },
    'B': {
        codes: [759174, 759175, 759176, 759177, 759178, 759179], exclude: [],
        textOnly: [759173]
    }, // Nama & Foto = text
    'C': { codes: [759181, 759182, 759183, 759184, 759185, 759186, 759187, 759188, 759189, 759190, 759191, 759192], exclude: [] },
    'D': { codes: [759194, 759195, 759196, 759197, 759198, 759199, 759200, 759201], exclude: [] },
    'E': {
        codes: [759204, 759206, 759207, 759208, 759209, 759210, 759212, 759213, 759214, 759215], exclude: [],
        textOnly: [759203, 759205]
    }, // Question & Answer = text
    'F': { codes: [759220, 759221, 759222, 759223, 759224, 759225, 759226, 759227, 759228], exclude: [759221] },
    'G': {
        codes: [759231, 759233, 759211, 759569, 759235, 759236, 759237, 759243, 759239], exclude: [759211],
        textOnly: [759565]
    },
    'H': {
        codes: [759247, 759248, 759249, 759250, 759251, 759252, 759253, 759254, 759255, 759256, 759257, 759258, 759259, 759260, 759261, 759267, 759262, 759263, 759265, 759266], exclude: [],
        textOnly: [759245, 759246, 759264]
    }, // Payment method, Name, Time = text
    'I': { codes: [759270, 759271, 759272, 759273, 759274, 759275, 759276, 759277], exclude: [] },
    'J': { codes: [759280, 759281, 759282, 759283, 759284], exclude: [759282, 759283] }, // Sabun+Tisue = grouped/info
    'K': { codes: [759287, 759288, 759289], exclude: [] }
};

const SEC_WEIGHT_MAP = {
    'A': 'A. Tampilan Tampak Depan Outlet',
    'B': 'B. Sambutan Hangat ketika Masuk ke Dalam Outlet',
    'C': 'C. Suasana & Kenyamanan Outlet',
    'D': 'D. Penampilan Retail Assistant',
    'E': 'E. Pelayanan Penjualan & Pengetahuan Produk',
    'F': 'F. Pengalaman Mencoba Produk',
    'G': 'G. Rekomendasi untuk Membeli Produk',
    'H': 'H. Pembelian Produk & Pembayaran di Kasir',
    'I': 'I. Penampilan Kasir',
    'J': 'J. Toilet (Khusus Store yang memiliki toilet )',
    'K': 'K. Salam Perpisahan oleh Retail Asisstant'
};

const out = [];
function log(msg) { out.push(msg); }

log('=== BOTTOM-UP VALIDATION V2 (Corrected Mapping) ===\n');

let perfect = 0, close = 0, mismatch = 0;
let secPerfect = {}, secMismatch = {};
Object.keys(SECTIONS).forEach(k => { secPerfect[k] = 0; secMismatch[k] = 0; });

records.forEach((row, idx) => {
    const store = row['Site Name'] || `Store ${idx}`;
    let earnedPts = 0, activeWeight = 0;
    const secIssues = [];

    Object.entries(SECTIONS).forEach(([letter, config]) => {
        let yes = 0, no = 0;

        // No conditional logic needed - exclusions handled via exclude array

        config.codes.forEach(code => {
            if (config.exclude.includes(code)) return;

            const col = getCol(code);
            if (!col) return;
            const score = parseScore(row[col]);
            if (score === 1) yes++;
            else if (score === 0) no++;
        });

        const scored = yes + no;
        const myGrade = scored > 0 ? (yes / scored) * 100 : null;

        const csvCol = headers.find(h => h.includes(`(Section) ${letter}.`));
        const csvGrade = csvCol ? parseFloat(row[csvCol]) : null;

        const wName = SEC_WEIGHT_MAP[letter];
        const w = WEIGHTS[wName] || 0;

        if (myGrade !== null && w > 0) {
            earnedPts += (myGrade / 100) * w;
            activeWeight += w;
        }

        const secMatch = (myGrade !== null && csvGrade !== null && Math.abs(myGrade - csvGrade) < 0.1) ||
            (myGrade === null && (csvGrade === null || isNaN(csvGrade)));
        if (secMatch) secPerfect[letter]++;
        else {
            secMismatch[letter]++;
            secIssues.push(`[${letter}] My:${myGrade !== null ? myGrade.toFixed(1) : 'N/A'} vs CSV:${csvGrade !== null ? csvGrade.toFixed(1) : 'N/A'} (${yes}Y/${no}N/${scored}T)`);
        }
    });

    const myFinal = activeWeight > 0 ? (earnedPts / activeWeight) * 100 : 0;
    const csvFinalCol = headers.find(h => h.includes('Final Score'));
    const csvFinal = csvFinalCol ? parseFloat(row[csvFinalCol]) : null;
    const diff = csvFinal !== null ? Math.abs(myFinal - csvFinal) : 999;

    if (diff < 0.1) perfect++;
    else if (diff < 2.0) close++;
    else mismatch++;

    if (diff >= 0.1) {
        log(`── ${store}`);
        log(`   Final: My ${myFinal.toFixed(2)}% vs CSV ${csvFinal ? csvFinal.toFixed(2) : '?'}% (Diff ${diff.toFixed(2)})`);
        secIssues.forEach(s => log(`   ${s}`));
    }
});

log(`\n${'═'.repeat(60)}`);
log(`FINAL SCORE SUMMARY:`);
log(`  ✅ Perfect Match:  ${perfect} stores`);
log(`  🟡 Close Match:    ${close} stores`);
log(`  ❌ Mismatch:       ${mismatch} stores`);
log(`  Total:             ${records.length} stores`);
log(`\nSECTION-LEVEL ACCURACY:`);
Object.keys(SECTIONS).forEach(k => {
    const total = secPerfect[k] + secMismatch[k];
    const pct = total > 0 ? (secPerfect[k] / total * 100).toFixed(1) : '0';
    log(`  [${k}] ✅ ${secPerfect[k]} / ${total} (${pct}%)`);
});
log(`${'═'.repeat(60)}`);

fs.writeFileSync('bottom_up_v2.txt', out.join('\n'), 'utf8');
console.log(`Done! ${out.length} lines -> bottom_up_v2.txt`);
