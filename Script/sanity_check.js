const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// --- 1. Load Scorecard (Question -> Section Mapping) ---
const scoreFile = path.join(__dirname, 'CSV', 'Scorecard.csv');
const scoreData = parse(fs.readFileSync(scoreFile, 'utf8'), {
    delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true
});

// Build a map: { questionCode: sectionName }
// questionCode is like "759166", sectionName is like "A. Tampilan..."
const questionToSection = {};
scoreData.forEach(r => {
    const journey = r.Journey;
    if (!journey) return;
    const codeMatch = journey.match(/\((\d+)\)/);
    if (codeMatch) {
        // Clean section: remove "(Section) " prefix
        const section = r.Section.replace('(Section) ', '').trim();
        questionToSection[codeMatch[1]] = { section, fullQuestion: journey };
    }
});

console.log(`Loaded ${Object.keys(questionToSection).length} question-to-section mappings from Scorecard.\n`);

// --- 2. Load Section Weights ---
const weightFile = path.join(__dirname, 'CSV', 'Section Weight.csv');
const weightData = parse(fs.readFileSync(weightFile, 'utf8'), {
    delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true
});
const sectionWeights = {};
weightData.forEach(r => {
    const clean = r.Section.replace('(Section) ', '').trim();
    sectionWeights[clean] = parseFloat(r.Weight);
});

// --- 3. Load Wave Data (FULL) ---
const waveFile = path.join(__dirname, 'CSV', 'Wave 3 2024.csv');
const waveData = parse(fs.readFileSync(waveFile, 'utf8'), {
    delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true
});
const headers = Object.keys(waveData[0]);

// Identify question columns (have numeric code in parens, NOT Section aggregates, NOT "- Text" columns)
const questionColumns = headers.filter(h => {
    if (h.includes('(Section)')) return false;
    if (h.endsWith('- Text')) return false;
    if (h === 'Final Score') return false;
    if (['Review number', 'Site Code', 'Site Name', 'Branch', 'Regional'].includes(h)) return false;

    const code = h.match(/\((\d+)\)/);
    return code !== null;
});

// Identify Section aggregate columns
const sectionColumns = headers.filter(h => h.includes('(Section)'));

// Helper: Determine if a cell value is Yes, No, or N/A
function classifyValue(val) {
    if (!val || val.trim() === '') return 'EMPTY';
    const v = val.trim().toLowerCase();
    if (v === 'n/a' || v === 'na') return 'NA';
    if (v.startsWith('yes') || v === '1' || v === '1.00') return 'YES';
    if (v.startsWith('no') || v === '0' || v === '0.00') return 'NO';
    // Check for score-like values (e.g. "100.00" for Yes, "0.00" for No)
    const num = parseFloat(v.replace(',', '.'));
    if (!isNaN(num)) {
        if (num >= 50) return 'YES';  // Typically 100.00
        if (num === 0) return 'NO';
    }
    return 'OTHER'; // Not a simple Yes/No/NA
}

// --- 4. Sample 3 stores and do sanity check ---
const sampleIndices = [0, Math.floor(waveData.length / 2), waveData.length - 1]; // First, Middle, Last

