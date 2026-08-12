const session = require("express-session");

module.exports = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: Number(process.env.SESSION_MAX_AGE_MS) || 1000 * 60 * 60 * 8, // 8h
    secure: process.env.NODE_ENV === "production",
  },
});
