# Схема и словарь

## `users`

Одна строка на пользователя: `user_id INTEGER PRIMARY KEY`, `registered_at TEXT`, `platform TEXT`, `acquisition_channel TEXT`.

## `experiment_assignments`

Одна строка назначения на пользователя и эксперимент в корректных данных: `assignment_id INTEGER PRIMARY KEY`, `user_id INTEGER`, `experiment_name TEXT`, `variant TEXT`, `assigned_at TEXT`. Дубли по `(user_id, experiment_name)` являются дефектом.

## `events`

Одна строка на событие: `event_id INTEGER PRIMARY KEY`, `user_id INTEGER`, `event_name TEXT`, `occurred_at TEXT`. Повторы одного типа дедуплицируются до первого события, но неверный порядок не исправляется сортировкой.

## `subscriptions`

Одна строка пробного периода: `subscription_id INTEGER PRIMARY KEY`, `user_id INTEGER`, `trial_started_at TEXT`, `canceled_at TEXT NULL`.

Время хранится в ISO 8601 UTC. Семь суток отсчитываются от `assigned_at`. Ранняя отмена означает `canceled_at <= trial_started_at + 72 часа`.

