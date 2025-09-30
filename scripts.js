let currentEmployeeId = null;
let currentEmployeePassword = null;
let managerLeaveChart = null;
let monthlyLeaveChart = null;
let departmentLeaveChart = null;
let allEmployees = [];
let displayedCount = 4; // show 5 initially



// ===== Role Selection =====
function showManagerLogin() {
  document.getElementById("roleSelection").style.display = "none";
  document.getElementById("managerLoginSection").style.display = "block";
}
function showEmployeeLogin() {
  document.getElementById("roleSelection").style.display = "none";
  document.getElementById("employeeLoginSection").style.display = "block";
}

// ===== Employee Login =====
document.getElementById("employeeLoginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  document.getElementById("employeeLoginError").textContent = "";
  const id = document.getElementById("emp_id").value;
  const password = document.getElementById("emp_password").value;

  currentEmployeeId = id;
  currentEmployeePassword = password;

  try {
    const response = await fetch("http://localhost:5050/api/employee-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, password })
    });
    const result = await response.json();

    if (result.success) {
      document.getElementById("employeeLoginSection").style.display = "none";
      document.getElementById('loginPage').style.display = 'none';
  document.getElementById('mainContent').style.display = 'block';
      document.getElementById("employeeDashboard").style.display = "block";
      document.getElementById("empName").textContent = result.employee.name;
      document.getElementById("empLeaves").textContent = result.employee.leaves_left;

document.getElementById("empEmail").textContent = result.employee.email;
document.getElementById("empContact").textContent = result.employee.contact;
document.getElementById("empDept").textContent = result.employee.department;

      document.getElementById("approvalMsg").textContent = result.employee.approved || "";
      loadEmployeeRequests();
    } else {
      document.getElementById("employeeLoginError").textContent = result.message;
    }
  } catch {
    document.getElementById("employeeLoginError").textContent = "Server/DB error";
  }
});
const employeeCards = document.querySelectorAll('.employee-card');

employeeCards.forEach(card => {
  card.querySelector('.employee-name').addEventListener('click', () => {
    // Only toggle the clicked card
    card.classList.toggle('active');
  });
});

// ===== Manager Login =====
document.getElementById("managerLoginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  document.getElementById("loginError").textContent = "";
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const response = await fetch("http://localhost:5050/api/manager-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const result = await response.json();

    if (result.success) {
      document.getElementById('loginPage').style.display = 'none';
  document.getElementById('mainContent').style.display = 'block';
      document.getElementById("managerLoginSection").style.display = "none";
      document.getElementById("managerDashboard").style.display = "block";
      loadEmployees();
      loadRequests();
      loadLeaveStats();
    } else {
      document.getElementById("loginError").textContent = result.message;
    }
  } catch {
    document.getElementById("loginError").textContent = "Server/DB error";
  }


});



// ===== Employee Leave Request =====
document.getElementById("requestLeaveForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  document.getElementById("leaveRequestMsg").textContent = "";
  const from_date = document.getElementById("from_date").value;
  const to_date = document.getElementById("to_date").value;
  const reason = document.getElementById("reason").value;

  try {
    const response = await fetch("http://localhost:5050/api/apply-leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emp_id: currentEmployeeId, from_date, to_date, reason })
    });
    const result = await response.json();
    document.getElementById("leaveRequestMsg").textContent = result.message || "DB error";
    loadEmployeeRequests();
  } catch {
    document.getElementById("leaveRequestMsg").textContent = "Server/DB error";
  }
});




