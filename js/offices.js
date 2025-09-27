// document.addEventListener("DOMContentLoaded", () => {
//     const token = localStorage.getItem("access_token");
//     const loadOfficesBtn = document.getElementById("loadOffices");
//     const tbody = document.querySelector("#officesTable tbody");
//     const officeModalEl = document.getElementById("officeModal");
//     const saveBtn = officeModalEl.querySelector(".modal-footer .btn-primary");
//
//     if (!token) {
//         alert("You must log in first.");
//         window.location.href = "login.html";
//         return;
//     }
//
//     // Load offices from backend
//     async function loadOffices() {
//         tbody.innerHTML = "";
//         try {
//             const response = await fetch("http://localhost:8000/offices/", {
//                 method: "GET",
//                 headers: { "Authorization": "Bearer " + token }
//             });
//
//             if (response.ok) {
//                 const offices = await response.json();
//                 if (offices.length === 0) {
//                     tbody.innerHTML = `<tr><td colspan="4">No offices found.</td></tr>`;
//                 } else {
//                     offices.forEach(office => {
//                         const row = document.createElement("tr");
//                         row.innerHTML = `
//                             <td>${office.id}</td>
//                             <td>${office.office_code}</td>
//                             <td>${office.description}</td>
//                             <td style="display: flex; gap: 8px;">
//                                 <button class="btn btn-danger btn-sm delete-office-btn" data-id="${office.id}">Delete</button>
//                                 <button class="btn btn-primary btn-sm update-office-btn" data-id="${office.id}">Update</button>
//                             </td>
//                         `;
//                         tbody.appendChild(row);
//                     });
//
//                     // Attach delete listeners AFTER rows are added
//                     tbody.querySelectorAll(".delete-office-btn").forEach(btn => {
//                         btn.addEventListener("click", async (e) => {
//                             const officeId = e.target.dataset.id;
//                             if (!confirm("Are you sure you want to delete this office?")) return;
//
//                             try {
//                                 const response = await fetch(`http://localhost:8000/offices/${officeId}`, {
//                                     method: "DELETE",
//                                     headers: { "Authorization": `Bearer ${token}` }
//                                 });
//
//                                 if (response.ok) {
//                                     alert("Office deleted successfully!");
//                                     loadOffices(); // Refresh table
//                                 } else {
//                                     const error = await response.json();
//                                     alert(error.detail || "Failed to delete office.");
//                                 }
//                             } catch (err) {
//                                 console.error("Network error while deleting office.", err);
//                                 alert("Network error while deleting office.");
//                             }
//                         });
//                     });
//                 }
//             } else {
//                 const error = await response.json();
//                 alert(error.detail || "Failed to load offices.");
//             }
//         } catch (err) {
//             console.error(err);
//             alert("Network error while loading offices.");
//         }
//     }
//
//     // Save new office from modal
//     saveBtn.addEventListener("click", async () => {
//         const officeCode = document.getElementById("inputEmail4").value.trim();
//         const description = document.getElementById("inputPassword4").value.trim();
//
//         if (!officeCode || !description) {
//             alert("Please fill in both Office Code and Description.");
//             return;
//         }
//
//         try {
//             const response = await fetch("http://localhost:8000/offices/", {
//                 method: "POST",
//                 headers: {
//                     "Content-Type": "application/json",
//                     "Authorization": `Bearer ${token}`
//                 },
//                 body: JSON.stringify({ office_code: officeCode, description })
//             });
//
//             if (response.ok) {
//                 alert("Office created successfully!");
//                 document.getElementById("inputEmail4").value = "";
//                 document.getElementById("inputPassword4").value = "";
//                 bootstrap.Modal.getInstance(officeModalEl).hide();
//                 loadOffices(); // Refresh table
//             } else {
//                 const error = await response.json();
//                 alert(error.detail || "Failed to create office.");
//             }
//         } catch (err) {
//             console.error(err);
//             alert("Network error while creating office.");
//         }
//     });
//
//     // Event listeners
//     loadOfficesBtn?.addEventListener("click", loadOffices);
//
//     // Initial load
//     loadOffices();
// });






import {API_BASE, configReady} from "./config.js";

