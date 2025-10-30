import {API_BASE, configReady} from "./config.js";

document.addEventListener("DOMContentLoaded", async () => {
    const uploadInput = document.getElementById("uploadFile");
    const token = localStorage.getItem("access_token");

    if (!uploadInput) return;

    await configReady;

    uploadInput.addEventListener("change", async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!token) {
            alert("You must log in first.");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch(`${API_BASE}/users/upload-csv`, {
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + token
                    // ❌ do NOT set Content-Type, fetch will set it automatically for FormData
                },
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                alert(result.message || "Users uploaded successfully!");
                // reload users after upload
                if (typeof loadUsers === "function") loadUsers();
            } else {
                const error = await response.json();
                alert(error.detail || "Failed to upload users.");
            }
        } catch (err) {
            console.error("Upload error:", err);
            alert("Network error while uploading users.");
        }
    });
});


// import {API_BASE, configReady} from "./config.js";
// ========================
// GET ALL USERS (ADMIN ONLY)
// ========================
document.addEventListener("DOMContentLoaded", async () => {
    const loadUsersBtn = document.getElementById("loadUsers");
    const token = localStorage.getItem("access_token");
    const tbody = document.querySelector("#usersTable tbody");

    if (!token) {
        alert("You must log in first.");
        return;
    }
    await configReady;

    async function loadUsers() {
        tbody.innerHTML = "";

        try {
            const response = await fetch(`${API_BASE}/users/`, {
                method: "GET",
                headers: {"Authorization": "Bearer " + token}
            });

            if (response.ok) {
                const users = await response.json();
                if (users.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="5">No users found.</td></tr>`;
                } else {
                    users.forEach(user => {
                        const row = document.createElement("tr");
                        const statusClass = user.is_active ? "btn-success" : "btn-secondary";
                        const statusText = user.is_active ? "Active" : "Inactive";
                        row.innerHTML = `
                            <td>${user.username}</td>
                            <td>${user.full_name}</td>
                            <td>${user.phone}</td>
                            <td>${user.role}</td>
                            <td style="display: flex; gap: 8px;">
                                <button class="btn btn-danger btn-sm delete-user-btn" data-id="${user.id}">Delete</button>
                                <button class="btn btn-primary btn-sm update-user-btn" data-id="${user.id}">Update</button>
                                <button class="btn btn-warning btn-sm reset-user-btn" data-username="${user.username}">Reset</button>
                                <button class="btn btn-sm ${statusClass} toggle-active-btn" data-id="${user.id}">${statusText}</button>
                            </td>
                        `;
                        tbody.appendChild(row);
                    });

                    // ✅ Disable All Voters Button
                    const disableAllVotersBtn = document.getElementById("disableAllVotersBtn");

                    if (disableAllVotersBtn) {
                        disableAllVotersBtn.addEventListener("click", async () => {
                            if (!confirm("Are you sure you want to disable all voters?")) return;

                            try {
                                const response = await fetch(`${API_BASE}/users/disable-voters`, {
                                    method: "PATCH",
                                    headers: {
                                        "Authorization": `Bearer ${token}`,
                                        "Content-Type": "application/json"
                                    }
                                });

                                if (response.ok) {
                                    const result = await response.json();
                                    alert(result.message || "All voters have been disabled.");

                                    // ✅ Optionally update UI instantly
                                    document.querySelectorAll(".toggle-active-btn").forEach(btn => {
                                        const role = btn.closest("tr")?.querySelector(".user-role")?.textContent?.trim()?.toLowerCase();
                                        if (role === "voter") {
                                            btn.textContent = "Inactive";
                                            btn.classList.remove("btn-success");
                                            btn.classList.add("btn-secondary");
                                        }
                                    });
                                } else {
                                    const error = await response.json();
                                    alert(error.detail || "Failed to disable voters.");
                                }
                            } catch (err) {
                                console.error("Network error while disabling voters:", err);
                                alert("Network error while disabling voters.");
                            }
                        });
                    }

                    

                    // ✅ Toggle Active/Inactive
                    tbody.querySelectorAll(".toggle-active-btn").forEach(btn => {
                        btn.addEventListener("click", async (e) => {
                            const userId = e.target.dataset.id;
                            const button = e.target;
                            const currentlyActive = button.textContent.trim() === "Active";
                            const newStatus = !currentlyActive; // toggle

                            try {
                                const response = await fetch(
                                    `${API_BASE}/users/${userId}/status?is_active=${newStatus}`,
                                    {
                                        method: "PATCH",
                                        headers: {
                                            "Authorization": `Bearer ${token}`,
                                            "Content-Type": "application/json"
                                        }
                                    }
                                );

                                if (response.ok) {
                                    const result = await response.json();
                                    alert(result.message || `User is now ${newStatus ? "Active" : "Inactive"}`);

                                    // ✅ Update button instantly (no reload)
                                    button.textContent = newStatus ? "Active" : "Inactive";
                                    button.classList.toggle("btn-success", newStatus);
                                    button.classList.toggle("btn-secondary", !newStatus);
                                } else {
                                    const error = await response.json();
                                    alert(error.detail || "Failed to toggle user status.");
                                }
                            } catch (err) {
                                console.error("Network error while toggling user status.", err);
                                alert("Network error while toggling user status.");
                            }
                        });
                    });

                    // ✅ Disable All Voters        
                    // document.getElementById('disableVotersBtn').addEventListener('click', async () => {
                    // if (!confirm('Are you sure you want to disable all voters?')) return;

                    // try {
                    //     const response = await fetch(`${API_BASE}/users/disable-voters`, {  // adjust URL to your route
                    //     method: 'PATCH',
                    //     headers: {
                    //         'Content-Type': 'application/json',
                    //         // 'Authorization': 'Bearer ' + localStorage.getItem('token')  // if auth is required
                    //     }
                    //     });

                    //     const data = await response.json();
                    //     alert(data.message);
                    // } catch (error) {
                    //     alert('Error disabling voters');
                    //     console.error(error);
                    // }
                    // });


                    // // ✅ Delete User
                    // tbody.querySelectorAll(".delete-user-btn").forEach(btn => {
                    //     btn.addEventListener("click", async (e) => {
                    //         const userId = e.target.dataset.id;
                    //         if (!confirm("Are you sure you want to delete this user?")) return;

                    //         try {
                    //             const response = await fetch(`${API_BASE}/users/${userId}`, {
                    //                 method: "DELETE",
                    //                 headers: {"Authorization": `Bearer ${token}`}
                    //             });

                    //             if (response.ok) {
                    //                 alert("User deleted successfully!");
                    //                 loadUsers(); // Refresh table
                    //             } else {
                    //                 const error = await response.json();
                    //                 alert(error.detail || "Failed to delete user.");
                    //             }
                    //         } catch (err) {
                    //             console.error("Network error while deleting user.", err);
                    //             alert("Network error while deleting user.");
                    //         }
                    //     });
                    // });

                    // ✅ Reset Password
                    tbody.querySelectorAll(".reset-user-btn").forEach(btn => {
                        btn.addEventListener("click", async (e) => {
                            const username = e.target.dataset.username;
                            if (!confirm(`Reset password for user "${username}"?`)) return;

                            try {
                                const response = await fetch(`${API_BASE}/api/reset-password/${username}`, {
                                    method: "POST",
                                    headers: {
                                        "Authorization": `Bearer ${token}`,
                                        "Content-Type": "application/json"
                                    }
                                });

                                if (response.ok) {
                                    const result = await response.json();
                                    alert(result.message || `Password for "${username}" has been reset.`);
                                } else {
                                    const error = await response.json();
                                    alert(error.detail || "Failed to reset password.");
                                }
                            } catch (err) {
                                console.error("Network error while resetting password.", err);
                                alert("Network error while resetting password.");
                            }
                        });
                    });
                }
            } else {
                const error = await response.json();
                alert(error.detail || "Failed to load users.");
            }
        } catch (err) {
            alert("Network error.");
        }
    }

    // Initial load
    loadUsers();

    // ✅ Attach event to "Load Users" button
    loadUsersBtn.addEventListener("click", loadUsers);



    // ✅ Export Users table to PDF (only voters, exclude last two columns)
    document.getElementById("exportUsersPDF").addEventListener("click", () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const title = "Users Report - Voters Only";
        doc.text(title, 14, 15);

        // Get table
        const table = document.getElementById("usersTable");
        const rows = Array.from(table.querySelectorAll("tbody tr"));

        // Remove the last two columns from headers
        const headCells = Array.from(table.querySelectorAll("thead tr th"))
            .slice(0, -2) // remove last two columns
            .map((th) => th.textContent);

        // Add S/No as the first column header
        const head = [["S/No", ...headCells]];

        let serial = 1; // ✅ independent counter

        // Build body with serial number, only "voter" rows, skip last two columns
        const body = rows
            .map((tr) => {
                const cells = Array.from(tr.querySelectorAll("td")).slice(0, -2); // remove last two columns
                const rowValues = cells.map((td) => td.textContent);

                // Get role (before slicing last two, role should have been second-to-last column)
                const allCells = Array.from(tr.querySelectorAll("td")).map((td) => td.textContent);
                const role = allCells[allCells.length - 2]; // second-to-last column

                if (role.toLowerCase() === "voter") {
                    return [serial++, ...rowValues]; // ✅ increment only when voter row passes
                }
                return null;
            })
            .filter((row) => row !== null);

        // Render table
        doc.autoTable({
            head: head,
            body: body,
            startY: 25,
            theme: "grid",
            headStyles: { fillColor: [41, 128, 185] },
        });

        // Save PDF
        const safeFilename = title.replace(/\s+/g, "_");
        doc.save(`${safeFilename}.pdf`);
    });

});





//
// // ========================
// // GET ALL USERS (ADMIN ONLY)
// // ========================
// document.getElementById("loadUsers").addEventListener("click", async () => {
//     const token = localStorage.getItem("access_token");
//     const tbody = document.querySelector("#usersTable tbody");
//     tbody.innerHTML = "";
//
//     if (!token) {
//         alert("You must log in first.");
//         window.location.href = "login.html";
//         return;
//     }
//
//     try {
//         const response = await fetch("http://localhost:8000/users/", {
//             method: "GET",
//             headers: { "Authorization": "Bearer " + token }
//         });
//
//         if (response.ok) {
//             const users = await response.json();
//             if (users.length === 0) {
//                 tbody.innerHTML = `<tr><td colspan="5">No users found.</td></tr>`;
//             } else {
//                 users.forEach(user => {
//                     const row = document.createElement("tr");
//                     row.innerHTML = `
//                         <td>${user.username}</td>
//                         <td>${user.full_name}</td>
//                         <td>${user.phone}</td>
//                         <td>${user.role}</td>
//                         <td style="display: flex; gap: 8px;">
//                             <button class="btn btn-danger btn-sm delete-user-btn" data-id="${user.id}">Delete</button>
// <!--                            <button class="btn btn-primary btn-sm update-user-btn" data-id="${user.id}">Update</button>-->
//                             <button class="btn btn-warning btn-sm reset-user-btn" data-username="${user.username}">Reset</button>
//                             <button class="btn btn-info btn-sm change-password-btn" data-username="${user.username}">Change Password</button>
//                         </td>
//                     `;
//                     tbody.appendChild(row);
//                 });
//
//                 // ✅ Change Password modal logic
//                 const userModal = new bootstrap.Modal(document.getElementById("userModal"));
//                 tbody.querySelectorAll(".change-password-btn").forEach(btn => {
//                     btn.addEventListener("click", (e) => {
//                         const username = e.target.dataset.username;
//                         document.getElementById("modalUsername").value = username;
//                         document.getElementById("modalOldPassword").value = "";
//                         document.getElementById("modalNewPassword").value = "";
//                         userModal.show();
//                     });
//                 });
//
//                 // ✅ Save new password
//                 document.getElementById("savePasswordBtn").onclick = async () => {
//                     const username = document.getElementById("modalUsername").value;
//                     const oldPassword = document.getElementById("modalOldPassword").value.trim();
//                     const newPassword = document.getElementById("modalNewPassword").value.trim();
//
//                     if (!oldPassword || !newPassword) {
//                         alert("Please fill in both old and new password.");
//                         return;
//                     }
//
//                     try {
//                         const response = await fetch("http://localhost:8000/change-password", {
//                             method: "POST",
//                             headers: {
//                                 "Content-Type": "application/json",
//                                 "Authorization": `Bearer ${token}`
//                             },
//                             body: JSON.stringify({
//                                 username: username,
//                                 old_password: oldPassword,
//                                 new_password: newPassword
//                             })
//                         });
//
//                         if (response.ok) {
//                             const result = await response.json();
//                             alert(result.message || "Password changed successfully!");
//                             userModal.hide();
//                         } else {
//                             const error = await response.json();
//                             alert(error.detail || "Failed to change password.");
//                         }
//                     } catch (err) {
//                         console.error("Network error while changing password.", err);
//                         alert("Network error while changing password.");
//                     }
//                 };
//             }
//         } else {
//             const error = await response.json();
//             alert(error.detail || "Failed to load users.");
//         }
//     } catch (err) {
//         alert("Network error.");
//     }
// });