// ===== Manager Dashboard: Employees =====
async function loadEmployees() {
  try {
    const response = await fetch("http://localhost:5050/api/employees");
    const employees = await response.json();

    // Button to open form for adding a new employee
    let table = `<button onclick="openEmployeeForm()" style="margin-bottom:20px;">+ Add Employee</button>`;

    table += "<table><tr><th>Name</th><th>Total</th><th>Taken</th><th>Left</th><th>Department</th><th>Actions</th></tr>";

    employees.forEach(emp => {
      // Escape single quotes in strings to prevent breaking the onclick
      const nameEscaped = emp.name.replace(/'/g, "\\'");
      const deptEscaped = (emp.department || '').replace(/'/g, "\\'");

      table += `<tr>
        <td>${emp.name}</td>
        <td>${emp.total_leaves}</td>
        <td>${emp.leaves_taken}</td>
        <td>${emp.leaves_left}</td>
        <td>${emp.department || 'N/A'}</td>
        <td>
          <button onclick="openEmployeeForm(${emp.id}, '${nameEscaped}', ${emp.total_leaves}, '${deptEscaped}')">Edit</button>
          <button onclick='deleteEmployee(${emp.id})' style="color:white;">Delete</button>
        </td>
      </tr>`;
    });

    table += "</table>";
    document.getElementById("employeesTable").innerHTML = table;

    updateManagerChart(employees);
  } catch (err) {
    console.error("Error loading employees:", err);
    document.getElementById("managerError").textContent = "DB error fetching employees";
  }
}
async function deleteEmployee(id) {
  if (!confirm("Are you sure you want to delete this employee?")) return;

  try {
    const response = await fetch(`http://localhost:5050/api/employees/${id}`, {
      method: "DELETE",
    });
    const result = await response.json();

    if (result.success) {
      alert("✅ Employee deleted");
      loadEmployees(); // refresh table
    } else {
      alert("❌ Error: " + result.message);
    }
  } catch {
    alert("❌ Failed to delete employee. Server error.");
  }
}

async function loadEmployeeDirectory() {
  try {
    const response = await fetch("http://localhost:5050/api/employees");
    allEmployees = await response.json();
    renderEmployeeList();
  } catch (err) {
    console.error("Error fetching employees:", err);
    document.getElementById("employeeList").textContent = "❌ Failed to load employees";
  }
}
function renderEmployeeList() {
  const deptFilter = document.getElementById("deptFilter").value;
  let filtered = deptFilter ? allEmployees.filter(emp => emp.department === deptFilter) : allEmployees;

  const listContainer = document.getElementById("employeeList");
  listContainer.innerHTML = "";

  filtered.slice(0, displayedCount).forEach(emp => {
    const empDiv = document.createElement("div");
    empDiv.className = "employee-card";
    empDiv.innerHTML = `
      <img src="${emp.imageUrl || 'default.png'}" alt="${emp.name}" class="emp-img">
      <h4 onclick="toggleEmployeeDetails(${emp.id})" style="cursor:pointer;">${emp.name}</h4>
      <div id="emp-details-${emp.id}" class="emp-details" style="display:none;">
        <p><b>Email:</b> ${emp.email || "N/A"}</p>
        <p><b>Contact:</b> ${emp.contact || "N/A"}</p>
        <p><b>Department:</b> ${emp.department || "N/A"}</p>
        <p><b>Total Leaves:</b> ${emp.total_leaves}</p>
        <p><b>Taken:</b> ${emp.leaves_taken}</p>
        <p><b>Left:</b> ${emp.leaves_left}</p>
        <button onclick="openEmployeeForm(${emp.id}, '${emp.name}', ${emp.total_leaves}, '${emp.department}', '${emp.email}', '${emp.contact}')">Edit</button>
        <button onclick="deleteEmployee(${emp.id})" style="color:white;">Delete</button>
      </div>
    `;
    listContainer.appendChild(empDiv);
  });

  document.getElementById("showMoreBtn").style.display = filtered.length > displayedCount ? "block" : "none";
}
function toggleEmployeeDetails(id) {
  const details = document.getElementById(`emp-details-${id}`);
  details.style.display = details.style.display === "none" ? "block" : "none";
}
function showMoreEmployees() {
  displayedCount += 5;
  renderEmployeeList();
}
function filterEmployees() {
  displayedCount = 5; // reset count when filter changes
  renderEmployeeList();
}
window.addEventListener('DOMContentLoaded', () => {
  loadEmployees();          // existing table
  loadEmployeeDirectory();  // new directory feature
});

window.addEventListener('DOMContentLoaded', loadLeaveStats);


function openEmployeeForm(id = "", name = "", total_leaves = "", department = "", email = "", contact = "") {
  document.getElementById("employeeFormModal").style.display = "block";
  document.getElementById("formTitle").textContent = id ? "Edit Employee" : "Add Employee";
  document.getElementById("emp_id_form").value = id;
  document.getElementById("emp_name_form").value = name;
  document.getElementById("emp_total_leaves_form").value = total_leaves;
  document.getElementById("emp_department_form").value = department;
  document.getElementById("emp_password_form").value = ""; // reset password input
  document.getElementById("emp_email_form").value = email; // reset email input  
  document.getElementById("emp_contact_form").value = contact; // reset contact input
}

function closeEmployeeForm() {
  document.getElementById("employeeFormModal").style.display = "none";
}
document.getElementById("employeeForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("emp_id_form").value;
  const name = document.getElementById("emp_name_form").value;
  const total_leaves = document.getElementById("emp_total_leaves_form").value;
  const department = document.getElementById("emp_department_form").value;
  const password = document.getElementById("emp_password_form").value;
  const email = document.getElementById("emp_email_form").value;
  const contact = document.getElementById("emp_contact_form").value;

  try {
    let url = "http://localhost:5050/api/employees";
    let method = "POST";

    if (id) {
      url += `/${id}`;
      method = "PUT";
    }

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, total_leaves, department, password, email, contact })
    });

    const result = await response.json();
    alert(result.message || "DB error");

    closeEmployeeForm();
    loadEmployees();
  } catch (err) {
    alert("Server/DB error saving employee");
  }
});

