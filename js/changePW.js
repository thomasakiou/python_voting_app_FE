import {API_BASE, configReady} from "./config";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("changePasswordForm");
    const messageDiv = document.getElementById("message");

    form.addEventListener("submit", async (e) => {
        e.preventDefault(); // Prevent form submission

        const username = document.getElementById("username").value.trim();
        const oldPassword = document.getElementById("oldPassword").value.trim();
        const newPassword = document.getElementById("newPassword").value.trim();
        const confirmPassword = document.getElementById("confirmPassword").value.trim();

        if (!username || !oldPassword || !newPassword || !confirmPassword) {
            messageDiv.innerHTML = `<div class="alert alert-warning">All fields are required.</div>`;
            return;
        }

        if (newPassword !== confirmPassword) {
            messageDiv.innerHTML = `<div class="alert alert-danger">New passwords do not match.</div>`;
            return;
        }

        await configReady;

        try {
            // Note: Backend doesn't implement change-password endpoint yet
            // This is a placeholder for when the endpoint becomes available
            const response = await fetch(`${API_BASE}/change-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, old_password: oldPassword, new_password: newPassword })
            });

            if (response.ok) {
                const result = await response.json();
                messageDiv.innerHTML = `<div class="alert alert-success">${result.message}</div>`;
                form.reset();
            } else {
                const error = await response.json().catch(() => ({}));
                messageDiv.innerHTML = `<div class="alert alert-danger">${error.detail || "Failed to change password."}</div>`;
            }
        } catch (err) {
            console.error(err);
            messageDiv.innerHTML = `<div class="alert alert-danger">Network error while changing password.</div>`;
        }
    });
});
