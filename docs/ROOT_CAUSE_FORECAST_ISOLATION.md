# Forecast isolation root cause

The dashboard correctly reads `business_id` from the authenticated session and
passes it to `runForecast`, but `runForecast` previously discarded that
argument. The Python process then called `load_daily_sales()` without any
business filter, so its SQL aggregated every completed sale in the database.
This made every account receive the same forecast. There was no forecast cache;
the result was retrained from that shared data on each dashboard render.

The existing business-scoped Node queries use `sales.business_id`; the forecast
loader must use the same completed-sale revenue definition and scope.
