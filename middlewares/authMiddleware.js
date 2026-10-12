function isLoggedIn(req, res, next) {
  if (!req.session?.user) {
    if (req.originalUrl.startsWith("/api/")) {
      return res.status(401).json({ error: "Authentication required." });
    }
    req.flash("error", "Please log in to continue.");
    return res.redirect("/login");
  }
  next();
}

module.exports = { isLoggedIn };
