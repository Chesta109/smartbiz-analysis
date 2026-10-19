require("../config/env");
const { verifySmtpConnection } = require("../services/emailService");

async function run() {
  await verifySmtpConnection();
  console.log("SMTP connection verified.");
}

run().catch((err) => {
  // Error messages intentionally exclude the configured password and OTPs.
  console.error("SMTP verification failed:", err.message);
  process.exitCode = 1;
});
