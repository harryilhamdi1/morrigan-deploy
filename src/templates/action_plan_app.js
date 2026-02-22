/**
 * action_plan_app.js
 * Logic for the standalone Action Plan Implementation & Monitoring Dashboard.
 */

// Global State
let apData = null; // Will point to window._REPORT_DATA
let globalStorePlansCache = {};
let globalStats = {
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0
};

// Pagination State
let currentPage = 1;
const itemsPerPage = 10;
let currentSearchQuery = '';

function initActionPlanDashboard() {
    console.log("Initializing Action Plan Monitoring Dashboard...");

    // Attempt to decompress data early if the base wrapper hasn't done it
    if (typeof reportData !== 'undefined') {
        apData = reportData;
        console.log("Found existing report data initialized by base html.");
    } else if (window._REPORT_DATA) {
        apData = window._REPORT_DATA;
    } else {
        console.error("No report data found. Please run the build script.");
        return;
    }

    // Build the global cache of actual action plans
    buildGlobalPlanCache();

    // Init aggregations
    renderNationalTab();
    renderRegionalTab();
    renderBranchTab();

    // Default to National Dashboard
    showDashboard();
}

function buildGlobalPlanCache() {
    const allStores = Object.values(apData.stores);
    allStores.forEach(st => {
        const tasks = buildRealActionPlanWithTracking(st);
        globalStorePlansCache[st.meta.name] = tasks;

        tasks.forEach(t => {
            globalStats.total++;
            if (t.status === 'approved') globalStats.completed++;
            else if (t.status === 'in_progress' || t.status === 'head_approved') globalStats.inProgress++;
            else globalStats.pending++;
        });
    });
}

