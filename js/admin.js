document.addEventListener("DOMContentLoaded", async () => {
    const voterDropdown = document.getElementById("voterDropdown");
    const loadVotesBtn = document.getElementById("loadVotes");
    const tbody = document.querySelector("#votesTable tbody");
    const token = localStorage.getItem("access_token");

    if (!token) {
        alert("You must log in first.");
        return;
    }

    // ✅ Load voters into dropdown
    async function loadVoters() {
        try {
            const res = await fetch("http://localhost:8000/users/", {
                headers: { "Authorization": "Bearer " + token }
            });
            if (res.ok) {
                const users = await res.json();
                users.forEach(user => {
                    const opt = document.createElement("option");
                    opt.value = user.username;
                    opt.textContent = user.full_name || user.username;
                    voterDropdown.appendChild(opt);
                });
            }
        } catch (err) {
            console.error("Error loading voters:", err);
        }
    }

    // ✅ Render votes table
    function renderVotes(votes) {
        tbody.innerHTML = "";
        if (votes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4">No votes found.</td></tr>`;
            return;
        }
        votes.forEach(vote => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${vote.id}</td>
                <td>${vote.user_name}</td>
                <td>${vote.candidate_name}</td>
                <td>${vote.office_name}</td>
            `;
            tbody.appendChild(row);
        });
    }

    // ✅ Load votes (filtered by voter if selected)
    async function loadVotes() {
        tbody.innerHTML = "";
        let url = "http://localhost:8000/votes/";

        const selectedVoter = voterDropdown.value;
        if (selectedVoter) {
            url += encodeURIComponent(selectedVoter);
        }

        try {
            const response = await fetch(url, {
                headers: { "Authorization": "Bearer " + token }
            });

            if (response.ok) {
                const votes = await response.json();
                renderVotes(votes);
            } else if (response.status === 404) {
                tbody.innerHTML = `<tr><td colspan="4">No votes found for "${selectedVoter}".</td></tr>`;
            } else {
                alert("Failed to load votes.");
            }
        } catch (err) {
            console.error("Error loading votes:", err);
            alert("Network error while loading votes.");
        }
    }

    // Initial load
    await loadVoters();
    await loadVotes();

    // ✅ Reload votes when button is clicked
    loadVotesBtn.addEventListener("click", loadVotes);

    // ✅ Reload votes automatically when voter is changed
    voterDropdown.addEventListener("change", loadVotes);
});







//     // ========================
//     // GET ALL VOTES (ADMIN ONLY)
//     // ========================
//     document.addEventListener("DOMContentLoaded", () => {
//     const loadVotesBtn = document.getElementById("loadVotes");
//     const tbody = document.querySelector("#votesTable tbody");
//
//     async function loadVotes() {
//     const token = localStorage.getItem("access_token");
//     tbody.innerHTML = "";
//
//     if (!token) {
//     alert("You must log in first.");
//     return;
// }
//
//     try {
//     const response = await fetch("http://localhost:8000/votes/", {
//     method: "GET",
//     headers: { "Authorization": "Bearer " + token }
// });
//
//     if (response.ok) {
//     const votes = await response.json();
//
//     if (votes.length === 0) {
//     tbody.innerHTML = `<tr><td colspan="4">No votes found.</td></tr>`;
// } else {
//     votes.forEach(vote => {
//     const row = document.createElement("tr");
//     row.innerHTML = `
//                             <td>${vote.id}</td>
//                             <td>${vote.user_name}</td>
//                             <td>${vote.candidate_name}</td>
//                             <td>${vote.office_name}</td>
//                         `;
//     tbody.appendChild(row);
// });
// }
// } else {
//     const error = await response.json();
//     alert(error.detail || "Failed to load votes.");
// }
// } catch (err) {
//     alert("Network error.");
// }
// }
//
//     // ✅ Initial load on page load
//     loadVotes();
//
//     // ✅ Reload when button is clicked
//     loadVotesBtn.addEventListener("click", loadVotes);
// });
//
