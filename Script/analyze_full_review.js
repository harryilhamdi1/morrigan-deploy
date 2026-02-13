const fs = require('fs');
const html = fs.readFileSync('Full review report.html', 'utf8');
const out = [];
function log(msg) { out.push(msg); }

// Extract final grade
const finalMatch = html.match(/Final grade:.*?<div.*?>([\d.]+)/s);
log(`FINAL GRADE: ${finalMatch ? finalMatch[1] : 'NOT FOUND'}`);

// Extract section names with their grades
const sectionPattern = /<a class="chapterNameLink"[^>]*>([^<]+)<\/a>.*?Weight (\d+).*?Grade ([\d.]+).*?\((\d+)\/(\d+)\)/gs;
let sMatch;
const sections = [];
while ((sMatch = sectionPattern.exec(html)) !== null) {
    sections.push({
        name: sMatch[1].trim(),
        weight: parseInt(sMatch[2]),
        grade: parseFloat(sMatch[3]),
        earned: parseInt(sMatch[4]),
        total: parseInt(sMatch[5])
    });
}

// Deduplicate (report shows them twice - summary and detail)
const uniqueSections = [];
const seen = new Set();
sections.forEach(s => {
    const key = s.name + s.grade;
    if (!seen.has(key)) { seen.add(key); uniqueSections.push(s); }
});

log(`\n=== SECTION SUMMARY ===`);
uniqueSections.forEach(s => {
    log(`${s.name.padEnd(55)} | Weight: ${s.weight.toString().padStart(2)} | Grade: ${s.grade.toFixed(2).padStart(6)} | Items: ${s.earned}/${s.total}`);
});

// Verify: is Grade = (earned/total) * 100?
log(`\n=== GRADE FORMULA VERIFICATION ===`);
uniqueSections.forEach(s => {
    const calcGrade = (s.earned / s.total) * 100;
    const match = Math.abs(calcGrade - s.grade) < 0.1;
    log(`${s.name.substring(0, 40).padEnd(42)} | ${s.earned}/${s.total} = ${calcGrade.toFixed(2)} vs Grade ${s.grade.toFixed(2)} ${match ? '✓' : 'MISMATCH!'}`);
});

// Key question: what is "total"? Does it = weight? Or is it the actual item count?
log(`\n=== DOES TOTAL = WEIGHT? ===`);
uniqueSections.forEach(s => {
    log(`${s.name.substring(0, 40).padEnd(42)} | Total: ${s.total.toString().padStart(2)} | Weight: ${s.weight.toString().padStart(2)} | ${s.total === s.weight ? 'SAME' : 'DIFFERENT (Δ=' + (s.total - s.weight) + ')'}`);
});

// Now extract ALL individual items from the detailed section
// Pattern: each item has a grade badge and text
// Look for "Calculated result:" which shows the item-level scoring
const calcResults = [...html.matchAll(/Calculated result:.*?Grade ([\d.]+)\s*\((\d+)\/(\d+)\)/gs)];
log(`\n=== ALL "Calculated result" ENTRIES (${calcResults.length} found) ===`);
calcResults.forEach((m, i) => {
    log(`  [${i + 1}] Grade ${m[1]} (${m[2]}/${m[3]})`);
});

// Extract question items - look for "questionTextContent" or answer patterns
// Let me look for Yes/No answers with their grade
const answerPattern = /class="answerGrade[^"]*"[^>]*>.*?Grade ([\d.]+).*?\((\d+)\/(\d+)\).*?<\/td>/gs;
const answers = [...html.matchAll(answerPattern)];
log(`\n=== INDIVIDUAL ANSWER GRADES (${answers.length} found) ===`);

// Better approach: find all grade instances in the report
const allGrades = [...html.matchAll(/Grade\s+([\d.]+)\s*<\/span>.*?\((\d+)\/(\d+)\)/gs)];
log(`\n=== ALL GRADES IN REPORT (${allGrades.length} instances) ===`);

// Let's look for the actual question items with Yes/No
const itemPattern = /<td[^>]*class="answerWithGrade"[^>]*>([\s\S]*?)<\/td>/g;
const items = [...html.matchAll(itemPattern)];
log(`\n=== ANSWER ITEMS WITH GRADE (${items.length} found) ===`);
items.forEach((m, i) => {
    // Clean HTML tags
    const clean = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 120);
    log(`  [${i + 1}] ${clean}`);
});

// Also look for "answerWithoutGrade" items
const noGradeItems = [...html.matchAll(/<td[^>]*class="answerWithoutGrade"[^>]*>([\s\S]*?)<\/td>/g)];
log(`\n=== ITEMS WITHOUT GRADE (${noGradeItems.length} found) ===`);
noGradeItems.forEach((m, i) => {
    const clean = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (clean.length > 5) log(`  [${i + 1}] ${clean.substring(0, 120)}`);
});

fs.writeFileSync('full_review_analysis.txt', out.join('\n'), 'utf8');
console.log(`Done! ${out.length} lines`);
