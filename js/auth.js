// auth.js
function checkAuth(allowedRoles = []) {
    const token = localStorage.getItem("access_token");
    if (!token) {
        // No token → force login
        window.location.href = "login.html";
        return;
    }

    try {
        // Decode JWT payload
        const payload = JSON.parse(atob(token.split(".")[1]));
        const role = payload.role;

        if (!allowedRoles.includes(role)) {
            // Wrong role → kick out
            window.location.href = "login.html";
            return;
        }

        // Token valid and role allowed
        console.log("Access granted for role:", role);

    } catch (err) {
        console.error("Invalid token:", err);
        localStorage.removeItem("access_token");
        window.location.href = "login.html";
    }
}
