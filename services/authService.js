const bcrypt = require("bcrypt");
const userModel = require("../models/userModel");
const { AppError } = require("../middlewares/errorHandler");

function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

async function login(email, password) {
  const user = await userModel.findByEmail(email);
  if (!user) {
    throw new AppError("Invalid credentials.", 401, "AUTHENTICATION_ERROR");
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw new AppError("Invalid credentials.", 401, "AUTHENTICATION_ERROR");
  }
  return sanitizeUser(user);
}

async function register(name, email, password, role) {
  const existing = await userModel.findByEmail(email);
  if (existing) {
    throw new AppError("Email already in use.", 409, "VALIDATION_ERROR");
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await userModel.create({
    name,
    email,
    password: hashedPassword,
    role,
  });
  return sanitizeUser(user);
}

module.exports = { login, register, sanitizeUser };
