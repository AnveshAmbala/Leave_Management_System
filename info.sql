CREATE DATABASE company;
USE company;
DROP TABLE IF EXISTS leave_requests;
DROP TABLE IF EXISTS employees;

CREATE TABLE employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  contact VARCHAR(20) NOT NULL,
  department VARCHAR(100) NOT NULL,
  total_leaves INT NOT NULL,
  leaves_taken INT DEFAULT 0,
  password VARCHAR(255) NOT NULL
);

CREATE TABLE leave_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  emp_id INT NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  applied_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (emp_id) REFERENCES employees(id) ON DELETE CASCADE
);
INSERT INTO employees (name, email, contact, department, total_leaves, leaves_taken, password) VALUES
('Alice Johnson', 'alice@example.com', '9876543210', 'HR', 20, 2, 'alice123'),
('Bob Smith', 'bob@example.com', '9123456780', 'IT', 25, 5, 'bob123'),
('Charlie Brown', 'charlie@example.com', '9988776655', 'Finance', 18, 0, 'charlie123');

INSERT INTO leave_requests (emp_id, from_date, to_date, reason, status) VALUES
(1, '2025-09-20', '2025-09-22', 'Family function', 'pending'),
(2, '2025-09-18', '2025-09-19', 'Medical leave', 'approved'),
(2, '2025-08-10', '2025-08-12', 'Travel', 'rejected'),
(3, '2025-09-25', '2025-09-27', 'Personal work', 'pending');

select * from employees;
