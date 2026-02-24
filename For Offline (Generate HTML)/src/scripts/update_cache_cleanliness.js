const fs = require('fs');
const path = require('path');

const CACHE_PATH = path.join(__dirname, '../cache/voc_ai_cache.json');

// New Category Definition
const CLEANLINESS_KEYWORDS = ['bersih', 'kotor', 'rapi', 'berantakan', 'toilet', 'wc', 'kamar mandi', 'kebersihan', 'sampah', 'bau', 'wangi', 'debu', 'higienis'];

function run() {
    console.log("🚀 Starting Bulk Re-Categorization for 'Cleanliness' (Key-Based)...");

    if (!fs.existsSync(CACHE_PATH)) {
        console.error("❌ Cache file not found at:", CACHE_PATH);
        return;
    }

    const raw = fs.readFileSync(CACHE_PATH, 'utf8');
    const cache = JSON.parse(raw);
    const keys = Object.keys(cache);
    console.log(`📦 Loaded ${keys.length} items from cache.`);

    let updatedCount = 0;

    keys.forEach(key => {
        // use the KEY as the text source, or item.text if available
        const item = cache[key];
        const textSource = (item.text || key).toString().toLowerCase();

        const isCleanliness = CLEANLINESS_KEYWORDS.some(k => textSource.includes(k));

        if (isCleanliness) {
            const currentCat = item.category || (item.themes && item.themes[0]);

            // Check if we need to update (avoid overwriting if already correct, though unlikely)
            if (currentCat !== 'Cleanliness') {
                // UPDATE IT
                item.category = 'Cleanliness';

                // Update Themes Array
                if (item.themes && Array.isArray(item.themes)) {
                    // Remove 'Cleanliness' if it exists to avoid dupes, remove 'Ambience' to replace it
                    const otherThemes = item.themes.filter(t => t !== 'Cleanliness' && t !== 'Ambience');
                    item.themes = ['Cleanliness', ...otherThemes];
                } else {
                    item.themes = ['Cleanliness'];
                }

                updatedCount++;
            }
        }
    });

    console.log(`✨ Updated ${updatedCount} items to 'Cleanliness' category.`);

    if (updatedCount > 0) {
        fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf8');
        console.log("💾 Cache saved successfully!");
    } else {
        console.log("No changes needed.");
    }
}

run();
