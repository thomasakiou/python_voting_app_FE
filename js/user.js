import { API_BASE, configReady } from "./config.js";

// Pagination variables
let currentPage = 1;
const rowsPerPage = 10;
let allUsers = [];
let filteredUsers = [];
let token;

// DOM elements
const tbody = document.querySelector('#usersTable tbody');
const searchInput = document.getElementById('userSearch');
const entriesInfo = document.querySelector('.entries-info');

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", async () => {
    await configReady;
    token = localStorage.getItem("access_token");
    
    // Load initial data
    await loadUsers();
    
    // Event listeners
    document.getElementById('loadUsers')?.addEventListener('click', loadUsers);
    document.getElementById('exportUsersPDF')?.addEventListener('click', exportToPDF);
    document.getElementById('uploadFile')?.addEventListener('change', handleFileUpload);
    document.getElementById('disableAllVotersBtn')?.addEventListener('click', () => updateAllVotersStatus(false));
    document.getElementById('enableAllVotersBtn')?.addEventListener('click', () => updateAllVotersStatus(true));
    
    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
});

// Load users function
async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE}/users/`, {
            headers: { Authorization: "Bearer " + token },
        });
        
        if (response.ok) {
            allUsers = await response.json();
            filteredUsers = [...allUsers];
            currentPage = 1;
            renderUsers();
            setupPagination();
        } else {
            throw new Error("Failed to load users");
        }
    } catch (err) {
        console.error("Error loading users:", err);
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading users</td></tr>';
        }
    }
}

// Render users function
// Update the renderUsers function
function renderUsers() {
    const tbody = document.querySelector('#usersTable tbody');
    if (!tbody) {
        console.error('Table body not found');
        return;
    }
    
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedUsers = filteredUsers.slice(start, end);
    
    tbody.innerHTML = '';
    
    if (paginatedUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No users found</td></tr>';
        updateEntriesInfo();
        return;
    }
    
    paginatedUsers.forEach((user, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${start + index + 1}</td>
            <td>${user.username || 'N/A'}</td>
            <td>${user.full_name || 'N/A'}</td>
            <td>${user.phone || 'N/A'}</td>
            <td>${user.role || 'N/A'}</td>
            <td>
                <button class="btn btn-sm ${user.is_active ? 'btn-success' : 'btn-secondary'} toggle-status" 
                        data-id="${user.id}" 
                        data-active="${user.is_active}">
                    ${user.is_active ? 'Active' : 'Inactive'}
                </button>
            </td>
            <td>
                <div class="d-flex gap-2">
                    <button class="btn btn-primary btn-sm edit-user" data-id="${user.id}">Edit</button>
                    <button class="btn btn-danger btn-sm delete-user" data-id="${user.id}">Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    // Add event listeners for the toggle buttons
    document.querySelectorAll('.toggle-status').forEach(button => {
        button.addEventListener('click', handleToggleStatus);
    });
    
    updateEntriesInfo();
}

// Add the handleToggleStatus function
async function handleToggleStatus(e) {
    const button = e.target;
    const userId = button.dataset.id;
    const currentStatus = button.dataset.active === 'true';
    const newStatus = !currentStatus;

    if (!confirm(`Are you sure you want to mark this user as ${newStatus ? 'active' : 'inactive'}?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/users/${userId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ is_active: newStatus })
        });

        if (response.ok) {
            // Update the UI
            button.dataset.active = newStatus;
            button.textContent = newStatus ? 'Active' : 'Inactive';
            button.className = `btn btn-sm ${newStatus ? 'btn-success' : 'btn-secondary'} toggle-status`;
            
            // Update the local data
            const user = allUsers.find(u => u.id === userId);
            if (user) {
                user.is_active = newStatus;
            }
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update user status');
        }
    } catch (err) {
        console.error('Error toggling user status:', err);
        alert('Error: ' + (err.message || 'Failed to update user status'));
    }
}

