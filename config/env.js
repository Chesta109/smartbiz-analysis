const path = require("path");

// Resolve from the project directory rather than the caller's working directory,
// so CLI scripts and the web server consume the same local configuration.
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env"), quiet: true });

