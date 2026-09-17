import { mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { generatedAt, snapshotId } from './project-config.mjs';

const dataDirectory = fileURLToPath(new URL('../data/', import.meta.url));
const databasePath = fileURLToPath(new URL('../data/quickcart.sqlite', import.meta.url));

mkdirSync(dataDirectory, { recursive: true });
rmSync(databasePath, { force: true });

const database = new DatabaseSync(databasePath);
database.exec(`
  PRAGMA journal_mode = DELETE;
  PRAGMA synchronous = FULL;
  PRAGMA user_version = 1;

  CREATE TABLE dataset_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  ) WITHOUT ROWID;

  CREATE TABLE delivery_orders (
    order_id TEXT PRIMARY KEY,
    order_date TEXT NOT NULL,
    month_id TEXT NOT NULL,
    month_label TEXT NOT NULL,
    month_sort INTEGER NOT NULL,
    district_id TEXT NOT NULL CHECK (district_id IN ('north', 'east')),
    district_name TEXT NOT NULL,
    district_sort INTEGER NOT NULL,
    delivery_slot TEXT NOT NULL CHECK (delivery_slot = '18:00-22:00'),
    promised_minutes INTEGER NOT NULL CHECK (promised_minutes = 45),
    delivered_minutes INTEGER NOT NULL CHECK (delivered_minutes > 0),
    status TEXT NOT NULL CHECK (status = 'completed'),
    snapshot_id TEXT NOT NULL
  ) WITHOUT ROWID;

  CREATE TABLE dataset_scope (
    dimension_id TEXT PRIMARY KEY,
    dimension_label TEXT NOT NULL,
    evidence_status TEXT NOT NULL CHECK (evidence_status IN ('verified', 'not_available')),
    evidence_text TEXT NOT NULL,
    decision_effect TEXT NOT NULL,
    sort_order INTEGER NOT NULL
  ) WITHOUT ROWID;
`);

const metadata = [
  ['snapshot_id', snapshotId],
  ['generated_at', generatedAt],
  ['data_class', 'deterministic synthetic data'],
  ['question', 'Стоит ли QuickCart в июле 2026 года ограниченно расширить вечерний экспресс-слот 18:00–22:00 в Северном и Восточном районах, сохранив долю доставок вовремя не ниже 90%?'],
  ['target_rate_pct', '90.0'],
  ['decision', 'Ограниченное расширение на один месяц с еженедельным контролем SLA и отдельной проверкой курьерской ёмкости.'],
];

const insertMetadata = database.prepare('INSERT INTO dataset_metadata (key, value) VALUES (?, ?)');
for (const row of metadata) insertMetadata.run(...row);

const monthlyPlan = [
  { monthId: '2026-01', monthLabel: 'Январь', monthSort: 1, north: [120, 108], east: [100, 84] },
  { monthId: '2026-02', monthLabel: 'Февраль', monthSort: 2, north: [125, 114], east: [105, 91] },
  { monthId: '2026-03', monthLabel: 'Март', monthSort: 3, north: [130, 120], east: [110, 99] },
  { monthId: '2026-04', monthLabel: 'Апрель', monthSort: 4, north: [135, 126], east: [115, 103] },
  { monthId: '2026-05', monthLabel: 'Май', monthSort: 5, north: [140, 132], east: [120, 108] },
  { monthId: '2026-06', monthLabel: 'Июнь', monthSort: 6, north: [145, 137], east: [125, 113] },
];

const districts = [
  { id: 'north', name: 'Северный', sort: 1, code: 'N' },
  { id: 'east', name: 'Восточный', sort: 2, code: 'E' },
];

const insertOrder = database.prepare(`
  INSERT INTO delivery_orders (
    order_id, order_date, month_id, month_label, month_sort,
    district_id, district_name, district_sort, delivery_slot,
    promised_minutes, delivered_minutes, status, snapshot_id
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

database.exec('BEGIN');
for (const month of monthlyPlan) {
  for (const district of districts) {
    const [total, onTime] = month[district.id];
    for (let index = 0; index < total; index += 1) {
      const day = String((index % 28) + 1).padStart(2, '0');
      const deliveredMinutes = index < onTime ? 25 + (index % 21) : 46 + (index % 20);
      const orderId = `QC-${month.monthId.replace('-', '')}-${district.code}-${String(index + 1).padStart(4, '0')}`;
      insertOrder.run(
        orderId,
        `${month.monthId}-${day}`,
        month.monthId,
        month.monthLabel,
        month.monthSort,
        district.id,
        district.name,
        district.sort,
        '18:00-22:00',
        45,
        deliveredMinutes,
        'completed',
        snapshotId,
      );
    }
  }
}
database.exec('COMMIT');

const scopeRows = [
  [
    'pilot_sla',
    'SLA завершённых заказов пилота',
    'verified',
    'Завершённые вечерние доставки в Северном и Восточном районах за январь–июнь 2026 года.',
    'Поддерживает ограниченный июльский запуск с контролем SLA.',
    1,
  ],
  [
    'future_capacity',
    'Курьерская ёмкость после расширения',
    'not_available',
    'В snapshot нет прогноза доступных курьеров при росте объёма.',
    'Не позволяет обещать постоянное расширение без отдельного capacity-check.',
    2,
  ],
  [
    'future_economics',
    'Экономика после расширения',
    'not_available',
    'В snapshot нет затрат и маржи будущего режима.',
    'Не позволяет делать вывод о прибыльности расширения.',
    3,
  ],
];

const insertScope = database.prepare(`
  INSERT INTO dataset_scope (
    dimension_id, dimension_label, evidence_status, evidence_text, decision_effect, sort_order
  ) VALUES (?, ?, ?, ?, ?, ?)
`);
for (const row of scopeRows) insertScope.run(...row);

database.exec('VACUUM');
database.close();

console.log(`Created ${databasePath} with 1470 synthetic completed orders.`);