// Update the updateAllVotersStatus function
async function updateAllVotersStatus(enable) {
    if (!confirm(`Are you sure you want to ${enable ? 'enable' : 'disable'} all voters?`)) {
        return;
    }

    try {
        // Use the toggle-all-voters endpoint with PATCH method
        const response = await fetch(`${API_BASE}/users/toggle-all-voters?enable=${enable}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({}) // Empty body as we're using query params
        });

        if (response.ok) {
            // Update local data, excluding users with 'user-user' role
            allUsers.forEach(user => {
                if (user.role === 'voter' && user.role !== 'user-user') {
                    user.is_active = enable;
                }
            });
            
            alert(`All voters have been ${enable ? 'enabled' : 'disabled'} successfully!`);
            // Re-render the users to reflect the changes
            renderUsers();
        } else {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `Failed to ${enable ? 'enable' : 'disable'} voters`);
        }
    } catch (err) {
        console.error('Error updating voters status:', err);
        alert('Error: ' + (err.message || 'Failed to update voters status'));
    }
}

// Setup pagination
function setupPagination() {
    const pageCount = Math.ceil(filteredUsers.length / rowsPerPage);
    const pagination = document.querySelector('.pagination');
    if (!pagination) return;
    
    pagination.innerHTML = '';

    if (pageCount <= 1) {
        pagination.style.display = 'none';
        return;
    }
    
    pagination.style.display = 'flex';

    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = '<a class="page-link" href="#" aria-label="Previous">Previous</a>';
    prevLi.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage > 1) {
            currentPage--;
            renderUsers();
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
            renderUsers();
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
            renderUsers();
            setupPagination();
        }
    });
    pagination.appendChild(nextLi);
}

// Update entries info
function updateEntriesInfo() {
    if (!entriesInfo) return;
    
    const start = (currentPage - 1) * rowsPerPage + 1;
    const end = Math.min(currentPage * rowsPerPage, filteredUsers.length);
    const total = filteredUsers.length;
    
    entriesInfo.textContent = `Showing ${start} to ${end} of ${total} entries`;
}

// Search handler
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    
    if (searchTerm) {
        filteredUsers = allUsers.filter(user => {
            return Object.values(user).some(value => 
                String(value).toLowerCase().includes(searchTerm)
            );
        });
    } else {
        filteredUsers = [...allUsers];
    }
    
    currentPage = 1;
    renderUsers();
    setupPagination();
}

// Handle file upload
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!token) {
        alert("You must log in first.");
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${API_BASE}/users/upload`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            body: formData
        });

        if (response.ok) {
            alert('Users uploaded successfully!');
            await loadUsers(); // Reload users after successful upload
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to upload file');
        }
    } catch (err) {
        console.error('Error uploading file:', err);
        alert('Error uploading file: ' + (err.message || 'Unknown error'));
    }
}

// Export to PDF
function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('Users List', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);

    // Get table headers
    const headers = [['#', 'Username', 'Name', 'Phone', 'Role']];
    
    // Prepare data
    const data = filteredUsers.map((user, index) => [
        index + 1,
        user.username || '',
        user.full_name || '',
        user.phone || '',
        user.role || ''
    ]);

    // Add table
    doc.autoTable({
        head: headers,
        body: data,
        startY: 30,
        styles: {
            fontSize: 10,
            cellPadding: 2,
            valign: 'middle'
        },
        headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: 'bold'
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        },
        margin: { top: 30 }
    });

    // Save the PDF
    doc.save('users-list.pdf');
}

// Update all voters status
// async function updateAllVotersStatus(enable) {
//     if (!confirm(`Are you sure you want to ${enable ? 'enable' : 'disable'} all voters?`)) {
//         return;
//     }

//     try {
//         const response = await fetch(`${API_BASE}/users/status`, {
//             method: 'PATCH',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Authorization': 'Bearer ' + token
//             },
//             body: JSON.stringify({ active: enable })
//         });

//         if (response.ok) {
//             alert(`All voters have been ${enable ? 'enabled' : 'disabled'} successfully!`);
//             await loadUsers(); // Reload users to reflect changes
//         } else {
//             const error = await response.json();
//             throw new Error(error.message || 'Failed to update voters status');
//         }
//     } catch (err) {
//         console.error('Error updating voters status:', err);
//         alert('Error: ' + (err.message || 'Failed to update voters status'));
//     }
// }

// Initialize file upload event listener
const uploadInput = document.getElementById("uploadFile");
if (uploadInput) {
    uploadInput.addEventListener("change", handleFileUpload);
}

