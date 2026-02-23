const https = require('https');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8').split('\n');
let SUPABASE_URL = '', SUPABASE_KEY = '';
env.forEach(line => {
    if (line.startsWith('SUPABASE_URL=')) SUPABASE_URL = line.substring(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '');
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) SUPABASE_KEY = line.substring(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '');
});

const get = (path) => new Promise((resolve, reject) => {
    try {
        const url = new URL(path, SUPABASE_URL);
        https.get(url, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve(JSON.parse(body)));
        }).on('error', err => reject(err));
    } catch (err) {
        reject(err);
    }
});

(async () => {
    try {
        const kpis = await get('/rest/v1/kpi_scores?select=*&wave_name=eq.Wave%202&wave_year=eq.2025');

        let allJourneys = [];
        let offset = 0;
        while (true) {
            const batch = await get('/rest/v1/journey_scores?select=*&limit=1000&offset=' + offset);
            allJourneys = allJourneys.concat(batch);
            if (batch.length < 1000) break;
            offset += 1000;
        }

        let criticalCount = 0;

        kpis.forEach(kpi => {
            const relatedJs = allJourneys.filter(js => js.kpi_score_id === kpi.id);
            const parsedSections = {};

            // Replicate app.js behavior precisely
            relatedJs.forEach(js => {
                const sec = js.section_name ? js.section_name.trim() : '';
                if (sec) parsedSections[sec] = js.score;
            });

            Object.values(parsedSections).forEach(v => {
                if (parseFloat(v) < 86) criticalCount++;
            });
        });

        console.log('App.js rendering simulation count (Wave 2 2025) < 86:', criticalCount);
    } catch (err) {
        console.error(err);
    }
})();
