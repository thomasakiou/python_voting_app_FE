import {API_BASE, configReady} from "./config.js";

function parseJwt(token) {
    try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
            atob(base64).split("").map((c) =>
                "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
            ).join("")
        );
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Invalid token", e);
        return {};
    }
}

// ========================
// LOGIN LOGIC
// ========================
document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    await configReady;

    // const API_BASE = getApiBase();
    // console.log(API_BASE);

    const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: formData
    });

    const messageEl = document.getElementById("message");

    if (response.ok) {
        const data = await response.json();
        localStorage.setItem("access_token", data.access_token);

        // Decode token
        const payload = parseJwt(data.access_token);
        const role = payload.role;

        console.log("Decoded role:", role); // Debug

        // 🚨 Force password change if default
        if (password === "Vote@123") {
            messageEl.style.color = "orange";
            messageEl.textContent = "You must change your password before continuing.";

            // Pre-fill username in modal
            document.getElementById("modalUsername").value = username;

            // Show modal immediately
            const modal = new bootstrap.Modal(document.getElementById("userModal"));
            modal.show();

            return; // Stop redirect
        }

        messageEl.style.color = "green";
        messageEl.textContent = "Login successful! Redirecting...";

        // Normal redirect if not using default password
        setTimeout(() => {
            if (role === "admin" || role === "super-admin") {
                window.location.href = "html/admin.html";
            } else if (role === "voter") {
                window.location.href = "html/vote.html";
            }
        }, 500);
    } else {
        const error = await response.json();
        messageEl.style.color = "red";
        messageEl.textContent = error.detail || "Login failed!";
    }
});

// ========================
// CHANGE PASSWORD LOGIC
// ========================
document.getElementById("savePasswordBtn").addEventListener("click", async () => {
    const username = document.getElementById("modalUsername").value;
    const oldPassword = document.getElementById("modalOldPassword").value;
    const newPassword = document.getElementById("modalNewPassword").value;

    if (!username || !oldPassword || !newPassword) {
        alert("Please fill in all fields.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/change-password`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: username,
                old_password: oldPassword,
                new_password: newPassword
            })
        });

        if (response.ok) {
            const result = await response.json();
            alert(result.message || "Password changed successfully!");

            // Reset form
            document.getElementById("changePasswordForm").reset();

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById("userModal"));
            modal.hide();

            // Redirect to login so they re-authenticate
            localStorage.removeItem("access_token");
            window.location.href = "/index.html";
        } else {
            const error = await response.json();
            alert(error.detail || "Failed to change password.");
        }
    } catch (err) {
        console.error("Error while changing password:", err);
        alert("Network error while changing password.");
    }
});
