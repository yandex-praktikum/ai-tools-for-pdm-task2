# Словарь данных

## `delivery_orders`

| Поле | Тип | Значение |
|---|---|---|
| `order_id` | TEXT | Детерминированный идентификатор синтетического заказа |
| `order_date` | TEXT | Дата заказа в ISO-формате |
| `month_id` | TEXT | Месяц `YYYY-MM` |
| `month_label` | TEXT | Русская подпись месяца |
| `month_sort` | INTEGER | Порядок месяца |
| `district_id` | TEXT | `north` или `east` |
| `district_name` | TEXT | Северный или Восточный район |
| `district_sort` | INTEGER | Порядок района |
| `delivery_slot` | TEXT | Фиксированный вечерний слот `18:00-22:00` |
| `promised_minutes` | INTEGER | Обещанный срок доставки, 45 минут |
| `delivered_minutes` | INTEGER | Фактический срок доставки |
| `status` | TEXT | `completed`; отменённые заказы отсутствуют в snapshot |
| `snapshot_id` | TEXT | Версия синтетического набора |

Доставка считается выполненной вовремя, если `delivered_minutes <= promised_minutes`. Знаменатель SLA — все завершённые доставки выбранного периода и сегмента.

## `dataset_scope`

Таблица фиксирует не числовой KPI, а наличие доказательства для решения. Статус `verified` означает, что источник есть в snapshot; `not_available` — что вывод по этой сущности делать нельзя.
