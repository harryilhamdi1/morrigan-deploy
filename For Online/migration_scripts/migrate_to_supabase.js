require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// 1. Core modules (same as build.js)
const WAVES = require('./config/waves');
const { loadMasterData, loadSectionWeights, loadLigaData } = require('./modules/data_loader');
const { processWave } = require('./modules/scorer');
const { buildHierarchy } = require('./modules/aggregator');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ ERR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const BASE_DIR = path.resolve(__dirname, '..');

// Helper to normalize qualitative topics
function normalizeVocTopics(fb) {
    if (!fb || !fb.themes) return [];
    return fb.themes;
}

// Server-side adaptation of action plan generation
function generateServerStoreActionPlan(storeObj, currentWaveKey, nationalSummary, feedbackData) {
    const res = storeObj.results ? storeObj.results[currentWaveKey] : null;
    let actions = [];

    // --- RISING STAR PROTOCOL (Unassessed/Blank Stores) ---
    if (!res || !res.sections) {
        return [
            { type: 'Baseline (Rising Star)', source: '(Section A) Tampilan Tampak Depan Outlet', action: 'Lakukan Pengecekan Harian (Grooming Area): Pastikan kebersihan fasad, area parkir, kaca depan, dan Signage toko menyala sempurna sebelum opening.', status: 'pending' },
            { type: 'Baseline (Rising Star)', source: '(Section B) Sambutan Hangat Ketika Masuk', action: 'Roleplay Interaksi Awal: Latih Retail Assistant untuk stand by dengan postur sempurna (Senyum 1 Jari, Tangan Kanan di Dada Kiri) menyambut setiap pelanggan.', status: 'pending' },
            { type: 'Baseline (Rising Star)', source: '(Section C) Suasana & Kenyamanan Outlet', action: 'Inspeksi Suasana: Pastikan temperatur AC sejuk, musik Eiger standar berputar, ruangan wangi, dan penerangan produk maksimal.', status: 'pending' },
            { type: 'Baseline (Rising Star)', source: '(Section D) Kerapihan & Ketersediaan Produk', action: 'Visual Merchandising Rutin: Lakukan perapihan display sesuai SOP planogram. Pastikan tidak ada space kosong dan ukuran produk terurut rapi.', status: 'pending' },
            { type: 'Baseline (Rising Star)', source: '(Section E) Pengetahuan Produk & Kebutuhan Pelanggan', action: 'Product Knowledge Briefing: Wajibkan briefing 10 menit setiap pagi untuk mengulas 1 jenis teknologi produk unggulan kepada seluruh staff.', status: 'pending' },
            { type: 'Baseline (Rising Star)', source: '(Section F) Penawaran Produk Lengkap', action: 'Simulasi Cross-Selling: Latih skenario di mana staff menawarkan produk pelengkap (add-on) saat melayani pelanggan di area display.', status: 'pending' },
            { type: 'Baseline (Rising Star)', source: '(Section G) Ketersediaan Ruang Pas (Fitting Room)', action: 'Kebersihan Fitting Room: Jadwalkan pengecekan setiap 2 jam untuk memastikan fitting room bersih dari barang tertinggal dan cermin selalu bersih.', status: 'pending' },
            { type: 'Baseline (Rising Star)', source: '(Section I) Pengantaran ke Kasir', action: 'SOP Kasir Antar: Terapkan budaya staff mengantarkan keranjang pelanggan langsung ke meja kasir dan menyerahkan ke kasir secara profesional.', status: 'pending' },
            { type: 'Baseline (Rising Star)', source: '(Section J) Layanan Transaksi & Benefit Member', action: 'Promosi EDU Member: Pastikan Kasir selalu proaktif menjelaskan secara lisan keuntungan tergabung dalam Eiger Adventure Club (EAC) saat kalkulasi belanja.', status: 'pending' },
            { type: 'Baseline (Rising Star)', source: '(Section L) Perpisahan yang Berkesan', action: 'Salam Hangat Terakhir: Kasir dan Security wajib memberikan ucapan terima kasih dengan gesture tangan di dada saat pelanggan keluar toko.', status: 'pending' }
        ];
    }

    // 1. EXTRACT ALL QUANTITATIVE ITEMS
    let quantGaps = [];
    if (res.sections && nationalSummary && nationalSummary[currentWaveKey] && nationalSummary[currentWaveKey].sections) {
        const natSections = nationalSummary[currentWaveKey].sections;
        for (const [sec, val] of Object.entries(res.sections)) {
            const natVal = natSections[sec] ? (natSections[sec].sum / natSections[sec].count) : val;
            const gap = val - natVal;
            quantGaps.push({ section: sec, score: val, gap: gap });
        }
    }

    // 2. EXTRACT QUALITATIVE (Themes) - strictly for the current wave
    let negThemesArr = [];
    if (feedbackData && feedbackData.length > 0) {
        const negativeFb = feedbackData.filter(f => f.siteCode === storeObj.meta.code && f.wave === currentWaveKey.split(' ')[1] && f.sentiment === 'negative');
        if (negativeFb.length > 0) {
            let negThemes = {};
            negativeFb.forEach(f => {
                let topics = normalizeVocTopics(f);
                topics.forEach(t => {
                    if (!negThemes[t]) negThemes[t] = { count: 0, examples: [], insights: [] };
                    negThemes[t].count++;
                    if (negThemes[t].examples.length < 3) negThemes[t].examples.push(f.text);
                    if (f.aiInsight && f.aiInsight !== 'N/A') negThemes[t].insights.push(f.aiInsight);
                });
            });
            negThemesArr = Object.entries(negThemes).sort((a, b) => b[1].count - a[1].count);
        }
    }

    // A. Priority 1: Critical Quantitative Gaps (Gap < -2.0)
    const negativeGaps = quantGaps.filter(q => q.gap < -2.0).sort((a, b) => a.gap - b.gap);
    negativeGaps.forEach(issue => {
        actions.push({
            type: 'Evaluasi Kuantitatif',
            source: `${issue.section} (Skor: ${issue.score.toFixed(1)}, Gap vs Nat: ${issue.gap.toFixed(1)})`,
            action: `Fokus pada standardisasi prosedur untuk area ${issue.section}. Lakukan tinjauan ulang panduan operasional nasional bersama tim untuk menutup jarak performa yang kritis ini.`,
            status: 'pending'
        });
    });

    // B. Priority 2: Top Qualitative Complaints
    let themesToAdd = negThemesArr.filter(t => t[1].count >= 2);
    if (themesToAdd.length === 0 && negThemesArr.length > 0) themesToAdd = negThemesArr.slice(0, 3);

    themesToAdd.forEach(theme => {
        let referenceText = '';
        if (theme[1].insights && theme[1].insights.length > 0) {
            referenceText = `Analisa AI: "${theme[1].insights[0]}"`;
        } else {
            const rawText = theme[1].examples[0];
            referenceText = `Contoh: "${rawText.length > 150 ? rawText.substring(0, 150) + '...' : rawText}"`;
        }
        actions.push({
            type: 'Suara Pelanggan (VOC)',
            source: `Keluhan Berulang: ${theme[0]} (${theme[1].count} penyebutan)`,
            action: `Tangani keluhan berulang mengenai ${theme[0]}. Perhatikan hal ini: ${referenceText}. Diskusikan segera dengan tim untuk evaluasi dan mencegah kejadian serupa.`,
            status: 'pending'
        });
    });

    // C. Priority 3: Pareto Items (Lowest Absolute Scores)
    const lowestScores = [...quantGaps].filter(q => q.score < 100).sort((a, b) => a.score - b.score).slice(0, 3);
    lowestScores.forEach(issue => {
        const alreadyAdded = actions.find(a => a.source && a.source.includes(issue.section));
        if (!alreadyAdded) {
            actions.push({
                type: 'Optimalisasi (Pareto)',
                source: `${issue.section} (Skor: ${issue.score.toFixed(1)})`,
                action: `Walaupun performa secara fungsional sudah baik, ${issue.section} adalah salah satu area dengan skor terbawah di toko ini. Terapkan roleplay atau evaluasi singkat untuk mendorong skor ini lebih mendekati nilai sempurna.`,
                status: 'pending'
            });
        }
    });

    // D. FALLBACK/GENERAL ADVICE
    const genericAdvice = [
        "Pertahankan tren positif yang ada saat ini. Lanjutkan sesi briefing reguler secara rutin dan berikan apresiasi kepada staf yang berprestasi untuk menjaga konsistensi toko.",
        "Lakukan sinkronisasi selama 10 menit setiap hari sebelum toko buka untuk menyelaraskan target pelayanan pelanggan hari ini.",
        "Minta tim untuk meninjau kembali modul product knowledge terbaru agar lebih percaya diri saat menangani pertanyaan seputar produk."
    ];

    let genericIndex = 0;
    while (actions.length < 3 && genericIndex < genericAdvice.length) {
        actions.push({
            type: 'Saran Best Practice',
            source: 'Perawatan Berkala Toko',
            action: genericAdvice[genericIndex],
            status: 'pending'
        });
        genericIndex++;
    }

    return actions;
}

