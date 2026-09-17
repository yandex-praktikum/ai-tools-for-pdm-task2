# Контрольные результаты

Откройте этот файл после собственной попытки расчёта. Используйте его, чтобы найти и объяснить расхождения, а не чтобы подставить готовые ответы в `analysis-notes.md`.

Число пользователей: `120`.

## `01_funnel.sql`

| stage | users | absolute_loss | loss_pct |
| --- | --- | --- | --- |
| sign_up | 120 |  |  |
| diagnostic_started | 110 | 10 | 8.33 |
| diagnostic_completed | 100 | 10 | 9.09 |
| recommendation_viewed | 90 | 10 | 10.0 |
| lesson_started | 80 | 10 | 11.11 |
| lesson_completed | 66 | 14 | 17.5 |
| trial_started | 50 | 16 | 24.24 |

## `02_experiment.sql`

| variant | assigned_users | completed_users | conversion_pct | difference_pp | relative_change_pct |
| --- | --- | --- | --- | --- | --- |
| control | 51 | 30 | 58.82 |  |  |
| test | 51 | 36 | 70.59 | 11.76 | 20.0 |

## `03_guardrail.sql`

| variant | trial_users | early_cancels | early_cancel_pct |
| --- | --- | --- | --- |
| control | 22 | 2 | 9.09 |
| test | 28 | 3 | 10.71 |

## `04_segment_ios.sql`

| variant | assigned_users | completed_users | conversion_pct |
| --- | --- | --- | --- |
| control | 25 | 15 | 60.0 |
| test | 26 | 18 | 69.23 |

## `05_duplicate_assignments.sql`

| user_id | experiment_name | assignment_count |
| --- | --- | --- |
| 101 | first_lesson_recommendation_v2 | 2 |

## `06_missing_assignments.sql`

| user_id | event_name | occurred_at |
| --- | --- | --- |
| 111 | lesson_completed | 2026-06-01T11:00:00Z |
| 112 | lesson_completed | 2026-06-01T11:00:00Z |

## `07_wrong_event_order.sql`

| defect | user_id | first_time | second_time |
| --- | --- | --- | --- |
| completion_before_assignment | 102 | 2026-06-01T09:20:00Z | 2026-06-01T09:25:00Z |
| completion_before_start | 103 | 2026-06-01T09:50:00Z | 2026-06-01T10:00:00Z |
