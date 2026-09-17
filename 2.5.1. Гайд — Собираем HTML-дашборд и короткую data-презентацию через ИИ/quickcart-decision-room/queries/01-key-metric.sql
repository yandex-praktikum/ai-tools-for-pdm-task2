WITH latest_period AS (
  SELECT MAX(month_id) AS month_id
  FROM delivery_orders
),
metric AS (
  SELECT
    orders.month_id AS period,
    orders.month_label || ' 2026' AS period_label,
    COUNT(*) AS completed_orders,
    SUM(CASE WHEN delivered_minutes <= promised_minutes THEN 1 ELSE 0 END) AS on_time_orders,
    ROUND(
      100.0 * SUM(CASE WHEN delivered_minutes <= promised_minutes THEN 1 ELSE 0 END) / COUNT(*),
      1
    ) AS on_time_rate_pct,
    CAST((SELECT value FROM dataset_metadata WHERE key = 'target_rate_pct') AS REAL) AS target_rate_pct
  FROM delivery_orders AS orders
  JOIN latest_period ON latest_period.month_id = orders.month_id
  WHERE orders.status = 'completed'
  GROUP BY orders.month_id, orders.month_label
)
SELECT
  period,
  period_label,
  completed_orders,
  on_time_orders,
  on_time_rate_pct,
  target_rate_pct,
  CASE WHEN on_time_rate_pct >= target_rate_pct THEN 'above_target' ELSE 'below_target' END AS target_status
FROM metric;
