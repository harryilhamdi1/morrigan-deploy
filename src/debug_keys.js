const fs = require('fs');
const path = require('path');
const WAVES = require('./config/waves');
const { loadMasterData, loadSectionWeights } = require('./modules/data_loader');
const { processWave } = require('./modules/scorer');

const CACHE_PATH = path.join(__dirname, 'cache/voc_ai_cache.json');
const BASE_DIR = __dirname;

function normalizeKey(text) {
    if (!text) return "";
    return text.toString()
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

async function run() {
    const raw = fs.readFileSync(CACHE_PATH, 'utf8');
    const cache = JSON.parse(raw);
    const keys = Object.keys(cache);

    console.log("=== CACHE KEYS (First 5) ===");
    keys.slice(0, 5).forEach(k => console.log(`"${k}"`));

    console.log("\n=== CSV GENERATED KEYS (First 5) ===");
    const masterMap = await loadMasterData(path.join(BASE_DIR, 'CSV', 'Master Site Morrigan.csv'));
    const sectionWeights = await loadSectionWeights(BASE_DIR);

    const wave = WAVES[0];
    const waveData = await processWave(path.join(BASE_DIR, 'CSV', wave.file), wave.name, wave.year, masterMap, sectionWeights);

    let count = 0;
    for (const entry of waveData) {
        if (entry.qualitative) {
            for (const q of entry.qualitative) {
                if (count < 5) {
                    console.log(`Text: "${q.text.substring(0, 30)}..." -> Key: "${normalizeKey(q.text).substring(0, 30)}..."`);
                    count++;
                }
            }
        }
    }
}

run();
