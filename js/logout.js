// // ✅ Check auth on page load
// document.addEventListener("DOMContentLoaded", () => {
//     const token = localStorage.getItem("access_token");
//     if (!token) {
//         window.location.href = "login.html"; // redirect if no token
//     }
// });
//
// // ✅ Logout function
// function logout() {
//     localStorage.removeItem("access_token"); // clear token
//     sessionStorage.clear(); // clear session if used
//     window.location.href = "login.html"; // redirect to login
// }
//
// // ✅ Attach logout to button
// document.getElementById("logoutBtn").addEventListener("click", logout);
//
//
//



    // ✅ Decode JWT payload safely
    function parseJwt(token) {
    try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
} catch (e) {
    return null;
}
}

    // ✅ Auto-check token on page load
    document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
    window.location.href = "/index.html";
    return;
}

    const payload = parseJwt(token);
    if (!payload || !payload.exp) {
    logout(); // invalid token
    return;
}

    // Convert exp (seconds) to ms
    const expiryTime = payload.exp * 1000;
    const now = Date.now();

    if (now >= expiryTime) {
    logout(); // already expired
    return;
}

    // ✅ Schedule auto logout when it expires
    const timeout = expiryTime - now;
    setTimeout(logout, timeout);
});

    // ✅ Logout function
    function logout() {
    localStorage.removeItem("access_token");
    sessionStorage.clear();
    window.location.href = "/index.html";
}

    // ✅ Attach logout button
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
}

