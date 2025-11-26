// ========================
// Load Offices on Page Load
// ========================
import {API_BASE, configReady} from "./config.js";

// Pagination variables
let currentPage = 1;
const rowsPerPage = 10;
let allVotes = [];
let filteredVotes = [];

document.addEventListener("DOMContentLoaded", async () => {
    const officeSelect = document.getElementById("office_code");
    const token = localStorage.getItem("access_token");

    await configReady;

    try {
        const response = await fetch(`${API_BASE}/offices/`, {
            headers: { "Authorization": "Bearer " + token }
        });

        if (response.ok) {
            const offices = await response.json();
            offices.forEach(office => {
                const option = document.createElement("option");
                option.value = office.office_code;
                option.textContent = office.description;
                officeSelect.appendChild(option);
            });
        }
    } catch (err) {
        console.error("Failed to load offices", err);
    }

    // Initialize votes table
    document.getElementById('loadVotes')?.addEventListener('click', loadVotes);
    document.getElementById('votesSearch')?.addEventListener('input', (e) => {
        filterVotes(e.target.value.toLowerCase());
    });
});

// ========================
// Load Candidates for Office
// ========================
document.getElementById("office_code").addEventListener("change", async (e) => {
    const officeCode = e.target.value;
    const candidateSelect = document.getElementById("candidate_code");
    candidateSelect.innerHTML = `<option value="">-- Select Candidate --</option>`;

    if (!officeCode) return;

    const token = localStorage.getItem("access_token");

    try {
        const response = await fetch(`${API_BASE}/candidates/${officeCode}/candidates`, {
            headers: { "Authorization": "Bearer " + token }
        });

        if (response.ok) {
            const candidates = await response.json();
            candidates.forEach(candidate => {
                const option = document.createElement("option");
                option.value = candidate.candidate_code;
                option.textContent = candidate.name;
                candidateSelect.appendChild(option);
            });
        }
    } catch (err) {
        console.error("Failed to load candidates", err);
    }
});

// ========================
// CAST VOTE
// ========================
document.getElementById("voteForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const candidate_code = document.getElementById("candidate_code").value;
    const office_code = document.getElementById("office_code").value;
    const messageEl = document.getElementById("voteMessage");

    const token = localStorage.getItem("access_token");
    if (!token) {
        messageEl.style.color = "red";
        messageEl.textContent = "You must log in first.";
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/votes/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ candidate_code, office_code })
        });

        if (response.ok) {
            const data = await response.json();
            messageEl.style.color = "green";
            messageEl.textContent = `Vote cast successfully for ${data.candidate_name} as ${data.office_name}`;
        } else {
            const error = await response.json();
            messageEl.style.color = "red";
            messageEl.textContent = error.detail || "Vote failed.";
        }
    } catch (err) {
        messageEl.style.color = "red";
        messageEl.textContent = "Network error.";
    }
});

// ========================
// VOTES TABLE FUNCTIONS
// ========================
async function loadVotes() {
    const token = localStorage.getItem("access_token");
    const tbody = document.querySelector("#votesTable tbody");
    
    if (!token) {
        alert("You must log in first.");
        return;
    }

    try {
        tbody.innerHTML = "<tr><td colspan='6' class='text-center'>Loading votes...</td></tr>";
        const response = await fetch(`${API_BASE}/votes/`, {
            method: "GET",
            headers: { "Authorization": "Bearer " + token }
        });

        if (response.ok) {
            allVotes = await response.json();
            filteredVotes = [...allVotes];
            currentPage = 1;
            displayVotes();
            setupPagination();
        } else {
            const error = await response.json();
            throw new Error(error.detail || "Failed to load votes");
        }
    } catch (err) {
        console.error("Error loading votes:", err);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error: ${err.message || 'Failed to load votes'}</td></tr>`;
    }
}

function filterVotes(searchTerm) {
    if (!searchTerm) {
        filteredVotes = [...allVotes];
    } else {
        filteredVotes = allVotes.filter(vote => {
            return Object.values(vote).some(value => 
                String(value).toLowerCase().includes(searchTerm)
            );
        });
    }
    currentPage = 1;
    displayVotes();
    setupPagination();
}

function displayVotes() {
    const tbody = document.querySelector("#votesTable tbody");
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
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="6" class="text-center">No votes found</td>`;
        tbody.appendChild(tr);
        return;
    }

    // Render votes
    paginatedVotes.forEach((vote, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${start + index + 1}</td>
            <td>${vote.voter_username || 'N/A'}</td>
            <td>${vote.candidate_name || 'N/A'}</td>
            <td>${vote.office_name || 'N/A'}</td>
            <td>${vote.created_at ? new Date(vote.created_at).toLocaleString() : 'N/A'}</td>
            <td>${vote.status || 'Completed'}</td>
        `;
        tbody.appendChild(tr);
    });
}

function setupPagination() {
    const pageCount = Math.ceil(filteredVotes.length / rowsPerPage);
    const pagination = document.querySelector('.pagination');
    if (!pagination) return;
    
    pagination.innerHTML = '';

    if (pageCount <= 1) return;

    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = '<a class="page-link" href="#" aria-label="Previous">Previous</a>';
    prevLi.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage > 1) {
            currentPage--;
            displayVotes();
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
            displayVotes();
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
            displayVotes();
            setupPagination();
        }
    });
    pagination.appendChild(nextLi);
}
