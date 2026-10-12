const userModel = require("../models/userModel");
const { sanitizeUser } = require("./authService");
const { AppError } = require("../middlewares/errorHandler");
async function updateProfile(userId, data) {
  const name = data.name?.trim();
  const email = data.email?.trim().toLowerCase();
  if (!name || name.length > 120) throw new Error("Invalid name.");
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || email.length > 160 || !emailRegex.test(email)) throw new Error("Invalid email.");
  const existing = await userModel.findByEmail(email);
  if (existing && existing.id !== Number(userId))
    throw new Error("That email is already in use.");
  return sanitizeUser(await userModel.updateProfile(userId, { name, email }));
}
module.exports = { updateProfile };
