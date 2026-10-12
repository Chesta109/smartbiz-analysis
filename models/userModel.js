const pool = require("../config/db");

async function findByEmail(email) {
  const [rows] = await pool.query(
    "SELECT id, business_id, name, email, password_hash AS password, role, created_at FROM users WHERE email = ?",
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
    "SELECT id, business_id, name, email, password_hash AS password, role, created_at FROM users WHERE id = ?",
    [userId],
  );
  return rows[0] || null;
}

async function create(data) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [bizResult] = await connection.query(
      "INSERT INTO businesses (name) VALUES (?)",
      [`${data.name}'s Business`]
    );
    const businessId = bizResult.insertId;
    const [result] = await connection.query(
      "INSERT INTO users (business_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)",
      [businessId, data.name, data.email, data.password, data.role || "manager"],
    );
    await connection.commit();
    const [rows] = await pool.query(
      "SELECT id, business_id, name, email, password_hash AS password, role, created_at FROM users WHERE id = ?",
      [result.insertId],
    );
    return rows[0];
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = { findByEmail, updateProfile, create };
