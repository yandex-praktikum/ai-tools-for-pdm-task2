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
    (SELECT COUNT(*) FROM eligible) AS eligible_count,
    (SELECT COUNT(*) FROM activated) AS activated_count
)
SELECT
  'H-01' AS hypothesis_id,
  'checks/01-denominator.sql' AS check_name,
  CASE
    WHEN eligible_count = 20
      AND activated_count = 14
      AND ROUND(100.0 * activated_count / eligible_count, 1) = 70.0
    THEN 'pass'
    ELSE 'fail'
  END AS status,
  printf('%d of %d eligible accounts; %.1f%%', activated_count, eligible_count,
    100.0 * activated_count / eligible_count) AS observed,
  '14 of 20 unique eligible June accounts; 70.0%' AS expected,
  'Eligible IDs: ' || (
    SELECT group_concat(account_id, ', ')
    FROM (SELECT account_id FROM eligible ORDER BY account_id)
  ) || '; activated IDs: ' || (
    SELECT group_concat(account_id, ', ')
    FROM (SELECT account_id FROM activated ORDER BY account_id)
  ) AS evidence
FROM summary;
