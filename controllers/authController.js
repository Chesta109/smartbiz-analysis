const authService = require("../services/authService");
const userModel = require("../models/userModel");

function flashPublicError(req, err, fallback) {
  // AppError messages are intentionally user-safe; database and SMTP driver
  // errors are logged by the global handler, not shown in the form.
  const actionableEmailError = ["EMAIL_CONFIGURATION_ERROR", "EMAIL_DELIVERY_ERROR"].includes(err?.type);
  req.flash("error", (err?.statusCode && err.statusCode < 500) || actionableEmailError ? err.message : fallback);
}

async function pendingRegistrationUser(req) {
  const pending = req.session.registrationVerification;
  if (pending?.userId) return userModel.findById(pending.userId);
  const email = String(req.body.email || "").trim().toLowerCase();
  return email ? userModel.findByEmail(email) : null;
}

async function login(req, res) {
  const { email, password } = req.body;
  try {
    const user = await authService.login(email, password);
    req.session.regenerate((err) => {
      if (err) console.error("Session regenerate error:", err);
      req.session.user = user;
      req.session.save((err) => {
        if (err) console.error("Session save error:", err);
        res.redirect("/dashboard");
      });
    });
  } catch (err) {
    flashPublicError(req, err, "Unable to sign in right now. Please try again.");
    res.redirect("/login");
  }
}

async function register(req, res) {
  const { name, email, password, confirm_password } = req.body;
  try {
    const user = await authService.register(name, email, password, confirm_password);
    req.session.registrationVerification = { userId: user.id, email: user.email };
    req.flash("success", "Verification code sent. Check your email to activate your account.");
    res.redirect("/verify-registration");
  } catch (err) {
    flashPublicError(req, err, "Registration could not be completed. Please try again.");
    res.redirect("/register");
  }
}

async function verifyRegistration(req, res) {
  const user = await pendingRegistrationUser(req);
  if (!user || user.email_verified) {
    req.flash("error", "Register or request a new verification code first.");
    return res.redirect("/register");
  }
  const verified = await authService.verifyRegistrationOtp(user.id, req.body.otp);
  if (!verified) {
    req.flash("error", "The verification code is incorrect.");
    return res.redirect("/verify-registration");
  }
  delete req.session.registrationVerification;
  req.flash("success", "Email verified. You can now sign in.");
  res.redirect("/login");
}

async function resendRegistrationOtp(req, res) {
  try {
    const user = await pendingRegistrationUser(req);
    if (!user || user.email_verified) {
      req.flash("error", "Register or sign in before requesting a verification code.");
      return res.redirect("/register");
    }
    await authService.issueRegistrationOtp(user);
    req.session.registrationVerification = { userId: user.id, email: user.email };
    req.flash("success", "A new verification code has been sent.");
    res.redirect("/verify-registration");
  } catch (err) {
    flashPublicError(req, err, "We could not send a verification email right now. Please try again later.");
    res.redirect("/verify-registration");
  }
}

function logout(req, res) {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.redirect("/login");
  });
}

async function forgotPassword(req, res) {
  const result = await authService.startPasswordReset(req.body.email, req.session.passwordReset);
  if (result.reset) req.session.passwordReset = result.reset;
  else delete req.session.passwordReset;
  req.flash("success", result.publicMessage);
  res.redirect("/verify-otp");
}

async function verifyOtp(req, res) {
  const result = authService.verifyPasswordResetOtp(req.body.otp, req.session.passwordReset);
  req.session.passwordReset = result.reset;
  if (!result.verified) {
    req.flash("error", "The verification code is incorrect.");
    return res.redirect("/verify-otp");
  }
  req.flash("success", "Code verified. Choose a new password.");
  res.redirect("/reset-password");
}

async function resetPassword(req, res) {
  await authService.completePasswordReset(req.body.password, req.body.confirmPassword, req.session.passwordReset);
  delete req.session.passwordReset;
  req.flash("success", "Your password has been reset. Please sign in.");
  res.redirect("/login");
}

module.exports = { login, register, verifyRegistration, resendRegistrationOtp, logout, forgotPassword, verifyOtp, resetPassword };
