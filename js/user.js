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
//                             <button class="btn btn-primary btn-sm update-user-btn" data-id="${user.id}">Update</button>
//                         </td>
//                     `;
//                     tbody.appendChild(row);
//                 });
//
//                 // Attach delete listeners AFTER rows are added
//                 tbody.querySelectorAll(".delete-user-btn").forEach(btn => {
//                     btn.addEventListener("click", async (e) => {
//                         const userId = e.target.dataset.id;
//                         if (!confirm("Are you sure you want to delete this user?")) return;
//
//                         try {
//                             const response = await fetch(`http://localhost:8000/users/${userId}`, {
//                                 method: "DELETE",
//                                 headers: { "Authorization": `Bearer ${token}` }
//                             });
//
//                             if (response.ok) {
//                                 alert("User deleted successfully!");
//                                 document.getElementById("loadUsers").click(); // Refresh table
//                             } else {
//                                 const error = await response.json();
//                                 alert(error.detail || "Failed to delete user.");
//                             }
//                         } catch (err) {
//                             console.error("Network error while deleting user.", err);
//                             alert("Network error while deleting user.");
//                         }
//                     });
//                 });
//             }
//         } else {
//             const error = await response.json();
//             alert(error.detail || "Failed to load users.");
//         }
//     } catch (err) {
//         alert("Network error.");
//     }
// });
document.addEventListener("DOMContentLoaded", () => {
    const uploadInput = document.getElementById("uploadFile");
    const token = localStorage.getItem("access_token");

    if (!uploadInput) return;

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
            const response = await fetch("http://localhost:8000/users/upload-csv", {
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



// ========================
// GET ALL USERS (ADMIN ONLY)
// ========================
document.addEventListener("DOMContentLoaded", () => {
    const loadUsersBtn = document.getElementById("loadUsers");
    const token = localStorage.getItem("access_token");
    const tbody = document.querySelector("#usersTable tbody");

    if (!token) {
        alert("You must log in first.");
        return;
    }

    async function loadUsers() {
        tbody.innerHTML = "";

        try {
            const response = await fetch("http://localhost:8000/users/", {
                method: "GET",
                headers: { "Authorization": "Bearer " + token }
            });

            if (response.ok) {
                const users = await response.json();
                if (users.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="5">No users found.</td></tr>`;
                } else {
                    users.forEach(user => {
                        const row = document.createElement("tr");
                        row.innerHTML = `
                            <td>${user.username}</td>
                            <td>${user.full_name}</td>
                            <td>${user.phone}</td>
                            <td>${user.role}</td>
                            <td style="display: flex; gap: 8px;">
                                <button class="btn btn-danger btn-sm delete-user-btn" data-id="${user.id}">Delete</button>
                                <button class="btn btn-primary btn-sm update-user-btn" data-id="${user.id}">Update</button>
                                <button class="btn btn-warning btn-sm reset-user-btn" data-username="${user.username}">Reset</button>
                            </td>
                        `;
                        tbody.appendChild(row);
                    });

                    // ✅ Delete User
                    tbody.querySelectorAll(".delete-user-btn").forEach(btn => {
                        btn.addEventListener("click", async (e) => {
                            const userId = e.target.dataset.id;
                            if (!confirm("Are you sure you want to delete this user?")) return;

                            try {
                                const response = await fetch(`http://localhost:8000/users/${userId}`, {
                                    method: "DELETE",
                                    headers: { "Authorization": `Bearer ${token}` }
                                });

                                if (response.ok) {
                                    alert("User deleted successfully!");
                                    loadUsers(); // Refresh table
                                } else {
                                    const error = await response.json();
                                    alert(error.detail || "Failed to delete user.");
                                }
                            } catch (err) {
                                console.error("Network error while deleting user.", err);
                                alert("Network error while deleting user.");
                            }
                        });
                    });

                    // ✅ Reset Password
                    tbody.querySelectorAll(".reset-user-btn").forEach(btn => {
                        btn.addEventListener("click", async (e) => {
                            const username = e.target.dataset.username;
                            if (!confirm(`Reset password for user "${username}"?`)) return;

                            try {
                                const response = await fetch(`http://localhost:8000/reset-password/${username}`, {
                                    method: "POST",
                                    headers: { "Authorization": `Bearer ${token}` }
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
