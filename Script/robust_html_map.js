const fs = require('fs');
const { parse } = require('csv-parse/sync');

// Load HTML
const htmlPath = 'Full review report.html';
const html = fs.readFileSync(htmlPath, 'utf8');

// Helper to find all occurrences
function findAll(str, pattern) {
    const indices = []; // Start indices
    let pos = str.indexOf(pattern);
    while (pos !== -1) {
        indices.push(pos);
        pos = str.indexOf(pattern, pos + 1);
    }
    return indices;
}

// Find Section Starts
const sectionStarts = findAll(html, 'subChapterName');
const sections = [];

sectionStarts.forEach((pos, i) => {
    // extract section name
    const endTag = html.indexOf('</a>', pos);
    const startTag = html.indexOf('>', pos) + 1;
    const name = html.substring(startTag, endTag).trim();

    // determine end of this section (start of next or end of file)
    const endPos = (i < sectionStarts.length - 1) ? sectionStarts[i + 1] : html.length;

    // Find questions in this block
    const questions = [];
    let qPos = html.indexOf('dir="ltr"><b>', pos);
    while (qPos !== -1 && qPos < endPos) {
        const qStart = qPos + 13; // length of dir="ltr"><b>
        const qEnd = html.indexOf('</b>', qStart);
        const qText = html.substring(qStart, qEnd).trim()
            .replace(/&amp;/g, '&')
            .replace(/\s+/g, ' ');

        questions.push(qText);
        qPos = html.indexOf('dir="ltr"><b>', qEnd);
    }

    sections.push({ name, questions });
});

// Load CSV Headers
const csvRaw = fs.readFileSync('CSV/Wave 3 2024.csv', 'utf8');
const csvRecords = parse(csvRaw, {
    delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true
});
const csvHeaders = Object.keys(csvRecords[0]);

// Output Mapping
console.log('=== HTML SECTION to CSV MAPPING ===');

sections.forEach(sec => {
    console.log(`\n--- ${sec.name} (${sec.questions.length} Qs) ---`);
    const codes = [];

    sec.questions.forEach(q => {
        // Try exact match first
        let match = csvHeaders.find(h => h.includes(q.substring(0, 30))); // First 30 chars usually unique enough

        // Special case for multi-line or long questions
        if (!match) {
            // Try searching keywords
            const keywords = q.split(' ').filter(w => w.length > 5).slice(0, 3);
            match = csvHeaders.find(h => keywords.every(kw => h.includes(kw)));
        }

        if (match) {
            const codeMatch = match.match(/\((\d{6})\)/);
            if (codeMatch) codes.push(parseInt(codeMatch[1]));
            // console.log(`  ✓ ${codeMatch?codeMatch[1]:'?'} : ${q.substring(0,40)}...`);
        } else {
            console.log(`  ❌ NOT FOUND: ${q.substring(0, 60)}...`);
        }
    });

    if (codes.length > 0) {
        // Sort and find min/max
        codes.sort((a, b) => a - b);
        console.log(`  MAPPED RANGE: ${codes[0]} - ${codes[codes.length - 1]} (Total ${codes.length})`);
        console.log(`  EXACT CODES: [${codes.join(', ')}]`);
    } else {
        console.log(`  ⚠️  NO CODES MAPPED`);
    }
});
