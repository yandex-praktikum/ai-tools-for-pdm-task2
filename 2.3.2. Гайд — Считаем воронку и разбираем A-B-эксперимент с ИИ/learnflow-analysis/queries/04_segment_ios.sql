WITH unique_assignments AS (
  SELECT user_id, MIN(variant) AS variant, MIN(assigned_at) AS assigned_at
  FROM experiment_assignments
  WHERE experiment_name = 'first_lesson_recommendation_v2'
  GROUP BY user_id HAVING COUNT(*) = 1
), valid_completion AS (
  SELECT a.user_id FROM unique_assignments a
  WHERE EXISTS (
    SELECT 1 FROM events s JOIN events c ON c.user_id = s.user_id
    WHERE s.user_id = a.user_id AND s.event_name = 'lesson_started' AND c.event_name = 'lesson_completed'
      AND s.occurred_at >= a.assigned_at AND c.occurred_at >= s.occurred_at
      AND julianday(c.occurred_at) - julianday(a.assigned_at) BETWEEN 0 AND 7
  )
)
SELECT a.variant, COUNT(*) AS assigned_users, COUNT(v.user_id) AS completed_users,
  ROUND(100.0 * COUNT(v.user_id) / COUNT(*), 2) AS conversion_pct
FROM unique_assignments a JOIN users u ON u.user_id = a.user_id
LEFT JOIN valid_completion v ON v.user_id = a.user_id
WHERE u.platform = 'ios' GROUP BY a.variant ORDER BY a.variant;

