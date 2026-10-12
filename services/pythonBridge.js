const { spawn } = require("child_process");
const path = require("path");
const saleModel = require("../models/saleModel");
const logger = require("../utils/logger");

const TIMEOUT_MS = 30000;
const forecastCache = new Map();

/**
 * Runs python/prediction/forecast.py and returns the parsed JSON.
 * Set PYTHON_PATH in .env if "python" is not the right command on your PC.
 */
function runForecast(businessId) {
  const normalizedBusinessId = Number(businessId);
  if (!Number.isInteger(normalizedBusinessId) || normalizedBusinessId < 1) {
    return Promise.reject(new Error("A valid business is required for forecasting."));
  }

  return saleModel
    .getActivityKey(normalizedBusinessId)
    .then((activityKey) => {
      const cached = forecastCache.get(normalizedBusinessId);
      if (cached && cached.activityKey === activityKey) {
        logger.info("Forecast cache hit", { businessId: normalizedBusinessId, activityKey });
        return cached.result;
      }

      logger.info("Forecast cache miss", { businessId: normalizedBusinessId, activityKey });
      return runPythonForecast(normalizedBusinessId).then((result) => {
        forecastCache.set(normalizedBusinessId, { activityKey, result });
        return result;
      });
    })
    .catch(() => {
      logger.error("Forecast request failed", { businessId: normalizedBusinessId });
      throw new Error("The revenue forecast is temporarily unavailable.");
    });
}

function runPythonForecast(businessId) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(
      __dirname, "..", "python", "prediction", "forecast.py"
    );

    const pythonCmd =
      process.env.PYTHON_PATH ||
      (process.platform === "win32" ? "python" : "python3");

    const py = spawn(pythonCmd, [scriptPath, "--business-id", String(businessId)], {
      cwd: path.join(__dirname, ".."),
    });

    let stdout = "";
    let stderr = "";
    let finished = false;

    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      py.kill();
      logger.warn("Forecast timed out", { businessId });
      reject(new Error("The revenue forecast is temporarily unavailable."));
    }, TIMEOUT_MS);

    py.stdout.on("data", (chunk) => (stdout += chunk.toString()));
    py.stderr.on("data", (chunk) => (stderr += chunk.toString()));

    py.on("error", (err) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      logger.error("Forecast Python process could not start", { businessId, code: err.code });
      reject(new Error("The revenue forecast is temporarily unavailable."));
    });

    py.on("close", (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);

      if (code !== 0) {
        logger.error("Forecast Python process failed", { businessId, code });
        return reject(new Error("The revenue forecast is temporarily unavailable."));
      }

      // Libraries may print warnings; the JSON is always the last line.
      const lastLine = stdout.trim().split(/\r?\n/).pop();
      try {
        resolve(JSON.parse(lastLine));
      } catch (err) {
        logger.error("Forecast Python returned invalid JSON", { businessId });
        reject(new Error("The revenue forecast is temporarily unavailable."));
      }
    });
  });
}

function clearForecastCache() {
  forecastCache.clear();
}

module.exports = { runForecast, clearForecastCache };
