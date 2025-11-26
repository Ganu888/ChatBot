const API_BASE = "/api/admin";

const state = {
    isSubmitting: false,
};

function setError(message = "") {
    const errorEl = document.getElementById("login-error");
    errorEl.textContent = message;
}

async function handleLogin(event) {
    event.preventDefault();
    if (state.isSubmitting) return;

    setError("");
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const remember = document.getElementById("remember").checked;

    if (!username || !password) {
        setError("Please enter username and password.");
        return;
    }

    state.isSubmitting = true;
    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "Unable to login.");
        }

        const sessionInfo = {
            username: data.admin.username,
            remember,
            timestamp: Date.now(),
        };
        localStorage.setItem("gp_admin_session", JSON.stringify(sessionInfo));
        window.location.href = "admin.html";
    } catch (error) {
        setError(error.message);
    } finally {
        state.isSubmitting = false;
    }
}

function togglePasswordVisibility(event) {
    const passwordInput = document.getElementById("password");
    const isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";
    event.currentTarget.textContent = isPassword ? "🙈" : "👁";
}

function initLoginPage() {
    const form = document.getElementById("login-form");
    form?.addEventListener("submit", handleLogin);

    document.querySelectorAll(".toggle-password").forEach((button) => {
        button.addEventListener("click", togglePasswordVisibility);
    });
}

document.addEventListener("DOMContentLoaded", initLoginPage);
