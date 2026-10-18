require("dotenv").config();
const verificationModel = require("../models/verificationModel");
const pool = require("../config/db");

async function run() {
  try {
    const removed = await verificationModel.deleteExpiredPending();
    console.log("Removed " + removed + " expired, unverified account(s).");
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Pending-account cleanup failed:", err.message);
  process.exitCode = 1;
});