// --- Aggregation Functions (Real Data) ---
function renderNationalTab() {
    document.getElementById('natTotalPlans').innerText = globalStats.total.toLocaleString();
    document.getElementById('natCompleted').innerText = globalStats.completed.toLocaleString();
    document.getElementById('natInProgress').innerText = globalStats.inProgress.toLocaleString();
    document.getElementById('natPending').innerText = globalStats.pending.toLocaleString();

    const now = new Date();
    document.getElementById('nationalLastUpdated').innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderRegionalTab() {
    const tbody = document.getElementById('apRegionalBody');
    if (!tbody || !apData) return;
    tbody.innerHTML = '';

    const regions = Object.keys(apData.regions || {}).sort();

    regions.forEach(regId => {
        let storeCount = 0;
        let totalRegionPlans = 0;
        let completedRegionPlans = 0;

        const regionStores = Object.values(apData.stores).filter(st => st.meta.region === regId);

        regionStores.forEach(st => {
            storeCount++;
            const plans = globalStorePlansCache[st.meta.name] || [];
            totalRegionPlans += plans.length;
            completedRegionPlans += plans.filter(p => p.status === 'approved').length;
        });

        const plansGenerated = totalRegionPlans;
        const implRate = totalRegionPlans > 0 ? Math.round((completedRegionPlans / totalRegionPlans) * 100) : 0;
        let color = implRate > 70 ? 'success' : (implRate > 50 ? 'warning' : 'danger');

        const html = `
            <tr class="premium-row border-0 text-center">
                <td class="ps-4 text-start">
                    <div class="d-flex align-items-center gap-3">
                        <div class="bg-${color} bg-opacity-10 p-2 rounded-3">
                            <i class="bi bi-map-fill text-${color}"></i>
                        </div>
                        <span class="fw-bold text-dark fs-6 w-100 text-center">${regId}</span>
                    </div>
                </td>
                <td>
                    <span class="badge bg-light text-dark border px-3 py-2 rounded-pill"><i class="bi bi-shop me-1"></i>${storeCount}</span>
                </td>
                <td>
                    <span class="badge bg-light text-dark border px-3 py-2 rounded-pill"><i class="bi bi-card-checklist text-primary me-1"></i>${plansGenerated.toLocaleString()} Plans</span>
                </td>
                <td class="pe-4">
                    <div class="d-flex flex-column align-items-center justify-content-center w-100">
                        <div class="d-flex justify-content-between w-50 mb-1 mx-auto">
                            <span class="xsmall fw-bold text-muted">Completion</span>
                            <span class="xsmall fw-bold text-${color}">${implRate}%</span>
                        </div>
                        <div class="progress w-50 mx-auto" style="height: 6px; border-radius:3px; background:#e2e8f0;">
                            <div class="progress-bar bg-${color}" role="progressbar" style="width: ${implRate}%"></div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
        tbody.innerHTML += html;
    });
}

function renderBranchTab() {
    const tbody = document.getElementById('apBranchBody');
    if (!tbody || !apData) return;
    tbody.innerHTML = '';

    const branchMap = {};

    // Group all stores by Branch
    Object.values(apData.stores).forEach(st => {
        const bName = st.meta.branch;
        if (!branchMap[bName]) {
            branchMap[bName] = {
                region: st.meta.region,
                branch: bName,
                storeCount: 0,
                totalBranchPlans: 0,
                completedBranchPlans: 0
            };
        }

        branchMap[bName].storeCount++;
        const plans = globalStorePlansCache[st.meta.name] || [];
        branchMap[bName].totalBranchPlans += plans.length;
        branchMap[bName].completedBranchPlans += plans.filter(p => p.status === 'approved').length;
    });

    const branchesList = Object.values(branchMap).sort((a, b) => a.branch.localeCompare(b.branch));

    branchesList.forEach(br => {
        const implRate = br.totalBranchPlans > 0 ? Math.round((br.completedBranchPlans / br.totalBranchPlans) * 100) : 0;
        let color = implRate > 70 ? 'success' : (implRate > 50 ? 'warning' : 'danger');

        const html = `
            <tr class="premium-row border-0 text-center">
                <td class="ps-4 text-start">
                    <div class="d-flex align-items-center gap-3">
                        <div class="bg-${color} bg-opacity-10 p-2 rounded-3">
                            <i class="bi bi-diagram-3-fill text-${color}"></i>
                        </div>
                        <div class="w-100 text-center">
                            <div class="fw-bold text-dark fs-6">${br.branch}</div>
                            <div class="small text-muted"><i class="bi bi-geo-alt me-1"></i>${br.region}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge bg-light text-dark border px-3 py-2 rounded-pill"><i class="bi bi-shop me-1"></i>${br.storeCount} stores</span>
                </td>
                <td class="pe-4">
                    <div class="d-flex flex-column align-items-center justify-content-center w-100">
                        <div class="d-flex justify-content-between w-50 mb-1 mx-auto">
                            <span class="xsmall fw-bold text-muted">Completion</span>
                            <span class="xsmall fw-bold text-${color}">${implRate}%</span>
                        </div>
                        <div class="progress w-50 mx-auto" style="height: 6px; border-radius:3px; background:#e2e8f0;">
                            <div class="progress-bar bg-${color}" role="progressbar" style="width: ${implRate}%"></div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
        tbody.innerHTML += html;
    });
}

// --- Navigation Functions ---
function hideAllTabs() {
    document.getElementById('tab-dashboard').style.display = 'none';
    document.getElementById('tab-regional').style.display = 'none';
    document.getElementById('tab-branch').style.display = 'none';
    document.getElementById('tab-stores').style.display = 'none';

    document.getElementById('nav-dashboard').classList.remove('active');
    document.getElementById('nav-regional').classList.remove('active');
    document.getElementById('nav-branch').classList.remove('active');
    document.getElementById('nav-store').classList.remove('active');
}

function showDashboard() {
    hideAllTabs();
    document.getElementById('tab-dashboard').style.display = 'block';
    document.getElementById('nav-dashboard').classList.add('active');
}

function showRegional() {
    hideAllTabs();
    document.getElementById('tab-regional').style.display = 'block';
    document.getElementById('nav-regional').classList.add('active');
}

function showBranch() {
    hideAllTabs();
    document.getElementById('tab-branch').style.display = 'block';
    document.getElementById('nav-branch').classList.add('active');
}

function showStoreList() {
    hideAllTabs();
    document.getElementById('tab-stores').style.display = 'block';
    document.getElementById('nav-store').classList.add('active');

    document.getElementById('storeContent').style.display = 'none';
    document.getElementById('storeListContainer').style.display = 'block';

    // Render the table
    renderActionPlanStoreTable();
}

// --- Store Table Rendering ---
function renderActionPlanStoreTable(searchQuery = '', page = 1) {
    const tbody = document.getElementById('apStoreMasterBody');
    if (!tbody || !apData) return;

    tbody.innerHTML = '';
    currentSearchQuery = searchQuery;
    currentPage = page;

    // Grab all stores from hierarchy
    const allStores = Object.values(apData.stores);
    const query = searchQuery.toLowerCase().trim();

    // Filter based on search query
    const filteredStores = query === '' ? allStores : allStores.filter(st => {
        return st.meta.name.toLowerCase().includes(query) ||
            st.meta.region.toLowerCase().includes(query) ||
            st.meta.branch.toLowerCase().includes(query) ||
            st.meta.brand.toLowerCase().includes(query);
    });

    if (filteredStores.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-5 text-muted">No stores matching your search.</td></tr>';
        return;
    }

    // Pagination Math
    const totalItems = filteredStores.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedStores = filteredStores.slice(startIndex, startIndex + itemsPerPage);

    // Render Paginated Stores
    paginatedStores.forEach(st => {
        const plans = globalStorePlansCache[st.meta.name] || [];
        const total = plans.length;
        const completed = plans.filter(p => p.status === 'approved').length;

        const randProgress = total > 0 ? Math.round((completed / total) * 100) : 0;
        let progressColor = 'danger';
        if (randProgress > 40) progressColor = 'warning';
        if (randProgress > 75) progressColor = 'success';

        const html = `
            <tr class="premium-row border-0 text-center">
                <td class="ps-4 py-3 text-start">
                    <div class="d-flex align-items-center gap-3">
                        <div class="user-avatar shadow-sm bg-gradient" style="background: linear-gradient(135deg, var(--bs-${progressColor}) 0%, #1e293b 100%); flex-shrink:0;">
                            <i class="bi bi-shop"></i>
                        </div>
                        <div class="w-100 text-center">
                            <div class="fw-bold text-dark" style="font-family:'Outfit', sans-serif; font-size:1.05rem;">${st.meta.name}</div>
                            <div class="small text-muted fw-bold justify-content-center d-flex gap-1"><span class="badge bg-light text-dark border">${st.meta.brand}</span> <span class="badge bg-light text-dark border">${st.meta.class}</span></div>
                        </div>
                    </div>
                </td>
                <td class="align-middle">
                    <div class="small fw-bold text-dark mb-1"><i class="bi bi-geo-alt text-primary me-1"></i>${st.meta.branch}</div>
                    <div class="xsmall text-muted bg-light d-inline-block px-2 py-1 rounded border">${st.meta.region}</div>
                </td>
                <td class="align-middle">
                    <div class="d-flex flex-column align-items-center justify-content-center w-100">
                        <div class="d-flex justify-content-between w-50 mb-1 mx-auto">
                            <span class="xsmall fw-bold text-muted">Completion</span>
                            <span class="xsmall fw-bold text-${progressColor}">${randProgress}%</span>
                        </div>
                        <div class="progress w-50 mx-auto" style="height: 6px; border-radius:3px; background:#e2e8f0;">
                            <div class="progress-bar bg-${progressColor}" role="progressbar" style="width: ${randProgress}%" aria-valuenow="${randProgress}" aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                    </div>
                </td>
                <td class="pe-4 align-middle">
                    <button class="btn btn-sm btn-dark rounded-pill px-4 fw-bold shadow-sm hover-lift" onclick="openStoreActionPlan('${st.meta.name}')"><i class="bi bi-eye text-warning me-1"></i> Monitor Task</button>
                </td>
            </tr>
        `;
        tbody.innerHTML += html;
    });

    renderStorePagination(totalPages, currentPage);
}

function renderStorePagination(totalPages, current) {
    let paginationContainer = document.getElementById('apStorePagination');
    if (!paginationContainer) {
        // Create container if it doesn't exist yet
        const tableContainer = document.getElementById('apStoreMasterTable').closest('.table-responsive');
        tableContainer.insertAdjacentHTML('afterend', `
            <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top px-3">
                <div class="small text-muted fw-bold" id="apStorePaginationInfo"></div>
                <ul class="pagination pagination-sm mb-0 shadow-sm" id="apStorePagination"></ul>
            </div>
        `);
        paginationContainer = document.getElementById('apStorePagination');
    }

    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        document.getElementById('apStorePaginationInfo').innerText = '';
        return;
    }

    // Update Info Text
    document.getElementById('apStorePaginationInfo').innerText = `Page ${current} of ${totalPages}`;

    let html = '';

    // Prev Button
    html += `
        <li class="page-item ${current === 1 ? 'disabled' : ''}">
            <a class="page-link text-dark" href="#" onclick="renderActionPlanStoreTable(currentSearchQuery, ${current - 1}); return false;" aria-label="Previous">
                <span aria-hidden="true"><i class="bi bi-chevron-left"></i></span>
            </a>
        </li>
    `;

    // Setup window (e.g., current +/- 2 pages)
    let startPage = Math.max(1, current - 2);
    let endPage = Math.min(totalPages, current + 2);

    if (startPage > 1) {
        html += `<li class="page-item"><a class="page-link text-dark" href="#" onclick="renderActionPlanStoreTable(currentSearchQuery, 1); return false;">1</a></li>`;
        if (startPage > 2) {
            html += `<li class="page-item disabled"><a class="page-link text-dark" href="#">...</a></li>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        if (i === current) {
            html += `<li class="page-item active" aria-current="page"><span class="page-link bg-dark border-dark">${i}</span></li>`;
        } else {
            html += `<li class="page-item"><a class="page-link text-dark fw-bold" href="#" onclick="renderActionPlanStoreTable(currentSearchQuery, ${i}); return false;">${i}</a></li>`;
        }
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<li class="page-item disabled"><a class="page-link text-dark" href="#">...</a></li>`;
        }
        html += `<li class="page-item"><a class="page-link text-dark" href="#" onclick="renderActionPlanStoreTable(currentSearchQuery, ${totalPages}); return false;">${totalPages}</a></li>`;
    }

    // Next Button
    html += `
        <li class="page-item ${current === totalPages ? 'disabled' : ''}">
            <a class="page-link text-dark" href="#" onclick="renderActionPlanStoreTable(currentSearchQuery, ${current + 1}); return false;" aria-label="Next">
                <span aria-hidden="true"><i class="bi bi-chevron-right"></i></span>
            </a>
        </li>
    `;

    paginationContainer.innerHTML = html;
}

