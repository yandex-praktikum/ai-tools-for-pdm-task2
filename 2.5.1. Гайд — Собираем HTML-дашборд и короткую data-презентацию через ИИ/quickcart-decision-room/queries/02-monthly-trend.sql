SELECT
  month_id,
  month_label,
  COUNT(*) AS completed_orders,
  SUM(CASE WHEN delivered_minutes <= promised_minutes THEN 1 ELSE 0 END) AS on_time_orders,
  ROUND(
    100.0 * SUM(CASE WHEN delivered_minutes <= promised_minutes THEN 1 ELSE 0 END) / COUNT(*),
    1
  ) AS on_time_rate_pct
FROM delivery_orders
WHERE status = 'completed'
GROUP BY month_id, month_label, month_sort
ORDER BY month_sort;
