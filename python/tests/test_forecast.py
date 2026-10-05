import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import pandas as pd

from prediction.forecast import forecast_from_daily


def make_daily(days=120, seed=1, end="2026-07-12"):
    rng = np.random.default_rng(seed)
    dates = pd.date_range(end=end, periods=days, freq="D")
    weekly = np.array([0.8, 0.9, 1.0, 1.0, 1.1, 1.5, 1.4])
    base = 5000 + np.arange(days) * 10
    revenue = base * weekly[dates.dayofweek] + rng.normal(0, 300, days)
    return pd.DataFrame({"date": dates, "revenue": np.clip(revenue, 0, None)})


def test_returns_seven_days_after_last_sale():
    result = forecast_from_daily(make_daily())
    assert "error" not in result
    assert len(result["forecast"]) == 7
    assert result["forecast"][0]["date"] == "2026-07-13"
    assert result["forecast"][-1]["date"] == "2026-07-19"


def test_predictions_are_sane():
    result = forecast_from_daily(make_daily())
    for row in result["forecast"]:
        assert row["predicted_revenue"] >= 0
        assert row["lower"] <= row["predicted_revenue"] <= row["upper"]
    assert 20000 < result["total_predicted"] < 90000


def test_history_is_returned_for_chart():
    result = forecast_from_daily(make_daily())
    assert len(result["history"]) == 21
    assert result["history"][-1]["date"] == "2026-07-12"


def test_not_enough_data_gives_message_not_crash():
    result = forecast_from_daily(make_daily(days=10))
    assert "error" in result
    assert result["forecast"] == []
