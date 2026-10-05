"""Loads monthly completed-sales revenue straight from the smartbiz MySQL database."""

import os
import mysql.connector
import pandas as pd
from dotenv import load_dotenv

# Reuse the same .env file the Node app uses, so DB credentials live in one place.
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))


def get_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        port=int(os.getenv("DB_PORT", 3306)),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "smartbiz"),
    )


def load_monthly_sales():
    """Returns a DataFrame with one row per month: month (datetime), revenue (float)."""
    conn = get_connection()
    try:
        query = """
            SELECT
                DATE_FORMAT(created_at, '%Y-%m-01') AS month,
                SUM(total_amount) AS revenue
            FROM sales
            WHERE status = 'completed'
            GROUP BY DATE_FORMAT(created_at, '%Y-%m-01')
            ORDER BY month
        """
        df = pd.read_sql(query, conn)
    finally:
        conn.close()

    df["month"] = pd.to_datetime(df["month"])
    df["revenue"] = df["revenue"].astype(float)
    return df


def load_daily_sales():
    """Returns a DataFrame with one row per day that had sales: date (datetime), revenue (float)."""
    conn = get_connection()
    try:
        query = """
            SELECT
                DATE(created_at) AS date,
                SUM(total_amount) AS revenue
            FROM sales
            WHERE status = 'completed'
            GROUP BY DATE(created_at)
            ORDER BY date
        """
        df = pd.read_sql(query, conn)
    finally:
        conn.close()

    df["date"] = pd.to_datetime(df["date"])
    df["revenue"] = df["revenue"].astype(float)
    return df
