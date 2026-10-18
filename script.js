/**
 * NexSociety - Portal Authentication & Session Router
 * Clean, human-written logic for role switcher, demo fills & redirect
 */

document.addEventListener("DOMContentLoaded", () => {
    const roleButtons = document.querySelectorAll(".role-tab-btn");
    const selectedRoleInput = document.getElementById("selectedRole");
    const loginForm = document.getElementById("loginForm");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const showPasswordBtn = document.getElementById("showPassword");
    const forgotPasswordLink = document.getElementById("forgotPassword");
    const submitBtn = document.getElementById("submitBtn");

    // ----------------------------------------------------
    // Role Switching
    // ----------------------------------------------------
    roleButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            roleButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const role = btn.dataset.role;
            selectedRoleInput.value = role;

            // Auto-populate demo credentials matching role for convenience
            if (role === "security") {
                emailInput.value = "guard@nexsociety.in";
                passwordInput.value = "admin123";
            } else if (role === "resident") {
                emailInput.value = "A-101";
                passwordInput.value = "Jetha101";
            } else if (role === "admin") {
                emailInput.value = "admin@nexsociety.in";
                passwordInput.value = "admin123";
            }
        });
    });

    // ----------------------------------------------------
    // Show / Hide Password
    // ----------------------------------------------------
    showPasswordBtn.addEventListener("click", () => {
        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            showPasswordBtn.textContent = "Hide";
        } else {
            passwordInput.type = "password";
            showPasswordBtn.textContent = "Show";
        }
    });

    // ----------------------------------------------------
    // Forgot Password Action
    // ----------------------------------------------------
    forgotPasswordLink.addEventListener("click", (e) => {
        e.preventDefault();
        showToast("Please contact the NexSociety Administrator desk at Tower A.", "⚠️");
    });

    // ----------------------------------------------------
    // Form Submission & Dashboard Routing
    // ----------------------------------------------------
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        const role = selectedRoleInput.value;

        if (!email || !password) {
            showToast("Please enter both email and password.", "⚠️");
            return;
        }

        submitBtn.classList.add("loading");

        let apiRes = null;
        if (window.NexAPI) {
            try {
                apiRes = await NexAPI.login(email, password, role);
            } catch (e) {}
        }

        // Direct fetch fallback if NexAPI was not available or threw
        if (!apiRes || apiRes.status === "offline") {
            try {
                const targetUrl = (window.location.port === "5000") ? "/api/auth/login" : "http://localhost:5000/api/auth/login";
                const res = await fetch(targetUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password, role })
                });
                apiRes = await res.json();
            } catch (err) {
                try {
                    const res2 = await fetch("http://127.0.0.1:5000/api/auth/login", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email, password, role })
                    });
                    apiRes = await res2.json();
                } catch (err2) {
                    submitBtn.classList.remove("loading");
                    showToast("Cannot connect to backend server. Please open http://localhost:5000 in browser.", "❌");
                    return;
                }
            }
        }

        // STRICT CHECK: IF NOT SUCCESS, DO NOT REDIRECT!
        if (!apiRes || !apiRes.success) {
            submitBtn.classList.remove("loading");
            showToast(apiRes ? apiRes.message : "Incorrect password or User ID.", "❌");
            return; // STOP EXECUTION!
        }

        // Login succeeded: save token and user metadata
        localStorage.setItem("nexSocietyToken", apiRes.token);
        if (apiRes.user) {
            localStorage.setItem("nexSocietyUserData", JSON.stringify(apiRes.user));
        }

        localStorage.setItem("nexSocietyRole", role);
        localStorage.setItem("nexSocietyUser", email);

        showToast("Authentication verified! Connecting to portal...", "✓");

        setTimeout(() => {
            if (role === "security") {
                window.location.href = "security.html";
            } else if (role === "resident") {
                window.location.href = "resident.html";
            } else if (role === "admin") {
                window.location.href = "admin.html";
            } else {
                window.location.href = "security.html";
            }
        }, 500);
    });
});

// --------------------------------------------------------
// 1-Click Demo Account Quick Fill Helper
// --------------------------------------------------------
function quickFill(role) {
    const roleBtn = document.querySelector(`.role-tab-btn[data-role="${role}"]`);
    if (roleBtn) roleBtn.click();
    if (role === "resident") {
        document.getElementById("email").value = "A-101";
        document.getElementById("password").value = "Jetha101";
        showToast("Loaded Jethalal (Flat A-101) credentials. Click 'Authenticate'!", "🏠");
    } else if (role === "security") {
        document.getElementById("email").value = "guard@nexsociety.in";
        document.getElementById("password").value = "admin123";
        showToast("Loaded Gate Security credentials. Click 'Authenticate'!", "🛡️");
    } else if (role === "admin") {
        document.getElementById("email").value = "admin@nexsociety.in";
        document.getElementById("password").value = "admin123";
        showToast("Loaded Admin credentials. Click 'Authenticate'!", "⚙️");
    }
}

// --------------------------------------------------------
// Toast Notification Utility
// --------------------------------------------------------
let toastTimeout = null;
function showToast(message, icon = "ℹ️") {
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toastMessage");
    const toastIcon = document.getElementById("toastIcon");

    if (!toast) return;

    toastMessage.textContent = message;
    if (toastIcon) toastIcon.textContent = icon;

    toast.classList.add("active");
    toast.classList.add("show");

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove("active");
        toast.classList.remove("show");
    }, 2800);
}