function openStoreActionPlan(storeName) {
    document.getElementById('storeListContainer').style.display = 'none';
    document.getElementById('storeContent').style.display = 'block';

    // Find store metadata
    const allStores = Object.values(apData.stores);
    const st = allStores.find(s => s.meta.name === storeName);
    if (st) {
        document.getElementById('apStoreName').innerText = st.meta.name;
        document.getElementById('apStoreMeta').innerText = `${st.meta.region} • ${st.meta.branch}`;
    }

    // Generate real action plan data using the Deep Dive engine
    const tasks = buildRealActionPlanWithTracking(st);

    // Calculate global implementation rate (only fully approved counts towards 100%)
    const compRate = Math.round((tasks.filter(t => t.status === 'approved').length / tasks.length) * 100);
    document.getElementById('apStoreCompletion').innerText = `${compRate}%`;

    renderTaskChecklists(tasks);
    renderWeeklyTimeline(tasks);
}

function buildRealActionPlanWithTracking(storeObj) {
    if (!storeObj || !storeObj.results) return [];

    // Pick the most recent wave available for this store
    const waves = Object.keys(storeObj.results).sort().reverse();
    if (waves.length === 0) return [];
    const currentWave = waves[0];

    // Generate the raw action plan from the common algorithm
    const rawActions = generateStoreActionPlan(storeObj, currentWave, storeObj.feedback);
    if (!rawActions || rawActions.length === 0) return [];

    // Map the raw engine output to execution tracking states.
    // RESET: Start everything as Pending (0 progress) for real-world simulation
    return rawActions.map((raw, index) => {
        let status = 'pending';
        let typeClass = 'secondary';

        // Match UI coloring to types
        if (raw.type.includes('Kuantitatif')) typeClass = 'danger';
        else if (raw.type.includes('Suara Pelanggan')) typeClass = 'dark';
        else if (raw.type.includes('Optimalisasi')) typeClass = 'primary';
        else typeClass = 'secondary';

        return {
            id: `AP-REAL-${index + 1}`,
            type: raw.type,
            source: raw.source,
            action: raw.action,
            status: status,
            week: index + 1,
            proofText: '',
            remarksHead: '',
            remarksHCBP: '',
            typeClass: typeClass
        };
    });
}

