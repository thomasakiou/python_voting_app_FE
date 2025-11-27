import { API_BASE, configReady } from "./config.js";

// Pagination variables
let currentPage = 1;
const rowsPerPage = 10;
let allVotes = [];
let filteredVotes = [];
let token;

document.addEventListener("DOMContentLoaded", async () => {
    const voterDropdown = document.getElementById("voterDropdown");
    const candidateDropdown = document.getElementById("candidateDropdown");
    const loadVotesBtn = document.getElementById("loadVotes");
    const tbody = document.querySelector("#votesTable tbody");
    token = localStorage.getItem("access_token");

    if (!token) {
        alert("You must log in first.");
        return;
    }

    await configReady;

    // Load voters into dropdown
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
                    opt.textContent = user.full_name || user.username || user.code;
                    voterDropdown.appendChild(opt);
                });
            }
        } catch (err) {
            console.error("Error loading voters:", err);
        }
    }

    // Load candidates into dropdown
    async function loadCandidates() {
        try {
            const res = await fetch(`${API_BASE}/candidates/`, {
                headers: { Authorization: "Bearer " + token },
            });
            if (res.ok) {
                const candidates = await res.json();
                candidates.forEach((cand) => {
                    const opt = document.createElement("option");
                    opt.value = cand.candidate_code;
                    opt.textContent = cand.name || cand.code;
                    candidateDropdown.appendChild(opt);
                });
            }
        } catch (err) {
            console.error("Error loading candidates:", err);
        }
    }

    // Render paginated votes
    function renderVotes() {
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const paginatedVotes = filteredVotes.slice(start, end);
        const total = filteredVotes.length;

        // Update entries info
        const entriesInfo = document.querySelector('.entries-info');
        const showingFrom = total > 0 ? start + 1 : 0;
        const showingTo = Math.min(end, total);
        if (entriesInfo) {
            entriesInfo.textContent = `Showing ${showingFrom} to ${showingTo} of ${total} entries`;
        }

        // Clear and rebuild table rows
        tbody.innerHTML = '';
        if (paginatedVotes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No votes found</td></tr>';
            return;
        }

        // Render votes
        paginatedVotes.forEach((vote, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${start + index + 1}</td>
                <td>${vote.user_name || 'N/A'}</td>
                <td>${vote.candidate_name || 'N/A'}</td>
                <td>${vote.office_name || 'N/A'}</td>
                <td>${vote.created_at ? new Date(vote.created_at).toLocaleString() : 'N/A'}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Setup pagination controls
    function setupPagination() {
        const pageCount = Math.ceil(filteredVotes.length / rowsPerPage);
        const pagination = document.querySelector('.pagination');
        if (!pagination) return;
        
        pagination.innerHTML = '';

        if (pageCount <= 1) {
            pagination.style.display = 'none';
            return;
        } else {
            pagination.style.display = 'flex';
        }

        // Previous button
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = '<a class="page-link" href="#" aria-label="Previous">Previous</a>';
        prevLi.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage > 1) {
                currentPage--;
                renderVotes();
                setupPagination();
            }
        });
        pagination.appendChild(prevLi);

        // Page numbers
        for (let i = 1; i <= pageCount; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === currentPage ? 'active' : ''}`;
            const a = document.createElement('a');
            a.className = 'page-link';
            a.href = '#';
            a.textContent = i;
            a.addEventListener('click', (e) => {
                e.preventDefault();
                currentPage = i;
                renderVotes();
                setupPagination();
            });
            li.appendChild(a);
            pagination.appendChild(li);
        }

        // Next button
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${currentPage === pageCount ? 'disabled' : ''}`;
        nextLi.innerHTML = '<a class="page-link" href="#" aria-label="Next">Next</a>';
        nextLi.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage < pageCount) {
                currentPage++;
                renderVotes();
                setupPagination();
            }
        });
        pagination.appendChild(nextLi);
    }

    // Load votes with pagination
    async function loadVotes() {
        const tbody = document.querySelector("#votesTable tbody");
        tbody.innerHTML = "<tr><td colspan='6' class='text-center'>Loading votes...</td></tr>";

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
                allVotes = await response.json();
                filteredVotes = [...allVotes];
                currentPage = 1;
                renderVotes();
                setupPagination();
                
                // Add search functionality
                const searchInput = document.getElementById('votesSearch');
                if (searchInput) {
                    searchInput.addEventListener('input', (e) => {
                        const searchTerm = e.target.value.toLowerCase();
                        if (searchTerm) {
                            filteredVotes = allVotes.filter(vote => {
                                return Object.values(vote).some(value => 
                                    String(value).toLowerCase().includes(searchTerm)
                                );
                            });
                        } else {
                            filteredVotes = [...allVotes];
                        }
                        currentPage = 1;
                        renderVotes();
                        setupPagination();
                    });
                }
            } else if (response.status === 404) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center">No votes found.</td></tr>';
            } else {
                throw new Error('Failed to load votes');
            }
        } catch (err) {
            console.error("Error loading votes:", err);
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading votes</td></tr>';
        }
    }

    // Initial load
    await loadVoters();
    await loadCandidates();
    await loadVotes();

    // Event listeners
    loadVotesBtn?.addEventListener("click", loadVotes);
    voterDropdown?.addEventListener("change", loadVotes);
    candidateDropdown?.addEventListener("change", loadVotes);

    // Export to PDF
    document.getElementById("exportPDF")?.addEventListener("click", () => {
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

        // Get all votes (not just the current page)
        const allRows = filteredVotes.map((vote, index) => [
            index + 1,
            vote.user_name || 'N/A',
            vote.candidate_name || 'N/A',
            vote.office_name || 'N/A',
            vote.created_at ? new Date(vote.created_at).toLocaleString() : 'N/A'
        ]);

        // Render table
        doc.autoTable({
            head: [['#', 'Voter', 'Candidate', 'Office Voted For', 'Date']],
            body: allRows,
            startY: 25,
            theme: "grid",
            headStyles: { fillColor: [41, 128, 185] },
        });

        // Dynamic filename
        const safeFilename = title.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9-_]/g, "");
        doc.save(`${safeFilename}.pdf`);
    });
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

// });
