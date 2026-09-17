import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { exportDefinitions, generatedAt, snapshotId } from './project-config.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const databasePath = resolve(projectRoot, 'data/quickcart.sqlite');
const sha256 = (content) => createHash('sha256').update(content).digest('hex');
const databaseSha256 = sha256(readFileSync(databasePath));
const database = new DatabaseSync(databasePath, { readOnly: true });

for (const definition of exportDefinitions) {
  const query = readFileSync(resolve(projectRoot, definition.query), 'utf8').trim();
  const actualRows = database.prepare(query).all().map((row) => ({ ...row }));
  const exported = JSON.parse(readFileSync(resolve(projectRoot, definition.output), 'utf8'));

  assert.equal(exported.export_id, definition.id);
  assert.equal(exported.snapshot_id, snapshotId);
  assert.equal(exported.generated_at, generatedAt);
  assert.equal(exported.database_sha256, databaseSha256);
  assert.equal(exported.query_sha256, sha256(query));
  assert.deepEqual(exported.rows, actualRows, `${definition.id}: SQL and JSON differ`);
}

const keyMetric = JSON.parse(readFileSync(resolve(projectRoot, 'exports/key-metric.json'), 'utf8')).rows[0];
assert.deepEqual(keyMetric, {
  period: '2026-06',
  period_label: 'Июнь 2026',
  completed_orders: 270,
  on_time_orders: 250,
  on_time_rate_pct: 92.6,
  target_rate_pct: 90,
  target_status: 'above_target',
});

const trend = JSON.parse(readFileSync(resolve(projectRoot, 'exports/monthly-trend.json'), 'utf8')).rows;
assert.deepEqual(trend.map((row) => row.month_id), [
  '2026-01',
  '2026-02',
  '2026-03',
  '2026-04',
  '2026-05',
  '2026-06',
]);

const districts = JSON.parse(readFileSync(resolve(projectRoot, 'exports/district-comparison.json'), 'utf8')).rows;
assert.deepEqual(districts.map((row) => [row.district_id, row.on_time_rate_pct]), [
  ['north', 94.5],
  ['east', 90.4],
]);

const limits = JSON.parse(readFileSync(resolve(projectRoot, 'exports/decision-limit.json'), 'utf8')).rows;
assert.deepEqual(limits.map((row) => row.evidence_status), ['verified', 'not_available', 'not_available']);
const metadataRows = database.prepare(`
  SELECT key, value
  FROM dataset_metadata
  WHERE key IN ('question', 'decision', 'target_rate_pct')
`).all();
const metadata = Object.fromEntries(metadataRows.map((row) => [row.key, row.value]));
for (const row of limits) {
  assert.equal(row.product_question, metadata.question);
  assert.equal(row.decision_text, metadata.decision);
  assert.equal(row.target_rate_pct, Number(metadata.target_rate_pct));
  assert.equal(row.target_rate_pct, keyMetric.target_rate_pct);
}

database.close();
console.log('PASS: four SQL results match four JSON exports and control values.');
