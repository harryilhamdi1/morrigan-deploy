const { THRESHOLD_SCORE } = require('../config/scoring');

function buildHierarchy(allStoreData, waves) {
    const hierarchy = { all: {}, regions: {}, branches: {}, stores: {} };

    // VoC Filter Config
    const latestWaveConfig = waves[waves.length - 1];
    const latestWaveKeyForCheck = `${latestWaveConfig.year} ${latestWaveConfig.name}`;
    const allQualitative = [];

    allStoreData.forEach(entry => {
        const waveKey = `${entry.year} ${entry.wave}`;

        // Collect VOC Data for Latest Wave
        if (waveKey === latestWaveKeyForCheck && entry.qualitative && entry.qualitative.length > 0) {
            allQualitative.push(...entry.qualitative);
        }

        // Initialize Store Node
        if (!hierarchy.stores[entry.siteCode]) {
            hierarchy.stores[entry.siteCode] = {
                meta: { name: entry.siteName, region: entry.region, branch: entry.branch, code: entry.siteCode },
                results: {}
            };
        }

        // Add Result to Store
        hierarchy.stores[entry.siteCode].results[waveKey] = {
            sections: entry.sections,
            qualitative: entry.qualitative,
            totalScore: entry.totalScore,
            failedItems: entry.failedItems || []
        };

        // Aggregation Helper
        const addToHierarchy = (levelObj, record) => {
            if (!levelObj[waveKey]) levelObj[waveKey] = { sum: 0, count: 0, sections: {} };
            levelObj[waveKey].sum += record.totalScore;
            levelObj[waveKey].count++;

            Object.entries(record.sections).forEach(([secName, val]) => {
                if (!levelObj[waveKey].sections[secName]) levelObj[waveKey].sections[secName] = { sum: 0, count: 0, critical: 0 };
                levelObj[waveKey].sections[secName].sum += val;
                levelObj[waveKey].sections[secName].count++;
                if (val < THRESHOLD_SCORE) levelObj[waveKey].sections[secName].critical++;
            });
        };

        addToHierarchy(hierarchy.all, entry);
        if (!hierarchy.regions[entry.region]) hierarchy.regions[entry.region] = {};
        addToHierarchy(hierarchy.regions[entry.region], entry);
        if (!hierarchy.branches[entry.branch]) hierarchy.branches[entry.branch] = {};
        addToHierarchy(hierarchy.branches[entry.branch], entry);
    });

    return { hierarchy, allQualitative };
}

module.exports = { buildHierarchy };