document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("access_token");
    const loadOfficesBtn = document.getElementById("loadOffices");
    const tbody = document.querySelector("#officesTable tbody");
    const officeModalEl = document.getElementById("officeModal");
    const saveBtn = officeModalEl.querySelector(".modal-footer .btn-primary");
    const officeModal = new bootstrap.Modal(officeModalEl);

    if (!token) {
        alert("You must log in first.");
        window.location.href = "login.html";
        return;
    }

    let editingOfficeId = null; // track office being updated

    await configReady;

    // Load offices from backend
    async function loadOffices() {
        // await configReady;
        tbody.innerHTML = "";
        try {
            const response = await fetch(`${API_BASE}/offices/`, {
                headers: {"Authorization": `Bearer ${token}`}
            });

            if (response.ok) {
                const offices = await response.json();
                if (offices.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="4">No offices found.</td></tr>`;
                } else {
                    offices.forEach(office => {
                        const row = document.createElement("tr");
                        row.innerHTML = `
                            <td>${office.id}</td>
                            <td>${office.office_code}</td>
                            <td>${office.description}</td>
                            <td style="display: flex; gap: 8px;">
                                <button class="btn btn-danger btn-sm delete-office-btn" data-id="${office.id}">Delete</button>
                                <button class="btn btn-primary btn-sm update-office-btn" data-id="${office.id}" data-code="${office.office_code}" data-desc="${office.description}">Update</button>
                            </td>
                        `;
                        tbody.appendChild(row);
                    });

                    // Delete button
                    tbody.querySelectorAll(".delete-office-btn").forEach(btn => {
                        btn.addEventListener("click", async (e) => {
                            const officeId = e.target.dataset.id;
                            if (!confirm("Are you sure you want to delete this office?")) return;

                            try {
                                const response = await fetch(`${API_BASE}/offices/${officeId}`, {
                                    method: "DELETE",
                                    headers: {"Authorization": `Bearer ${token}`}
                                });

                                if (response.ok) {
                                    alert("Office deleted successfully!");
                                    loadOffices();
                                } else {
                                    const error = await response.json();
                                    alert(error.detail || "Failed to delete office.");
                                }
                            } catch (err) {
                                console.error("Network error while deleting office.", err);
                                alert("Network error while deleting office.");
                            }
                        });
                    });

                    // Update button
                    tbody.querySelectorAll(".update-office-btn").forEach(btn => {
                        btn.addEventListener("click", (e) => {
                            editingOfficeId = e.target.dataset.id;
                            document.getElementById("inputEmail4").value = e.target.dataset.code;
                            document.getElementById("inputPassword4").value = e.target.dataset.desc;
                            officeModal.show();
                        });
                    });
                }
            } else {
                const error = await response.json();
                alert(error.detail || "Failed to load offices.");
            }
        } catch (err) {
            console.error(err);
            alert("Network error while loading offices.");
        }
    }

    // Save / Update office
    saveBtn.addEventListener("click", async () => {
        const officeCode = document.getElementById("inputEmail4").value.trim();
        const description = document.getElementById("inputPassword4").value.trim();

        if (!officeCode || !description) {
            alert("Please fill in both Office Code and Description.");
            return;
        }

        // If editingOfficeId is set, perform update
        if (editingOfficeId) {
            try {
                const response = await fetch(`${API_BASE}/offices/${editingOfficeId}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({office_code: officeCode, description})
                });

                if (response.ok) {
                    alert("Office updated successfully!");
                    officeModal.hide();
                    editingOfficeId = null;
                    loadOffices();
                } else {
                    const error = await response.json();
                    alert(error.detail || "Failed to update office.");
                }
            } catch (err) {
                console.error("Network error while updating office.", err);
                alert("Network error while updating office.");
            }
        } else {
            // Create new office
            try {
                const response = await fetch(`${API_BASE}/offices`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({office_code: officeCode, description})
                });

                if (response.ok) {
                    alert("Office created successfully!");
                    officeModal.hide();
                    loadOffices();
                } else {
                    const error = await response.json();
                    alert(error.detail || "Failed to create office.");
                }
            } catch (err) {
                console.error("Network error while creating office.", err);
                alert("Network error while creating office.");
            }
        }

        // Clear input fields after save/update
        document.getElementById("inputEmail4").value = "";
        document.getElementById("inputPassword4").value = "";
    });

    // Open modal for creating new office
    document.getElementById("addOfficeBtn")?.addEventListener("click", () => {
        editingOfficeId = null;
        document.getElementById("inputEmail4").value = "";
        document.getElementById("inputPassword4").value = "";
        officeModal.show();
    });

    // Load offices on button click
    loadOfficesBtn?.addEventListener("click", loadOffices);

    // Initial load
    loadOffices();
});
