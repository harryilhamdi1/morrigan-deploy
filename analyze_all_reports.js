const fs = require('fs');

const files = [
    { path: 'Script/Full review report.html', label: 'Report 1' },
    { path: 'Script/Full review report 2.html', label: 'Report 2' },
    { path: 'Script/Full review report 3.html', label: 'Report 3' }
];

const out = [];
function log(msg) { out.push(msg); }

function findAll(str, pattern) {
    const indices = [];
    let pos = str.indexOf(pattern);
    while (pos !== -1) {
        indices.push(pos);
        pos = str.indexOf(pattern, pos + 1);
    }
    return indices;
}

function getScore(rowHTML) {
    // Check for answer value
    const ansWithGrade = rowHTML.includes('answerWithGrade');
    const ansWithoutGrade = rowHTML.includes('answerWithoutGrade');

    // Get answer text
    const ansMatch = rowHTML.match(/answerValue[^>]*>([^<]+)/);
    const ansText = ansMatch ? ansMatch[1].trim() : '';

    if (!ansText || ansText === '') return { type: 'EMPTY', score: null, text: '' };

    const lower = ansText.toLowerCase();

    // Direct Yes/No
    if (lower.startsWith('yes')) return { type: 'YES', score: 1, text: ansText };
    if (lower.startsWith('no')) return { type: 'NO', score: 0, text: ansText };
    if (lower === 'n/a' || lower === 'na') return { type: 'N/A', score: null, text: ansText };

    // Multi-choice with embedded score
    if (ansText.includes('(1/1)') || ansText.includes('100.00')) return { type: 'MC-YES', score: 1, text: ansText };
    if (ansText.includes('(0/1)') || ansText.includes('0.00')) return { type: 'MC-NO', score: 0, text: ansText };

    // Pure text
    return { type: 'TEXT', score: null, text: ansText };
}

files.forEach(({ path: filePath, label }) => {
    if (!fs.existsSync(filePath)) {
        log(`\n❌ File not found: ${filePath}`);
        return;
    }
    const html = fs.readFileSync(filePath, 'utf8');

    // Find store name
    // Pattern: "siteAndDetails" or just search for site info
    let storeName = 'Unknown';
    const siteMatch = html.match(/class="siteAndDetails"[^>]*>([^<]+)/);
    if (siteMatch) storeName = siteMatch[1].trim();
    // Alternate: title tag
    if (storeName === 'Unknown') {
        const titleMatch = html.match(/<title>\s*(.*?)\s*<\/title>/s);
        if (titleMatch) storeName = titleMatch[1].trim();
    }

    log(`\n${'▓'.repeat(80)}`);
    log(`${label}: ${storeName}`);
    log(`File: ${filePath}`);
    log(`${'▓'.repeat(80)}`);

    // Find subChapter markers - these are the DETAILED sections
    // Pattern: <a class="subChapterName" ...>Section Name</a>
    // Followed by: subChapterGrade, subChapterWeight
    const scPositions = findAll(html, 'subChapterName');

    const sections = [];
    scPositions.forEach((pos, idx) => {
        // Extract name (between > and </a>)
        const closeA = html.indexOf('</a>', pos);
        const openTag = html.indexOf('>', pos);
        if (openTag === -1 || closeA === -1) return;

        const rawName = html.substring(openTag + 1, closeA).replace(/&amp;/g, '&').trim();
        if (!rawName || rawName.length < 3) return;

        // Extract Grade, Weight, Earned/Total from nearby text
        const nearBlock = html.substring(pos, pos + 500);
        const gradeMatch = nearBlock.match(/Grade\s*:?\s*([\d.]+)/);
        const weightMatch = nearBlock.match(/Weight\s+(\d+)\s*\((\d+)\/(\d+)\)/);

        if (!gradeMatch || !weightMatch) return; // Skip non-section anchors

        sections.push({
            name: rawName,
            grade: parseFloat(gradeMatch[1]),
            weight: parseInt(weightMatch[1]),
            earned: parseInt(weightMatch[2]),
            total: parseInt(weightMatch[3]),
            startPos: pos
        });
    });

    log(`Found ${sections.length} sections\n`);

    let totalEarned = 0, totalWeight = 0;

    sections.forEach((sec, si) => {
        const endPos = si < sections.length - 1 ? sections[si + 1].startPos : html.length;
        const block = html.substring(sec.startPos, endPos);

        // Extract items
        const items = [];
        let searchPos = 0;
        while (true) {
            const qStart = block.indexOf('dir="ltr"><b>', searchPos);
            if (qStart === -1) break;

            const qTextStart = qStart + 13;
            const qTextEnd = block.indexOf('</b>', qTextStart);
            if (qTextEnd === -1) break;

            const qText = block.substring(qTextStart, qTextEnd)
                .replace(/&amp;/g, '&')
                .replace(/&nbsp;/g, ' ')
                .replace(/<[^>]+>/g, '')
                .replace(/\s+/g, ' ')
                .trim();

            // Get the row context (up to next question or end of block)
            const nextQ = block.indexOf('dir="ltr"><b>', qTextEnd);
            const rowEnd = nextQ !== -1 ? nextQ : Math.min(qTextEnd + 1000, block.length);
            const rowHTML = block.substring(qStart, rowEnd);

            const scoreResult = getScore(rowHTML);
            items.push({ text: qText, ...scoreResult });

            searchPos = qTextEnd + 1;
        }

        // Calculate section score from items
        let yesCount = 0, noCount = 0, naCount = 0, textCount = 0;
        items.forEach(i => {
            if (i.type === 'YES' || i.type === 'MC-YES') yesCount++;
            else if (i.type === 'NO' || i.type === 'MC-NO') noCount++;
            else if (i.type === 'N/A') naCount++;
            else textCount++;
        });

        const scoredItems = yesCount + noCount;
        const calcGrade = scoredItems > 0 ? (yesCount / scoredItems * 100) : 0;
        const match = Math.abs(calcGrade - sec.grade) < 0.1;

        log(`── ${sec.name}`);
        log(`   Grade: ${sec.grade}% | Weight: ${sec.weight} | Earned: ${sec.earned}/${sec.total}`);
        log(`   Items: ${items.length} total (${yesCount} Yes, ${noCount} No, ${naCount} N/A, ${textCount} Text)`);
        log(`   Calc:  ${yesCount}/${scoredItems} = ${calcGrade.toFixed(2)}% → ${match ? '✅ MATCH' : '❌ MISMATCH'}`);

        if (!match) {
            log(`   ⚠️  DISCREPANCY: Calc ${calcGrade.toFixed(2)}% vs Morrigan ${sec.grade}%`);
            log(`   Items detail:`);
            items.forEach((i, idx) => {
                log(`     [${idx + 1}] ${i.type.padEnd(6)} ${i.text.substring(0, 55)}`);
            });
        }

        totalEarned += sec.earned;
        totalWeight += sec.total;
    });

    // Final Score verification
    log(`\n── FINAL SCORE`);
    log(`   Total Earned: ${totalEarned} / Total Weight: ${totalWeight}`);
    log(`   Calc Final = ${(totalEarned / totalWeight * 100).toFixed(2)}%`);

    // Also compute fractional
    let fracEarned = 0;
    sections.forEach(s => {
        fracEarned += (s.grade / 100) * s.weight;
    });
    log(`   Fractional Final = ${(fracEarned / totalWeight * 100).toFixed(2)}%`);
});

// Write output
fs.writeFileSync('compare_reports_output.txt', out.join('\n'));
console.log(`Done! ${out.length} lines written to compare_reports_output.txt`);