async function submitEmployeeForm() {
  const id = document.getElementById("emp_id_form").value;
  const name = document.getElementById("emp_name_form").value;
  const total_leaves = document.getElementById("emp_total_leaves_form").value;
  const department = document.getElementById("emp_department_form").value;
  const password = document.getElementById("emp_password_form").value;
  const email = document.getElementById("emp_email_form").value;
  const contact = document.getElementById("emp_contact_form").value;

  const payload = { name, total_leaves, department, email, contact };
  if (!id && !password) {
    document.getElementById("employeeFormError").textContent = "Password is required for new employee";
    return;
  }
  if (password) payload.password = password;

  try {
    let url = "http://localhost:5050/api/employees";
    let method = "POST";

    if (id) {
      url += `/${id}`;
      method = "PUT";
    }

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.success) {
      closeEmployeeForm();
      loadEmployees();
    } else {
      document.getElementById("employeeFormError").textContent = result.message;
    }
  } catch (err) {
    document.getElementById("employeeFormError").textContent = "Server/DB error";
  }
}

// ===== Manager Dashboard: Leave Requests =====
async function loadRequests() {
  try {
    const response = await fetch("http://localhost:5050/api/leave-requests");
    const requests = await response.json();
    const list = document.getElementById("requestsList");
    list.innerHTML = "";

    // Group requests by employee
    const latestRequests = {};
    requests.forEach(req => {
      // Only consider latest request per employee
      if (!latestRequests[req.emp_id] || latestRequests[req.emp_id].id < req.id) {
        latestRequests[req.emp_id] = req;
      }
    });

    Object.values(latestRequests).forEach(req => {
      const li = document.createElement("li");
      let cls = req.status === "approved" ? "status-approved" :
                req.status === "rejected" ? "status-rejected" : "status-pending";

      li.innerHTML = `${req.name} | ${req.from_date} → ${req.to_date} | ${req.reason} | <span class="${cls}">${req.status}</span>`;

      // Only show buttons if request is still pending
      if (req.status === "pending") {
        const approveBtn = document.createElement("button");
        approveBtn.textContent = "Approve";
        approveBtn.onclick = () => updateRequest(req.id, "approved");

        const rejectBtn = document.createElement("button");
        rejectBtn.textContent = "Reject";
        rejectBtn.onclick = () => updateRequest(req.id, "rejected");

        li.appendChild(approveBtn);
        li.appendChild(rejectBtn);
      }

      list.appendChild(li);
    });

  } catch {
    document.getElementById("managerError").textContent = "DB error fetching requests";
  }
}


