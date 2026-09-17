export const snapshotId = 'quickcart-evening-pilot-v1';
export const generatedAt = '2026-07-16T12:00:00Z';

export const exportDefinitions = [
  {
    id: 'key-metric',
    query: 'queries/01-key-metric.sql',
    output: 'exports/key-metric.json',
    sourceTables: ['delivery_orders', 'dataset_metadata'],
    units: { on_time_rate_pct: 'percent', target_rate_pct: 'percent' },
  },
  {
    id: 'monthly-trend',
    query: 'queries/02-monthly-trend.sql',
    output: 'exports/monthly-trend.json',
    sourceTables: ['delivery_orders'],
    units: { on_time_rate_pct: 'percent' },
  },
  {
    id: 'district-comparison',
    query: 'queries/03-district-comparison.sql',
    output: 'exports/district-comparison.json',
    sourceTables: ['delivery_orders'],
    units: { on_time_rate_pct: 'percent' },
  },
  {
    id: 'decision-limit',
    query: 'queries/04-decision-limit.sql',
    output: 'exports/decision-limit.json',
    sourceTables: ['dataset_scope', 'dataset_metadata'],
    units: { evidence_status: 'categorical', target_rate_pct: 'percent' },
  },
];
