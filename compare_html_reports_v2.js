const fs = require('fs');
const path = require('path');

const files = [
    'Full review report.html',
    'Script/Full review report 2.html',
    'Script/Full review report 3.html'
];

function analyze(file) {
    if (!fs.existsSync(file)) return;
    const html = fs.readFileSync(file, 'utf8');

    // Extract Store Name
    let storeName = 'Unknown';
    const t = html.match(/class="siteAndDetails"[^>]*>([^<]+)/);
    if (t) storeName = t[1].trim();

    console.log(`\nSTORE: ${storeName} (${file})`);

    // Helper to extract section
    function extractSection(nameKey) {
        const start = html.indexOf(nameKey);
        if (start === -1) return null;

        // Find Grade
        const gradeBlock = html.substring(start, start + 300);
        const gradeMatch = gradeBlock.match(/Grade ([0-9.]+)/);
        const weightMatch = gradeBlock.match(/Weight ([0-9]+)\s*\((\d+)\/(\d+)\)/);

        let earned = '?', total = '?';
        if (weightMatch) {
            earned = weightMatch[2];
            total = weightMatch[3];
        }

        // Find items until next subChapter
        let end = html.indexOf('subChapterName', start + 100);
        if (end === -1) end = html.length;

        const block = html.substring(start, end);
        const items = [];
        const pattern = /dir="ltr"><b>([^<]+)<\/b>[\s\S]*?answerValue[^>]*>([^<]+)/g;
        let match;
        while ((match = pattern.exec(block)) !== null) {
            items.push({ q: match[1].trim(), a: match[2].trim() });
        }

        return { grade: gradeMatch ? gradeMatch[1] : '?', earned, total, items };
    }

    // SECTION F
    const secF = extractSection('Pengalaman Mencoba Produk');
    if (secF) {
        console.log(`  [F] Grade ${secF.grade}% (${secF.earned}/${secF.total}) - ${secF.items.length} items`);
        secF.items.forEach((i, idx) => {
            // Only show key items
            if (idx < 3) console.log(`      ${idx + 1}. ${i.q.substring(0, 30)}... -> ${i.a}`);
        });
    }

    // SECTION J
    const secJ = extractSection('Toilet (Khusus Store');
    if (secJ) {
        console.log(`  [J] Grade ${secJ.grade}% (${secJ.earned}/${secJ.total}) - ${secJ.items.length} items`);
    }

    // SECTION K (Salam)
    const secK = extractSection('Salam Perpisahan');
    if (secK) {
        console.log(`  [K] Grade ${secK.grade}% (${secK.earned}/${secK.total}) - ${secK.items.length} items`);
    }
}

files.forEach(f => analyze(f));
