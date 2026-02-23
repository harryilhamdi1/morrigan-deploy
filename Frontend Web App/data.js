
// --- NEW FIX: DYNAMIC ACTION PLAN EXTRACTOR ---

function generateStoreActionPlan(storeData, currentWaveKey, feedbackData) {
    const res = storeData.results[currentWaveKey];

    if (!res) {
        return null; // Return null instead of manipulating DOM
    }

    const planData = {
        storeName: storeData.meta.name,
        wave: currentWaveKey,
        generatedAt: new Date().toLocaleDateString('en-GB'),
        actions: []
    };

    // 1. EXTRACT ALL QUANTITATIVE ITEMS
    let quantGaps = [];
    if (res.sections && reportData.summary && reportData.summary[currentWaveKey] && reportData.summary[currentWaveKey].sections) {
        const natSections = reportData.summary[currentWaveKey].sections;
        for (const [sec, val] of Object.entries(res.sections)) {
            const natVal = natSections[sec] ? (natSections[sec].sum / natSections[sec].count) : val;
            const gap = val - natVal;
            quantGaps.push({ section: sec, score: val, gap: gap });
        }
    }

    // 2. EXTRACT QUALITATIVE (Themes) - strictly for the current wave
    let negThemesArr = [];
    if (feedbackData && feedbackData.length > 0) {
        // Filter feedback by current wave AND negative sentiment
        const negativeFb = feedbackData.filter(f => f.wave === currentWaveKey && f.sentiment === 'negative');
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

    // 3. COMPILE ACTION PLAN (Maximized, No Hard Limit)

    // A. Priority 1: Critical Quantitative Gaps (Gap < 0)
    const negativeGaps = quantGaps.filter(q => q.gap < -2.0).sort((a, b) => a.gap - b.gap); // Focus on significant gaps
    negativeGaps.forEach(issue => {
        planData.actions.push({
            type: 'Evaluasi Kuantitatif',
            source: `${issue.section} (Skor: ${issue.score.toFixed(1)}, Gap vs Nat: ${issue.gap.toFixed(1)})`,
            action: `Fokus pada standardisasi prosedur untuk area ${issue.section}. Lakukan tinjauan ulang panduan operasional nasional bersama tim untuk menutup jarak performa yang kritis ini.`,
            status: 'pending'
        });
    });

    // B. Priority 2: Top Qualitative Complaints (Themes with >= 2 mentions, or top 3 if fewer)
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

        planData.actions.push({
            type: 'Suara Pelanggan (VOC)',
            source: `Keluhan Berulang: ${theme[0]} (${theme[1].count} penyebutan)`,
            action: `Tangani keluhan berulang mengenai ${theme[0]}. Perhatikan hal ini: ${referenceText}. Diskusikan segera dengan tim untuk evaluasi dan mencegah kejadian serupa.`,
            status: 'pending'
        });
    });

    // C. Priority 3: Pareto Items (Lowest Absolute Scores)
    // Always provide the 3 lowest scoring areas to push for perfection, even if they are above national average
    // FIX: Do not generate "Optimalisasi" tasks for items that are already 100%.
    const lowestScores = [...quantGaps].filter(q => q.score < 100).sort((a, b) => a.score - b.score).slice(0, 3);
    lowestScores.forEach(issue => {
        // Only add if we haven't already added this section as a negative gap
        const alreadyAdded = planData.actions.find(a => a.source && a.source.includes(issue.section));
        if (!alreadyAdded) {
            planData.actions.push({
                type: 'Optimalisasi (Pareto)',
                source: `${issue.section} (Skor: ${issue.score.toFixed(1)})`,
                action: `Walaupun performa secara fungsional sudah baik, ${issue.section} adalah salah satu area dengan skor terbawah di toko ini. Terapkan roleplay atau evaluasi singkat untuk mendorong skor ini lebih mendekati nilai sempurna.`,
                status: 'pending'
            });
        }
    });

    // D. FALLBACK/GENERAL ADVICE if somehow still less than 3
    const genericAdvice = [
        "Pertahankan tren positif yang ada saat ini. Lanjutkan sesi briefing reguler secara rutin dan berikan apresiasi kepada staf yang berprestasi untuk menjaga konsistensi toko.",
        "Lakukan sinkronisasi selama 10 menit setiap hari sebelum toko buka untuk menyelaraskan target pelayanan pelanggan hari ini.",
        "Minta tim untuk meninjau kembali modul product knowledge terbaru agar lebih percaya diri saat menangani pertanyaan seputar produk."
    ];

    let genericIndex = 0;
    while (planData.actions.length < 3 && genericIndex < genericAdvice.length) {
        planData.actions.push({
            type: 'Saran Best Practice',
            source: 'Perawatan Berkala Toko',
            action: genericAdvice[genericIndex],
            status: 'pending'
        });
        genericIndex++;
    }

    // Store globally for export
    window._currentStoreActionPlan = planData;

    // Return the generated data so other modules can use it
    return planData.actions;
}

