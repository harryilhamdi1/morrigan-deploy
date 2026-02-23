const fs = require('fs');
const path = require('path');

const BASE_DIR = __dirname;
const TEMPLATE_DIR = path.join(BASE_DIR, 'src', 'templates');
const OUT_DIR = path.join(BASE_DIR, 'Action Plan Web App', 'apps', 'action-plan');

if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
}

console.log("Assembling Action Plan HTML Shell...");

let tplBase = fs.readFileSync(path.join(BASE_DIR, 'Action Plan Web App', 'base_template_reference.html'), 'utf8');
let tplActionPlanDash = fs.readFileSync(path.join(TEMPLATE_DIR, 'action_plan_dashboard.html'), 'utf8');
let tplActionPlanApp = fs.readFileSync(path.join(TEMPLATE_DIR, 'action_plan_app.js'), 'utf8');
let tplActionPlanBase = fs.readFileSync(path.join(TEMPLATE_DIR, 'action_plan.js'), 'utf8');

const apSidebarHTML = `
    <div class="sidebar-nav">
        <a href="#" onclick="showDashboard(); return false;" id="nav-dashboard" class="active">
            <i class="bi bi-grid-1x2-fill"></i> National Monitoring
        </a>
        <a href="#" onclick="showRegional(); return false;" id="nav-regional">
            <i class="bi bi-map-fill"></i> Regional Overview
        </a>
        <a href="#" onclick="showBranch(); return false;" id="nav-branch">
            <i class="bi bi-diagram-3-fill"></i> Branch Detail
        </a>
        <a href="#" onclick="showStoreList(); return false;" id="nav-store">
            <i class="bi bi-shop-window"></i> Store Action Plan
        </a>
    </div>
`;

// Inject standard layout and content
let finalApHTML = tplBase
    .replace(/ESS Retail In Depth Analysis/g, "Action Plan Monitoring")
    .replace(/<div class="sidebar-nav">[\s\S]*?<\/div>/, () => apSidebarHTML)
    .replace(/\{\s*\{\s*CONTENT\s*\}\s*\}/, () => tplActionPlanDash)
    .replace(/\{\s*\{\s*REPORT_DATA_B64\s*\}\s*\}/, "") // No more data blob
    .replace(/\{\s*\{\s*FFLATE_LIB\s*\}\s*\}/, "") // No more fflate
    .replace(/\{\s*\{\s*GENERATED_DATE\s*\}\s*\}/, () => new Date().toLocaleDateString('en-GB'))
    .replace(/\{\s*\{\s*THRESHOLD\s*\}\s*\}/, "86");

// Strip compression logic from base.html
finalApHTML = finalApHTML.replace(/\/\/ DECOMPRESSION LOGIC[\s\S]*?var config = \{ responsive: true, displayModeBar: false \};/m, 'var config = { responsive: true, displayModeBar: false };');

// Provide Supabase setup and external app.js instead of inline SCRIPTS
const supabaseScripts = `
    <!-- Supabase integration -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="../../js/config.js"></script>
    <script src="app.js"></script>
`;

finalApHTML = finalApHTML.replace(/<script>[\s\S]*?\{\s*\{\s*SCRIPTS\s*\}\s*\}[\s\S]*?<\/script>/, supabaseScripts);

// Write app.js (combining action_plan.js and action_plan_app.js)
fs.writeFileSync(path.join(OUT_DIR, 'app.js'), tplActionPlanBase + '\n\n' + tplActionPlanApp);

// Write index.html
fs.writeFileSync(path.join(OUT_DIR, 'index.html'), finalApHTML);

console.log('Action Plan Shell generated successfully in Action Plan Web App/apps/action-plan!');
