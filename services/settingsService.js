const userModel = require("../models/userModel");
const { sanitizeUser } = require("./authService");
const { AppError } = require("../middlewares/errorHandler");
async function updateProfile(userId, data) {
  const name = data.name?.trim();
  if (!name || name.length > 120) throw new AppError("Invalid name.", 422, "VALIDATION_ERROR");
  if (Object.hasOwn(data, "email")) {
    throw new AppError("Email changes are not available from Settings.", 422, "EMAIL_CHANGE_DISABLED");
  }
  return sanitizeUser(await userModel.updateName(userId, name));
}
module.exports = { updateProfile };
