require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ ERR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
}

// We MUST use the service_role key to bypass RLS and use Admin Auth API
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const DEFAULT_PASSWORD = 'password123'; // Users will be forced to change this later if needed

let cachedUsers = null;
async function getAllUsers() {
    if (cachedUsers) return cachedUsers;
    cachedUsers = [];
    let page = 1;
    while (true) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error || !data || !data.users || data.users.length === 0) break;
        cachedUsers.push(...data.users);
        if (data.users.length < 1000) break;
        page++;
    }
    return cachedUsers;
}

async function importManagementUsers() {
    console.log('\n--- Importing Management Users ---');
    const csvPath = path.join(__dirname, '../Action Plan Web App/Retail MPP Tracking (National) - For Supabase User Management (Management and HCBP).csv');
    const records = parse(fs.readFileSync(csvPath, 'utf-8'), { columns: true, skip_empty_lines: true });

    for (const row of records) {
        let userId = row['User ID'].trim();
        if (!userId) continue;

        // Fix: emails cannot have spaces
        userId = userId.replace(/\s+/g, '_');

        const fullName = row['Display Name'].trim();
        const rank = row['Rank'] ? row['Rank'].trim() : null;
        const role = row['Role'].trim().toLowerCase(); // superadmin, admin, regional, branch
        const email = `${userId}@ess-retail.online`;

        console.log(`Processing ${role}: ${email}...`);

        // 1. Assign proper scopes based on role
        let regionScope = null;
        let branchScope = null;

        if (role === 'regional') {
            // e.g. "Regional 1" -> "REGION 1"
            if (fullName.toLowerCase().startsWith('regional')) {
                regionScope = fullName.toUpperCase().replace('REGIONAL', 'REGION').trim();
            } else {
                regionScope = fullName;
            }
        } else if (role === 'branch') {
            // e.g. "DKI 4 Branch" -> "DKI 4"
            branchScope = fullName.replace(/ Branch$/i, '').trim().toUpperCase();
        }

        try {
            // 2. Create Auth User
            const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
                email: email,
                password: DEFAULT_PASSWORD,
                email_confirm: true
            });

            if (userError) {
                if (userError.message.includes('already exists') || userError.message.includes('already been registered')) {
                    console.log(`⚠️ User ${email} already exists (skipping auth creation).`);
                } else {
                    console.error(`❌ Error creating auth for ${email}:`, userError.message);
                    continue; // Skip profile if auth fails
                }
            }

            // Get UID for Profile
            let uid = userData?.user?.id;
            if (!uid) {
                // Fetch existing UID
                const existingUsers = await getAllUsers();
                const matchedUser = existingUsers.find(u => u.email === email);
                if (matchedUser) uid = matchedUser.id;
            }

            if (!uid) {
                console.error(`❌ Could not retrieve UID for ${email}`);
                continue;
            }

            // 3. Upsert Profile
            const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
                id: uid,
                full_name: fullName,
                rank: rank,
                role: role,
                region_scope: regionScope,
                branch_scope: branchScope,
                store_scope: null
            });

            if (profileError) {
                console.error(`❌ Profile Error for ${email}:`, profileError.message);
            } else {
                console.log(`✅ Success: ${email} -> Role: ${role} | Rank: ${rank} | Region: ${regionScope} | Branch: ${branchScope}`);
            }

        } catch (err) {
            console.error(`❌ Catch Error on ${email}:`, err);
        }
    }
}

async function importStoreUsers() {
    console.log('\n--- Importing Store Users ---');
    const csvPath = path.join(__dirname, '../Action Plan Web App/Retail MPP Tracking (National) - For Supabase User Management (Store).csv');
    const records = parse(fs.readFileSync(csvPath, 'utf-8'), { columns: true, skip_empty_lines: true });

    for (const row of records) {
        let userId = row['User ID'].trim();
        if (!userId) continue;

        // Fix: emails cannot have spaces
        userId = userId.replace(/\s+/g, '_');

        const siteCode = row['Site Code'].trim();
        const fullName = row['Display Name'].trim();
        const rank = row['Rank'] ? row['Rank'].trim() : null;
        const role = 'store'; // Hardcoded per requirements
        const email = `${userId}@ess-retail.online`;

        console.log(`Processing Store: ${email}...`);

        try {
            // 1. Create Auth User
            const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
                email: email,
                password: DEFAULT_PASSWORD,
                email_confirm: true
            });

            if (userError) {
                if (userError.message.includes('already exists') || userError.message.includes('already been registered')) {
                    console.log(`⚠️ User ${email} already exists (skipping auth creation).`);
                } else {
                    console.error(`❌ Error creating auth for ${email}:`, userError.message);
                    continue;
                }
            }

            let uid = userData?.user?.id;
            if (!uid) {
                const existingUsers = await getAllUsers();
                const matchedUser = existingUsers.find(u => u.email === email);
                if (matchedUser) uid = matchedUser.id;
            }

            if (!uid) continue;

            // 2. Upsert Profile
            const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
                id: uid,
                full_name: fullName,
                rank: rank,
                role: role,
                region_scope: null,
                branch_scope: null,
                store_scope: siteCode
            });

            if (profileError) {
                console.error(`❌ Profile Error for ${email}:`, profileError.message);
            } else {
                console.log(`✅ Success: ${email} -> Store Scope: ${siteCode} | Rank: ${rank}`);
            }

        } catch (err) {
            console.error(`❌ Catch Error on ${email}:`, err);
        }
    }
}

async function run() {
    console.log("🚀 Starting Supabase User Import Script...");
    await importManagementUsers();
    await importStoreUsers();
    console.log("\n🎉 IMPORT COMPLETE!");
}

run();