// Set up event listeners for the page
document.addEventListener("DOMContentLoaded", async () => {
    const loadUsersBtn = document.getElementById("loadUsers");
    const token = localStorage.getItem("access_token");
    const tbody = document.querySelector("#usersTable tbody");

    if (!token) {
        alert("You must log in first.");
        return;
    }

    await configReady;

    // Load users function
    async function loadUsers() {
        try {
            const response = await fetch(`${API_BASE}/users/`, {
                headers: { Authorization: "Bearer " + token },
            });
            
            if (response.ok) {
                allUsers = await response.json();
                filteredUsers = [...allUsers];
                currentPage = 1;
                renderUsers();
                setupPagination();
                updateEntriesInfo();
            } else {
                throw new Error("Failed to load users");
            }
        } catch (err) {
            console.error("Error loading users:", err);
            const tbody = document.querySelector("#usersTable tbody");
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading users</td></tr>';
            }
        }
    }

    function setupEventListeners() {
        const disableAllVotersBtn = document.getElementById("disableAllVotersBtn");
        const enableAllVotersBtn = document.getElementById("enableAllVotersBtn");

        // Disable All Voters Button
        if (disableAllVotersBtn) {
            disableAllVotersBtn.addEventListener("click", async () => {
                if (!confirm("Are you sure you want to disable all voters?")) return;
                await updateAllVotersStatus(false);
            });
        }

        // Enable All Voters Button
        if (enableAllVotersBtn) {
            enableAllVotersBtn.addEventListener("click", async () => {
                if (!confirm("Are you sure you want to enable all voters?")) return;
                await updateAllVotersStatus(true);
            });
        }

        // Toggle Active/Inactive
        tbody.querySelectorAll(".toggle-active-btn").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const userId = e.target.dataset.id;
                const button = e.target;
                const currentlyActive = button.textContent.trim() === "Active";
                const newStatus = !currentlyActive;

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
                        button.textContent = newStatus ? "Active" : "Inactive";
                        button.classList.toggle("btn-success", newStatus);
                        button.classList.toggle("btn-secondary", !newStatus);
                    } else {
                        const error = await response.json();
                        alert(error.detail || "Failed to toggle user status.");
                    }
                } catch (err) {
                    console.error("Error toggling user status:", err);
                    alert("An error occurred while updating user status.");
                }
            });
        });

        // Delete User
        tbody.querySelectorAll(".delete-user-btn").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const userId = e.target.dataset.id;
                if (!confirm("Are you sure you want to delete this user?")) return;

                try {
                    const response = await fetch(`${API_BASE}/users/${userId}`, {
                        method: "DELETE",
                        headers: {"Authorization": `Bearer ${token}`}
                    });

                    if (response.ok) {
                        alert("User deleted successfully!");
                        loadUsers();
                    } else {
                        const error = await response.json();
                        alert(error.detail || "Failed to delete user.");
                    }
                } catch (err) {
                    console.error("Error deleting user:", err);
                    alert("An error occurred while deleting the user.");
                }
            });
        });

        // Reset Password
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
                    console.error("Error resetting password:", err);
                    alert("An error occurred while resetting the password.");
                }
            });
        });
    }

    // Display users for current page
            function displayUsers(page, users = allUsers) {
            if (!tbody) return;
            
            const start = (page - 1) * rowsPerPage;
            const end = start + rowsPerPage;
            const paginatedUsers = users.slice(start, end);
            
            tbody.innerHTML = '';
            
            if (paginatedUsers.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center">No users found</td></tr>';
                updateEntriesInfo();
                return;
            }

        tbody.innerHTML = paginatedUsers.map((user, index) => `
            <tr>
                <td>${start + index + 1}</td>
                <td>${user.username}</td>
                <td>${user.full_name || ''}</td>
                <td>${user.phone || ''}</td>
                <td class='user-role'>${user.role}</td>
                <td>
                    <button class="btn btn-sm ${user.is_active ? 'btn-success' : 'btn-secondary'} toggle-active-btn" 
                            data-id="${user.id}">
                        ${user.is_active ? 'Active' : 'Inactive'}
                    </button>
                    <button class="btn btn-danger btn-sm delete-user-btn" data-id="${user.id}">
                        Delete
                    </button>
                    <button class="btn btn-warning btn-sm reset-user-btn" data-username="${user.username}">
                        Reset
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Setup pagination controls
    // function setupPagination(users = allUsers) {
    //     const pageCount = Math.ceil(users.length / rowsPerPage);
    //     paginationContainer.innerHTML = '';

    //     if (pageCount <= 1) return;

    //     const ul = document.createElement('ul');
    //     ul.className = 'pagination';

    //     // Previous button
    //     const prevLi = document.createElement('li');
    //     prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    //     prevLi.innerHTML = '<a class="page-link" href="#" aria-label="Previous">Previous</a>';
    //     prevLi.addEventListener('click', (e) => {
    //         e.preventDefault();
    //         if (currentPage > 1) {
    //             currentPage--;
    //             displayUsers(currentPage, users);
    //             setupPagination(users);
    //         }
    //     });
    //     ul.appendChild(prevLi);

    //     // Page numbers
    //     for (let i = 1; i <= pageCount; i++) {
    //         const li = document.createElement('li');
    //         li.className = `page-item ${i === currentPage ? 'active' : ''}`;
    //         li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
    //         li.addEventListener('click', (e) => {
    //             e.preventDefault();
    //             currentPage = i;
    //             displayUsers(currentPage, users);
    //             setupPagination(users);
    //         });
    //         ul.appendChild(li);
    //     }

    //     // Next button
    //     const nextLi = document.createElement('li');
    //     nextLi.className = `page-item ${currentPage === pageCount ? 'disabled' : ''}`;
    //     nextLi.innerHTML = '<a class="page-link" href="#" aria-label="Next">Next</a>';
    //     nextLi.addEventListener('click', (e) => {
    //         e.preventDefault();
    //         if (currentPage < pageCount) {
    //             currentPage++;
    //             displayUsers(currentPage, users);
    //             setupPagination(users);
    //         }
    //     });
    //     ul.appendChild(nextLi);

    //     paginationContainer.appendChild(ul);
    // }

    // Helper function to update all voters status
    async function updateAllVotersStatus(enable) {
        const token = localStorage.getItem("access_token");
        try {
            const response = await fetch(`${API_BASE}/users/toggle-all-voters?enable=${enable}`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (response.ok) {
                const result = await response.json();
                alert(result.message || `All voters have been ${enable ? 'enabled' : 'disabled'}`);
                loadUsers();
            } else {
                const error = await response.json();
                alert(error.detail || `Failed to ${enable ? 'enable' : 'disable'} all voters.`);
            }
        } catch (err) {
            console.error(`Error ${enable ? 'enabling' : 'disabling'} all voters:`, err);
            alert(`An error occurred while ${enable ? 'enabling' : 'disabling'} all voters.`);
        }
    }

    // Example if you have a search input
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        if (searchTerm) {
            filteredUsers = allUsers.filter(user => {
                return Object.values(user).some(value => 
                    String(value).toLowerCase().includes(searchTerm)
                );
            });
        } else {
            filteredUsers = [...allUsers];
        }
        currentPage = 1;
        renderUsers();
        setupPagination();
        updateEntriesInfo();
    });

    // Search functionality
    const searchInput = document.getElementById('userSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            if (searchTerm) {
                filteredUsers = allUsers.filter(user => 
                    (user.full_name && user.full_name.toLowerCase().includes(searchTerm)) ||
                    (user.username && user.username.toLowerCase().includes(searchTerm))
                );
            } else {
                filteredUsers = [...allUsers];
            }
            currentPage = 1;
            renderUsers();
            setupPagination();
        });
    }

    // Initialize and assign loadUsers
    loadUsers = async function() {
        tbody.innerHTML = "<tr><td colspan='6' class='text-center'>Loading users...</td></";
        const token = localStorage.getItem("access_token");

        try {
            const response = await fetch(`${API_BASE}/users/`, {
                method: "GET",
                headers: {"Authorization": "Bearer " + token}
            });

            if (response.ok) {
                allUsers = await response.json();
                filteredUsers = [...allUsers];
                displayUsers(currentPage, filteredUsers);
                setupPagination(filteredUsers);
                setupEventListeners();
            } else {
                const error = await response.json();
                alert(error.detail || "Failed to load users.");
            }
        } catch (err) {
            console.error("Error loading users:", err);
            tbody.innerHTML = "<tr><td colspan='6' class='text-center text-danger'>Error loading users</td></";
        }
    };

    // Initial load
    loadUsers();

    // Attach event to "Load Users" button
    if (loadUsersBtn) {
        loadUsersBtn.addEventListener("click", loadUsers);
    }

    function updateEntriesInfo() {
        const entriesInfo = document.querySelector('.entries-info');
        if (!entriesInfo) return;
        
        const start = (currentPage - 1) * rowsPerPage;
        const end = Math.min(start + rowsPerPage, filteredUsers.length);
        const total = filteredUsers.length;
        const showingFrom = total > 0 ? start + 1 : 0;
        
        entriesInfo.textContent = `Showing ${showingFrom} to ${end} of ${total} entries`;
    }

    function setupPagination() {
        const pageCount = Math.ceil(filteredUsers.length / rowsPerPage);
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
                renderUsers();
                setupPagination();
                updateEntriesInfo();
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
                renderUsers();
                setupPagination();
                updateEntriesInfo();
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
                renderUsers();
                setupPagination();
                updateEntriesInfo();
            }
        });
        pagination.appendChild(nextLi);
    }

        function renderUsers() {
        const tbody = document.querySelector("#usersTable tbody");
        if (!tbody) return;
        
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const paginatedUsers = filteredUsers.slice(start, end);
        
        tbody.innerHTML = '';
        
        if (paginatedUsers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No users found</td></tr>';
            return;
        }
        
        // Your existing user rendering code here, but use paginatedUsers instead of allUsers
        paginatedUsers.forEach((user, index) => {
            const tr = document.createElement('tr');
            // Your existing row creation code here
            // ...
            tbody.appendChild(tr);
        });
    }

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
            .slice(1, -2) // remove last two columns
            .map((th) => th.textContent);

        // Add S/No as the first column header
        const head = [["S/No", ...headCells]];

        let serial = 1; // ✅ independent counter

        // Build body with serial number, only "voter" rows, skip last two columns
        const body = rows
            .map((tr) => {
                const cells = Array.from(tr.querySelectorAll("td")).slice(1, -2); // remove last two columns
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
