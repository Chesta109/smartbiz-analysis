require("../config/env");
const nodemailer = require("nodemailer");
const { AppError } = require("../middlewares/errorHandler");
const logger = require("../utils/logger");

function smtpSettings() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE == null
    ? port === 465
    : String(process.env.SMTP_SECURE).toLowerCase() === "true";

  return { host, port, secure, user: process.env.SMTP_USER, pass: process.env.SMTP_APP_PASSWORD };
}

function assertSmtpConfigured(settings = smtpSettings()) {
  if (!settings.user || !settings.pass) {
    throw new AppError(
      "Email delivery is not configured. Set the server SMTP settings and try again.",
      503,
      "EMAIL_CONFIGURATION_ERROR",
    );
  }
  if (!settings.host || /[@\s]/.test(settings.host)) {
    throw new AppError(
      "Email delivery is not configured correctly. Set SMTP_HOST to a mail server hostname and try again.",
      503,
      "EMAIL_CONFIGURATION_ERROR",
    );
  }
  if (!Number.isInteger(settings.port) || settings.port < 1 || settings.port > 65535) {
    throw new AppError(
      "Email delivery is not configured correctly. Set a valid SMTP_PORT and try again.",
      503,
      "EMAIL_CONFIGURATION_ERROR",
    );
  }
  if (settings.host.toLowerCase() === "smtp.gmail.com" &&
    !((settings.port === 465 && settings.secure) || (settings.port === 587 && !settings.secure))) {
    throw new AppError(
      "Email delivery is not configured correctly. Gmail requires port 465 with SMTP_SECURE=true or port 587 with SMTP_SECURE=false.",
      503,
      "EMAIL_CONFIGURATION_ERROR",
    );
  }
  return settings;
}

function createTransport() {
  const settings = assertSmtpConfigured();
  return nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth: { user: settings.user, pass: settings.pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
}

async function verifySmtpConnection() {
  try {
    await createTransport().verify();
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error("SMTP connection verification failed.", { code: err.code, command: err.command });
    throw new AppError(
      "SMTP connection could not be verified. Check the SMTP host, port, TLS setting, and Google App Password.",
      503,
      "EMAIL_DELIVERY_ERROR",
    );
  }
}

async function sendOtpEmail(email, otp, purpose) {
  const settings = assertSmtpConfigured();
  const registration = purpose === "registration";
  try {
    const result = await createTransport().sendMail({
      from: process.env.SMTP_FROM || settings.user,
      to: email,
      subject: registration ? "Verify your SmartBiz Insight email" : "SmartBiz Insight password reset code",
      text: registration
        ? `Your SmartBiz Insight verification code is ${otp}. It expires in 10 minutes.`
        : `Your SmartBiz Insight password reset code is ${otp}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
    });

    // Nodemailer can resolve even when an SMTP server rejects every recipient.
    // Treat that as a delivery failure; never claim that a code was sent.
    if (result?.rejected?.length || (Array.isArray(result?.accepted) && result.accepted.length === 0)) {
      throw new Error("SMTP provider rejected the recipient.");
    }
    logger.info(`SMTP accepted ${purpose} email.`);
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error("SMTP submission failed.", { code: err.code, command: err.command });
    throw new AppError(
      "We could not deliver a verification email right now. Check the SMTP settings or try again later.",
      503,
      "EMAIL_DELIVERY_ERROR",
    );
  }
}

module.exports = { smtpSettings, createTransport, verifySmtpConnection, sendOtpEmail };
