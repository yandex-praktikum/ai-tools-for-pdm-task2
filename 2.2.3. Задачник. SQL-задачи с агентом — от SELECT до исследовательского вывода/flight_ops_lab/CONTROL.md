# Контроль комплекта `flight_ops_lab`

* Целевой сервер: PostgreSQL 16.
* Данные: синтетические учебные.

После загрузки `schema.sql` и `seed.sql` сверяйте результаты запросов с контрольными количествами ниже.

## Контрольные количества

| Таблица | Строк |
|---|---:|
| `airports` | 8 |
| `aircraft` | 5 |
| `flights` | 30 |
| `passengers` | 2689 |
| `bookings` | 2688 |
| `boarding_passes` | 2248 |

## Предварительная проверка

После успешного выполнения `schema.sql` и `seed.sql` запустите в pgAdmin 4 Query Tool весь блок. Шесть результатов должны совпасть с таблицей выше.

```sql
SELECT 'airports' AS table_name, COUNT(*) AS row_count FROM airports
UNION ALL
SELECT 'aircraft', COUNT(*) FROM aircraft
UNION ALL
SELECT 'flights', COUNT(*) FROM flights
UNION ALL
SELECT 'passengers', COUNT(*) FROM passengers
UNION ALL
SELECT 'bookings', COUNT(*) FROM bookings
UNION ALL
SELECT 'boarding_passes', COUNT(*) FROM boarding_passes;
```

После `reset.sql` и повторного `seed.sql` контрольные количества должны снова совпасть с таблицей.
