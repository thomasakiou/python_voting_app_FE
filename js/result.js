import {API_BASE, configReady} from "./config.js";

document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("access_token");
    const officeDropdown = document.getElementById("officeDropdown");
    const loadResultsBtn = document.getElementById("loadResultsBtn");
    const resultsTableBody = document.getElementById("resultsTableBody");

    if (!token) {
        alert("You must log in first.");
        window.location.href = "login.html";
        return;
    }

    await configReady;

    // Load offices into dropdown
    async function loadOffices() {
        try {
            const response = await fetch(`${API_BASE}/offices/`, {
                headers: {"Authorization": `Bearer ${token}`}
            });
            if (response.ok) {
                const offices = await response.json();
                officeDropdown.innerHTML = `<option value="">-- Select Office --</option>`;
                offices.forEach(office => {
                    const option = document.createElement("option");
                    option.value = office.office_code;
                    option.textContent = `${office.office_code} - ${office.description}`;
                    officeDropdown.appendChild(option);
                });
            } else {
                console.error("Failed to load offices");
            }
        } catch (err) {
            console.error("Network error while loading offices", err);
        }
    }

    // Load results for selected office
    async function loadResults() {
        const officeCode = officeDropdown.value;
        if (!officeCode) {
            alert("Please select an office.");
            return;
        }

        resultsTableBody.innerHTML = `<tr><td colspan="2">Loading results...</td></tr>`;

        try {
            const response = await fetch(`${API_BASE}/results/${officeCode}`, {
                headers: {"Authorization": `Bearer ${token}`}
            });

            if (response.ok) {
                const data = await response.json();
                const results = data.results;

                if (results.length === 0) {
                    resultsTableBody.innerHTML = `<tr><td colspan="2">No votes found for this office.</td></tr>`;
                    return;
                }

                resultsTableBody.innerHTML = "";
                results.forEach(result => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td>${result.candidate_name}</td>
                        <td>${result.vote_count}</td>
                    `;
                    resultsTableBody.appendChild(row);
                });
            } else {
                const error = await response.json().catch(() => ({}));
                resultsTableBody.innerHTML = `<tr><td colspan="2">Error loading results: ${error.detail || "Unknown error"}</td></tr>`;
            }
        } catch (err) {
            console.error("Network error while loading results.", err);
            resultsTableBody.innerHTML = `<tr><td colspan="2">Network error while loading results.</td></tr>`;
        }
    }

    // Event listeners
    loadResultsBtn.addEventListener("click", loadResults);

    // Initial load
    loadOffices();



    document.getElementById("exportResultsPDF").addEventListener("click", () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // ✅ Detect filter (office dropdown)
        const officeDropdown = document.getElementById("officeDropdown");
        let selectedOfficeText = "";
        if (officeDropdown && officeDropdown.selectedIndex > -1) {
            selectedOfficeText = officeDropdown.options[officeDropdown.selectedIndex].text;
        }

        // Build dynamic title
        let title = "Results Report";
        if (selectedOfficeText) {
            title = `Office of ${selectedOfficeText} Result`;
        }

        doc.text(title, 14, 15);

        // ✅ Get table
        const table = document.getElementById("resultsTable");
        if (!table) {
            alert("Results table not found.");
            return;
        }

        const rows = Array.from(table.querySelectorAll("tbody tr"));
        let headCells = Array.from(table.querySelectorAll("thead tr th")).map(
            (th) => th.textContent
        );

        const head = [["S/No", ...headCells]];

        // Body rows (keep all columns)
        const body = rows.map((tr, i) => {
            const cells = Array.from(tr.querySelectorAll("td")).map((td) => td.textContent);
            return [i + 1, ...cells];
        });

        // Generate PDF
        doc.autoTable({
            head: head,
            body: body,
            startY: 25,
            theme: "grid",
            headStyles: { fillColor: [41, 128, 185] },
        });

        // Safe filename also matches the header
        const safeFilename = title.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9-_]/g, "");
        doc.save(`${safeFilename}.pdf`);
    });


});
