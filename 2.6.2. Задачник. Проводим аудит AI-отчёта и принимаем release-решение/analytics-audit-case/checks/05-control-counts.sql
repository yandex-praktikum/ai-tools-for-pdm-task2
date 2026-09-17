WITH eligible AS (
  SELECT account_id, acquisition_channel
  FROM accounts
  WHERE created_at >= '2026-06-01T00:00:00Z'
    AND created_at < '2026-07-01T00:00:00Z'
    AND is_internal = 0
    AND canceled_within_24h = 0
),
counts AS (
  SELECT
    COUNT(*) AS eligible_count,
    SUM(CASE WHEN acquisition_channel = 'paid_search' THEN 1 ELSE 0 END) AS paid_count,
    SUM(CASE WHEN acquisition_channel = 'organic_search' THEN 1 ELSE 0 END) AS organic_count,
    SUM(CASE WHEN acquisition_channel = 'partner_referral' THEN 1 ELSE 0 END) AS partner_count,
    EXISTS (
      SELECT 1
      FROM sqlite_master
      WHERE type = 'table' AND name = 'marketing_spend'
    ) AS has_marketing_spend
  FROM eligible
)
SELECT
  'H-05' AS hypothesis_id,
  'checks/05-control-counts.sql' AS check_name,
  CASE WHEN has_marketing_spend = 0 THEN 'not-checkable' ELSE 'fail' END AS status,
  printf('Eligible=%d; paid_search=%d; organic_search=%d; partner_referral=%d; spend source=%s',
    eligible_count, paid_count, organic_count, partner_count,
    CASE WHEN has_marketing_spend = 1 THEN 'present' ELSE 'absent' END) AS observed,
  'CAC comparison requires account counts and marketing spend by the same channel and period' AS expected,
  'Account control counts reconcile to input/control-counts.md; sqlite_master has no marketing_spend table' AS evidence
FROM counts;
