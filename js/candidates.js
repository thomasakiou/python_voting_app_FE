import {API_BASE, configReady} from "./config.js";

document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("access_token");
    const loadCandidatesBtn = document.getElementById("loadCandidates");
    const officeDropdownFilter = document.getElementById("officeDropdown"); // filter dropdown
    const tbody = document.querySelector("#candidatesTable tbody");
    const candidateModalEl = document.getElementById("candidateModal");
    const saveBtn = candidateModalEl.querySelector(".modal-footer .btn-primary");
    const candidateModal = new bootstrap.Modal(candidateModalEl);
    const inputCandidateCode = document.getElementById("inputCandidateCode");
    const inputName = document.getElementById("inputName");
    const inputOfficeCode = document.getElementById("inputOfficeCode"); // dropdown for office selection

    let editingCandidateId = null;

    if (!token) {
        alert("You must log in first.");
        window.location.href = "/index.html";
        return;
    }

    await configReady;

    // Load offices into both filter and modal dropdown
    async function loadOffices() {
        try {
            const response = await fetch(`${API_BASE}/offices/`, {
                headers: {"Authorization": `Bearer ${token}`}
            });
            if (response.ok) {
                const offices = await response.json();

                // Filter dropdown
                officeDropdownFilter.innerHTML = `<option value="">-- Select an Office --</option>`;
                offices.forEach(office => {
                    const option = document.createElement("option");
                    option.value = office.office_code;
                    option.textContent = `${office.office_code} - ${office.description}`;
                    officeDropdownFilter.appendChild(option);
                });

                // Modal dropdown
                inputOfficeCode.innerHTML = `<option value="">-- Select an Office --</option>`;
                offices.forEach(office => {
                    const option = document.createElement("option");
                    option.value = office.office_code;
                    option.textContent = `${office.office_code} - ${office.description}`;
                    inputOfficeCode.appendChild(option);
                });
            }
        } catch (err) {
            console.warn("Error loading offices", err);
        }
    }

    // Load candidates
    async function loadCandidates() {
        tbody.innerHTML = "";
        const officeCode = officeDropdownFilter.value;
        const url = officeCode
            ? `${API_BASE}/candidates/${officeCode}/candidates`
            : `${API_BASE}/candidates/`;

        try {
            const response = await fetch(url, {
                headers: {"Authorization": `Bearer ${token}`}
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                alert(error.detail || "Failed to load candidates.");
                return;
            }

            const candidates = await response.json();
            if (candidates.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5">No candidates found.</td></tr>`;
            } else {
                candidates.forEach(candidate => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td>${candidate.candidate_code}</td>
                        <td>${candidate.name}</td>
                        <td>${candidate.office.office_code}</td>
                        <td>${candidate.office.description}</td>
                        <td style="display: flex; gap: 8px;">
                            <button class="btn btn-danger btn-sm delete-btn" data-id="${candidate.id}">Delete</button>
                            <button class="btn btn-primary btn-sm update-btn" 
                                data-id="${candidate.id}" 
                                data-code="${candidate.candidate_code}" 
                                data-name="${candidate.name}" 
                                data-office="${candidate.office.office_code}">
                                Update
                            </button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });

                // Delete listeners
                tbody.querySelectorAll(".delete-btn").forEach(btn => {
                    btn.addEventListener("click", async (e) => {
                        const candidateId = e.target.dataset.id;
                        if (!confirm("Are you sure you want to delete this candidate?")) return;
                        try {
                            const response = await fetch(`${API_BASE}/candidates/${candidateId}`, {
                                method: "DELETE",
                                headers: {"Authorization": `Bearer ${token}`}
                            });
                            if (response.ok) {
                                alert("Candidate deleted successfully!");
                                loadCandidates();
                            } else {
                                const error = await response.json();
                                alert(error.detail || "Failed to delete candidate.");
                            }
                        } catch (err) {
                            console.error("Network error while deleting candidate.", err);
                            alert("Network error while deleting candidate.");
                        }
                    });
                });

                // Update listeners
                tbody.querySelectorAll(".update-btn").forEach(btn => {
                    btn.addEventListener("click", (e) => {
                        editingCandidateId = e.target.dataset.id;
                        inputCandidateCode.value = e.target.dataset.code;
                        inputName.value = e.target.dataset.name;
                        inputOfficeCode.value = e.target.dataset.office; // select correct office
                        candidateModal.show();
                    });
                });
            }
        } catch (err) {
            console.error("Network error while loading candidates.", err);
        }
    }


    // Save or update candidate
    saveBtn.addEventListener("click", async () => {
        const candidateCode = inputCandidateCode.value.trim();
        const name = inputName.value.trim();
        const officeCode = inputOfficeCode.value;

        if (!candidateCode || !name || !officeCode) {
            alert("Please fill in Candidate Code, Name, and select an Office.");
            return;
        }

        try {
            let response;
            if (editingCandidateId) {
                // Update candidate
                response = await fetch(`${API_BASE}/candidates/${editingCandidateId}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({candidate_code: candidateCode, name, office_code: officeCode})
                });
            } else {
                // Create candidate
                response = await fetch(`${API_BASE}/candidates/`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({candidate_code: candidateCode, name, office_code: officeCode})
                });
            }

            if (response.ok) {
                alert(editingCandidateId ? "Candidate updated successfully!" : "Candidate created successfully!");
                inputCandidateCode.value = "";
                inputName.value = "";
                inputOfficeCode.value = "";
                candidateModal.hide();
                editingCandidateId = null;
                loadCandidates();
            } else {
                const error = await response.json();
                alert(error.detail || "Failed to save candidate.");
            }
        } catch (err) {
            console.error("Network error while saving candidate.", err);
            alert("Network error while saving candidate.");
        }
    });

    // Event listeners
    loadCandidatesBtn.addEventListener("click", loadCandidates);
    officeDropdownFilter.addEventListener("change", loadCandidates);

    // Initial load
    loadOffices();
    loadCandidates();



    // ✅ Export candidates table to PDF with S/No + dynamic filename
    document.getElementById("exportCandidatesPDF").addEventListener("click", () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const title = "Candidates Report";
        doc.text(title, 14, 15);

        const table = document.getElementById("candidatesTable");
        const rows = Array.from(table.querySelectorAll("tbody tr"));
        let headCells = Array.from(table.querySelectorAll("thead tr th")).map(
            (th) => th.textContent
        );

        // ❌ Remove last column from head
        headCells = headCells.slice(0, -1);

        const head = [["S/No", ...headCells]];

        // Build body without last column
        const body = rows.map((tr, i) => {
            const cells = Array.from(tr.querySelectorAll("td")).map((td) => td.textContent);
            cells.pop(); // ❌ remove last column
            return [i + 1, ...cells];
        });

        doc.autoTable({
            head: head,
            body: body,
            startY: 25,
            theme: "grid",
            headStyles: { fillColor: [41, 128, 185] },
        });

        const safeFilename = title.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9-_]/g, "");
        doc.save(`${safeFilename}.pdf`);
    });

});





// document.addEventListener("DOMContentLoaded", () => {
//     const token = localStorage.getItem("access_token");
//     const loadCandidatesBtn = document.getElementById("loadCandidates");
//     const tbody = document.querySelector("#candidatesTable tbody");
//     const candidateModalEl = document.getElementById("candidateModal");
//     const saveBtn = candidateModalEl.querySelector(".modal-footer .btn-primary");
//
//     if (!token) {
//         alert("You must log in first.");
//         window.location.href = "login.html";
//         return;
//     }
//
//     // Load offices from backend
//     async function loadCandidates() {
//         tbody.innerHTML = "";
//         try {
//             const response = await fetch("http://localhost:8000/candidates/", {
//                 method: "GET",
//                 headers: { "Authorization": "Bearer " + token }
//             });
//
//             if (response.ok) {
//                 const candidates = await response.json();
//                 candidates.forEach(candidate => {
//                     const row = document.createElement("tr");
//                     row.innerHTML = `
//                              <td>${candidate.candidate_code}</td>
//                              <td>${candidate.name}</td>
//                              <td>${candidate.office.office_code}</td>
//
//                     `;
//                     tbody.appendChild(row);
//                 });
//             } else {
//                 const error = await response.json();
//                 alert(error.detail || "Failed to load candidates.");
//             }
//         } catch (err) {
//             console.error(err);
//             alert("Network error while loading candidates.");
//         }
//     }
//
//     // Event listener for Load Offices button
//     loadCandidatesBtn?.addEventListener("click", loadCandidates);
//
//     // Save new office from modal
//     saveBtn.addEventListener("click", async () => {
//         const candidateCode = document.getElementById("inputCandidateCode").value.trim();
//         // const name = document.getElementById("inputPassword4").value.trim();
//         const name = document.getElementById("inputName").value.trim();
//         const  officeCode= document.getElementById("inputOfficeCode").value.trim();
//
//         if (!officeCode || !name || !candidateCode) {
//             alert("Please fill in both Candidate Code, Name and Office Code.");
//             return;
//         }
//
//         try {
//             const response = await fetch("http://localhost:8000/candidates/", {
//                 method: "POST",
//                 headers: {
//                     "Content-Type": "application/json",
//                     "Authorization": `Bearer ${token}`
//                 },
//                 body: JSON.stringify({ candidate_code: candidateCode, name, office_code: officeCode }),
//             });
//
//             if (response.ok) {
//                 const newCandidate = await response.json();
//                 alert("Candidate created successfully!");
//
//                 // Add new office to table
//                 const row = document.createElement("tr");
//                 row.innerHTML = `
//                     <td>${newCandidate.id}</td>
//                     <td>${newCandidate.office_code}</td>
//                     <td>${newCandidate.name}</td>
//                     <td>${newCandidate.candidate_code}</td>
//                 `;
//                 tbody.appendChild(row);
//
//                 // Close modal
//                 const modal = bootstrap.Modal.getInstance(candidateModalEl);
//                 modal.hide();
//
//                 // Clear inputs
//                 document.getElementById("inputCandidateCode").value = "";
//                 document.getElementById("inputName").value = "";
//                 document.getElementById("inputOfficeCode").value = "";
//
//             } else {
//                 const error = await response.json();
//                 alert(error.detail || "Failed to create candidate.");
//             }
//         } catch (err) {
//             console.error(err);
//             alert("Network error while creating candidate.");
//         }
//     });
//
//     // Initial load on page load
//     loadCandidates();
// });







// document.addEventListener("DOMContentLoaded", () => {
//     const token = localStorage.getItem("access_token");
//     const officeDropdown = document.getElementById("officeDropdown");
//     const loadCandidatesBtn = document.getElementById("loadCandidates");
//     const tbody = document.querySelector("#candidatesTable tbody");
//
//     if (!token) {
//         alert("You must log in first.");
//         window.location.href = "login.html";
//         return;
//     }
//
//     // Load offices into dropdown
//     async function loadOffices() {
//         try {
//             const response = await fetch("http://localhost:8000/offices/", {
//                 headers: { "Authorization": "Bearer " + token }
//             });
//
//             if (response.ok) {
//                 const offices = await response.json();
//                 offices.forEach(office => {
//                     const option = document.createElement("option");
//                     option.value = office.office_code;
//                     option.textContent = office.description;
//                     officeDropdown.appendChild(option);
//                 });
//             } else {
//                 console.warn("Failed to load offices.");
//             }
//         } catch (err) {
//             console.warn("Network error while loading offices.", err);
//         }
//     }
//
//     // Load candidates (all or by office)
//     async function loadCandidates() {
//         const officeCode = officeDropdown.value;
//         tbody.innerHTML = "";
//
//         try {
//             let url = "";
//
//             if (officeCode) {
//                 // Load only for selected office
//                 url = `http://localhost:8000/candidates/${officeCode}/candidates`;
//             } else {
//                 // Load all candidates if nothing selected
//                 url = "http://localhost:8000/candidates/";
//             }
//
//             const response = await fetch(url, {
//                 headers: { "Authorization": "Bearer " + token }
//             });
//
//             if (response.ok) {
//                 const candidates = await response.json();
//                 if (candidates.length === 0) {
//                     const row = document.createElement("tr");
//                     row.innerHTML = `<td colspan="4">No candidates found.</td>`;
//                     tbody.appendChild(row);
//                 } else {
//                     candidates.forEach(candidate => {
//                         const row = document.createElement("tr");
//                         row.innerHTML = `
//                             <td>${candidate.candidate_code}</td>
//                             <td>${candidate.name}</td>
//                             <td>${candidate.office.office_code}</td>
//                             <td>${candidate.office.description}</td>
//                         `;
//                         tbody.appendChild(row);
//                     });
//                 }
//             } else if (response.status !== 404) {
//                 // Show only real errors (skip 404 silently)
//                 const error = await response.json().catch(() => ({}));
//                 alert(error.detail || "Failed to load candidates.");
//             }
//         } catch (err) {
//             console.warn("Network error while loading candidates.", err);
//         }
//     }
//
//     // Event listeners
//     if (loadCandidatesBtn) {
//         loadCandidatesBtn.addEventListener("click", loadCandidates);
//     }
//     if (officeDropdown) {
//         officeDropdown.addEventListener("change", loadCandidates);
//     }
//
//     // Initial load
//     loadOffices();
// });
//
//
//
//
// //
// // // ========================
// // // GET ALL VOTES (ADMIN ONLY)
// // // ========================
// // document.getElementById("loadCandidates").addEventListener("click", async () => {
// //     const token = localStorage.getItem("access_token");
// //     const tbody = document.querySelector("#candidatesTable tbody");
// //     tbody.innerHTML = "";
// //
// //     if (!token) {
// //         alert("You must log in first.");
// //         return;
// //     }
// //
// //     try {
// //         const response = await fetch("http://localhost:8000/candidates/", {
// //             method: "GET",
// //             headers: { "Authorization": "Bearer " + token }
// //         });
// //
// //         if (response.ok) {
// //             const candidates = await response.json();
// //             candidates.forEach(candidate => {
// //                 const row = document.createElement("tr");
// //                 row.innerHTML = `
// //                     <td>${candidate.candidate_code}</td>
// //                     <td>${candidate.name}</td>
// //                     <td>${candidate.office.office_code}</td>
// //                     <td>${candidate.office.description}</td>
// //
// //                 `;
// //                 tbody.appendChild(row);
// //             });
// //         } else {
// //             const error = await response.json();
// //             alert(error.detail || "Failed to load votes.");
// //         }
// //     } catch (err) {
// //         alert("Network error.");
// //     }
// // });
// //
// //
// //
// // // ========================
// // // LOAD OFFICES INTO DROPDOWN
// // // ========================
// // document.getElementById("loadOffices").addEventListener("click", async () => {
// //     const token = localStorage.getItem("access_token");
// //     const dropdown = document.getElementById("officeDropdown");
// //     dropdown.innerHTML = `<option value="">-- Select an Office --</option>`;
// //
// //     if (!token) {
// //         alert("You must log in first.");
// //         return;
// //     }
// //
// //     try {
// //         const response = await fetch("http://localhost:8000/offices/", {
// //             method: "GET",
// //             headers: { "Authorization": "Bearer " + token }
// //         });
// //
// //         if (response.ok) {
// //             const offices = await response.json();
// //             offices.forEach(office => {
// //                 const option = document.createElement("option");
// //                 option.value = office.office_code;
// //                 option.textContent = `${office.office_code} - ${office.description}`;
// //                 dropdown.appendChild(option);
// //             });
// //         } else {
// //             const error = await response.json();
// //             alert(error.detail || "Failed to load offices.");
// //         }
// //     } catch (err) {
// //         alert("Network error.");
// //     }
// // });
// //
// // // ========================
// // // FETCH CANDIDATES BY OFFICE
// // // ========================
// // document.getElementById("officeDropdown").addEventListener("change", async (e) => {
// //     const officeCode = e.target.value;
// //     const token = localStorage.getItem("access_token");
// //     const tbody = document.querySelector("#candidatesTable tbody");
// //     tbody.innerHTML = "";
// //
// //     if (!officeCode) return; // if no office selected, do nothing
// //
// //     try {
// //         const response = await fetch(`http://localhost:8000/${officeCode}/candidates`, {
// //             method: "GET",
// //             headers: { "Authorization": "Bearer " + token }
// //         });
// //
// //         if (response.ok) {
// //             const candidates = await response.json();
// //             candidates.forEach(candidate => {
// //                 const row = document.createElement("tr");
// //                 row.innerHTML = `
// //                     <td>${candidate.candidate_code}</td>
// //                     <td>${candidate.name}</td>
// //                     <td>${candidate.office.office_code}</td>
// //                     <td>${candidate.office.description}</td>
// //                 `;
// //                 tbody.appendChild(row);
// //             });
// //         } else {
// //             const error = await response.json();
// //             alert(error.detail || "Failed to load candidates.");
// //         }
// //     } catch (err) {
// //         alert("Network error.");
// //     }
// // });
// //
//
//
// // document.addEventListener("DOMContentLoaded", () => {
// //     const token = localStorage.getItem("access_token");
// //     const officeDropdown = document.getElementById("officeDropdown");
// //     const loadCandidatesBtn = document.getElementById("loadCandidates");
// //     const tbody = document.querySelector("#candidatesTable tbody");
// //
// //     if (!token) {
// //         alert("You must log in first.");
// //         window.location.href = "login.html";
// //         return;
// //     }
// //
// //     // Load offices into dropdown
// //     async function loadOffices() {
// //         try {
// //             const response = await fetch("http://localhost:8000/offices/", {
// //                 method: "GET",
// //                 headers: { "Authorization": "Bearer " + token }
// //             });
// //
// //             if (response.ok) {
// //                 const offices = await response.json();
// //                 offices.forEach(office => {
// //                     const option = document.createElement("option");
// //                     option.value = office.office_code;
// //                     option.textContent = office.description;
// //                     officeDropdown.appendChild(option);
// //                 });
// //             } else {
// //                 const error = await response.json();
// //                 alert(error.detail || "Failed to load offices.");
// //             }
// //         } catch (err) {
// //             alert("Network error while loading offices.");
// //         }
// //     }
// //
// //     // Load candidates for selected office
// //     async function loadCandidates() {
// //         const officeCode = officeDropdown.value;
// //         tbody.innerHTML = "";
// //
// //         if (!officeCode) {
// //             // alert("Please select an office.");
// //             // return;
// //             try {
// //                     const response = await fetch("http://localhost:8000/candidates/", {
// //                         method: "GET",
// //                         headers: { "Authorization": "Bearer " + token }
// //                     });
// //
// //                     if (response.ok) {
// //                         const candidates = await response.json();
// //                         candidates.forEach(candidate => {
// //                             const row = document.createElement("tr");
// //                             row.innerHTML = `
// //                                 <td>${candidate.candidate_code}</td>
// //                                 <td>${candidate.name}</td>
// //                                 <td>${candidate.office.office_code}</td>
// //                                 <td>${candidate.office.description}</td>
// //
// //                             `;
// //                             tbody.appendChild(row);
// //                         });
// //                     } else {
// //                         const error = await response.json();
// //                         alert(error.detail || "Failed to load votes.");
// //                     }
// //                 } catch (err) {
// //                     alert("Network error.");
// //                 }
// //         }
// //
// //         try {
// //             const response = await fetch(`http://localhost:8000/candidates/${officeCode}/candidates`, {
// //                 method: "GET",
// //                 headers: { "Authorization": "Bearer " + token }
// //             });
// //
// //             if (response.ok) {
// //                 const candidates = await response.json();
// //                 candidates.forEach(candidate => {
// //                     const row = document.createElement("tr");
// //                     row.innerHTML = `
// //                         <td>${candidate.candidate_code}</td>
// //                         <td>${candidate.name}</td>
// //                         <td>${candidate.office.office_code}</td>
// //                         <td>${candidate.office.description}</td>
// //                     `;
// //                     tbody.appendChild(row);
// //                 });
// //             } else {
// //                 const error = await response.json();
// //                 alert(error.detail || "Failed to load candidates.");
// //             }
// //         } catch (err) {
// //             alert("Network error while loading candidates.");
// //         }
// //     }
// //
// //     // Attach event listeners
// //     if (loadCandidatesBtn) {
// //         loadCandidatesBtn.addEventListener("click", loadCandidates);
// //     }
// //     if (officeDropdown) {
// //         officeDropdown.addEventListener("change", loadCandidates);
// //     }
// //
// //     // Initial load
// //     loadOffices();
// // });
