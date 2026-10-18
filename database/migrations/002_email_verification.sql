-- SmartBiz Insight: email-verification support for an existing database.
-- Safe to run repeatedly on MySQL 5.7+ / 8.x. It preserves all existing data.
-- Existing users stay verified when the email_verified column is introduced;
-- newly registered accounts are explicitly created with email_verified = 0.
--
-- MySQL Workbench: select schema smartbiz_insight, open this file, then execute.
-- CLI: mysql -u root -p smartbiz_insight < database/migrations/002_email_verification.sql

DELIMITER $$

DROP PROCEDURE IF EXISTS smartbiz_apply_email_verification_migration$$
CREATE PROCEDURE smartbiz_apply_email_verification_migration()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE users
      ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER password_hash;
  END IF;

  -- Pending registrations have no business until their email address is verified.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'users'
      AND column_name = 'business_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE users MODIFY COLUMN business_id INT NULL;
  END IF;
END$$

CALL smartbiz_apply_email_verification_migration()$$
DROP PROCEDURE smartbiz_apply_email_verification_migration$$

DELIMITER ;

-- Before verification existed, every user already had a workspace. Mark only
-- those legacy workspace accounts verified; pending registrations always have
-- a NULL business_id and are intentionally left unverified.
UPDATE users
SET email_verified = 1
WHERE email_verified = 0 AND business_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
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
) ENGINE=InnoDB;
