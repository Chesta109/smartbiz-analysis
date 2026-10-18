const authService = require("../services/authService");

async function login(req, res) {
  try {
    const user = await authService.loginDemo(req.body.password);
    req.session.regenerate((err) => {
      if (err) throw err;
      req.session.user = user;
      req.session.isDemo = true;
      req.session.save((saveErr) => {
        if (saveErr) throw saveErr;
        res.redirect("/dashboard");
      });
    });
  } catch (err) {
    req.flash("error", err.statusCode && err.statusCode < 500 ? err.message : "Demo access is unavailable right now.");
    res.redirect("/login");
  }
}

module.exports = { login };
