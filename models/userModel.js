const pool = require("../config/db");

async function findByEmail(email) {
  const [rows] = await pool.query(
    "SELECT id, business_id, name, email, password_hash AS password, role, email_verified, created_at FROM users WHERE email = ?",
    [email],
  );
  return rows[0] || null;
}

async function findDemoAccount({ email, businessName, accountName }) {
  const [rows] = await pool.query(
    `SELECT u.id, u.business_id, u.name, u.email, u.password_hash AS password, u.role, u.email_verified, u.created_at
     FROM users u
     JOIN businesses b ON b.id = u.business_id
     WHERE u.email = ? AND u.name = ? AND b.name = ? AND u.email_verified = 1
     LIMIT 1`,
    [email, accountName, businessName],
  );
  return rows[0] || null;
}

async function updateName(userId, name) {
  await pool.query("UPDATE users SET name = ? WHERE id = ?", [name, userId]);
  const [rows] = await pool.query(
    "SELECT id, business_id, name, email, password_hash AS password, role, email_verified, created_at FROM users WHERE id = ?",
    [userId],
  );
  return rows[0] || null;
}

async function findById(userId) {
  const [rows] = await pool.query(
    "SELECT id, business_id, name, email, password_hash AS password, role, email_verified, created_at FROM users WHERE id = ?",
    [userId],
  );
  return rows[0] || null;
}

async function updatePassword(userId, passwordHash) {
  const [result] = await pool.query(
    "UPDATE users SET password_hash = ? WHERE id = ?",
    [passwordHash, userId],
  );
  return result.affectedRows === 1;
}

async function createPending(data) {
  const [result] = await pool.query(
    "INSERT INTO users (business_id, name, email, password_hash, role, email_verified) VALUES (NULL, ?, ?, ?, 'manager', 0)",
    [data.name, data.email, data.password],
  );
  return findById(result.insertId);
}

async function updatePendingCredentials(userId, data) {
  await pool.query(
    "UPDATE users SET name = ?, password_hash = ? WHERE id = ? AND email_verified = 0",
    [data.name, data.password, userId],
  );
  return findById(userId);
}

async function activateAndCreateBusiness(userId, tokenId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [userRows] = await connection.query("SELECT id, name, email_verified FROM users WHERE id = ? FOR UPDATE", [userId]);
    const user = userRows[0];
    if (!user || user.email_verified) throw new Error("Pending account is no longer available.");
    const [tokenResult] = await connection.query(
      "UPDATE email_verification_tokens SET consumed_at = NOW() WHERE id = ? AND user_id = ? AND purpose = 'registration' AND consumed_at IS NULL",
      [tokenId, userId],
    );
    if (tokenResult.affectedRows !== 1) throw new Error("Verification code is no longer available.");
    const [business] = await connection.query("INSERT INTO businesses (name) VALUES (?)", [user.name + "'s Business"]);
    await connection.query("UPDATE users SET business_id = ?, email_verified = 1 WHERE id = ?", [business.insertId, userId]);
    await connection.commit();
    const [rows] = await connection.query(
      "SELECT id, business_id, name, email, password_hash AS password, role, email_verified, created_at FROM users WHERE id = ?",
      [userId],
    );
    return rows[0] || null;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
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
      "INSERT INTO users (business_id, name, email, password_hash, role, email_verified) VALUES (?, ?, ?, ?, ?, 1)",
      [businessId, data.name, data.email, data.password, data.role || "manager"],
    );
    await connection.commit();
    const [rows] = await pool.query(
      "SELECT id, business_id, name, email, password_hash AS password, role, email_verified, created_at FROM users WHERE id = ?",
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

module.exports = { findByEmail, findDemoAccount, findById, updateName, updatePassword, create, createPending, updatePendingCredentials, activateAndCreateBusiness };
