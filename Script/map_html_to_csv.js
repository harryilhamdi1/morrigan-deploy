const fs = require('fs');
const { parse } = require('csv-parse/sync');

// Load HTML Items (from previous extraction logic)
const html = fs.readFileSync('Full review report.html', 'utf8');
const subChapterPattern = /subChapterName[^>]*>([^<]+)<[\s\S]*?subChapterGrade[^>]*>\s*Grade\s*([\d.]+)[\s\S]*?subChapterWeight[^>]*>Weight\s+(\d+)\s*\(\d+\/\d+\)/g;
let sMatch;
const sections = [];
while ((sMatch = subChapterPattern.exec(html)) !== null) {
    sections.push({
        name: sMatch[1].trim(),
        startPos: sMatch.index
    });
}

// Prepare HTML Questions List
const htmlQuestions = [];
for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const endPos = i < sections.length - 1 ? sections[i + 1].startPos : html.length;
    const block = html.substring(sec.startPos, endPos);

    const qPattern = /dir="ltr"><b>([^<]+)<\/b>/g;
    let qm;
    while ((qm = qPattern.exec(block)) !== null) {
        let qText = qm[1].trim()
            .replace(/&amp;/g, '&')
            .replace(/\s+/g, ' '); // Normalize spaces
        htmlQuestions.push({ section: sec.name, text: qText });
    }
}

// Load CSV Headers
const csvRaw = fs.readFileSync('CSV/Wave 3 2024.csv', 'utf8');
const csvRecords = parse(csvRaw, {
    delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true
});
const csvHeaders = Object.keys(csvRecords[0]);

// Perform Mapping
console.log('=== MAPPING HTML QUESTIONS TO CSV COLUMNS ===');
const mapping = [];
const missing = [];

htmlQuestions.forEach(q => {
    // Find matching header
    // Strategy: Look for the text inside the header
    // Exact match often fails due to spaces/formatting. Use substring or similarity.
    const match = csvHeaders.find(h => {
        const cleanH = h.replace(/\(\d+\)\s*/, '').trim().replace(/\s+/g, ' ');
        return cleanH.includes(q.text) || q.text.includes(cleanH);
        // Maybe try simple inclusion is risky? 
        // Let's try exact substring match of a significant chunk
    });

    if (match) {
        const codeMatch = match.match(/\((\d{6})\)/);
        const code = codeMatch ? codeMatch[1] : '???';
        mapping.push({
            section: q.section,
            htmlText: q.text.substring(0, 50),
            csvCode: code,
            csvHeader: match
        });
        // console.log(`✓ [${q.section}] ${code} : ${q.text.substring(0,40)}...`);
    } else {
        missing.push(q);
        // Try fuzzier search?
        // Let's try matching the first 20 chars
        const fuzzyMatch = csvHeaders.find(h => h.includes(q.text.substring(0, 20)));
        if (fuzzyMatch) {
            const codeMatch = fuzzyMatch.match(/\((\d{6})\)/);
            mapping.push({
                section: q.section,
                htmlText: q.text.substring(0, 50),
                csvCode: codeMatch ? codeMatch[1] : '???',
                csvHeader: fuzzyMatch,
                note: 'Fuzzy Match'
            });
            // console.log(`~ [${q.section}] ${codeMatch?codeMatch[1]:'?'} : ${q.text.substring(0,40)}...`);
        } else {
            // console.log(`❌ [${q.section}] NOT FOUND: ${q.text.substring(0,60)}...`);
        }
    }
});

// Output Mapping Table
console.log(`Mapped: ${mapping.length} / ${htmlQuestions.length} questions`);

// Group by section and print codes
const sectionCodes = {};
mapping.forEach(m => {
    if (!sectionCodes[m.section]) sectionCodes[m.section] = [];
    sectionCodes[m.section].push(m.csvCode);
});

Object.keys(sectionCodes).forEach(sec => {
    const codes = sectionCodes[sec].sort();
    console.log(`\nSection: ${sec}`);
    console.log(`  Codes: ${codes.join(', ')}`);
});

if (missing.length > 0) {
    console.log(`\n=== MISSING QUESTIONS (${missing.length}) ===`);
    missing.forEach(m => console.log(`  [${m.section}] ${m.text}`));
}
