# AI Handover Context: Morrigan In-Depth Report & Action Plan System

## 1. Project Overview & Dual Architecture
This system was historically a "Fat-Client" Static Site Generator (SSG) that bundled its entire database into single HTML files. Recently (in Phase 4), we **successfully pioneered a Live Online System** powered by Supabase. 

Currently, the workspace explicitly maintains **both architectures** to give Eigerindo flexibility:
1. **Online Architecture (`For Online/`)**: A live, multi-user web app synced with Supabase, capable of live CRUD (such as Action Plan execution proofs).
2. **Offline Architecture (`For Offline/`)**: The legacy SSG engine that compiles static Data + UI into massively portable, single `.html` files for zero-internet environments.

---

## 2. Deep Dive: Online Architecture Stack
*   **Database / Auth Backend**: **Supabase** (PostgreSQL, Auth, and Storage).
*   **Role-Based Access Control (RBAC)**: Enforced via Supabase Row Level Security (RLS). 5 Tiers: Superadmin, Admin, Regional, Branch, Store. RLS isolates data so users only see assigned stores based on `profiles` scopes.
*   **Authentication Flow**: Users log in using simple text IDs (e.g., `2019` or `dki_4`). The `auth.js` script silently appends a dummy domain (`@ess-retail.online`) to bridge with Supabase's email-auth requirement.
*   **Action Plan Middleware**: `Action Plan Web App/server.js` (Node/Express). Accepts `multipart/form-data` execution proofs (photos), uploads them to a connected **Google Drive** via a Service Account (saving Supabase storage quota), and returns the public link to be saved in Supabase.
*   **Frontend**: Native Vanilla JS, Bootstrap 5, Plotly, Chart.js.

### Crucial Online Mechanics & Bug Fixes ⚠️
1.  **Supabase 1000-Row Limit Bypass**: In `apps/retail-analysis/app.js`, we circumvent Supabase's mandatory 1000-row limit on `select(*)` by implementing recursive `.range(start, end)` pagination (`fetchAllRows`). **Do not revert to standard `select`, or exactly 219 critical issue items will arbitrary drop off the radar.**
2.  **Vercel CDN Cache Busting**: Vercel tightly caches heavy `.js` assets at the edge. Always increment the `?v=X.X` parameter in HTML script tags (`<script src="app.js?v=1.2"></script>`) whenever modifying core logic.
3.  **String Matching Vulnerabilities**: When joining `journey_scores` to create the UI datasets in `app.js`, we explicitly execute `.trim()` on keys (`js.section_name`, `gs.item_code`). Do not remove this, or trailing spaces in the DB will break object lookups.
4.  **DOM Wrapper Dependencies**: JS logic relies on specific DIVs existing on init. (e.g., `Action Plan Monitoring` expects `<div class="main-content flex-grow-1">`). UI refactors must not strip these structural wrappers.

---

## 3. Deep Dive: Offline Architecture (SSG HTML Generation)
Eigerindo still occasionally needs the standalone "Fat-Clients." The logic lives in `For Offline (Generate HTML)/src/build.js`. Here is the exact data flow:

1. **Extraction**: `build.js` uses `csv-parse` to read CSV files from `resources/CSV/`. It joins Master Store Data with individual Wave scoring data.
2. **Aggregation**: It executes heavy multi-dimensional math (Averages, Regional rankings, standard deviations, Top Priorities calculation). 
3. **VoC AI Generation**: It connects to Google Gemini APIs (`@google/generative-ai`) to synthesize localized Voice of Customer blurbs based on bad qualitative feedback strings.
4. **Compression (`fflate`)**: The massive resulting JSON object (`reportData`) is converted to an aggressively minified String and then Zlib Deflated (`zlib.deflateSync`) into a Base64 payload.
5. **Template Assembly**: The Node script reads `src/templates/base.html` and recursively injects the Base64 payload, alongside minified UI scripts (`templates/scripts.js`), Plotly libs, and CSS.
6. **Output**: It writes the final payload to `For Offline (Generate HTML)/ESS Retail Analysis.html` and `ESS Action Plan Monitoring.html`.

### How to Generate the Offline HTML manually:
1. Open terminal in `For Offline (Generate HTML)/`.
2. Run `npm install` (using the `package.json` in that directory).
3. Ensure `.env` is setup with `GEMINI_API_KEY`.
4. Run: `node src/build.js` -> Wait a few minutes -> Dist files are built instantly into the current folder.

---

## 4. Current Workspace Directory Structure
Use this as your immediate mental map. **Do not modify this root structure.**

*   `For Online/` 
    *   `Frontend Web App/`: Front-end SSG UI connected to Supabase APIs.
    *   `Action Plan Web App/`: Middleware Node.js server.
    *   `migration_scripts/`: Administration CLI scripts mapping Offline CSVs to Online Supabase `UPSERTS` (`import_users.js`, `migrate_to_supabase.js`).
*   `For Offline (Generate HTML)/` 
    *   `src/`: The SSG compiler engine (`build.js`).
    *   The `package.json` locking offline dependencies.
*   `resources/` 
    *   `CSV/`, `Excel/`: The immutable source of truth data from the survey platform.
    *   Archived technical documentation and project historical states.
*   *Root*: Keep it clean. Only `README.md`, `.env` (holding `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` used by migration CLI scripts), and `.gitignore`.

Good luck, prioritize system stability, and always provide premium interactive interfaces for Mr. Harry!
