const { renderView } = require("../utils/viewLocals");
const { runForecast } = require("../services/pythonBridge");

async function forecast(req, res) {
  let forecastResult;
  try {
    forecastResult = await runForecast();
  } catch (err) {
    forecastResult = { error: err.message };
  }

  renderView(req, res, "reports/forecast", {
    title: "Sales Forecast",
    activeNav: "/reports",
    forecastResult,
  });
}

module.exports = { forecast };