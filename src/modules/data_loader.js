const fs = require('fs').promises;
const path = require('path');
const { parse } = require('csv-parse/sync');

async function loadMasterData(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        const records = parse(content, { columns: true, delimiter: ';', skip_empty_lines: true, trim: true, bom: true });
        const masterMap = {};
        records.forEach(r => {
            if (r['Site Code']) {
                masterMap[r['Site Code']] = {
                    region: r['Region'] ? r['Region'].trim().toUpperCase() : 'UNKNOWN',
                    branch: r['Branch'] ? r['Branch'].trim().toUpperCase() : 'UNKNOWN',
                    siteName: r['Site Name'],
                    city: r['City']
                };
            }
        });
        return masterMap;
    } catch (err) {
        console.warn("Warning: Could not load Master Data from " + filePath);
        return {};
    }
}

function normalizeString(str) {
    if (!str) return 'UNKNOWN';
    return String(str).trim().toUpperCase();
}

async function loadSectionWeights(baseDir) {
    let weights = {};
    try {
        const weightPath = path.join(baseDir, 'CSV', 'Section Weight.csv');
        const content = await fs.readFile(weightPath, 'utf8');
        const records = parse(content, { columns: true, delimiter: ';', skip_empty_lines: true, trim: true, bom: true });
        records.forEach(r => {
            const vals = Object.values(r);
            const name = (vals[0] || '').trim();
            const weight = parseInt(vals[1]);
            if (name && weight) {
                const letterMatch = name.match(/([A-K])\./);
                if (letterMatch) weights[letterMatch[1]] = weight;
            }
        });
        // console.log('Loaded Section Weights:', weights);
    } catch (err) {
        console.error('Error loading Section Weights:', err.message);
    }
    return weights;
}

module.exports = { loadMasterData, loadSectionWeights, normalizeString };