async function runMigration() {
    console.log("🚀 Starting Data Migration to Supabase...");

    // 1. Gather Data (Identical to build.js Process)
    console.log("   Loading Master Data & Processing Waves...");
    const masterMap = await loadMasterData(path.join(BASE_DIR, 'CSV', 'Master Site Morrigan.csv'));
    const sectionWeights = await loadSectionWeights(BASE_DIR);
    const ligaMap = await loadLigaData(path.join(BASE_DIR, 'CSV', 'CSE Analysis - Liga ESS.csv'));

    let allStoreData = [];
    for (const wave of WAVES) {
        const filePath = path.join(BASE_DIR, 'CSV', wave.file);
        try {
            const waveData = await processWave(filePath, wave.name, wave.year, masterMap, sectionWeights, ligaMap);
            allStoreData = allStoreData.concat(waveData);
        } catch (err) {
            console.error(`❌ Error parsing ${wave.file}:`, err.message);
        }
    }

    console.log("   Building Hierarchy...");
    const { hierarchy, allQualitative } = buildHierarchy(allStoreData, WAVES);

    // Inject Unassessed Stores (Rising Stars)
    Object.keys(masterMap).forEach(siteCode => {
        if (!siteCode.startsWith('9') && !hierarchy.stores[siteCode]) {
            const m = masterMap[siteCode];
            hierarchy.stores[siteCode] = {
                meta: { name: m.siteName || ("Store " + siteCode), region: m.region || "UNKNOWN", branch: m.branch || "UNKNOWN", code: siteCode, liga: ligaMap?.[siteCode] || null },
                results: {}
            };
        }
    });

    const storeCodes = Object.keys(hierarchy.stores);
    console.log(`   Found ${storeCodes.length} Total Stores.`);

    let kpiCount = 0;
    let actionCount = 0;

    // 2. Migrate Store by Store
    for (const siteCode of storeCodes) {
        const st = hierarchy.stores[siteCode];

        // Let's normalize name just in case
        const sName = st.meta.name.trim();

        // A. Create/Find Store Entry
        const { data: storeRow, error: storeErr } = await supabaseAdmin.from('stores').upsert({
            site_code: st.meta.code,
            store_name: sName,
            region: st.meta.region,
            branch: st.meta.branch,
            liga: st.meta.liga ? st.meta.liga.tier_2025 : null
        }, { onConflict: 'site_code' }).select('id').single();

        if (storeErr) {
            console.error(`❌ Store Upsert Error (${sName}):`, storeErr.message);
            continue;
        }

        const storeId = storeRow.id;

        // B. Insert Waves (KPI & Journey Scores)
        const waveKeys = Object.keys(st.results);
        for (const wk of waveKeys) {
            const wData = st.results[wk];
            const [wYearStr, ...wNameArr] = wk.split(' ');
            const wName = wNameArr.join(' ');
            const wYear = parseInt(wYearStr, 10);

            // Insert KPI
            const { data: kpiRow, error: kpiErr } = await supabaseAdmin.from('kpi_scores').upsert({
                store_id: storeId,
                wave_name: wName,
                wave_year: wYear,
                score: wData.totalScore
            }, { onConflict: 'store_id, wave_name, wave_year' }).select('id').single();

            if (kpiErr) {
                console.error(`   ❌ KPI Upsert Error (${sName} - ${wk}):`, kpiErr.message);
                continue;
            }
            kpiCount++;

            // Insert Journey Sections (A-L)
            const journeyInserts = [];
            for (const [secName, secScore] of Object.entries(wData.sections)) {
                const secLetter = secName.split('.')[0]; // "A. Tampilan" -> "A"
                journeyInserts.push({
                    kpi_score_id: kpiRow.id,
                    section_name: secName,
                    section_letter: secLetter,
                    score: secScore
                });
            }

            if (journeyInserts.length > 0) {
                const { error: journeyErr } = await supabaseAdmin.from('journey_scores').upsert(
                    journeyInserts, { onConflict: 'kpi_score_id, section_letter' }
                );
                if (journeyErr) console.error(`   ❌ Journey Upsert Error (${sName}):`, journeyErr.message);
            }

            // Insert Granular Scores
            const granularInserts = [];
            if (wData.details) {
                for (const [secLetter, items] of Object.entries(wData.details)) {
                    for (const [itemCode, itemObj] of Object.entries(items)) {
                        granularInserts.push({
                            kpi_score_id: kpiRow.id,
                            section_letter: secLetter,
                            item_code: itemCode,
                            item_name: itemObj.t,
                            score: itemObj.r,
                            failed_reason: itemObj.reason || null
                        });
                    }
                }
            }
            if (granularInserts.length > 0) {
                const { error: gErr } = await supabaseAdmin.from('granular_scores').upsert(
                    granularInserts, { onConflict: 'kpi_score_id, item_code' }
                );
                if (gErr) console.error(`   ❌ Granular Score Upsert Error (${sName}):`, gErr.message);
            }

            // Insert Qualitative Feedback
            if (wData.qualitative && wData.qualitative.length > 0) {
                await supabaseAdmin.from('qualitative_feedback').delete().eq('kpi_score_id', kpiRow.id);
                const qualInserts = wData.qualitative.map(q => ({
                    kpi_score_id: kpiRow.id,
                    feedback_text: q.text,
                    sentiment: q.sentiment,
                    category: q.category,
                    themes: q.themes || [],
                    staff_name: q.staffName || null,
                    source_column: q.sourceColumn || null
                }));
                const { error: qErr } = await supabaseAdmin.from('qualitative_feedback').insert(qualInserts);
                if (qErr) console.error(`   ❌ Qualitative Feedback Insert Error (${sName}):`, qErr.message);
            }

            // Insert Dialogue
            if (wData.dialogue && (wData.dialogue.customerQuestion || wData.dialogue.raAnswer || wData.dialogue.memberBenefits)) {
                const { error: dErr } = await supabaseAdmin.from('dialogues').upsert({
                    kpi_score_id: kpiRow.id,
                    customer_question: wData.dialogue.customerQuestion || null,
                    ra_answer: wData.dialogue.raAnswer || null,
                    member_benefits: wData.dialogue.memberBenefits || null
                }, { onConflict: 'kpi_score_id' });
                if (dErr) console.error(`   ❌ Dialogue Upsert Error (${sName}):`, dErr.message);
            }
        }

        // C. Generate & Insert Action Plans (Using latest wave logic)
        // Find latest wave
        let currentWave = 'Unknown Wave';
        if (waveKeys.length > 0) {
            currentWave = waveKeys.sort().reverse()[0];
        } else if (WAVES.length > 0) {
            currentWave = `${WAVES[WAVES.length - 1].year} ${WAVES[WAVES.length - 1].name}`;
        }

        const generatedPlans = generateServerStoreActionPlan(st, currentWave, hierarchy.all, allQualitative);

        let weekCounter = 1;
        for (const plan of generatedPlans) {
            const categoryLabel = plan.type.split(' (')[0];

            // 1. Insert Action Plan
            const { data: apRow, error: apErr } = await supabaseAdmin.from('action_plans').insert({
                store_id: storeId,
                category: categoryLabel,
                finding_source: plan.source,
                action_required: plan.action,
                timeline_week: weekCounter <= 4 ? weekCounter : 4,
                status: 'pending'
            }).select('id').single();

            if (!apErr && apRow) {
                actionCount++;
                weekCounter++;
                // 2. Initialize blank Approvals row for this plan
                await supabaseAdmin.from('approvals').insert({ action_plan_id: apRow.id });
            }
        }

        console.log(`✅ Processed [${sName}] - Waves: ${waveKeys.length}, Plans: ${generatedPlans.length}`);
    }

    console.log("\n🎉 DATA MIGRATION COMPLETE!");
    console.log(`📊 Migrated ${kpiCount} wave scorecards and ${actionCount} distinct action plans.`);
}

runMigration().catch(console.error);
