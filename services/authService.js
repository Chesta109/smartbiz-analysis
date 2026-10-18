const bcrypt = require("bcrypt");
const crypto = require("crypto");
const userModel = require("../models/userModel");
const verificationModel = require("../models/verificationModel");
const { AppError } = require("../middlewares/errorHandler");
const { sendOtpEmail } = require("./emailService");
const demoConfig = require("./demoConfig");

const OTP_LIFETIME_MS = 10 * 60 * 1000;
const VERIFIED_RESET_LIFETIME_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const MIN_RESEND_INTERVAL_MS = 60 * 1000;
const MAX_OTP_REQUESTS = 3;

function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}
function normaliseEmail(email) { return String(email || "").trim().toLowerCase(); }
function hashOtp(otp) { return crypto.createHash("sha256").update(otp).digest("hex"); }
function createOtp() { return crypto.randomInt(100000, 1000000).toString(); }
async function login(email, password) {
  const user = await userModel.findByEmail(normaliseEmail(email));
  if (!user || !(await bcrypt.compare(password || "", user.password))) throw new AppError("Invalid credentials.", 401, "AUTHENTICATION_ERROR");
  if (!user.email_verified || !user.business_id) throw new AppError("Verify your email address before signing in.", 403, "EMAIL_NOT_VERIFIED");
  return sanitizeUser(user);
}

async function loginDemo(password) {
  if (!demoConfig.isConfigured()) {
    throw new AppError("Demo access has not been configured on this server.", 503, "DEMO_CONFIGURATION_ERROR");
  }
  const config = demoConfig.config();
  if (!(await bcrypt.compare(String(password || ""), config.passwordHash))) {
    throw new AppError("Invalid demo access password.", 401, "AUTHENTICATION_ERROR");
  }
  const user = await userModel.findDemoAccount(config);
  if (!user) {
    throw new AppError("The demo account has not been seeded yet.", 503, "DEMO_CONFIGURATION_ERROR");
  }
  // The demo context is a manager so teammates can exercise CRUD. Settings
  // remains blocked at the route level for sessions created here.
  if (user.role !== "manager") {
    throw new AppError("The demo account is not configured safely.", 503, "DEMO_CONFIGURATION_ERROR");
  }
  return sanitizeUser(user);
}

async function issueRegistrationOtp(user) {
  const existing = await verificationModel.findActive(user.id, "registration");
  const now = Date.now();
  if (existing && now - new Date(existing.last_sent_at).getTime() < MIN_RESEND_INTERVAL_MS) throw new AppError("Please wait a minute before requesting another code.", 429, "RATE_LIMIT_ERROR");
  if (existing && existing.resend_count >= MAX_OTP_REQUESTS) throw new AppError("Too many verification codes requested. Please try again later.", 429, "RATE_LIMIT_ERROR");
  const otp = createOtp();
  await verificationModel.replaceToken({ userId: user.id, purpose: "registration", otpHash: hashOtp(otp), expiresAt: new Date(now + OTP_LIFETIME_MS), resendCount: (existing ? existing.resend_count : 0) + 1 });
  const token = await verificationModel.findActive(user.id, "registration");
  try {
    await sendOtpEmail(user.email, otp, "registration");
  } catch (err) {
    // Do not retain a code that was never delivered. A later registration or
    // resend can safely issue a fresh one.
    if (token) await verificationModel.deleteById(token.id);
    throw err;
  }
}

async function register(name, email, password, confirmPassword) {
  const normalisedEmail = normaliseEmail(email);
  if (!name || !name.trim()) throw new AppError("Name is required.", 422, "VALIDATION_ERROR");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalisedEmail)) throw new AppError("Enter a valid email address.", 422, "VALIDATION_ERROR");
  if (!password || password.length < 8) throw new AppError("Password must be at least 8 characters.", 422, "VALIDATION_ERROR");
  if (password !== confirmPassword) throw new AppError("Passwords do not match.", 422, "VALIDATION_ERROR");
  const existing = await userModel.findByEmail(normalisedEmail);
  if (existing && existing.email_verified) throw new AppError("Email already in use.", 409, "VALIDATION_ERROR");
  const passwordHash = await bcrypt.hash(password, 10);
  const user = existing
    ? await userModel.updatePendingCredentials(existing.id, { name: name.trim(), password: passwordHash })
    : await userModel.createPending({ name: name.trim(), email: normalisedEmail, password: passwordHash });
  await issueRegistrationOtp(user);
  return sanitizeUser(user);
}