function renderTaskChecklists(tasks) {
    const container = document.getElementById('apTaskListContainer');
    container.innerHTML = '';

    tasks.forEach(task => {
        let statusBadge = '';
        if (task.status === 'approved') statusBadge = '<span class="badge bg-success bg-opacity-10 text-success border border-success px-2 py-1"><i class="bi bi-check-all me-1"></i>Verified by HCBP</span>';
        else if (task.status === 'head_approved') statusBadge = '<span class="badge bg-info bg-opacity-10 text-info border border-info px-2 py-1"><i class="bi bi-person-check-fill me-1"></i>Approved by HOB</span>';
        else if (task.status === 'in_progress') statusBadge = '<span class="badge bg-warning bg-opacity-10 text-warning border border-warning px-2 py-1"><i class="bi bi-arrow-repeat me-1"></i>In Review (HOB)</span>';
        else statusBadge = '<span class="badge bg-secondary bg-opacity-10 text-secondary border border-secondary px-2 py-1"><i class="bi bi-hourglass me-1"></i>Pending Execution</span>';

        // Serial Logic
        const isHeadApproved = task.status === 'head_approved' || task.status === 'approved';
        const isHcbpApproved = task.status === 'approved';

        const btnStateHead = isHeadApproved ? 'disabled' : '';
        const btnStateHcbp = isHcbpApproved ? 'disabled' : '';

        // Generate serial HCBP UI
        let hcbpUI = '';
        if (!isHeadApproved) {
            hcbpUI = `
                <div class="col-md-6 p-4 bg-light d-flex flex-column justify-content-center align-items-center text-center">
                    <i class="bi bi-lock-fill text-muted fs-4 mb-2 opacity-50"></i>
                    <div class="small fw-bold text-muted opacity-75">Awaiting HOB Approval</div>
                    <div class="xsmall text-muted opacity-50">Serial Validation</div>
                </div>
            `;
        } else {
            hcbpUI = `
                <div class="col-md-6 p-3 bg-light">
                    <h6 class="fw-bold text-dark mb-2 small text-uppercase"><i class="bi bi-briefcase-fill me-2 text-danger"></i>HCBP Assessment</h6>
                    <div class="btn-group w-100 shadow-sm mb-2" role="group">
                        <button type="button" class="btn btn-sm btn-outline-success ${isHcbpApproved ? 'active' : ''} ${btnStateHcbp}">Verify & Close</button>
                        <button type="button" class="btn btn-sm btn-outline-danger ${btnStateHcbp}">Reject</button>
                    </div>
                    <textarea class="form-control form-control-sm border-0 shadow-sm" rows="2" placeholder="Leave remarks..." ${btnStateHcbp}>${task.remarksHCBP}</textarea>
                </div>
            `;
        }

        const html = `
            <div class="card border-0 shadow-sm bg-white hover-lift" style="border-radius: 16px; left: 0; transition: transform 0.2s, box-shadow 0.2s; border: 1px solid rgba(0,0,0,0.05) !important;">
                <div class="card-header bg-light bg-gradient border-bottom py-3 d-flex justify-content-between align-items-center">
                    <div>
                        <span class="badge bg-${task.typeClass} shadow-sm px-2 py-1"><i class="bi bi-tag-fill me-1 opacity-75"></i>${task.type}</span>
                        <span class="small text-muted ms-2 fw-bold d-none d-md-inline text-uppercase" style="letter-spacing:0.5px; font-size:0.75rem;"><i class="bi bi-bullseye me-1 text-${task.typeClass}"></i>${task.source}</span>
                    </div>
                    ${statusBadge}
                </div>
                <div class="card-body p-4">
                    <div class="d-flex gap-3 mb-4">
                        <div class="mt-1">
                            <div class="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center shadow-sm" style="width: 32px; height:32px;">
                                <i class="bi bi-lightning-charge-fill"></i>
                            </div>
                        </div>
                        <p class="fw-bold text-dark mb-0" style="font-size: 1.1rem; line-height: 1.6; font-family:'Outfit', sans-serif;">"${task.action}"</p>
                    </div>
                    
                    <!-- Execution Proof Form (Store Head) -->
                    <div class="ps-4 border-start border-3 border-primary mb-4 bg-light bg-opacity-50 p-3 rounded-end shadow-sm">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h6 class="fw-bold text-primary mb-0 small text-uppercase" style="letter-spacing: 1px;"><i class="bi bi-building-check me-2"></i>Execution Proof (Store Head)</h6>
                            <span class="small text-muted"><i class="bi bi-braces border p-1 rounded"></i> Mockup</span>
                        </div>
                        <textarea class="form-control form-control-sm bg-white mb-2 shadow-sm border-0" rows="3" placeholder="Describe how this action plan was executed...">${task.proofText}</textarea>
                        <button class="btn btn-sm btn-white border shadow-sm fw-bold text-primary"><i class="bi bi-cloud-upload me-2"></i>Upload Evidence (Mock)</button>
                    </div>

                    <!-- Approval Section -->
                    <div class="row g-0 rounded-3 border overflow-hidden">
                        <!-- Head of Branch -->
                        <div class="col-md-6 p-3 bg-light border-end">
                            <h6 class="fw-bold text-dark mb-2 small text-uppercase"><i class="bi bi-person-badge me-2 text-warning"></i>Head of Branch Review</h6>
                            <div class="btn-group w-100 shadow-sm mb-2" role="group">
                                <button type="button" class="btn btn-sm btn-outline-success ${isHeadApproved ? 'active' : ''} ${btnStateHead}">Approve</button>
                                <button type="button" class="btn btn-sm btn-outline-danger ${btnStateHead}">Reject</button>
                            </div>
                            <textarea class="form-control form-control-sm border-0 shadow-sm" rows="2" placeholder="Leave remarks for store..." ${btnStateHead}>${task.remarksHead}</textarea>
                        </div>
                        <!-- HCBP (Serial Lock) -->
                        ${hcbpUI}
                    </div>
                    
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}

function renderWeeklyTimeline(tasks) {
    const list = document.getElementById('apWeeklyTimeline');
    list.innerHTML = '';

    // Draw a background line for the timeline
    list.style.position = 'relative';
    const bgLine = document.createElement('div');
    bgLine.style.cssText = 'position: absolute; left: 15px; top: 15px; bottom: 15px; width: 2px; background: #e2e8f0; z-index: 1;';
    list.appendChild(bgLine);

    tasks.forEach(task => {
        let statusColor = 'secondary';
        let statusIcon = 'bi-circle';
        let statusText = 'Pending';

        if (task.status === 'approved') {
            statusColor = 'success';
            statusIcon = 'bi-check-circle-fill';
            statusText = 'Verified';
        } else if (task.status === 'head_approved') {
            statusColor = 'info';
            statusIcon = 'bi-person-check-fill';
            statusText = 'Wait HCBP';
        } else if (task.status === 'in_progress') {
            statusColor = 'warning';
            statusIcon = 'bi-circle-fill';
            statusText = 'Wait HOB';
        }

        const li = document.createElement('li');
        li.className = 'list-group-item px-0 py-3 bg-transparent border-0 d-flex gap-3 position-relative';
        li.style.zIndex = '2';

        li.innerHTML = `
            <div class="bg-white d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.1); flex-shrink: 0;">
                <i class="bi ${statusIcon} text-${statusColor}"></i>
            </div>
            <div>
                <div class="small fw-bold text-muted text-uppercase" style="font-size: 0.65rem; letter-spacing: 1px;">Week ${task.week} Tracking</div>
                <div class="fw-bold text-dark text-truncate" style="max-width: 250px;">${task.type}</div>
                <div class="text-${statusColor} small fw-bold">${statusText}</div>
            </div>
        `;
        list.appendChild(li);
    });
}

// Run init on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait slightly to ensure base.html decompression is finished
    setTimeout(initActionPlanDashboard, 500);
});
