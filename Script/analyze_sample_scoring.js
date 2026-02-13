const fs = require('fs');
const { parse } = require('csv-parse/sync');

const data = parse(fs.readFileSync('CSV/Sample Scoring.csv', 'utf8'), {
    delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true
});

const out = [];
out.push('Total Rows: ' + data.length);
out.push('Headers: ' + Object.keys(data[0]).join(' | '));
out.push('');

// Check for extra columns beyond the 5 known ones
const allKeys = Object.keys(data[0]);
out.push('All column names: ' + JSON.stringify(allKeys));
out.push('');

data.forEach((r, i) => {
    const order = r['Order'] || '';
    const code = r['Question code'] || '';
    const question = (r['Question'] || '').substring(0, 70);
    const answer = (r['Answer'] || '').substring(0, 40);
    const val = r['Answer val'] || '';

    // Check for any extra columns
    const extras = {};
    allKeys.forEach(k => {
        if (!['Order', 'Question code', 'Question', 'Answer', 'Answer val'].includes(k)) {
            if (r[k]) extras[k] = r[k];
        }
    });
    const extraStr = Object.keys(extras).length > 0 ? ' | EXTRA: ' + JSON.stringify(extras) : '';

    out.push(`[${order.padStart(3)}] (${code.padEnd(8)}) ${question.padEnd(72)} | ${answer.padEnd(42)} | Val: ${val}${extraStr}`);
});

fs.writeFileSync('sample_scoring_analysis.txt', out.join('\n'), 'utf8');
console.log('Done! ' + out.length + ' lines written.');
