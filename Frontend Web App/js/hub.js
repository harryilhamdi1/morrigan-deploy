/**
 * hub.js
 * Controls the Lobby / Portal logic. Fetches user metadata and handles navigation checks.
 */

document.addEventListener("DOMContentLoaded", async () => {
    // Standard Global Session Check
    const { data: { session }, error } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = 'index.html';
        return;
    }

    // Load User Profile Data
    await loadUserProfile(session.user);

    // Logout Handler
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = 'index.html';
    });
});

async function loadUserProfile(user) {
    try {
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('full_name, rank, role, store_scope')
            .eq('id', user.id)
            .maybeSingle();

        if (error) {
            console.error("Error fetching profile:", error.message);
            document.getElementById('userNameDisplay').textContent = user.email.split('@')[0].toUpperCase();
            return;
        }

        // Store profile object globally in window for apps to use if needed
        window.userProfile = profile || { email: user.email, role: 'viewer', full_name: user.email.split('@')[0] };

        const displayProfile = window.userProfile;

        // Display Name & Role in Navbar
        document.getElementById('userNameDisplay').textContent = displayProfile.full_name || displayProfile.email.split('@')[0].toUpperCase();

        let roleString = displayProfile.rank || (displayProfile.role ? displayProfile.role.toUpperCase() : 'VIEWER');
        if (displayProfile.role === 'store' && displayProfile.store_scope) {
            roleString += ` (${displayProfile.store_scope})`;
        }
        document.getElementById('userRoleDisplay').textContent = roleString;

    } catch (err) {
        console.error("Failed to parse profile context.", err);
    }
}
