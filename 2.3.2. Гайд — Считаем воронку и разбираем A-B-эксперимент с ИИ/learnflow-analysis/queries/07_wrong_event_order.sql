SELECT 'completion_before_assignment' AS defect, a.user_id AS user_id, c.occurred_at AS first_time, a.assigned_at AS second_time
FROM experiment_assignments a JOIN events c ON c.user_id = a.user_id AND c.event_name = 'lesson_completed'
WHERE a.experiment_name = 'first_lesson_recommendation_v2' AND c.occurred_at < a.assigned_at
UNION ALL
SELECT 'completion_before_start', c.user_id AS user_id, c.occurred_at, s.occurred_at
FROM events c JOIN events s ON s.user_id = c.user_id AND s.event_name = 'lesson_started'
WHERE c.event_name = 'lesson_completed' AND c.occurred_at < s.occurred_at
ORDER BY user_id;
