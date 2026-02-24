/**
 * auth.js
 * Handles Login and Session validation for ess-retail.online
 */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Check if user is already logged in
    checkSession();

    // 2. Handle Login Form Submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await loginUser();
        });
    }
});

async function checkSession() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();

    // If we're on the login page and ALREADY logged in, redirect to Hub
    if (session && window.location.pathname.endsWith('index.html')) {
        window.location.href = 'hub.html';
    }

    // If we're NOT on the login page and NOT logged in, kick out to Login
    if (!session && !window.location.pathname.endsWith('index.html')) {
        window.location.href = 'index.html';
    }
}

async function loginUser() {
    const usernameInput = document.getElementById('inputUsername').value.trim();
    const passwordInput = document.getElementById('inputPassword').value;
    const errorBox = document.getElementById('loginError');
    const errorText = document.getElementById('loginErrorText');
    const btnText = document.getElementById('loginBtnText');
    const btnSpinner = document.getElementById('loginBtnSpinner');
    const loginBtn = document.getElementById('loginBtn');

    // UI Feedback: Loading state
    errorBox.classList.add('d-none');
    btnText.innerText = 'Authenticating...';
    btnSpinner.classList.remove('d-none');
    loginBtn.disabled = true;

    // Pseudo-email strategy: Append @ess-retail.online
    const email = `${usernameInput.toLowerCase()}@ess-retail.online`;

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: passwordInput,
        });

        if (error) throw error;

        // Login successful, redirect to central Hub
        window.location.href = 'hub.html';

    } catch (error) {
        // UI Feedback: Error state
        console.error("Login Error:", error.message);
        errorBox.classList.remove('d-none');

        if (error.message.includes('Invalid login credentials')) {
            errorText.innerText = 'Invalid Username or Password.';
        } else {
            errorText.innerText = 'Authentication failed. Please try again.';
        }

        btnText.innerText = 'Sign In';
        btnSpinner.classList.add('d-none');
        loginBtn.disabled = false;
    }
}
