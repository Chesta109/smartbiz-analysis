const pool = require("../config/db");

async function findByEmail(email) {
  const [rows] = await pool.query(
    "SELECT id, name, email, password_hash AS password, role, created_at FROM users WHERE email = ?",
    [email],
  );
  return rows[0] || null;
}

async function updateProfile(userId, data) {
  await pool.query("UPDATE users SET name = ?, email = ? WHERE id = ?", [
    data.name,
    data.email,
    userId,
  ]);
  const [rows] = await pool.query(
    "SELECT id, name, email, password_hash AS password, role, created_at FROM users WHERE id = ?",
    [userId],
  );
  return rows[0] || null;
}

async function create(data) {
  const [result] = await pool.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
    [data.name, data.email, data.password, data.role || "manager"],
  );
  const [rows] = await pool.query(
    "SELECT id, name, email, password_hash AS password, role, created_at FROM users WHERE id = ?",
    [result.insertId],
  );
  return rows[0];
}

module.exports = { findByEmail, updateProfile, create };
