const { spawn } = require("child_process");
const path = require("path");

const TIMEOUT_MS = 30000;

/**
 * Runs python/prediction/forecast.py and returns the parsed JSON.
 * Set PYTHON_PATH in .env if "python" is not the right command on your PC.
 */
function runForecast() {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(
      __dirname, "..", "python", "prediction", "forecast.py"
    );

    const pythonCmd =
      process.env.PYTHON_PATH ||
      (process.platform === "win32" ? "python" : "python3");

    const py = spawn(pythonCmd, [scriptPath], {
      cwd: path.join(__dirname, ".."),
    });

    let stdout = "";
    let stderr = "";
    let finished = false;

    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      py.kill();
      reject(new Error("Forecast took too long and was stopped."));
    }, TIMEOUT_MS);

    py.stdout.on("data", (chunk) => (stdout += chunk.toString()));
    py.stderr.on("data", (chunk) => (stderr += chunk.toString()));

    py.on("error", (err) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      reject(new Error(
        `Could not start Python (is it installed and on PATH?): ${err.message}`
      ));
    });

    py.on("close", (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);

      if (code !== 0) {
        return reject(new Error(
          stderr.trim() || `forecast.py exited with code ${code}`
        ));
      }

      // Libraries may print warnings; the JSON is always the last line.
      const lastLine = stdout.trim().split(/\r?\n/).pop();
      try {
        resolve(JSON.parse(lastLine));
      } catch (err) {
        reject(new Error(`Could not parse forecast.py output: ${stdout}`));
      }
    });
  });
}

module.exports = { runForecast };
