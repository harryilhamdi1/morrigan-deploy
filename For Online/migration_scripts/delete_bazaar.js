require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function runCleanup() {
    console.log("🧹 Menghapus Toko Bazaar (Kode 9xxx) dari Supabase...");

    // Karena ada "ON DELETE CASCADE", menghapus dari tabel stores akan
    // secara otomatis menghapus Action Plans, KPI Scores, Journey, dan Feedbacknya.
    const { data, error } = await supabaseAdmin
        .from('stores')
        .delete()
        .like('site_code', '9%')
        .select('site_code');

    if (error) {
        console.error("❌ Gagal menghapus:", error.message);
    } else {
        console.log(`✅ Sukses menghapus ${data.length} Toko Bazaar & seluruh datanya.`);
    }
}

runCleanup();
