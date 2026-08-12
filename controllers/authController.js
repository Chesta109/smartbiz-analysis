const authService = require("../services/authService");

async function login(req, res) {
  const { email, password } = req.body;
  try {
    const user = await authService.login(email, password);
    req.session.user = user;
    req.session.save((err) => {
      if (err) console.error("Session save error:", err);
      res.redirect("/dashboard");
    });
  } catch (err) {
    req.flash("error", err.message || "Invalid credentials.");
    res.redirect("/login");
  }
}

async function register(req, res) {
  const { name, email, password, role } = req.body;
  try {
    const user = await authService.register(name, email, password, role);
    req.session.user = user;
    req.session.save((err) => {
      if (err) console.error("Session save error:", err);
      res.redirect("/dashboard");
    });
  } catch (err) {
    req.flash("error", err.message || "Registration failed.");
    res.redirect("/register");
  }
}

function logout(req, res) {
  req.session.destroy(() => res.redirect("/login"));
}

module.exports = { login, register, logout };
