SELECT user_id, experiment_name, COUNT(*) AS assignment_count
FROM experiment_assignments
WHERE experiment_name = 'first_lesson_recommendation_v2'
GROUP BY user_id, experiment_name HAVING COUNT(*) > 1;

