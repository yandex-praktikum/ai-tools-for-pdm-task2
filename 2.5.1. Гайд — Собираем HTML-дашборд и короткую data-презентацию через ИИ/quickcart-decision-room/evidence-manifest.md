# Карта доказательств

Snapshot: `quickcart-evening-pilot-v1`.

| Утверждение | Блок / экран | JSON | SQL | Таблицы и поля | Контроль |
|---|---|---|---|---|---|
| В июне SLA составил `92,6%`: 250 из 270 завершённых доставок | `key-metric` / экран 1 | `exports/key-metric.json` | `queries/01-key-metric.sql` | `delivery_orders.month_id`, `delivered_minutes`, `promised_minutes`, `status` | JSON совпадает с SQL; порог `90,0%` взят из `dataset_metadata` |
| Доля доставок вовремя выросла с `87,3%` в январе до `92,6%` в июне | `monthly-trend` / экран 2 | `exports/monthly-trend.json` | `queries/02-monthly-trend.sql` | `delivery_orders.month_id`, `month_sort`, `delivered_minutes`, `promised_minutes` | Шесть периодов в порядке 1–6; пропусков нет; причинный вывод не делается |
| Северный район — `94,5%`, Восточный — `90,4%` в июне | `district-comparison` / экран 3 | `exports/district-comparison.json` | `queries/03-district-comparison.sql` | `delivery_orders.district_id`, `district_name`, `delivered_minutes`, `promised_minutes` | 137/145 и 113/125; одинаковый знаменатель — завершённые доставки |
| Данных достаточно только для ограниченного запуска с контролем | `decision-limit` / экран 4 | `exports/decision-limit.json` | `queries/04-decision-limit.sql` | `dataset_scope.evidence_status`, `evidence_text`, `decision_effect` | SLA проверен; capacity и экономика явно имеют статус `not_available` |

## Ограниченное решение

Провести в июле ограниченное расширение вечернего слота в двух пилотных районах с еженедельным контролем SLA и отдельной проверкой курьерской ёмкости. Этот snapshot не подтверждает постоянное расширение, причинность улучшения или прибыльность.

## Автоматическая проверка

`npm run data:verify` повторно выполняет каждый SQL, сравнивает строки с JSON и проверяет SHA-256 базы и запросов. `npm run package:verify` проверяет состав пакета, точные версии, пути экспортов и SVG-рендерер.
