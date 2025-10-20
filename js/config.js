// config.js
let API_BASE = "https://vmi2848672.contaboserver.net/voting/";

async function loadConfig() {
    try {
        const res = await fetch("https://vmi2848672.contaboserver.net/voting/config");
        if (res.ok) {
            const cfg = await res.json();
            API_BASE = cfg.api_base_url;
        } else {
            API_BASE = window.location.origin + "/api";
        }
    } catch (e) {
        console.error("Failed to load config, fallback to default:", e);
        API_BASE = window.location.origin + "/api";
    }
}

// Instead of top-level await, export a promise
const configReady = loadConfig();

// function getApiBase() {
//     return API_BASE;
// }
//
// export { configReady, getApiBase };
export { API_BASE, configReady };



// // config.js
// export const API_BASE = (async () => {
//     try {
//         const res = await fetch("http://localhost:8000/config");
//         if (res.ok) {
//             const cfg = await res.json();
//             return cfg.api_base_url;
//         }
//         return window.location.origin + "/api";
//     } catch {
//         return window.location.origin + "/api";
//     }
// })();
