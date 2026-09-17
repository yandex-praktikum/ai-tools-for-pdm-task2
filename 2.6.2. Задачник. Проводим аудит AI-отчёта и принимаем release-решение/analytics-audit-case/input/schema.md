# Схема синтетической базы OrbitDesk

Файл базы: `input/orbitdesk-audit.sqlite`.

Версия набора данных хранится в `dataset_metadata`. Все данные синтетические.

## `dataset_metadata`

| Поле | Тип | Назначение |
|---|---|---|
| `dataset_id` | TEXT, PK | Идентификатор набора данных |
| `dataset_version` | TEXT | Версия согласованного набора |
| `generated_at` | TEXT | Время сборки в UTC |
| `period_start` | TEXT | Начало покрытия |
| `period_end` | TEXT | Конец покрытия |
| `provenance` | TEXT | Происхождение данных |
| `synthetic` | INTEGER | Признак синтетических данных |

## `accounts`

| Поле | Тип | Назначение |
|---|---|---|
| `account_id` | TEXT, PK | Уникальный аккаунт |
| `created_at` | TEXT | Время создания в UTC |
| `segment` | TEXT | Продуктовый сегмент |
| `acquisition_channel` | TEXT | Канал привлечения |
| `is_internal` | INTEGER | Внутренний аккаунт |
| `canceled_within_24h` | INTEGER | Отмена в первые сутки |

## `events`

| Поле | Тип | Назначение |
|---|---|---|
| `event_id` | TEXT, PK | Уникальное событие |
| `account_id` | TEXT, FK | Аккаунт |
| `event_name` | TEXT | Тип события |
| `occurred_at` | TEXT | Время события в UTC |

## `integrations`

| Поле | Тип | Назначение |
|---|---|---|
| `integration_id` | TEXT, PK | Подключение интеграции |
| `account_id` | TEXT, FK | Аккаунт |
| `integration_type` | TEXT | Тип интеграции |
| `connected_at` | TEXT | Время подключения в UTC |

Один аккаунт может иметь несколько строк в этой таблице.

## `account_profiles`

| Поле | Тип | Назначение |
|---|---|---|
| `account_id` | TEXT, PK, FK | Аккаунт |
| `owner_role` | TEXT, NULL | Роль владельца |
| `team_size_band` | TEXT | Диапазон размера команды |

В базе нет неописанных источников. Если для метрики нужна таблица, которой нет в схеме, метрика не вычисляется из этого набора.
