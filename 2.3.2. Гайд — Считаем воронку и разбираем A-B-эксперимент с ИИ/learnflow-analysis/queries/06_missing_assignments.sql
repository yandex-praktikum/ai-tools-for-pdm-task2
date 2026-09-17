SELECT DISTINCT e.user_id, e.event_name, e.occurred_at
FROM events e
WHERE e.event_name = 'lesson_completed'
  AND NOT EXISTS (
    SELECT 1 FROM experiment_assignments a
    WHERE a.user_id = e.user_id AND a.experiment_name = 'first_lesson_recommendation_v2'
  )
ORDER BY e.user_id;

