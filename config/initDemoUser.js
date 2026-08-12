const bcrypt = require("bcrypt");
const userModel = require("../models/userModel");
const logger = require("../utils/logger");

async function ensureDemoUser() {
  try {
    const existing = await userModel.findByEmail("owner@demo.com");
    const password_hash = await bcrypt.hash("password123", 10);
    if (existing) {
      if (!(await bcrypt.compare("password123", existing.password_hash))) {
        await userModel.updatePasswordHash(existing.id, password_hash);
        logger.info(
          "Demo user password refreshed (owner@demo.com / password123)",
        );
      }
      return;
    }

    await userModel.create({
      name: "Demo Owner",
      email: "owner@demo.com",
      password_hash,
      role: "owner",
    });
    logger.info("Demo user created (owner@demo.com / password123)");
  } catch (err) {
    logger.warn(
      "Database unavailable — UI will load but data features need MySQL.",
      {
        message: err.message,
      },
    );
  }
}

module.exports = { ensureDemoUser };
