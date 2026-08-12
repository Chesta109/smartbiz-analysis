const settingsService = require("../services/settingsService");
async function update(req, res) {
  req.session.user = await settingsService.updateProfile(
    req.session.user.id,
    req.body,
  );
  req.flash("success", "Profile updated successfully.");
  res.redirect("/settings");
}
module.exports = { update };
