const pool = require("../config/db");

async function replaceToken({ userId, purpose, otpHash, expiresAt, resendCount = 1 }) {
  await pool.query("DELETE FROM email_verification_tokens WHERE user_id = ? AND purpose = ?", [userId, purpose]);
  await pool.query(
    "INSERT INTO email_verification_tokens (user_id, purpose, otp_hash, expires_at, attempts, resend_count, last_sent_at) VALUES (?, ?, ?, ?, 0, ?, NOW())",
    [userId, purpose, otpHash, expiresAt, resendCount],
  );
}

async function findActive(userId, purpose) {
  const [rows] = await pool.query(
    "SELECT * FROM email_verification_tokens WHERE user_id = ? AND purpose = ? AND consumed_at IS NULL ORDER BY id DESC LIMIT 1",
    [userId, purpose],
  );
  return rows[0] || null;
}

async function incrementAttempts(id) {
  await pool.query("UPDATE email_verification_tokens SET attempts = attempts + 1 WHERE id = ?", [id]);
}

async function consume(id) {
  const [result] = await pool.query("UPDATE email_verification_tokens SET consumed_at = NOW() WHERE id = ? AND consumed_at IS NULL", [id]);
  return result.affectedRows === 1;
}

async function deleteById(id) {
  await pool.query("DELETE FROM email_verification_tokens WHERE id = ? AND consumed_at IS NULL", [id]);
}

async function deleteExpiredPending() {
  const [result] = await pool.query(
    "DELETE u FROM users u LEFT JOIN email_verification_tokens t ON t.user_id = u.id AND t.purpose = 'registration' WHERE u.email_verified = 0 AND u.created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR) AND (t.id IS NULL OR t.expires_at < NOW())",
  );
  return result.affectedRows;
}

module.exports = { replaceToken, findActive, incrementAttempts, consume, deleteById, deleteExpiredPending };
