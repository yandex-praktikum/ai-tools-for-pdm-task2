WITH eligible AS (
  SELECT account_id, created_at
  FROM accounts
  WHERE created_at >= '2026-06-01T00:00:00Z'
    AND created_at < '2026-07-01T00:00:00Z'
    AND is_internal = 0
    AND canceled_within_24h = 0
),
account_level AS (
  SELECT
    a.account_id,
    CASE WHEN EXISTS (
      SELECT 1
      FROM events AS e
      WHERE e.account_id = a.account_id
        AND e.event_name = 'workspace_activated'
        AND julianday(e.occurred_at) >= julianday(a.created_at)
        AND julianday(e.occurred_at) <= julianday(a.created_at) + 7
    ) THEN 1 ELSE 0 END AS activated,
    (
      SELECT COUNT(*)
      FROM integrations AS i
      WHERE i.account_id = a.account_id
        AND julianday(i.connected_at) >= julianday(a.created_at)
        AND julianday(i.connected_at) <= julianday(a.created_at) + 7
    ) AS integration_rows
  FROM eligible AS a
),
summary AS (
  SELECT
    SUM(CASE WHEN integration_rows > 0 THEN 1 ELSE 0 END) AS connected_accounts,
    SUM(CASE WHEN integration_rows > 0 AND activated = 1 THEN 1 ELSE 0 END) AS connected_activated,
    SUM(CASE WHEN integration_rows = 0 THEN 1 ELSE 0 END) AS unconnected_accounts,
    SUM(CASE WHEN integration_rows = 0 AND activated = 1 THEN 1 ELSE 0 END) AS unconnected_activated,
    SUM(integration_rows) AS joined_rows,
    SUM(CASE WHEN activated = 1 THEN integration_rows ELSE 0 END) AS joined_activated_rows
  FROM account_level
),
rates AS (
  SELECT
    *,
    100.0 * connected_activated / connected_accounts AS connected_rate,
    100.0 * unconnected_activated / unconnected_accounts AS unconnected_rate,
    100.0 * joined_activated_rows / joined_rows AS joined_row_rate
  FROM summary
)
SELECT
  'H-02' AS hypothesis_id,
  'checks/02-join-duplicates.sql' AS check_name,
  CASE
    WHEN ROUND(connected_rate - unconnected_rate, 1) = 30.0 THEN 'pass'
    ELSE 'fail'
  END AS status,
  printf('Distinct accounts: %.1f%% vs %.1f%%; difference %.1f pp',
    connected_rate, unconnected_rate, connected_rate - unconnected_rate) AS observed,
  '30.0 pp at distinct-account grain (reported 90.0% vs 60.0%)' AS expected,
  printf('Connected accounts=%d, connected activated=%d; integration JOIN rows=%d, activated JOIN rows=%d, row-weighted rate=%.1f%%',
    connected_accounts, connected_activated, joined_rows, joined_activated_rows, joined_row_rate) AS evidence
FROM rates;
