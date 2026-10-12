const test = require("node:test");
const assert = require("node:assert/strict");
const { runForecast } = require("../../services/pythonBridge");

test("forecasting rejects a missing or untrusted business identifier before loading sales", async () => {
  await assert.rejects(() => runForecast(undefined), /valid business/);
  await assert.rejects(() => runForecast("not-an-id"), /valid business/);
  await assert.rejects(() => runForecast(0), /valid business/);
});
