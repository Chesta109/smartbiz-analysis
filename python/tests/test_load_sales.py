import os
import sys
from unittest.mock import Mock, patch

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.load_sales import load_daily_sales


def test_daily_sales_query_is_scoped_to_the_requested_business():
    connection = Mock()
    rows = pd.DataFrame({"date": ["2026-01-02"], "revenue": [125.5]})

    with patch("utils.load_sales.get_connection", return_value=connection), patch(
        "utils.load_sales.pd.read_sql", return_value=rows
    ) as read_sql:
        result = load_daily_sales(42)

    query = read_sql.call_args.args[0]
    assert "business_id = %s" in query
    assert read_sql.call_args.kwargs["params"] == [42]
    assert result["revenue"].tolist() == [125.5]
    connection.close.assert_called_once()


def test_empty_business_history_returns_an_empty_dataframe():
    connection = Mock()
    with patch("utils.load_sales.get_connection", return_value=connection), patch(
        "utils.load_sales.pd.read_sql", return_value=pd.DataFrame()) as read_sql:
        result = load_daily_sales(7)

    assert result.empty
    assert list(result.columns) == ["date", "revenue"]
    assert read_sql.call_args.kwargs["params"] == [7]
