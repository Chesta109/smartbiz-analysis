// Idempotent Node alternative to database/migrations/002_email_verification.sql.
// It is useful on machines where the MySQL command-line client is unavailable.
require("dotenv").config();
const pool = require("../config/db");

async function hasColumn(connection, table, column) {
  const [rows] = await connection.query(
    "SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?",
    [table, column],
  );
  return rows.length > 0;
}

async function run() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    if (!(await hasColumn(connection, "users", "email_verified"))) {
      // The following update marks only legacy, workspace-backed accounts as
      // verified. New accounts remain pending until they complete OTP proof.
      await connection.query("ALTER TABLE users ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER password_hash");
    }
    if (await hasColumn(connection, "users", "business_id")) {
      await connection.query("ALTER TABLE users MODIFY COLUMN business_id INT NULL");
    }

    await connection.query("UPDATE users SET email_verified = 1 WHERE email_verified = 0 AND business_id IS NOT NULL");
    await connection.query(`CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      purpose ENUM('registration', 'password_reset') NOT NULL,
      otp_hash CHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
      resend_count TINYINT UNSIGNED NOT NULL DEFAULT 1,
      last_sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      consumed_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_token_user_purpose (user_id, purpose),
      KEY idx_tokens_expiry (expires_at),
      CONSTRAINT fk_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`);

    await connection.commit();
    console.log("Email-verification migration completed.");
  } catch (err) {
    await connection.rollback();
    console.error("Email-verification migration failed:", err.message);
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
}

run();
