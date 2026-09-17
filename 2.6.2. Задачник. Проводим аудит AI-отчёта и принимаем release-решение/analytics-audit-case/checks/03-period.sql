WITH eligible AS (
  SELECT account_id, created_at, substr(created_at, 1, 7) AS cohort_month
  FROM accounts
  WHERE created_at >= '2026-05-01T00:00:00Z'
    AND created_at < '2026-07-01T00:00:00Z'
    AND is_internal = 0
    AND canceled_within_24h = 0
),
activation_times AS (
  SELECT
    a.account_id,
    a.cohort_month,
    ROUND((julianday(MIN(e.occurred_at)) - julianday(a.created_at)) * 24.0, 3) AS hours_to_activation
  FROM eligible AS a
  JOIN events AS e ON e.account_id = a.account_id
  WHERE e.event_name = 'workspace_activated'
    AND julianday(e.occurred_at) >= julianday(a.created_at)
    AND julianday(e.occurred_at) <= julianday(a.created_at) + 7
  GROUP BY a.account_id, a.cohort_month, a.created_at
),
ranked AS (
  SELECT
    *,
    ROW_NUMBER() OVER (PARTITION BY cohort_month ORDER BY hours_to_activation, account_id) AS row_num,
    COUNT(*) OVER (PARTITION BY cohort_month) AS cohort_count
  FROM activation_times
),
medians AS (
  SELECT
    cohort_month,
    ROUND(AVG(hours_to_activation), 1) AS median_hours,
    MAX(cohort_count) AS activated_accounts
  FROM ranked
  WHERE row_num IN ((cohort_count + 1) / 2, (cohort_count + 2) / 2)
  GROUP BY cohort_month
),
summary AS (
  SELECT
    MAX(CASE WHEN cohort_month = '2026-05' THEN median_hours END) AS may_median,
    MAX(CASE WHEN cohort_month = '2026-06' THEN median_hours END) AS june_median,
    MAX(CASE WHEN cohort_month = '2026-05' THEN activated_accounts END) AS may_count,
    MAX(CASE WHEN cohort_month = '2026-06' THEN activated_accounts END) AS june_count
  FROM medians
)
SELECT
  'H-03' AS hypothesis_id,
  'checks/03-period.sql' AS check_name,
  CASE
    WHEN may_median = 36.0 AND june_median = 18.0 THEN 'pass'
    ELSE 'fail'
  END AS status,
  printf('May median %.1f h; June median %.1f h', may_median, june_median) AS observed,
  '36.0 h for May cohort and 18.0 h for June cohort, same seven-day window' AS expected,
  printf('Activated cohort rows: May=%d, June=%d; cohort key comes from accounts.created_at; first activation only',
    may_count, june_count) AS evidence
FROM summary;
