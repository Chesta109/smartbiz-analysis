"""
7-day revenue forecast (machine learning).

Used ONLY by the "Machine learning" box on the dashboard.

How it works
------------
1. Load completed sales grouped by day (missing days count as Rs 0).
2. Turn every day into features:
     - day of week (Mon..Sun)      -> weekly pattern
     - trend (day number)          -> growth / decline
     - revenue 7 days ago          -> "same weekday last week"
     - revenue 14 days ago
     - average of days 7..13 ago   -> recent level
   (all lags are >= 7 days, so the next 7 days can be predicted directly)
3. Train candidate models (Ridge regression, Gradient Boosting) and a simple
   baseline (average of the same weekday). A rolling backtest on the most
   recent weeks picks the model with the lowest error.
4. Predict the next 7 days after the last day that has sales.

Node.js runs this script and reads the JSON printed to stdout.
"""

import json
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import pandas as pd

HORIZON_DAYS = 7          # how far ahead we predict
HISTORY_DAYS_SHOWN = 21   # how many past days are returned for the chart
TRAIN_WINDOW_DAYS = 180   # only the most recent days are used for training
MIN_DAYS_REQUIRED = 28    # need at least 4 weeks of history
MAX_BACKTEST_FOLDS = 4
LAG_START = 14            # first day that has all lag features


# --------------------------------------------------------------------------
# Data preparation
# --------------------------------------------------------------------------
def to_daily_series(df):
    """One value per calendar day between the first and last sale (gaps -> 0)."""
    s = df.set_index("date")["revenue"].astype(float).sort_index()
    full_index = pd.date_range(s.index.min(), s.index.max(), freq="D")
    return s.reindex(full_index, fill_value=0.0)


def build_features(series, horizon):
    """Feature table for every history day AND the `horizon` future days."""
    future_index = pd.date_range(
        series.index[-1] + pd.Timedelta(days=1), periods=horizon, freq="D"
    )
    full = pd.concat([series, pd.Series(np.nan, index=future_index)])

    feats = pd.DataFrame(index=full.index)
    feats["trend"] = np.arange(len(full)) / 30.0
    for d in range(7):
        feats[f"dow_{d}"] = (full.index.dayofweek == d).astype(float)
    feats["lag_7"] = full.shift(7)
    feats["lag_14"] = full.shift(14)
    feats["mean_7_13"] = sum(full.shift(k) for k in range(7, 14)) / 7.0
    return feats, full, future_index


# --------------------------------------------------------------------------
# Models
# --------------------------------------------------------------------------
def make_models():
    from sklearn.ensemble import GradientBoostingRegressor
    from sklearn.linear_model import Ridge
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler

    return {
        "Ridge regression": lambda: make_pipeline(
            StandardScaler(), Ridge(alpha=5.0)
        ),
        "Gradient boosting": lambda: GradientBoostingRegressor(
            n_estimators=120, max_depth=2, learning_rate=0.05,
            subsample=0.8, random_state=42,
        ),
    }


def weekday_average_predict(train_y, target_dates):
    """Baseline: average of the last 4 same-weekdays before the target day."""
    preds = []
    for d in target_dates:
        same = train_y[train_y.index.dayofweek == d.dayofweek].tail(4)
        preds.append(float(same.mean()) if len(same) else float(train_y.mean()))
    return np.array(preds)


