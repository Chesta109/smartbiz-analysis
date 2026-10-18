// Requires a migrated local smartbiz_insight database. SMTP is mocked so this
// exercises the real MySQL-backed flow without sending an email.
require("../../config/env");
const assert = require("node:assert/strict");
const nodemailer = require("nodemailer");
const pool = require("../../config/db");

// SMTP transport is mocked below; these only satisfy the configuration guard.
process.env.SMTP_USER ||= "test-sender@example.test";
process.env.SMTP_APP_PASSWORD ||= "not-used-by-mocked-transport";

const sent = [];
let rejectNextEmail = false;
nodemailer.createTransport = () => ({
  sendMail: async (message) => {
    sent.push(message);
    if (rejectNextEmail) return { accepted: [], rejected: [message.to] };
    return { accepted: [message.to], rejected: [] };
  },
});

const authService = require("../../services/authService");
const userModel = require("../../models/userModel");
const verificationModel = require("../../models/verificationModel");

function otpFromLatestEmail() {
  const match = sent.at(-1)?.text.match(/\b(\d{6})\b/);
  assert.ok(match, "Mocked email should contain a six-digit OTP");
  return match[1];
}

async function expectAppError(action, type) {
  await assert.rejects(action, (err) => err?.type === type);
}

async function run() {
  const email = `auth-flow-${Date.now()}@example.test`;
  const createdBusinessIds = [];
  try {
    const pending = await authService.register("Auth Flow Test", email.toUpperCase(), "Password!123", "Password!123");
    assert.equal(pending.email, email);
    assert.equal(Number(pending.email_verified), 0);
    assert.equal(pending.business_id, null);

    const token = await verificationModel.findActive(pending.id, "registration");
    assert.ok(token?.otp_hash && token.otp_hash.length === 64);
    assert.equal(token.consumed_at, null);
    await expectAppError(() => authService.login(email, "Password!123"), "EMAIL_NOT_VERIFIED");

    assert.equal(await authService.verifyRegistrationOtp(pending.id, "000000"), false);
    assert.equal((await verificationModel.findActive(pending.id, "registration")).attempts, 1);
    assert.equal(await authService.verifyRegistrationOtp(pending.id, otpFromLatestEmail()), true);
    const active = await userModel.findById(pending.id);
    assert.equal(Number(active.email_verified), 1);
    assert.ok(active.business_id);
    createdBusinessIds.push(active.business_id);
    assert.equal((await verificationModel.findActive(pending.id, "registration")), null);
    assert.equal((await authService.login(email, "Password!123")).id, pending.id);
    await expectAppError(() => authService.register("Duplicate", email, "Password!123", "Password!123"), "VALIDATION_ERROR");

    const resetStart = await authService.startPasswordReset(email, {});
    assert.ok(resetStart.reset);
    const wrongReset = authService.verifyPasswordResetOtp("000000", resetStart.reset);
    assert.equal(wrongReset.verified, false);
    const verifiedReset = authService.verifyPasswordResetOtp(otpFromLatestEmail(), wrongReset.reset);
    assert.equal(verifiedReset.verified, true);
    await authService.completePasswordReset("NewPassword!123", "NewPassword!123", verifiedReset.reset);
    assert.equal((await authService.login(email, "NewPassword!123")).id, pending.id);

    const resendUser = await authService.register("Resend Test", `resend-${Date.now()}@example.test`, "Password!123", "Password!123");
    await expectAppError(() => authService.issueRegistrationOtp(resendUser), "RATE_LIMIT_ERROR");
    await pool.query("UPDATE email_verification_tokens SET last_sent_at = DATE_SUB(NOW(), INTERVAL 61 SECOND) WHERE user_id = ? AND purpose = 'registration'", [resendUser.id]);
    await authService.issueRegistrationOtp(resendUser);
    const resent = await verificationModel.findActive(resendUser.id, "registration");
    assert.equal(resent.resend_count, 2);
    await pool.query("UPDATE email_verification_tokens SET expires_at = DATE_SUB(NOW(), INTERVAL 1 SECOND) WHERE id = ?", [resent.id]);
    await expectAppError(() => authService.verifyRegistrationOtp(resendUser.id, otpFromLatestEmail()), "VERIFICATION_ERROR");

    // SMTP rejection must not leave a usable OTP. The pending account is
    // deliberately retained so the same email can safely retry registration.
    const retryEmail = `retry-${Date.now()}@example.test`;
    rejectNextEmail = true;
    await expectAppError(() => authService.register("Retry Test", retryEmail, "Password!123", "Password!123"), "EMAIL_DELIVERY_ERROR");
    rejectNextEmail = false;
    const retryPending = await userModel.findByEmail(retryEmail);
    assert.equal(Number(retryPending.email_verified), 0);
    assert.equal(await verificationModel.findActive(retryPending.id, "registration"), null);
    await authService.register("Retry Test", retryEmail, "Password!123", "Password!123");
    assert.ok(await verificationModel.findActive(retryPending.id, "registration"));

    console.log("Auth integration checks passed.");
  } finally {
    await pool.query("DELETE FROM users WHERE email LIKE 'auth-flow-%@example.test' OR email LIKE 'resend-%@example.test' OR email LIKE 'retry-%@example.test'");
    if (createdBusinessIds.length) {
      await pool.query("DELETE FROM businesses WHERE id IN (?)", [createdBusinessIds]);
    }
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Auth integration checks failed:", err.message);
  process.exitCode = 1;
});