sampleIndices.forEach((idx, sampleNum) => {
    const row = waveData[idx];
    const storeCode = row['Site Code'];
    const storeName = row['Site Name'];

    console.log(`${'='.repeat(80)}`);
    console.log(`SAMPLE ${sampleNum + 1}: Store ${storeCode} - ${storeName}`);
    console.log(`${'='.repeat(80)}`);

    // Group question columns by section
    const sectionItems = {}; // { sectionName: { yes: 0, no: 0, na: 0, total: 0 } }

    questionColumns.forEach(colName => {
        const codeMatch = colName.match(/\((\d+)\)/);
        if (!codeMatch) return;
        const code = codeMatch[1];

        // Find which section this question belongs to
        let section = null;
        if (questionToSection[code]) {
            section = questionToSection[code].section;
        } else {
            // Try to find section from column position (fallback)
            // Skip unknown questions
            return;
        }

        const rawVal = row[colName];
        const classification = classifyValue(rawVal);

        if (!sectionItems[section]) sectionItems[section] = { yes: 0, no: 0, na: 0, other: 0, items: [] };

        if (classification === 'YES') sectionItems[section].yes++;
        else if (classification === 'NO') sectionItems[section].no++;
        else if (classification === 'NA' || classification === 'EMPTY') sectionItems[section].na++;
        else sectionItems[section].other++;

        sectionItems[section].items.push({ col: colName.substring(0, 50), val: rawVal, cls: classification });
    });

    // Now compare calculated vs actual
    let totalWeightedEarned = 0;
    let totalWeightUsed = 0;

    const targetSections = [
        'A. Tampilan Tampak Depan Outlet', 'B. Sambutan Hangat Ketika Masuk ke Dalam Outlet',
        'C. Suasana & Kenyamanan Outlet', 'D. Penampilan Retail Assistant',
        'E. Pelayanan Penjualan & Pengetahuan Produk', 'F. Pengalaman Mencoba Produk',
        'G. Rekomendasi untuk Membeli Produk', 'H. Pembelian Produk & Pembayaran di Kasir',
        'I. Penampilan Kasir', 'J. Toilet (Khusus Store yang memiliki toilet )',
        'K. Salam Perpisahan oleh Retail Asisstant'
    ];

    targetSections.forEach(secName => {
        // Get actual section score from CSV
        const secCol = sectionColumns.find(c => c.includes(secName));
        let actualScore = secCol ? parseFloat(row[secCol]) : null;
        if (isNaN(actualScore)) actualScore = null;

        // Get calculated section score from items
        const items = sectionItems[secName];
        let calcScore = null;
        if (items) {
            const validItems = items.yes + items.no;
            if (validItems > 0) {
                calcScore = (items.yes / validItems) * 100;
            }
        }

        const weight = sectionWeights[secName] || 0;
        const match = (actualScore !== null && calcScore !== null)
            ? (Math.abs(actualScore - calcScore) < 0.5 ? '✅' : '❌ MISMATCH')
            : (actualScore === null && calcScore === null ? '⬜ N/A' : '⚠️ PARTIAL');

        console.log(`\n  [${secName.substring(0, 40)}]`);
        if (items) {
            console.log(`    Items: ${items.yes} Yes, ${items.no} No, ${items.na} N/A, ${items.other} Other`);
        } else {
            console.log(`    Items: No matching questions found in Scorecard`);
        }
        console.log(`    Calculated Score: ${calcScore !== null ? calcScore.toFixed(2) : 'N/A'}`);
        console.log(`    CSV Score (Col F-P): ${actualScore !== null ? actualScore.toFixed(2) : 'N/A (empty)'}`);
        console.log(`    Weight: ${weight}`);
        console.log(`    Match: ${match}`);

        // Weighted calculation using CSV section score (our actual pipeline)
        if (actualScore !== null && weight > 0) {
            totalWeightedEarned += (actualScore / 100) * weight;
            totalWeightUsed += weight;
        }
    });

    // Final Score comparison
    const csvFinalScore = parseFloat(row['Final Score']);
    const calcFinalScore = totalWeightUsed > 0 ? (totalWeightedEarned / totalWeightUsed) * 100 : 0;

    console.log(`\n  ${'─'.repeat(60)}`);
    console.log(`  FINAL SCORE COMPARISON:`);
    console.log(`    CSV Final Score (Col Q):     ${!isNaN(csvFinalScore) ? csvFinalScore.toFixed(2) : 'N/A'}`);
    console.log(`    Our Weighted Calculation:     ${calcFinalScore.toFixed(2)}`);
    console.log(`    Difference:                  ${!isNaN(csvFinalScore) ? Math.abs(csvFinalScore - calcFinalScore).toFixed(2) : 'N/A'}`);
    console.log(`    Weight Used / Total:         ${totalWeightUsed} / 100`);
    console.log('');
});
