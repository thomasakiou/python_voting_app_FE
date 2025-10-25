import { API_BASE, configReady } from "./config.js";

document.addEventListener("DOMContentLoaded", async () => {
    const voterDropdown = document.getElementById("voterDropdown");
    const candidateDropdown = document.getElementById("candidateDropdown");
    const loadVotesBtn = document.getElementById("loadVotes");
    const tbody = document.querySelector("#votesTable tbody");
    const token = localStorage.getItem("access_token");

    if (!token) {
        alert("You must log in first.");
        return;
    }

    await configReady;

    // ✅ Load voters into dropdown
    async function loadVoters() {
        try {
            const res = await fetch(`${API_BASE}/users/`, {
                headers: { Authorization: "Bearer " + token },
            });
            if (res.ok) {
                const users = await res.json();
                users.forEach((user) => {
                    const opt = document.createElement("option");
                    opt.value = user.id;
                    opt.textContent =
                        user.full_name || user.username || user.code;
                    voterDropdown.appendChild(opt);
                });
            }
        } catch (err) {
            console.error("Error loading voters:", err);
        }
    }

    // ✅ Load candidates into dropdown
    async function loadCandidates() {
        try {
            const res = await fetch(`${API_BASE}/candidates/`, {
                headers: { Authorization: "Bearer " + token },
            });
            if (res.ok) {
                const candidates = await res.json();
                candidates.forEach((cand) => {
                    const opt = document.createElement("option");
                    opt.value = cand.candidate_code; // backend expects candidate code
                    opt.textContent = cand.name || cand.code;
                    candidateDropdown.appendChild(opt);
                });
            }
        } catch (err) {
            console.error("Error loading candidates:", err);
        }
    }

    // ✅ Render votes table
    function renderVotes(votes) {
        tbody.innerHTML = "";
        if (votes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4">No votes found.</td></tr>`;
            return;
        }
        votes.forEach((vote) => {
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

    // ✅ Load votes based on dropdowns
    async function loadVotes() {
        tbody.innerHTML = "";
        let url = `${API_BASE}/votes/`;

        const selectedVoterId = parseInt(voterDropdown.value);
        const selectedCandidateCode = candidateDropdown.value;

        if (selectedVoterId) {
            url = `${API_BASE}/votes/${encodeURIComponent(selectedVoterId)}`;
        } else if (selectedCandidateCode) {
            url = `${API_BASE}/votes/code/${encodeURIComponent(selectedCandidateCode)}`;
        }

        try {
            const response = await fetch(url, {
                headers: { Authorization: "Bearer " + token },
            });

            if (response.ok) {
                const votes = await response.json();
                renderVotes(votes);
            } else if (response.status === 404) {
                tbody.innerHTML = `<tr><td colspan="4">No votes found.</td></tr>`;
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
    await loadCandidates();
    await loadVotes();

    // ✅ Reload votes on button click
    loadVotesBtn.addEventListener("click", loadVotes);

    // ✅ Reload votes when voter or candidate changes
    voterDropdown.addEventListener("change", loadVotes);
    candidateDropdown.addEventListener("change", loadVotes);







// ✅ Export table to PDF with dynamic title + filename + serial number
    document.getElementById("exportPDF").addEventListener("click", () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Figure out filter
        const selectedVoter = voterDropdown.options[voterDropdown.selectedIndex]?.text;
        const selectedCandidate = candidateDropdown.options[candidateDropdown.selectedIndex]?.text;

        let title = "Votes Report"; // default
        if (voterDropdown.value) {
            title = `Votes by Voter - ${selectedVoter}`;
        } else if (candidateDropdown.value) {
            title = `Votes by Candidate - ${selectedCandidate}`;
        }

        // Title in PDF
        doc.text(title, 14, 15);

        // Build table manually (to inject S/No column)
        const table = document.getElementById("votesTable");
        const rows = Array.from(table.querySelectorAll("tbody tr"));

        // ❌ Skip the first header cell (ID)
        const headCells = Array.from(table.querySelectorAll("thead tr th"))
            .slice(1) // remove first column
            .map((th) => th.textContent);

        // Add S/No as the first column header
        const head = [["S/No", ...headCells]];

        // Build body with serial number, skipping first <td>
        const body = rows.map((tr, i) => [
            i + 1, // serial number
            ...Array.from(tr.querySelectorAll("td"))
                .slice(1) // remove first column
                .map((td) => td.textContent),
        ]);

        // Render table
        doc.autoTable({
            head: head,
            body: body,
            startY: 25,
            theme: "grid",
            headStyles: { fillColor: [41, 128, 185] },
        });

        // Dynamic filename
        const safeFilename = title.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9-_]/g, "");
        doc.save(`${safeFilename}.pdf`);
    });




    // // ✅ Export table to PDF
    // document.getElementById("exportPDF").addEventListener("click", () => {
    //     const { jsPDF } = window.jspdf;
    //     const doc = new jsPDF();
    //
    //     doc.text("Votes Report", 14, 15);
    //
    //     // Use autoTable plugin
    //     doc.autoTable({
    //         html: "#votesTable",  // directly from your table element
    //         startY: 20,
    //         theme: "grid",
    //         headStyles: { fillColor: [41, 128, 185] }, // nice blue header
    //     });
    //
    //     // Save as PDF
    //     doc.save("votes_report.pdf");
    // });

});
