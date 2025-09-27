import {API_BASE, configReady} from "./config";

document.addEventListener("DOMContentLoaded", async () => {
    const resetBtn = document.getElementById("resetBtn");
    const usernameInput = document.getElementById("usernameInput");
    const messageDiv = document.getElementById("message");
    const token = localStorage.getItem("access_token");

    if (!token) {
        alert("You must log in first.");
        window.location.href = "login.html";
        return;
    }

    await configReady;

    resetBtn.addEventListener("click", async () => {
        const username = usernameInput.value.trim();
        if (!username) {
            messageDiv.innerHTML = `<div class="alert alert-danger">Please enter a username.</div>`;
            return;
        }

        if (!confirm(`Are you sure you want to reset password for "${username}"?`)) return;

        try {
            const response = await fetch(`${API_BASE}/reset-password/${username}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (response.ok) {
                const data = await response.json();
                messageDiv.innerHTML = `<div class="alert alert-success">${data.message}</div>`;
                usernameInput.value = "";
            } else {
                const error = await response.json().catch(() => ({}));
                messageDiv.innerHTML = `<div class="alert alert-danger">${error.detail || "Failed to reset password."}</div>`;
            }
        } catch (err) {
            console.error("Network error while resetting password", err);
            messageDiv.innerHTML = `<div class="alert alert-danger">Network error. Please try again.</div>`;
        }
    });
});
