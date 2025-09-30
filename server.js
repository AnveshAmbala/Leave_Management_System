import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import e from "express";

const app = express();
app.use(cors());
app.use(express.json());

// ===== DB Connection =====
let db;
async function initDB() {
  try {
    db = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "hsevna@183", // <-- your MySQL password
      database: "company",
    });
    console.log("✅ Connected to MySQL");
  } catch (err) {
    console.error("❌ DB connection failed:", err.message);
    process.exit(1);
  }
}
await initDB();

// ===== Employee Login =====
// ===== Employee Login =====
app.post("/api/employee-login", async (req, res) => {
  const { id, password } = req.body;
  if (!id || !password) {
    return res.status(400).json({ success: false, message: "id and password required" });
  }

  try {
    // Fetch employee with profile details
    const [rows] = await db.execute(
      "SELECT id, name, email, contact, department, total_leaves, leaves_taken, password FROM employees WHERE id=? AND password=?",
      [id, password]
    );

    if (rows.length === 0) {
      return res.json({ success: false, message: "Invalid credentials" });
    }

    const emp = rows[0];
    const leaves_left = emp.total_leaves - emp.leaves_taken;

    // Get today's date
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Check for current approved leaves
    const [currentLeaves] = await db.execute(
      `SELECT * FROM leave_requests
       WHERE emp_id=? AND status='approved'
         AND from_date <= ? AND to_date >= ?
       ORDER BY id DESC LIMIT 1`,
      [emp.id, today, today]
    );

    // Check for future approved leaves
    const [futureLeaves] = await db.execute(
      `SELECT * FROM leave_requests
       WHERE emp_id=? AND status='approved'
         AND from_date > ?
       ORDER BY from_date ASC LIMIT 1`,
      [emp.id, today]
    );

    let approvedMessage = null;
    if (currentLeaves.length > 0) {
      approvedMessage = `🎉 You are currently on approved leave until ${currentLeaves[0].to_date}!`;
    } else if (futureLeaves.length > 0) {
      approvedMessage = `📅 You have an upcoming approved leave from ${futureLeaves[0].from_date} to ${futureLeaves[0].to_date}.`;
    }

    res.json({
      success: true,
      employee: {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        contact: emp.contact,
        department: emp.department,
        total_leaves: emp.total_leaves,
        leaves_taken: emp.leaves_taken,
        leaves_left,
        approved: approvedMessage,
      },
    });

  } catch (err) {
    console.error("❌ DB Error (Employee login):", err.message);
    res.status(500).json({ success: false, message: "Database error" });
  }
});



// ===== Manager Login =====
app.post("/api/manager-login", async (req, res) => {
  const { username, password } = req.body;
  if (username === "admin" && password === "admin123") {
    return res.json({ success: true, manager: { id: 0, name: "Manager" } });
  }
  res.json({ success: false, message: "Invalid manager credentials" });
});

// ===== Fetch Employees (Manager Dashboard) =====
app.get("/api/employees", async (req, res) => {
  try {
    const [results] = await db.execute(
      "SELECT id, name, total_leaves, leaves_taken, (total_leaves - leaves_taken) AS leaves_left, department, email, contact, imageUrl FROM employees"
    );
     console.log(results); 
    res.json(results);
  } catch (err) {
    console.error("❌ DB Error (Get employees):", err.message);
    res.status(500).json({ success: false, message: "Database error" });
  }
});