function renderActionPlan(actions) {
    const container = document.getElementById("stActionPlanContainer");
    if (!container) return;
    container.innerHTML = "";

    actions.forEach((item, idx) => {
        let iconClass = 'bi-star-fill text-warning';
        let bgClass = 'bg-warning';

        if (item.type.includes('Kuantitatif')) {
            iconClass = 'bi-bar-chart-line-fill text-danger';
            bgClass = 'bg-danger';
        } else if (item.type.includes('Suara Pelanggan')) {
            iconClass = 'bi-chat-left-quote-fill text-purple'; // Assuming purple exists, fallback to dark
            bgClass = 'bg-dark';
        } else if (item.type.includes('Optimalisasi')) {
            iconClass = 'bi-arrow-up-right-circle-fill text-primary';
            bgClass = 'bg-primary';
        }

        const html = `
            <div class="d-flex align-items-start p-3 bg-white border border-${bgClass.replace('bg-', '')} border-opacity-25 rounded-3 shadow-sm hover-shadow mb-3" style="transition: all 0.2s;">
                <div class="form-check mt-1 me-3">
                    <input class="form-check-input border-secondary" type="checkbox" id="actionCb${idx}" style="cursor: pointer; width: 1.25rem; height: 1.25rem;">
                </div>
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center flex-wrap gap-2 mb-2">
                        <span class="badge ${bgClass} fw-bold px-2 py-1 shadow-sm" style="font-size: 0.65rem; letter-spacing: 0.5px; border-radius: 6px;"><i class="bi ${iconClass} text-white me-1"></i>${item.type}</span>
                        <span class="text-muted fw-bold d-inline-flex align-items-center rounded bg-light px-2 py-1 border" style="font-size: 0.70rem;"><i class="bi bi-bullseye me-1"></i>${item.source}</span>
                    </div>
                    <label class="form-check-label fw-medium text-dark mt-1" for="actionCb${idx}" style="cursor: pointer; line-height: 1.5; font-size: 0.95rem;">
                        ${item.action}
                    </label>
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}



function exportActionPlanPDF() {
    if (!window._currentStoreActionPlan) return alert("No action plan available.");
    const plan = window._currentStoreActionPlan;

    // Simple print window for the action plan
    const printWin = window.open('', '_blank');
    let printHtml = `
        <html>
        <head>
            <title>Action Plan - ${plan.storeName}</title>
            <style>
                body { font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6; }
                h2 { color: #000; border-bottom: 2px solid #eee; padding-bottom: 10px; }
                .item { margin-bottom: 20px; padding: 15px; border: 1px solid #ccc; border-radius: 5px; }
                .meta { font-size: 0.85em; color: #666; font-weight: bold; margin-bottom: 5px; }
                .action { font-size: 1.05em; margin-top: 5px; }
                .header-meta { color: #777; margin-bottom: 30px; }
            </style>
        </head>
        <body>
            <h2>Store Action Plan & Monitoring</h2>
            <div class="header-meta">
                <strong>Store:</strong> ${plan.storeName} <br>
                <strong>Wave:</strong> ${plan.wave} <br>
                <strong>Generated On:</strong> ${plan.generatedAt}
            </div>
    `;

    plan.actions.forEach(a => {
        printHtml += `
            <div class="item">
                <div class="meta">[${a.type.toUpperCase()}] Source: ${a.source}</div>
                <div class="action">${a.action}</div>
                <br>
                <div><i>Status: ______ Checked By: ______ Date: ______</i></div>
            </div>
        `;
    });

    printHtml += `
        </body>
        </html>
    `;

    printWin.document.write(printHtml);
    printWin.document.close();
    printWin.focus();
    printWin.print();
}
