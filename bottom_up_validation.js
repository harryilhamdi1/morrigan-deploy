const fs = require('fs');
const { parse } = require('csv-parse/sync');

// --- LOAD DATA ---
const waveRaw = fs.readFileSync('CSV/Wave 3 2024.csv', 'utf8');
const records = parse(waveRaw, { delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true });
const headers = Object.keys(records[0]);

const weightRaw = fs.readFileSync('CSV/Section Weight.csv', 'utf8');
const weightRecords = parse(weightRaw, { delimiter: ';', columns: true, skip_empty_lines: true, bom: true });
const WEIGHTS = {};
weightRecords.forEach(r => {
    const vals = Object.values(r);
    const name = vals[0]; const w = parseInt(vals[1]);
    if (name && w) WEIGHTS[name] = w;
});

// --- SCORING LOGIC ---
function parseScore(val) {
    if (!val) return null;
    const s = String(val);
    if (s.includes('(1/1)') || s.includes('100.00')) return 1;
    if (s.includes('(0/1)') || s.includes('0.00')) return 0;
    return null; // N/A or Text
}

const getCol = (code) => headers.find(h => h.includes(`(${code})`) && !h.endsWith('- Text'));

// Section Item Codes (from HTML visum)
const SECTIONS = {
    'A': { codes: [759165, 759166, 759167, 759168, 759169, 759170], exclude: [] },
    'B': { codes: [759173, 759174, 759175, 759176, 759177, 759178], exclude: [] },
    'C': { codes: [759182, 759183, 759184, 759185, 759186, 759187, 759188, 759189, 759190, 759191, 759192, 759193], exclude: [] },
    'D': { codes: [759196, 759197, 759198, 759199, 759200, 759201, 759202, 759203], exclude: [] },
    'E': { codes: [759207, 759209, 759210, 759211, 759212, 759213, 759214, 759215, 759216, 759217], exclude: [] },
    'F': { codes: [759220, 759221, 759222, 759223, 759224, 759225, 759226, 759227, 759228], exclude: [], conditional: { trigger: 759220, skip: 759221 } },
    'G': { codes: [759231, 759232, 759233, 759234, 759569, 759235, 759236, 759237, 759238, 759239], exclude: [] },
    'H': { codes: [759242, 759243, 759244, 759245, 759246, 759247, 759248, 759249, 759250, 759251, 759252, 759253, 759254, 759255, 759256, 759257, 759258, 759259, 759260, 759261, 759262], exclude: [] },
    'I': { codes: [759265, 759266, 759267, 759268, 759269, 759270, 759271, 759272], exclude: [] },
    'J': { codes: [759280, 759281, 759282, 759283, 759284], exclude: [759283] }, // Tisue = informational
    'K': { codes: [759287, 759288, 759289], exclude: [] }
};

// Section Weight Mapping (to match CSV weight column names)
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

log('=== FULL BOTTOM-UP VALIDATION: Item → Section → Final Score ===');
log(`Total Stores: ${records.length}\n`);

let perfectMatch = 0;
let closeMatch = 0;
let mismatch = 0;

records.forEach((row, idx) => {
    const storeName = row['Site Name'] || `Store ${idx}`;
    let totalEarnedPoints = 0;
    let totalActiveWeight = 0;
    const sectionResults = [];

    Object.entries(SECTIONS).forEach(([letter, config]) => {
        let yes = 0, no = 0;

        // Check conditional logic (Section F)
        let skipCode = null;
        if (config.conditional) {
            const triggerVal = row[getCol(config.conditional.trigger)];
            const triggerScore = parseScore(triggerVal);
            if (triggerScore === 1) skipCode = config.conditional.skip;
        }

        config.codes.forEach(code => {
            if (config.exclude.includes(code)) return; // Static exclusion (Tisue)
            if (skipCode && code === skipCode) return; // Conditional exclusion (F)

            const col = getCol(code);
            if (!col) return;

            const val = row[col];
            const score = parseScore(val);

            if (score === 1) yes++;
            else if (score === 0) no++;
            // null = N/A, skip
        });

        const scored = yes + no;
        const myGrade = scored > 0 ? (yes / scored) * 100 : null;

        // Get CSV section grade for comparison
        const csvSecCol = headers.find(h => h.includes(`(Section) ${letter}.`));
        const csvGrade = csvSecCol ? parseFloat(row[csvSecCol]) : null;

        // Weight
        const weightName = SEC_WEIGHT_MAP[letter];
        const weight = WEIGHTS[weightName] || 0;

        // Add to final score if section is active
        if (myGrade !== null && weight > 0) {
            totalEarnedPoints += (myGrade / 100) * weight;
            totalActiveWeight += weight;
        }

        const match = myGrade !== null && csvGrade !== null && Math.abs(myGrade - csvGrade) < 0.1;
        sectionResults.push({ letter, myGrade, csvGrade, match, scored });
    });

    const myFinal = totalActiveWeight > 0 ? (totalEarnedPoints / totalActiveWeight) * 100 : 0;
    const csvFinalCol = headers.find(h => h.includes('Final Score') || h.includes('Total Score'));
    const csvFinal = csvFinalCol ? parseFloat(row[csvFinalCol]) : null;

    const finalDiff = csvFinal !== null ? Math.abs(myFinal - csvFinal) : 999;

    if (finalDiff < 0.1) perfectMatch++;
    else if (finalDiff < 2.0) closeMatch++;
    else mismatch++;

    // Only log details for mismatches
    if (finalDiff >= 0.1) {
        log(`\n── ${storeName}`);
        log(`   Final: My ${myFinal.toFixed(2)}% vs CSV ${csvFinal ? csvFinal.toFixed(2) : '?'}% (Diff: ${finalDiff.toFixed(2)})`);

        sectionResults.filter(s => !s.match && s.csvGrade !== null).forEach(s => {
            log(`   [${s.letter}] My: ${s.myGrade !== null ? s.myGrade.toFixed(2) : 'N/A'}% vs CSV: ${s.csvGrade.toFixed(2)}% (${s.scored} scored)`);
        });
    }
});

log(`\n${'═'.repeat(60)}`);
log(`SUMMARY:`);
log(`  ✅ Perfect Match (< 0.1% diff):  ${perfectMatch} stores`);
log(`  🟡 Close Match  (< 2.0% diff):   ${closeMatch} stores`);
log(`  ❌ Mismatch     (≥ 2.0% diff):   ${mismatch} stores`);
log(`  Total:                            ${records.length} stores`);
log(`${'═'.repeat(60)}`);

fs.writeFileSync('bottom_up_validation.txt', out.join('\n'));
console.log(`Done! Results in bottom_up_validation.txt (${out.length} lines)`);
