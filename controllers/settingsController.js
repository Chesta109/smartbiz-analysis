const settingsService = require("../services/settingsService");
async function update(req, res, next) {
  try {
    req.session.user = await settingsService.updateProfile(
      req.session.user.id,
      req.body,
    );
    req.session.save(() => {
      req.flash("success", "Profile updated successfully.");
      res.redirect("/settings");
    });
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) {
      req.flash("error", err.message);
      return res.redirect("/settings");
    }
    next(err);
  }
}
module.exports = { update };