async function verifyRegistrationOtp(userId, otp) {
  const user = await userModel.findById(userId);
  const token = await verificationModel.findActive(userId, "registration");
  if (!user || user.email_verified || !token) throw new AppError("Request a new verification code first.", 400, "VERIFICATION_ERROR");
  if (Date.now() > new Date(token.expires_at).getTime()) throw new AppError("This verification code has expired. Request a new one.", 400, "VERIFICATION_ERROR");
  if (token.attempts >= MAX_OTP_ATTEMPTS) throw new AppError("Too many incorrect attempts. Request a new code.", 429, "RATE_LIMIT_ERROR");
  const inputHashBuf = Buffer.from(hashOtp(String(otp || "")));
  const storedHashBuf = Buffer.from(String(token.otp_hash || ""));
  if (inputHashBuf.length !== storedHashBuf.length || !crypto.timingSafeEqual(inputHashBuf, storedHashBuf)) {
    await verificationModel.incrementAttempts(token.id);
    return false;
  }
  await userModel.activateAndCreateBusiness(user.id, token.id);
  return true;
}

async function startPasswordReset(email, currentReset = {}) {
  const now = Date.now();
  const normalisedEmail = normaliseEmail(email);
  if (!normalisedEmail) throw new AppError("Enter your email address.", 422, "VALIDATION_ERROR");
  if (currentReset.lastSentAt && now - currentReset.lastSentAt < MIN_RESEND_INTERVAL_MS) throw new AppError("Please wait a minute before requesting another code.", 429, "RATE_LIMIT_ERROR");
  if ((currentReset.requestCount || 0) >= MAX_OTP_REQUESTS) throw new AppError("Too many reset requests. Please try again later.", 429, "RATE_LIMIT_ERROR");
  const user = await userModel.findByEmail(normalisedEmail);
  if (!user || !user.email_verified) return { publicMessage: "If that email is registered, a verification code has been sent.", reset: null };
  const otp = createOtp();
  await sendOtpEmail(user.email, otp, "password_reset");
  return { publicMessage: "If that email is registered, a verification code has been sent.", reset: { userId: user.id, email: user.email, otpHash: hashOtp(otp), expiresAt: now + OTP_LIFETIME_MS, attempts: 0, requestCount: (currentReset.requestCount || 0) + 1, lastSentAt: now } };
}

function verifyPasswordResetOtp(otp, reset) {
  if (!reset || !reset.userId || !reset.otpHash) throw new AppError("Request a new verification code first.", 400, "RESET_ERROR");
  if (Date.now() > reset.expiresAt) throw new AppError("This verification code has expired. Request a new one.", 400, "RESET_ERROR");
  if (reset.attempts >= MAX_OTP_ATTEMPTS) throw new AppError("Too many incorrect attempts. Request a new code.", 429, "RATE_LIMIT_ERROR");
  const inputHashBuf = Buffer.from(hashOtp(String(otp || "")));
  const storedHashBuf = Buffer.from(String(reset.otpHash || ""));
  if (inputHashBuf.length !== storedHashBuf.length || !crypto.timingSafeEqual(inputHashBuf, storedHashBuf)) {
    return { verified: false, reset: { ...reset, attempts: reset.attempts + 1 } };
  }
  return { verified: true, reset: { userId: reset.userId, email: reset.email, verifiedAt: Date.now(), resetExpiresAt: Date.now() + VERIFIED_RESET_LIFETIME_MS } };
}

async function completePasswordReset(password, confirmPassword, reset) {
  if (!reset || !reset.userId || !reset.verifiedAt || Date.now() > reset.resetExpiresAt) throw new AppError("Your reset verification has expired. Start again.", 400, "RESET_ERROR");
  if (!password || password.length < 8) throw new AppError("Password must be at least 8 characters.", 422, "VALIDATION_ERROR");
  if (password !== confirmPassword) throw new AppError("Passwords do not match.", 422, "VALIDATION_ERROR");
  const user = await userModel.findById(reset.userId);
  if (!user || !user.email_verified || normaliseEmail(user.email) !== normaliseEmail(reset.email)) throw new AppError("Your reset request is no longer valid. Start again.", 400, "RESET_ERROR");
  await userModel.updatePassword(user.id, await bcrypt.hash(password, 10));
}

module.exports = { login, loginDemo, register, sanitizeUser, startPasswordReset, verifyPasswordResetOtp, completePasswordReset, issueRegistrationOtp, verifyRegistrationOtp };
