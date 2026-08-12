const userModel = require("../models/userModel");
const { sanitizeUser } = require("./authService");
const { AppError } = require("../middlewares/errorHandler");
async function updateProfile(userId, data) {
  const name = data.name?.trim();
  const email = data.email?.trim().toLowerCase();
  if (!name || !email)
    throw new AppError("Name and email are required.", 422, "VALIDATION_ERROR");
  const existing = await userModel.findByEmail(email);
  if (existing && existing.id !== Number(userId))
    throw new AppError(
      "That email address is already in use.",
      409,
      "VALIDATION_ERROR",
    );
  return sanitizeUser(await userModel.updateProfile(userId, { name, email }));
}
module.exports = { updateProfile };
