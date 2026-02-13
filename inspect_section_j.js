const fs = require('fs');
const files = ['Full review report.html', 'Script/Full review report 2.html', 'Script/Full review report 3.html'];

files.forEach(f => {
    if (!fs.existsSync(f)) return;
    const html = fs.readFileSync(f, 'utf8');

    // Find Section J start
    const jStart = html.indexOf('Toilet (Khusus Store');
    if (jStart === -1) return;

    // Find end of Section J (start of next section or end of list)
    let jEnd = html.indexOf('subChapterName', jStart + 100);
    if (jEnd === -1) jEnd = html.length;

    const block = html.substring(jStart, jEnd);

    console.log(`\n=== SECTION J in ${f} ===`);

    // Get Grade
    const gradeMatch = block.match(/Grade\s*([0-9.]+)/);
    console.log(`Grade: ${gradeMatch ? gradeMatch[1] : '?'}`);

    // List all items in this block
    const items = [];
    const qProb = /dir="ltr"><b>([^<]+)<\/b>/g;
    let m;
    while ((m = qProb.exec(block)) !== null) {
        items.push(m[1].trim().substring(0, 40));
    }

    items.forEach((i, idx) => console.log(`  ${idx + 1}. ${i}`));
});