def backtest(feats, y, factories):
    """Rolling-origin backtest over the last few weeks. Returns MAE per model."""
    rows = feats.index[y.notna() & feats["lag_14"].notna()]
    n_rows = len(rows)
    folds = min(MAX_BACKTEST_FOLDS, (n_rows - 14) // HORIZON_DAYS)
    if folds < 1:
        return None

    errors = {name: [] for name in list(factories) + ["Weekday average"]}
    residuals = {name: [] for name in errors}

    for k in range(folds, 0, -1):
        test_rows = rows[n_rows - k * HORIZON_DAYS: n_rows - (k - 1) * HORIZON_DAYS]
        train_rows = rows[: n_rows - k * HORIZON_DAYS][-TRAIN_WINDOW_DAYS:]
        y_test = y.loc[test_rows].values

        for name, make in factories.items():
            model = make()
            model.fit(feats.loc[train_rows], y.loc[train_rows])
            pred = np.clip(model.predict(feats.loc[test_rows]), 0, None)
            errors[name].extend(np.abs(pred - y_test))
            residuals[name].extend(y_test - pred)

        pred = weekday_average_predict(y.loc[: train_rows[-1]], test_rows)
        errors["Weekday average"].extend(np.abs(pred - y_test))
        residuals["Weekday average"].extend(y_test - pred)

    return {
        "folds": folds,
        "mae": {k: float(np.mean(v)) for k, v in errors.items()},
        "resid_std": {k: float(np.std(v)) for k, v in residuals.items()},
    }


# --------------------------------------------------------------------------
# Main forecasting function (pure: takes a DataFrame, returns a dict)
# --------------------------------------------------------------------------
def forecast_from_daily(df, horizon=HORIZON_DAYS):
    if df is None or len(df) == 0:
        return not_enough_data(0)

    series = to_daily_series(df)
    if len(series) < MIN_DAYS_REQUIRED:
        return not_enough_data(len(series))

    feats, full, future_index = build_features(series, horizon)
    train_rows = feats.index[full.notna() & feats["lag_14"].notna()]
    y = full

    factories = make_models()
    bt = backtest(feats, y, factories)

    # Choose the model with the lowest backtest error
    if bt:
        best_name = min(bt["mae"], key=bt["mae"].get)
        best_mae = bt["mae"][best_name]
        resid_std = bt["resid_std"][best_name]
    else:
        best_name, best_mae, resid_std = "Ridge regression", None, None

    if best_name == "Weekday average":
        preds = weekday_average_predict(series, future_index)
        model_label = "Weekday average"
        is_ml = False
    else:
        fit_rows = train_rows[-TRAIN_WINDOW_DAYS:]
        model = factories[best_name]()
        model.fit(feats.loc[fit_rows], y.loc[fit_rows])
        preds = np.clip(model.predict(feats.loc[future_index]), 0, None)
        model_label = best_name
        is_ml = True

        if resid_std is None:  # too little data for a backtest
            resid_std = float(np.std(y.loc[fit_rows] - model.predict(feats.loc[fit_rows])))

    # ~80% prediction band
    band = 1.28 * float(resid_std or 0)

    forecast_rows = [
        {
            "date": d.strftime("%Y-%m-%d"),
            "predicted_revenue": round(float(p), 2),
            "lower": round(max(float(p) - band, 0.0), 2),
            "upper": round(float(p) + band, 2),
        }
        for d, p in zip(future_index, preds)
    ]

    history_rows = [
        {"date": d.strftime("%Y-%m-%d"), "revenue": round(float(v), 2)}
        for d, v in series.tail(HISTORY_DAYS_SHOWN).items()
    ]

    total_predicted = round(float(np.sum(preds)), 2)
    last_week_total = float(series.tail(horizon).sum())
    change_pct = (
        round((total_predicted - last_week_total) / last_week_total * 100, 1)
        if last_week_total > 0 else None
    )

    if change_pct is None or abs(change_pct) < 3:
        trend = "flat"
    else:
        trend = "increasing" if change_pct > 0 else "decreasing"

    return {
        "model": model_label,
        "is_ml": is_ml,
        "last_data_date": series.index[-1].strftime("%Y-%m-%d"),
        "history": history_rows,
        "forecast": forecast_rows,
        "total_predicted": total_predicted,
        "last_week_total": round(last_week_total, 2),
        "change_pct": change_pct,
        "trend": trend,
        "backtest": (
            {
                "folds": bt["folds"],
                "mae": round(best_mae, 2),
                "baseline_mae": round(bt["mae"]["Weekday average"], 2),
            }
            if bt else None
        ),
        "days_of_history": len(series),
    }


def not_enough_data(found_days):
    return {
        "error": (
            f"Not enough sales history to forecast yet. "
            f"Need at least {MIN_DAYS_REQUIRED} days of completed sales, "
            f"found {found_days}."
        ),
        "history": [],
        "forecast": [],
    }


def forecast_sales():
    from utils.load_sales import load_daily_sales
    return forecast_from_daily(load_daily_sales())


if __name__ == "__main__":
    try:
        print(json.dumps(forecast_sales()))
    except ImportError as exc:
        print(json.dumps({
            "error": f"A Python package is missing ({exc.name}). "
                     f"Run: pip install -r python/requirements.txt",
            "history": [], "forecast": [],
        }))
    except Exception as exc:  # DB down, bad credentials, etc.
        print(json.dumps({
            "error": f"Forecast could not be generated: {exc}",
            "history": [], "forecast": [],
        }))
