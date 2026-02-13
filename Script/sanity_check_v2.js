const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// --- Load Scorecard ---
const scoreData = parse(fs.readFileSync(path.join(__dirname, 'CSV', 'Scorecard.csv'), 'utf8'), {
    delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true
});
const questionMap = {}; // code -> { section, question }
scoreData.forEach(r => {
    if (!r.Journey) return;
    const m = r.Journey.match(/\((\d+)\)/);
    if (m) questionMap[m[1]] = {
        section: r.Section.replace('(Section) ', '').trim(),
        question: r.Journey
    };
});

// --- Load Weights ---
const weightData = parse(fs.readFileSync(path.join(__dirname, 'CSV', 'Section Weight.csv'), 'utf8'), {
    delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true
});
const weights = {};
weightData.forEach(r => { weights[r.Section.replace('(Section) ', '').trim()] = parseFloat(r.Weight); });

// --- Load Wave Data ---
const waveRecords = parse(fs.readFileSync(path.join(__dirname, 'CSV', 'Wave 3 2024.csv'), 'utf8'), {
    delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true
});
const headers = Object.keys(waveRecords[0]);

// Section columns
const sectionCols = {};
headers.forEach(h => {
    if (h.includes('(Section)')) {
        sectionCols[h.replace('(Section) ', '').trim()] = h;
    }
});

// Map question columns to their codes
const questionCols = {}; // code -> headerName
headers.forEach(h => {
    if (h.includes('(Section)') || h.endsWith('- Text')) return;
    const m = h.match(/\((\d+)\)/);
    if (m && questionMap[m[1]]) questionCols[m[1]] = h;
});

// Classify answer
function classify(val) {
    if (!val || val.trim() === '') return { type: 'EMPTY', display: '(empty)' };
    const v = val.trim();
    const vl = v.toLowerCase();
    if (vl === 'n/a' || vl === 'na') return { type: 'NA', display: 'N/A' };
    if (vl.startsWith('yes')) return { type: 'YES', display: v.substring(0, 30) };
    if (vl.startsWith('no')) return { type: 'NO', display: v.substring(0, 30) };
    return { type: 'OTHER', display: v.substring(0, 40) };
}

// --- Sections in order ---
const sectionOrder = [
    'A. Tampilan Tampak Depan Outlet', 'B. Sambutan Hangat Ketika Masuk ke Dalam Outlet',
    'C. Suasana & Kenyamanan Outlet', 'D. Penampilan Retail Assistant',
    'E. Pelayanan Penjualan & Pengetahuan Produk', 'F. Pengalaman Mencoba Produk',
    'G. Rekomendasi untuk Membeli Produk', 'H. Pembelian Produk & Pembayaran di Kasir',
    'I. Penampilan Kasir', 'J. Toilet (Khusus Store yang memiliki toilet )',
    'K. Salam Perpisahan oleh Retail Asisstant'
];

// --- Sample 5 stores (evenly spread) ---
const step = Math.floor(waveRecords.length / 5);
const indices = [0, step, step * 2, step * 3, waveRecords.length - 1];

const output = [];
function log(msg) { output.push(msg); }

indices.forEach((idx, sNum) => {
    const row = waveRecords[idx];
    log(`\n${'='.repeat(90)}`);
    log(`STORE ${sNum + 1}: [${row['Site Code']}] ${row['Site Name']}`);
    log(`${'='.repeat(90)}`);

    let totalEarned = 0, totalMaxW = 0;

    sectionOrder.forEach(secName => {
        // Get CSV section score
        const csvCol = sectionCols[secName];
        const csvRaw = csvCol ? row[csvCol] : '';
        let csvScore = csvRaw ? parseFloat(csvRaw) : null;
        if (isNaN(csvScore)) csvScore = null;

        const w = weights[secName] || 0;

        log(`\n  ┌─ Section: ${secName}`);
        log(`  │  Weight: ${w} | CSV Score: ${csvScore !== null ? csvScore.toFixed(2) : 'N/A'}`);

        // Find all questions for this section
        let yesCount = 0, noCount = 0, naCount = 0, otherItems = [];

        Object.entries(questionMap).forEach(([code, info]) => {
            if (info.section !== secName) return;
            const colName = questionCols[code];
            if (!colName) {
                log(`  │  [?] (${code}) Column not found in Wave data`);
                return;
            }
            const rawVal = row[colName];
            const cl = classify(rawVal);

            let icon = '  ';
            if (cl.type === 'YES') { yesCount++; icon = 'Y '; }
            else if (cl.type === 'NO') { noCount++; icon = 'X '; }
            else if (cl.type === 'NA' || cl.type === 'EMPTY') { naCount++; icon = '- '; }
            else { otherItems.push({ code, val: cl.display }); icon = '? '; }

            const shortQ = info.question.substring(0, 65);
            log(`  │  [${icon}] (${code}) ${shortQ}  →  ${cl.display}`);
        });

        const validItems = yesCount + noCount;
        let calcScore = validItems > 0 ? (yesCount / validItems) * 100 : null;

        log(`  │`);
        log(`  │  Tally: ${yesCount} Yes, ${noCount} No, ${naCount} N/A, ${otherItems.length} Other`);
        log(`  │  Manual Calc: ${calcScore !== null ? calcScore.toFixed(2) : 'N/A'}`);
        log(`  │  CSV Score:   ${csvScore !== null ? csvScore.toFixed(2) : 'N/A'}`);

        if (csvScore !== null && calcScore !== null) {
            const diff = Math.abs(csvScore - calcScore);
            log(`  │  ${diff < 0.5 ? 'MATCH ✓' : `MISMATCH (diff: ${diff.toFixed(2)})`}`);
        } else if (csvScore === null && calcScore === null) {
            log(`  │  BOTH N/A ✓`);
        }

        if (otherItems.length > 0) {
            log(`  │  ⚠ Non-YesNo items: ${otherItems.map(o => `(${o.code}): "${o.val}"`).join(', ')}`);
        }

        // Weighted calc uses CSV section score (our actual pipeline)
        if (csvScore !== null && w > 0) {
            totalEarned += (csvScore / 100) * w;
            totalMaxW += w;
        }

        log(`  └─────`);
    });

    const calcFinal = totalMaxW > 0 ? (totalEarned / totalMaxW) * 100 : 0;
    const csvFinal = parseFloat(row['Final Score']);

    log(`\n  ╔══════════════════════════════════════════════════╗`);
    log(`  ║  FINAL SCORE                                     ║`);
    log(`  ║  CSV (Col Q):          ${(!isNaN(csvFinal) ? csvFinal.toFixed(2) : 'N/A').padEnd(27)}║`);
    log(`  ║  Our Weighted Calc:    ${calcFinal.toFixed(2).padEnd(27)}║`);
    log(`  ║  Difference:           ${(!isNaN(csvFinal) ? Math.abs(csvFinal - calcFinal).toFixed(2) : 'N/A').padEnd(27)}║`);
    log(`  ║  Weights Used:         ${(totalMaxW + ' / 100').padEnd(27)}║`);
    log(`  ╚══════════════════════════════════════════════════╝`);
});

// Write to file
fs.writeFileSync(path.join(__dirname, 'sanity_check_v2_output.txt'), output.join('\n'), 'utf8');
console.log(`Done! Output written to sanity_check_v2_output.txt (${output.length} lines)`);
