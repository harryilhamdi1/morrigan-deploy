# AI Handover Context: Morrigan In-Depth Report & Action Plan System

## 1. Project Overview
This project, initially a monolithic "Fat-Client" Static Site Generator (SSG), has been **successfully decoupled** into a modern, live full-stack application (Phase 4). The system serves two primary dashboards for Eigerindo:
1. **Retail Analysis**: High-level, wave-by-wave VoC and KPI scoring dashboards with deep-dive drill-downs. 
2. **Action Plan Monitoring**: Operational dashboard for store heads to submit execution records (proofs) to remedy critical gaps, with approval workflows for regional/HQ supervisors.

The system enforces strict 5-Tier **Role-Based Access Control (RBAC)** down to Row Level Security (RLS) depending on scopes (Global, Region, Branch, Store IDs).

---

## 2. Directory Architecture (Current Clean State)
The workspace was recently reorganized cleanly into clear scopes. **DO NOT modify this root structure without user permission.**

*   `For Online/` **(Primary Focus for ongoing development)**
    *   `Frontend Web App/`: The live front-end portal. Uses vanilla JS, Bootstrap 5, Plotly, and the `@supabase/supabase-js` client.
    *   `Action Plan Web App/`: Contains the `server.js` Node/Express middleware handler (for Google Drive image uploads).
    *   `migration_scripts/`: Key Node.js administration scripts used via CLI to sync data up to Supabase (`import_users.js`, `migrate_to_supabase.js`).
*   `For Offline (Generate HTML)/` **(Legacy & Standalone Engine)**
    *   Contains the origin `src/build.js` engine and template folders. This is used if the user ever wants to run the purely local `node build.js` to create giant standalone `ESS Retail Analysis.html` files.
*   `resources/` **(Data & History)**
    *   `CSV/` and `Excel/` files acting as base master data. 
    *   Archived markdown trackers and logs.
*   *Root Configs*: `.env` (contains SUPABASE_URL and Service Keys - *Use these for CLI scripts*), `package.json` (root packages mostly used for CLI scripts).

---

## 3. Technology Stack
*   **Database / Auth Backend**: **Supabase**. (Utilizing PostgreSQL, Auth, and RLS). 
*   **Authentication Flow**: Users log in with IDs like `2019` or `dki_4`. The frontend `auth.js` silently appends `@ess-retail.online` behind the scenes to satisfy Supabase email Auth requirements.
*   **Middleware API**: Node.js + Express (handling image multipart/form-data uploads to Google Drive to save Supabase Storage quota).
*   **Frontend**: Native HTML/CSS/JS. Dynamic DOM injection (`innerHTML`). No React or Vue. 
*   **Charting**: Plotly.js and Chart.js.

---

## 4. Key Mechanics & Recent Bug Fixes
As the next AI, strictly be aware of these recent implementations to avoid regressions:

1.  **Supabase 1000-Row Limit Pagination**: In `apps/retail-analysis/app.js`, we bypassed Supabase's default generic `select(*)` limit of 1000 rows by implementing recursive `.range(start, end)` API fetching (`fetchAllRows`). **Do not revert this to standard `select`, or exactly 219 critical issues will arbitrarily drop.**
2.  **Vercel & Cache Busting**: Vercel's edge network aggressively caches the massive frontend `.js` files. When making updates to `app.js`, **always change the `?v=X.X` parameter** in the calling `index.html` file (e.g. `<script src="app.js?v=1.2"></script>`) to force users to receive your updates.
3.  **String Matching**: `app.js` performs heavy joining of `journey_scores` and `granular_scores` to create the UI datasets. Be extremely careful when using database keys. We explicitly added `.trim()` to `js.section_name` and `gs.item_code` to ensure perfect object-key matching.
4.  **UI Wrapper Dependencies**: The JS execution heavily relies on the pre-existing DOM. E.g., `Action Plan Monitoring` expects `<div class="main-content">` to be there on load. Do not accidentally delete structural wrappers in html files.

---

## 5. Typical Workflows
*   **Updating Logic**: Edit JS apps inside `For Online/Frontend Web App`. Change the version query in HTML, push to Git.
*   **Updating User Logins**: User adds a row to `resources/CSV/...Store.csv`. AI runs `node "For Online\migration_scripts\import_users.js"` using the root `.env` service key to push them to Supabase.

Selamat bekerja, give your best to Mr. Harry!
