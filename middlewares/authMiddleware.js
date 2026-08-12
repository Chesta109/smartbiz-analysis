function isLoggedIn(req, res, next) {
  if (!req.session?.user) {
    req.flash("error", "Please log in to continue.");
    return res.redirect("/login");
  }
  next();
}

module.exports = { isLoggedIn };
