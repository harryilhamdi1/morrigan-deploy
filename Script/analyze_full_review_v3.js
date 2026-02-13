const fs = require('fs');
const html = fs.readFileSync('Full review report.html', 'utf8');
const out = [];
function log(msg) { out.push(msg); }

// Find all subChapter blocks - they contain the actual questions
const subChapterPattern = /subChapterName[^>]*>([^<]+)<[\s\S]*?subChapterGrade[^>]*>\s*Grade\s*:\s*([\d.]+)[\s\S]*?subChapterWeight[^>]*>Weight\s+(\d+)\s+\((\d+)\/(\d+)\)/g;
let sMatch;
const subChapters = [];
while ((sMatch = subChapterPattern.exec(html)) !== null) {
    subChapters.push({
        name: sMatch[1].trim(),
        grade: parseFloat(sMatch[2]),
        weight: parseInt(sMatch[3]),
        earned: parseInt(sMatch[4]),
        total: parseInt(sMatch[5]),
        startPos: sMatch.index
    });
}

log(`Found ${subChapters.length} sub-chapters\n`);

// Extract items within each sub-chapter
for (let si = 0; si < subChapters.length; si++) {
    const sc = subChapters[si];
    const endPos = si < subChapters.length - 1 ? subChapters[si + 1].startPos : html.length;
    const block = html.substring(sc.startPos, endPos);

    log(`\n${'═'.repeat(80)}`);
    log(`${sc.name}`);
    log(`Grade: ${sc.grade} | Weight: ${sc.weight} | Earned: ${sc.earned}/${sc.total}`);
    log(`${'═'.repeat(80)}`);

    // Find all question+answer pairs
    // Question: <td ... dir="ltr"><b>question text</b>
    // Answer: answerValue ... (X/Y) Yes/No  OR  answerWithoutGrade (no score)
    const qPattern = /dir="ltr"><b>([^<]+)<\/b>[\s\S]*?(?:answerWith(Grade|outGrade))/g;
    let qm;
    let yesCount = 0, noCount = 0, naCount = 0;
    let itemIdx = 0;

    while ((qm = qPattern.exec(block)) !== null) {
        const qText = qm[1].trim();
        const hasGrade = qm[2] === 'Grade';

        // Get the answer value
        const afterQ = block.substring(qm.index, qm.index + 800);
        const answerMatch = afterQ.match(/answerValue[^>]*>([^<]+)/);
        const scoreMatch = afterQ.match(/answerWithGrade[^>]*>[\s\S]*?([\d.]+)\s*\n/);
        const gradeBarMatch = afterQ.match(/(■+)(□*)/);

        let answer = answerMatch ? answerMatch[1].trim() : '';
        let score = scoreMatch ? parseFloat(scoreMatch[1]) : null;
        let type = 'N/A';

        if (hasGrade && answer.includes('Yes')) { type = 'YES'; yesCount++; }
        else if (hasGrade && answer.includes('No')) { type = 'NO'; noCount++; }
        else if (answer.includes('N/A')) { type = 'N/A'; naCount++; }
        else if (!hasGrade) { type = 'TEXT'; }
        else { type = answer ? 'OTHER' : '???'; }

        itemIdx++;
        log(`  [${itemIdx.toString().padStart(2)}] ${type.padEnd(6)} | Score: ${(score !== null ? score.toFixed(0) : '-').padStart(4)} | ${qText.substring(0, 75)}`);
        if (type === 'OTHER') log(`       → Answer: "${answer.substring(0, 80)}"`);
    }

    log(`  ---`);
    log(`  Items: ${itemIdx} total (${yesCount} Yes, ${noCount} No, ${naCount} N/A)`);
    const simpleGrade = yesCount + noCount > 0 ? (yesCount / (yesCount + noCount) * 100).toFixed(2) : 'N/A';
    log(`  Simple calc: ${yesCount}/(${yesCount}+${noCount}) = ${simpleGrade}% vs Morrigan Grade: ${sc.grade.toFixed(2)}%`);

    if (simpleGrade !== 'N/A' && Math.abs(parseFloat(simpleGrade) - sc.grade) > 0.1) {
        log(`  ⚠️  MISMATCH!`);
    } else {
        log(`  ✅  MATCH`);
    }
}

// Final verification
log(`\n\n${'═'.repeat(80)}`);
log(`FINAL GRADE VERIFICATION`);
log(`${'═'.repeat(80)}`);
let totalEarned = 0, totalWeight = 0;
subChapters.forEach(sc => {
    totalEarned += sc.earned;
    totalWeight += sc.total; // total = weight in Morrigan
});
log(`Total Earned: ${totalEarned} / Total Weight: ${totalWeight}`);
log(`Calc Final = ${(totalEarned / totalWeight * 100).toFixed(2)}`);

// But wait - maybe the actual "earned" is fractional (non-integer) for some sections
// Let's compute earned_fractional = (grade/100) * weight
let totalEarnedFractional = 0;
subChapters.forEach(sc => {
    const fractEarned = (sc.grade / 100) * sc.weight;
    log(`  ${sc.name.substring(0, 40).padEnd(42)} | (${sc.grade}/100)*${sc.weight} = ${fractEarned.toFixed(4)}`);
    totalEarnedFractional += fractEarned;
});
log(`Total Earned (fractional): ${totalEarnedFractional.toFixed(4)}`);
log(`Calc Final (fractional) = ${(totalEarnedFractional / totalWeight * 100).toFixed(2)}`);

fs.writeFileSync('full_review_detailed.txt', out.join('\n'), 'utf8');
console.log(`Done! ${out.length} lines`);