async function updateRequest(id, status) {
  try {
    const response = await fetch(`http://localhost:5050/api/leave-requests/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    const result = await response.json();
    alert(result.message || "DB error updating request");
    loadEmployees();
    loadRequests();
    loadEmployeeRequests();
  } catch {
    alert("Server/DB error updating request");
  }
}

function loadLeaveStats() {
  fetch("http://localhost:5050/api/leave-stats")
    .then(res => res.json())
    .then(data => {
      // Monthly chart
      const ctxMonthly = document.getElementById("monthlyStats").getContext("2d");
      new Chart(ctxMonthly, {
        type: 'bar',
        data: {
          labels: data.monthly.map(d => d.month),
          datasets: [{
            label: 'Approved Leaves per Month',
            data: data.monthly.map(d => d.count),
            backgroundColor: '#36A2EB'
          }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
      });

      // Department chart
      const ctxDept = document.getElementById("departmentStats").getContext("2d");
      new Chart(ctxDept, {
        type: 'bar',
        data: {
          labels: data.department.map(d => d.department),
          datasets: [{
            label: 'Approved Leaves per Department',
            data: data.department.map(d => d.count),
            backgroundColor: '#FF6384'
          }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
      });
    })
    .catch(err => {
      console.error("Error loading leave stats:", err);
      document.getElementById("leaveStatistics").innerHTML += "<p>⚠️ Error loading stats</p>";
    });
}

// Call this after manager login:
loadLeaveStats();

// ===== Employee Dashboard: My Requests =====
async function loadEmployeeRequests() {
  if (!currentEmployeeId) return;

  const month = document.getElementById("filterMonth").value;
  const year = document.getElementById("filterYear").value;
  const status = document.getElementById("filterStatus").value;

  try {
    const resp = await fetch("http://localhost:5050/api/leave-requests");
    const requests = await resp.json();
    const list = document.getElementById("employeeRequestsList");
    list.innerHTML = "";

    requests
      .filter(r => r.emp_id == currentEmployeeId)
      .filter(r => !month || new Date(r.from_date).getMonth() + 1 == month)
      .filter(r => !year || new Date(r.from_date).getFullYear() == year)
      .filter(r => !status || r.status === status)
      .forEach(req => {
        let cls = req.status === "approved" ? "status-approved" :
                  req.status === "rejected" ? "status-rejected" : "status-pending";
        const li = document.createElement("li");

        // Add Cancel button only if request is pending
        let cancelBtn = req.status === "pending"
          ? `<button onclick="cancelRequest(${req.id})">Cancel</button>`
          : "";

        li.innerHTML = `${req.from_date} → ${req.to_date} | ${req.reason} | 
                        <span class="${cls}">${req.status}</span> ${cancelBtn}`;
        list.appendChild(li);
      });
  } catch (err) {
    document.getElementById("leaveRequestMsg").textContent = "DB error fetching requests";
  }
}

async function cancelRequest(id) {
  try {
    const response = await fetch(`http://localhost:5050/api/cancel-request/${id}`, {
      method: "DELETE"
    });
    const result = await response.json();
    alert(result.message || "DB error cancelling request");
    loadEmployeeRequests();
  } catch (err) {
    alert("Server/DB error cancelling request");
  }
}


// ===== Manager Chart =====
function updateManagerChart(employees) {
  const ctx = document.getElementById('managerLeaveChart').getContext('2d');
  if (managerLeaveChart) managerLeaveChart.destroy();

  managerLeaveChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: employees.map(emp => emp.name),
      datasets: [
        { label: 'Leaves Taken', data: employees.map(emp => emp.leaves_taken), backgroundColor: '#FF6384' },
        { label: 'Leaves Left', data: employees.map(emp => emp.leaves_left), backgroundColor: '#36A2EB' }
      ]
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } }, plugins: { legend: { position: 'bottom' } } }
  });
}

// ===== Employee Polling (No Chart) =====
// ===== Employee Polling =====
setInterval(async () => {
  if (!currentEmployeeId || !currentEmployeePassword) return;

  try {
    const resp = await fetch("http://localhost:5050/api/employee-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: currentEmployeeId, password: currentEmployeePassword })
    });

    const result = await resp.json();
    if (result.success) {
      // Update leaves left
      document.getElementById("empLeaves").textContent = result.employee.leaves_left;

      // Update leave approval/future leave message
      document.getElementById("approvalMsg").textContent = result.employee.approved || "";

      // Update employee's leave requests list
      loadEmployeeRequests();
    } else {
      // If login fails during polling, show error (optional)
      document.getElementById("leaveRequestMsg").textContent = result.message;
    }

  } catch (err) {
    // Show DB/server error
    document.getElementById("leaveRequestMsg").textContent = "Server/DB error";
    console.error("Polling error:", err);
  }
}, 5000); // polls every 5 seconds


