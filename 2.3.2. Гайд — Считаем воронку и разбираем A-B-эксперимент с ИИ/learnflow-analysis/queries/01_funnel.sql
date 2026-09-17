WITH event_times AS (
  SELECT user_id,
    MIN(CASE WHEN event_name = 'sign_up' THEN occurred_at END) AS sign_up,
    MIN(CASE WHEN event_name = 'diagnostic_started' THEN occurred_at END) AS diagnostic_started,
    MIN(CASE WHEN event_name = 'diagnostic_completed' THEN occurred_at END) AS diagnostic_completed,
    MIN(CASE WHEN event_name = 'recommendation_viewed' THEN occurred_at END) AS recommendation_viewed,
    MIN(CASE WHEN event_name = 'lesson_started' THEN occurred_at END) AS lesson_started,
    MIN(CASE WHEN event_name = 'lesson_completed' THEN occurred_at END) AS lesson_completed,
    MIN(CASE WHEN event_name = 'trial_started' THEN occurred_at END) AS trial_started
  FROM events GROUP BY user_id
), stages(step_no, stage, users) AS (
  SELECT 1, 'sign_up', COUNT(*) FROM event_times WHERE sign_up IS NOT NULL
  UNION ALL SELECT 2, 'diagnostic_started', COUNT(*) FROM event_times WHERE diagnostic_started >= sign_up
  UNION ALL SELECT 3, 'diagnostic_completed', COUNT(*) FROM event_times WHERE diagnostic_started >= sign_up AND diagnostic_completed >= diagnostic_started
  UNION ALL SELECT 4, 'recommendation_viewed', COUNT(*) FROM event_times WHERE diagnostic_started >= sign_up AND diagnostic_completed >= diagnostic_started AND recommendation_viewed >= diagnostic_completed
  UNION ALL SELECT 5, 'lesson_started', COUNT(*) FROM event_times WHERE diagnostic_started >= sign_up AND diagnostic_completed >= diagnostic_started AND recommendation_viewed >= diagnostic_completed AND lesson_started >= recommendation_viewed
  UNION ALL SELECT 6, 'lesson_completed', COUNT(*) FROM event_times WHERE diagnostic_started >= sign_up AND diagnostic_completed >= diagnostic_started AND recommendation_viewed >= diagnostic_completed AND lesson_started >= recommendation_viewed AND lesson_completed >= lesson_started
  UNION ALL SELECT 7, 'trial_started', COUNT(*) FROM event_times WHERE diagnostic_started >= sign_up AND diagnostic_completed >= diagnostic_started AND recommendation_viewed >= diagnostic_completed AND lesson_started >= recommendation_viewed AND lesson_completed >= lesson_started AND trial_started >= lesson_completed
), with_previous AS (
  SELECT *, LAG(users) OVER (ORDER BY step_no) AS previous_users FROM stages
)
SELECT stage, users,
  CASE WHEN previous_users IS NULL THEN NULL ELSE previous_users - users END AS absolute_loss,
  CASE WHEN previous_users IS NULL THEN NULL ELSE ROUND(100.0 * (previous_users - users) / previous_users, 2) END AS loss_pct
FROM with_previous ORDER BY step_no;