// ===== Fetch Leave Requests =====
app.get("/api/leave-requests", async (req, res) => {
  try {
    const [results] = await db.execute(`
      SELECT lr.id, lr.emp_id, e.name, lr.from_date, lr.to_date, lr.reason, lr.status
      FROM leave_requests lr
      JOIN employees e ON lr.emp_id = e.id
      ORDER BY lr.id DESC
    `);
    res.json(results);
  } catch (err) {
    console.error("❌ DB Error (Get leave requests):", err.message);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

// ===== Approve/Reject Leave =====
app.post("/api/leave-requests/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["approved", "rejected"].includes(status)) return res.status(400).json({ success: false, message: "Invalid status" });

  try {
    await db.execute("UPDATE leave_requests SET status=? WHERE id=?", [status, id]);

    if (status === "approved") {
      const [results] = await db.execute(
        "SELECT emp_id, DATEDIFF(to_date, from_date)+1 AS days FROM leave_requests WHERE id=?",
        [id]
      );

      if (results[0]) {
        const { emp_id, days } = results[0];
        await db.execute("UPDATE employees SET leaves_taken = leaves_taken + ? WHERE id=?", [days, emp_id]);
      }
    }

    res.json({ success: true, message: `Leave request ${status}` });
  } catch (err) {
    console.error("❌ DB Error (Update leave):", err.message);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

// ===== Apply Leave =====
app.post("/api/apply-leave", async (req, res) => {
  const { emp_id, from_date, to_date, reason } = req.body;
  if (!emp_id || !from_date || !to_date || !reason) return res.status(400).json({ success: false, message: "All fields required" });

  try {
    await db.execute(
      "INSERT INTO leave_requests (emp_id, from_date, to_date, reason, status) VALUES (?, ?, ?, ?, 'pending')",
      [emp_id, from_date, to_date, reason]
    );
    res.json({ success: true, message: "Leave request submitted" });
  } catch (err) {
    console.error("❌ DB Error (Apply leave):", err.message);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

app.delete("/api/cancel-request/:id", (req, res) => {
  const requestId = req.params.id;
  const sql = "DELETE FROM leave_requests WHERE id = ? AND status = 'pending'";
  db.query(sql, [requestId], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: "DB error" });
    if (result.affectedRows > 0) {
      res.json({ success: true, message: "Request cancelled successfully" });
    } else {
      res.json({ success: false, message: "Cannot cancel approved/rejected request" });
    }
  });
});

// ===== Add New Employee =====
app.post("/api/employees", async (req, res) => {
  const { name, total_leaves, password, department, email, contact } = req.body;
  if (!name || !total_leaves || !password || !department || !email || !contact) {
    return res.status(400).json({ success: false, message: "All fields required" });
  }
  try {
    await db.execute(
      "INSERT INTO employees (name, total_leaves, leaves_taken, password, department, email, contact) VALUES (?, ?, 0, ?, ?,?, ?)",
      [name, total_leaves, password, department, email, contact]
    );
    res.json({ success: true, message: "Employee added" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "DB error" });
  }
});

// ===== Edit Employee Details =====
app.put("/api/employees/:id", async (req, res) => {
  const { id } = req.params;
  const { name, total_leaves, password, department, email, contact } = req.body;
  try {
    await db.execute(
      "UPDATE employees SET name=?, total_leaves=?, password=?, department=?, email=?, contact=? WHERE id=?",
      [name, total_leaves, password, department, email, contact, id]
    );
    res.json({ success: true, message: "Employee updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "DB error" });
  }
});
// ===== Delete Employee =====
app.delete("/api/employees/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute("DELETE FROM employees WHERE id = ?", [id]);
    res.json({ success: true, message: "Employee deleted" });
  } catch (err) {
    console.error("❌ DB Error (Delete employee):", err.message);
    res.status(500).json({ success: false, message: "DB error" });
  }
});


// GET Leave Stats
app.get("/api/leave-stats", async (req, res) => {
  try {
    const [monthly] = await db.execute(`
      SELECT DATE_FORMAT(from_date, '%Y-%m') AS month, COUNT(*) AS count
      FROM leave_requests
      WHERE status='approved'
      GROUP BY DATE_FORMAT(from_date, '%Y-%m')
      ORDER BY month
    `);

    const [department] = await db.execute(`
      SELECT e.department, COUNT(*) AS count
      FROM leave_requests lr
      JOIN employees e ON lr.emp_id = e.id
      WHERE lr.status='approved'
      GROUP BY e.department
    `);

    res.json({ monthly, department });
  } catch (err) {
    console.error("❌ DB Error (leave stats):", err.message);
    res.status(500).json({ success: false, message: "Database error" });
  }
});






// ===== Start Server =====
app.listen(5050, () => console.log("🚀 Server running on port 5050"));
