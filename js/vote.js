// ========================
// Load Offices on Page Load
// ========================
document.addEventListener("DOMContentLoaded", async () => {
    const officeSelect = document.getElementById("office_code");
    const token = localStorage.getItem("access_token");

    try {
        const response = await fetch("http://localhost:8000/offices", {
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
        const response = await fetch(`http://localhost:8000/candidates/${officeCode}/candidates`, {
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
        const response = await fetch("http://localhost:8000/votes/", {
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
            messageEl.textContent = `Vote cast successfully for ${data.candidate_name} in ${data.office_name}`;
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
