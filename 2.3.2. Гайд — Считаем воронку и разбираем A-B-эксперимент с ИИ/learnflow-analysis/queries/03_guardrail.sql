WITH unique_assignments AS (
  SELECT user_id, MIN(variant) AS variant
  FROM experiment_assignments
  WHERE experiment_name = 'first_lesson_recommendation_v2'
  GROUP BY user_id HAVING COUNT(*) = 1
)
SELECT a.variant, COUNT(*) AS trial_users,
  SUM(CASE WHEN s.canceled_at IS NOT NULL AND julianday(s.canceled_at) - julianday(s.trial_started_at) BETWEEN 0 AND 3 THEN 1 ELSE 0 END) AS early_cancels,
  ROUND(100.0 * SUM(CASE WHEN s.canceled_at IS NOT NULL AND julianday(s.canceled_at) - julianday(s.trial_started_at) BETWEEN 0 AND 3 THEN 1 ELSE 0 END) / COUNT(*), 2) AS early_cancel_pct
FROM unique_assignments a JOIN subscriptions s ON s.user_id = a.user_id
GROUP BY a.variant ORDER BY a.variant;

