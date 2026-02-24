require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ ERR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const NEW_PASSWORD = 'Eiger123!';

async function resetAllPasswords() {
    console.log(`Starting bulk password reset to: ${NEW_PASSWORD}`);
    let page = 1;
    let totalUpdated = 0;

    while (true) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) {
            console.error("Error fetching users:", error);
            break;
        }

        if (!data || !data.users || data.users.length === 0) break;

        for (const user of data.users) {
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                user.id,
                { password: NEW_PASSWORD }
            );

            if (updateError) {
                console.error(`❌ Failed to update password for ${user.email}:`, updateError.message);
            } else {
                console.log(`✅ Updated password for ${user.email}`);
                totalUpdated++;
            }
        }

        if (data.users.length < 1000) break;
        page++;
    }

    console.log(`\n🎉 Password reset complete! Total users updated: ${totalUpdated}`);
}

resetAllPasswords();
