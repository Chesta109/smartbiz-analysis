/**
 * Turns the Python forecast result into everything the dashboard's
 * "Machine learning" box needs (SVG coordinates, labels, summary text).
 * The chart is drawn at a fixed size (viewBox) and then scaled by the
 * browser, so lines are never stretched or distorted.
 */

const W = 760;
const H = 280;
const PAD = { left: 58, right: 18, top: 16, bottom: 36 };

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function parseDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return { y, m, d };
}
function shortDate(str) {
  const { m, d } = parseDate(str);
  return `${MONTHS[m - 1]} ${String(d).padStart(2, "0")}`;
}
function longDate(str) {
  const { y } = parseDate(str);
  return `${shortDate(str)} ${y}`;
}
function rupees(value) {
  return `₹${Math.round(Number(value) || 0).toLocaleString("en-IN")}`;
}
function rupeesShort(value) {
  const v = Number(value) || 0;
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}K`;
  return `₹${Math.round(v)}`;
}

/** Rounds the top of the y-axis up to a "nice" number. */
function niceMax(value) {
  if (value <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(value)));
  const n = value / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

function buildForecastChart(forecast) {
  if (!forecast || forecast.error) return null;

  const history = Array.isArray(forecast.history) ? forecast.history : [];
  const future = Array.isArray(forecast.forecast) ? forecast.forecast : [];
  if (history.length === 0 || future.length === 0) return null;

  const total = history.length + future.length;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const maxValue = niceMax(
    Math.max(
      ...history.map((p) => Number(p.revenue) || 0),
      ...future.map((p) => Number(p.upper) || Number(p.predicted_revenue) || 0),
      1
    ) * 1.05
  );

  const xAt = (i) => PAD.left + (total <= 1 ? 0 : (i / (total - 1)) * plotW);
  const yAt = (v) => PAD.top + plotH - (Math.max(v, 0) / maxValue) * plotH;
  const pt = (x, y) => `${x.toFixed(1)},${y.toFixed(1)}`;

  // Historical (solid) line + soft area under it
  const histPts = history.map((p, i) => ({
    x: xAt(i), y: yAt(Number(p.revenue) || 0), label: shortDate(p.date),
    value: rupees(p.revenue),
  }));
  const historyLine = histPts.map((p) => pt(p.x, p.y)).join(" ");
  const baseY = PAD.top + plotH;
  const historyArea =
    `${pt(histPts[0].x, baseY)} ${historyLine} ` +
    `${pt(histPts[histPts.length - 1].x, baseY)}`;

  // Forecast (dashed) line starts at the last real point so the lines join
  const lastHist = histPts[histPts.length - 1];
  const futPts = future.map((p, i) => ({
    x: xAt(history.length + i),
    y: yAt(Number(p.predicted_revenue) || 0),
    label: shortDate(p.date),
    value: rupees(p.predicted_revenue),
  }));
  const forecastLine = [pt(lastHist.x, lastHist.y), ...futPts.map((p) => pt(p.x, p.y))].join(" ");

  // Uncertainty band
  const upper = future.map((p, i) => pt(xAt(history.length + i), yAt(Number(p.upper) || 0)));
  const lower = future
    .map((p, i) => pt(xAt(history.length + i), yAt(Number(p.lower) || 0)))
    .reverse();
  const bandPolygon = [...upper, ...lower].join(" ");

  // Y-axis grid (5 lines)
  const yTicks = [];
  for (let i = 0; i <= 4; i++) {
    const value = (maxValue / 4) * i;
    yTicks.push({ y: yAt(value), label: rupeesShort(value) });
  }

  // X-axis labels: roughly every 4th day, always the first forecast day
  const allDates = [...history, ...future].map((p) => p.date);
  const xLabels = [];
  allDates.forEach((date, i) => {
    const isForecastStart = i === history.length;
    const isLast = i === total - 1;
    if (i % 4 === 0 || isForecastStart || isLast) {
      // skip a label that would collide with the forecast-start label
      const nearForecastStart = Math.abs(i - history.length) < 2 && !isForecastStart;
      if (!nearForecastStart) xLabels.push({ x: xAt(i), label: shortDate(date) });
    }
  });

  const first = future[0].date;
  const last = future[future.length - 1].date;

  return {
    width: W,
    height: H,
    plot: { left: PAD.left, right: W - PAD.right, top: PAD.top, bottom: baseY },
    historyLine,
    historyArea,
    forecastLine,
    bandPolygon,
    forecastStartX: xAt(history.length - 1),
    forecastDots: futPts,
    yTicks,
    xLabels,

    totalPredicted: Number(forecast.total_predicted) || 0,
    totalPredictedText: rupees(forecast.total_predicted),
    rangeLabel: `${shortDate(first)} – ${longDate(last)}`,
    lastDataText: forecast.last_data_date ? longDate(forecast.last_data_date) : "",
    modelName: forecast.model || "Machine learning model",
    isMl: forecast.is_ml !== false,
    trend: forecast.trend || "flat",
    changePct: forecast.change_pct,
    changeText:
      forecast.change_pct === null || forecast.change_pct === undefined
        ? null
        : `${forecast.change_pct > 0 ? "+" : ""}${forecast.change_pct}% vs the previous 7 days`,
    backtestText: forecast.backtest
      ? `Typical daily error ≈ ${rupees(forecast.backtest.mae)} (tested on the last ${forecast.backtest.folds * 7} days)`
      : null,
  };
}

module.exports = { buildForecastChart };