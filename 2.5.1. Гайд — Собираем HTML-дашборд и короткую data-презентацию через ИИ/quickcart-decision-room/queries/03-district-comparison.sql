WITH latest_period AS (
  SELECT MAX(month_id) AS month_id
  FROM delivery_orders
)
SELECT
  orders.district_id,
  orders.district_name,
  orders.month_id AS period,
  COUNT(*) AS completed_orders,
  SUM(CASE WHEN delivered_minutes <= promised_minutes THEN 1 ELSE 0 END) AS on_time_orders,
  ROUND(
    100.0 * SUM(CASE WHEN delivered_minutes <= promised_minutes THEN 1 ELSE 0 END) / COUNT(*),
    1
  ) AS on_time_rate_pct
FROM delivery_orders AS orders
JOIN latest_period ON latest_period.month_id = orders.month_id
WHERE orders.status = 'completed'
GROUP BY orders.district_id, orders.district_name, orders.district_sort, orders.month_id
ORDER BY orders.district_sort;
