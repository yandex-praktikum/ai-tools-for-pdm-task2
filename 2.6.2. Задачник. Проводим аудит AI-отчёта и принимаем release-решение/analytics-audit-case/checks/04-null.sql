WITH eligible AS (
  SELECT account_id, created_at
  FROM accounts
  WHERE created_at >= '2026-06-01T00:00:00Z'
    AND created_at < '2026-07-01T00:00:00Z'
    AND is_internal = 0
    AND canceled_within_24h = 0
),
activated AS (
  SELECT DISTINCT a.account_id
  FROM eligible AS a
  JOIN events AS e ON e.account_id = a.account_id
  WHERE e.event_name = 'workspace_activated'
    AND julianday(e.occurred_at) >= julianday(a.created_at)
    AND julianday(e.occurred_at) <= julianday(a.created_at) + 7
),
summary AS (
  SELECT
    COUNT(*) AS activated_count,
    SUM(CASE WHEN NULLIF(TRIM(p.owner_role), '') IS NOT NULL THEN 1 ELSE 0 END) AS role_present_count,
    SUM(CASE WHEN NULLIF(TRIM(p.owner_role), '') IS NULL THEN 1 ELSE 0 END) AS role_missing_count,
    group_concat(CASE WHEN NULLIF(TRIM(p.owner_role), '') IS NULL THEN a.account_id END, ', ') AS missing_role_ids
  FROM activated AS a
  LEFT JOIN account_profiles AS p ON p.account_id = a.account_id
)
SELECT
  'H-04' AS hypothesis_id,
  'checks/04-null.sql' AS check_name,
  CASE
    WHEN activated_count = 14
      AND role_present_count = 13
      AND role_missing_count = 1
      AND ROUND(100.0 * role_present_count / activated_count, 1) = 92.9
    THEN 'pass'
    ELSE 'fail'
  END AS status,
  printf('%d of %d roles present; %.1f%%; missing=%d', role_present_count,
    activated_count, 100.0 * role_present_count / activated_count, role_missing_count) AS observed,
  '13 of 14; NULL and blank values count as missing; 92.9%' AS expected,
  'Activated account with missing owner_role: ' || COALESCE(missing_role_ids, 'none') AS evidence
FROM summary;
