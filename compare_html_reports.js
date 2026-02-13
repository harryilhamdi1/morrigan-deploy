const fs = require('fs');
const path = require('path');

const files = [
    'Full review report.html',
    'Script/Full review report 2.html',
    'Script/Full review report 3.html'
];

function analyzeReport(filePath) {
    if (!fs.existsSync(filePath)) return null;
    const html = fs.readFileSync(filePath, 'utf8');

    // Extract Store Name to identify
    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    const storeName = titleMatch ? titleMatch[1] : 'Unknown';

    console.log(`\n=== REPORT: ${filePath} (${storeName}) ===`);

    const subChapterPattern = /subChapterName[^>]*>([^<]+)<[\s\S]*?subChapterGrade[^>]*>\s*Grade\s*([\d.]+)[\s\S]*?subChapterWeight[^>]*>Weight\s+(\d+)\s*\(\d+\/\d+\)/g;
    let sMatch;
    const sections = [];
    while ((sMatch = subChapterPattern.exec(html)) !== null) {
        sections.push({
            name: sMatch[1].trim(),
            grade: parseFloat(sMatch[2]),
            weight: parseInt(sMatch[3]),
            startPos: sMatch.index
        });
    }

    // Analyze specific sections
    ['Pengalaman Mencoba Produk', 'Rekomendasi untuk Membeli Produk', 'Toilet', 'Salam Perpisahan'].forEach(targetName => {
        const sec = sections.find(s => s.name.includes(targetName));
        if (!sec) return;

        console.log(`\n  SECTION: ${sec.name} (Grade: ${sec.grade} | Weight ${sec.weight})`);

        // Extract items
        const endPos = sections.indexOf(sec) < sections.length - 1 ? sections[sections.indexOf(sec) + 1].startPos : html.length;
        const block = html.substring(sec.startPos, endPos);

        const qPattern = /dir="ltr"><b>([^<]+)<\/b>[\s\S]*?answerValue[^>]*>([^<]+)/g;
        let qm;
        let count = 0;
        while ((qm = qPattern.exec(block)) !== null) {
            count++;
            const qText = qm[1].trim().substring(0, 60);
            const ans = qm[2].trim();
            console.log(`    [${count}] ${ans.padEnd(20)} | ${qText}`);
        }
    });
}

files.forEach(f => analyzeReport(f));
