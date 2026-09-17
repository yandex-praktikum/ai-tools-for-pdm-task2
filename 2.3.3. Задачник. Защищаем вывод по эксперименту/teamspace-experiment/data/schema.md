# Схема TeamSpace

Все даты хранятся как UTC-подобные значения `TEXT` в формате `YYYY-MM-DD HH:MM:SS`. В базе нет персональных или рабочих данных.

## `users`

* `user_id TEXT PRIMARY KEY`
* `created_at TEXT NOT NULL`

## `workspaces`

* `workspace_id TEXT PRIMARY KEY`
* `owner_user_id TEXT NOT NULL` — ссылка на `users.user_id`
* `team_size INTEGER NOT NULL` — подготовленный размер команды для сегментного среза
* `created_at TEXT NOT NULL`
* `deleted_at TEXT NULL` — время раннего удаления, если оно было

## `memberships`

* `workspace_id TEXT NOT NULL` — ссылка на `workspaces.workspace_id`
* `user_id TEXT NOT NULL` — ссылка на `users.user_id`
* `role TEXT NOT NULL`
* `joined_at TEXT NOT NULL`
* первичный ключ: `workspace_id`, `user_id`

## `experiment_assignments`

* `assignment_id INTEGER PRIMARY KEY`
* `workspace_id TEXT NOT NULL`
* `experiment_key TEXT NOT NULL`
* `variant TEXT NOT NULL` — `control` или `test`
* `assigned_at TEXT NOT NULL`

## `events`

* `event_id INTEGER PRIMARY KEY`
* `workspace_id TEXT NOT NULL`
* `user_id TEXT NOT NULL`
* `event_name TEXT NOT NULL`
* `event_at TEXT NOT NULL`

События воронки: `workspace_created`, `teammate_invited`, `first_task_created`, `first_task_completed`, `workspace_returned_d7`. Последнее событие подтверждает возврат в окне от `assigned_at + 7 дней` включительно до `assigned_at + 8 дней` не включительно.

## `subscriptions`

* `subscription_id INTEGER PRIMARY KEY`
* `workspace_id TEXT NOT NULL`
* `trial_started_at TEXT NOT NULL`
* `trial_canceled_at TEXT NULL`
* `status TEXT NOT NULL`

Перед агрегацией проверьте уровень строки, кардинальность соединений, `NULL`, повторные назначения, дубли событий и временной порядок этапов.
