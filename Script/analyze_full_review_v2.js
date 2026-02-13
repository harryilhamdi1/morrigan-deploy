const fs = require('fs');
const html = fs.readFileSync('Full review report.html', 'utf8');
const out = [];
function log(msg) { out.push(msg); }

// Extract detailed item data from the HTML report
// The structure is: section headers followed by item tables
// Each item has: question text, answer, grade bar, grade value

// Strategy: split by section anchors and then extract items within each section
const sectionAnchors = [
    { id: 'chapter14906', name: 'A', fullName: 'A. Tampilan Tampak Depan Outlet' },
    { id: 'chapter14907', name: 'B', fullName: 'B. Sambutan Hangat' },
    { id: 'chapter14908', name: 'C', fullName: 'C. Suasana & Kenyamanan' },
    { id: 'chapter14909', name: 'D', fullName: 'D. Penampilan RA' },
    { id: 'chapter14910', name: 'E', fullName: 'E. Pelayanan & Pengetahuan' },
    { id: 'chapter14916', name: 'F', fullName: 'F. Pengalaman Mencoba Produk' },
    { id: 'chapter14917', name: 'G', fullName: 'G. Rekomendasi Membeli Produk' },
    { id: 'chapter14918', name: 'H', fullName: 'H. Pembelian & Kasir' },
    { id: 'chapter14919', name: 'I', fullName: 'I. Penampilan Kasir' },
    { id: 'chapter14920', name: 'J', fullName: 'J. Toilet' },
    { id: 'chapter14921', name: 'K', fullName: 'K. Salam Perpisahan' }
];

// For each section, extract the block
for (let si = 0; si < sectionAnchors.length; si++) {
    const sec = sectionAnchors[si];
    const startIdx = html.indexOf(`id="${sec.id}"`);
    if (startIdx === -1) continue;

    const endIdx = si < sectionAnchors.length - 1
        ? html.indexOf(`id="${sectionAnchors[si + 1].id}"`)
        : html.indexOf('</body>');

    const block = html.substring(startIdx, endIdx);

    // Extract section grade
    const gradeMatch = block.match(/Grade\s+([\d.]+)\s*<\/span>.*?\((\d+)\/(\d+)\)/s);
    log(`\n${'═'.repeat(80)}`);
    log(`SECTION ${sec.name}: ${sec.fullName}`);
    if (gradeMatch) {
        log(`Grade: ${gradeMatch[1]} (${gradeMatch[2]}/${gradeMatch[3]})`);
    }
    log(`${'═'.repeat(80)}`);

    // Find all question blocks within this section
    // Pattern: questionTextCol has the question text, followed by answer info
    const questionPattern = /<td[^>]*class="questionTextCol"[^>]*>([\s\S]*?)<\/td>/g;
    const questions = [...block.matchAll(questionPattern)];

    // Find all answer grades within this section (for scored items)
    const answerGradePattern = /<td[^>]*class="answerWithGrade"[^>]*>([\s\S]*?)<\/td>/g;
    const answerGrades = [...block.matchAll(answerGradePattern)];

    // Find all answer texts
    const answerTextPattern = /<td[^>]*class="answerText"[^>]*>([\s\S]*?)<\/td>/g;
    const answerTexts = [...block.matchAll(answerTextPattern)];

    // Combine all items - try to find question + grade pairs
    // Let's extract items differently - look for table rows that contain both question and grade
    const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    const rows = [...block.matchAll(rowPattern)];

    let itemNum = 0;
    rows.forEach(row => {
        const rowHTML = row[1];

        // Check if this row has a question
        const qMatch = rowHTML.match(/class="questionTextCol"[^>]*>([\s\S]*?)<\/td>/);
        if (!qMatch) return;

        const questionText = qMatch[1].replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
        if (!questionText || questionText.length < 5) return;

        // Check for grade
        const gradeInRow = rowHTML.match(/([\d.]+)\s*$/);
        const hasGrade = rowHTML.includes('answerWithGrade');
        const hasNoGrade = rowHTML.includes('answerWithoutGrade');

        // Get the actual score if present
        const scoreMatch = rowHTML.match(/class="answerWithGrade"[^>]*>[\s\S]*?([\d.]+)\s*<\/td>/);
        const score = scoreMatch ? scoreMatch[1] : null;

        // Check for visual bar to determine Yes/No
        const blackSquares = (rowHTML.match(/■/g) || []).length;
        const whiteSquares = (rowHTML.match(/□/g) || []).length;

        itemNum++;
        const yesNo = blackSquares > 0 && whiteSquares === 0 ? 'YES' :
            blackSquares === 0 && whiteSquares > 0 ? 'NO' :
                blackSquares > 0 && whiteSquares > 0 ? `PARTIAL(${blackSquares}/${blackSquares + whiteSquares})` :
                    hasNoGrade ? 'N/A/TEXT' : '???';

        log(`  [${itemNum.toString().padStart(2)}] ${yesNo.padEnd(15)} Score: ${(score || 'N/A').padStart(6)} | ${questionText.substring(0, 80)}`);
    });
}

// Also verify: Final Grade calculation
log(`\n\n${'═'.repeat(80)}`);
log(`FINAL GRADE VERIFICATION`);
log(`${'═'.repeat(80)}`);

const sectionData = [...html.matchAll(/<a class="chapterNameLink"[^>]*>([^<]+)<\/a>.*?Weight (\d+).*?Grade ([\d.]+).*?\((\d+)\/(\d+)\)/gs)];
const seen = new Set();
let totalEarned = 0, totalWeight = 0;
sectionData.forEach(m => {
    const name = m[1].trim();
    const weight = parseInt(m[2]);
    const grade = parseFloat(m[3]);
    const earned = parseInt(m[4]);
    const total = parseInt(m[5]);

    const key = name;
    if (seen.has(key)) return;
    seen.add(key);

    // Earned points = (grade/100) * weight = earned (literally the numerator in X/weight)
    totalEarned += earned;
    totalWeight += weight;

    log(`  ${name.substring(0, 45).padEnd(47)} | W: ${weight.toString().padStart(2)} | Grade: ${grade.toFixed(2).padStart(6)} | ${earned}/${total}`);
});

log(`\n  Total Earned: ${totalEarned}`);
log(`  Total Weight: ${totalWeight}`);
log(`  Final Grade = ${totalEarned}/${totalWeight} * 100 = ${(totalEarned / totalWeight * 100).toFixed(2)}`);

const reportedFinal = html.match(/Final grade:.*?<div[^>]*>([\d.]+)/s);
log(`  Reported Final: ${reportedFinal ? reportedFinal[1] : 'N/A'}`);

fs.writeFileSync('full_review_detailed.txt', out.join('\n'), 'utf8');
console.log(`Done! ${out.length} lines`);
