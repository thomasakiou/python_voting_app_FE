// // config.js
// let API_BASE = "https://vmi2848672.contaboserver.net/api";

// async function loadConfig() {
//     try {
//         const res = await fetch("https://vmi2848672.contaboserver.net/api/config");
//         if (res.ok) {
//             const cfg = await res.json();
//             API_BASE = cfg.api_base_url;
//         } else {
//             API_BASE = window.location.origin + "/api";
//         }
//     } catch (e) {
//         console.error("Failed to load config, fallback to default:", e);
//         API_BASE = window.location.origin + "/api";
//     }
// }

// // Instead of top-level await, export a promise
// const configReady = loadConfig();

// // function getApiBase() {
// //     return API_BASE;
// // }
// //
// // export { configReady, getApiBase };
// export { API_BASE, configReady };



// // // config.js
// // export const API_BASE = (async () => {
// //     try {
// //         const res = await fetch("http://localhost:8000/config");
// //         if (res.ok) {
// //             const cfg = await res.json();
// //             return cfg.api_base_url;
// //         }
// //         return window.location.origin + "/api";
// //     } catch {
// //         return window.location.origin + "/api";
// //     }
// // })();


// config.js
let API_BASE = "https://vmi2848672.contaboserver.net/api";

async function loadConfig() {
    try {
        const res = await fetch(`${API_BASE}/config`);
        if (res.ok) {
            const cfg = await res.json();
            // If backend gives something different, still ensure /api stays in URL
            const url = new URL(cfg.api_base_url || API_BASE);
            API_BASE = `${url.origin}/api`;
        } else {
            API_BASE = `${window.location.origin}/api`;
        }
    } catch (e) {
        console.error("Failed to load config, fallback to default:", e);
        API_BASE = `${window.location.origin}/api`;
    }
}

const configReady = loadConfig();
export { API_BASE, configReady };
