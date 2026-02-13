const fs = require('fs');
const { parse } = require('csv-parse/sync');

const htmlPath = 'Full review report.html';
const html = fs.readFileSync(htmlPath, 'utf8');

const csvRaw = fs.readFileSync('CSV/Wave 3 2024.csv', 'utf8');
const records = parse(csvRaw, {
    delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true
});
const csvHeaders = Object.keys(records[0]);

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

    // Parse name like "A. Tampilan..."
    const match = name.match(/^([A-K])\./);
    const letter = match ? match[1] : 'Unknown';

    const endPos = (i < sectionStarts.length - 1) ? sectionStarts[i + 1] : html.length;

    // Extract questions
    const questions = [];
    let qPos = html.indexOf('dir="ltr"><b>', pos);
    while (qPos !== -1 && qPos < endPos) {
        const qStart = qPos + 13;
        const qEnd = html.indexOf('</b>', qStart);
        const qText = html.substring(qStart, qEnd).trim()
            .replace(/&amp;/g, '&').replace(/\s+/g, ' ');
        questions.push(qText);
        qPos = html.indexOf('dir="ltr"><b>', qEnd);
    }

    if (letter !== 'Unknown') {
        sections.push({ letter, questions });
    }
});

const mapping = {};
const debug = [];

sections.forEach(sec => {
    debug.push(`Section ${sec.letter}`);
    const codes = [];

    sec.questions.forEach(q => {
        // Try precise match (first 30 chars usually unique enough)
        const partial = q.substring(0, 30);
        let match = csvHeaders.find(h => h.includes(partial));

        if (!match) {
            // Try keyword match
            const words = q.split(' ').filter(w => w.length > 5);
            if (words.length >= 2) {
                match = csvHeaders.find(h => words.slice(0, 2).every(kw => h.includes(kw)));
            }
        }

        if (match) {
            const codeMatch = match.match(/\((\d{6})\)/);
            if (codeMatch) codes.push(parseInt(codeMatch[1]));
        } else {
            debug.push(`  Miss: ${q.substring(0, 40)}`);
        }
    });

    // Remove duplicates & Sort
    const cleanCodes = [...new Set(codes)].sort((a, b) => a - b);
    mapping[sec.letter] = cleanCodes;
    debug.push(`  Mapped: ${cleanCodes.join(', ')}`);
});

fs.writeFileSync('mapping.json', JSON.stringify(mapping, null, 2));
fs.writeFileSync('map_debug.txt', debug.join('\n'));
console.log('Mapping done.');
