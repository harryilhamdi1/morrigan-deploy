const fs = require('fs');
const { parse } = require('csv-parse/sync');

// Load HTML
const htmlPath = 'Full review report.html';
const html = fs.readFileSync(htmlPath, 'utf8');

// Load CSV Headers
const csvRaw = fs.readFileSync('CSV/Wave 3 2024.csv', 'utf8');
const csvRecords = parse(csvRaw, {
    delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true
});
const csvHeaders = Object.keys(csvRecords[0]);

// Helper to find all sections
function findAll(str, pattern) {
    const indices = [];
    let pos = str.indexOf(pattern);
    while (pos !== -1) {
        indices.push(pos);
        pos = str.indexOf(pattern, pos + 1);
    }
    return indices;
}

const sectionStarts = findAll(html, 'subChapterName');
const sections = [];

sectionStarts.forEach((pos, i) => {
    const endTag = html.indexOf('</a>', pos);
    const startTag = html.indexOf('>', pos) + 1;
    const name = html.substring(startTag, endTag).trim();

    // Convert full name to letter (e.g., "A. Tampilan..." -> "A")
    const letterMatch = name.match(/^([A-K])\./);
    const letter = letterMatch ? letterMatch[1] : 'Unknown';

    const endPos = (i < sectionStarts.length - 1) ? sectionStarts[i + 1] : html.length;

    const questions = [];
    let qPos = html.indexOf('dir="ltr"><b>', pos);
    while (qPos !== -1 && qPos < endPos) {
        const qStart = qPos + 13;
        const qEnd = html.indexOf('</b>', qStart);
        const qText = html.substring(qStart, qEnd).trim()
            .replace(/&amp;/g, '&')
            .replace(/\s+/g, ' ');

        questions.push(qText);
        qPos = html.indexOf('dir="ltr"><b>', qEnd);
    }

    if (letter !== 'Unknown') {
        sections.push({ letter, name, questions });
    }
});

const finalMap = {};
const debugLog = [];

sections.forEach(sec => {
    debugLog.push(`Processing Section ${sec.letter}`);
    const codes = [];

    sec.questions.forEach(q => {
        // Search Strategy
        // 1. Exact substring match (first 40 chars)
        const partial = q.substring(0, 40);
        let match = csvHeaders.find(h => h.includes(partial));

        // 2. Fallback: Keyword match (3 longest words)
        if (!match) {
            const words = q.split(' ').filter(w => w.length > 5).sort((a, b) => b.length - a.length);
            if (words.length >= 2) {
                const keywords = words.slice(0, 2);
                match = csvHeaders.find(h => keywords.every(kw => h.includes(kw)));
            }
        }

        if (match) {
            const codeMatch = match.match(/\((\d{6})\)/);
            if (codeMatch) {
                codes.push(parseInt(codeMatch[1]));
            }
        } else {
            debugLog.push(`  Missing: ${q.substring(0, 50)}`);
        }
    });

    // Remove duplicates and sort
    const uniqueCodes = [...new Set(codes)].sort((a, b) => a - b);
    finalMap[sec.letter] = uniqueCodes;
    debugLog.push(`  Mapped ${uniqueCodes.length} items: [${uniqueCodes.join(', ')}]`);
});

fs.writeFileSync('mapping.json', JSON.stringify(finalMap, null, 2));
fs.writeFileSync('map_debug.txt', debugLog.join('\n'));
console.log('Mapping generated to mapping.json');
