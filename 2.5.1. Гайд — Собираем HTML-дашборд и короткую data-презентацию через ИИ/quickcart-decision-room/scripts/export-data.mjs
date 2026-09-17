import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { exportDefinitions, generatedAt, snapshotId } from './project-config.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const databasePath = resolve(projectRoot, 'data/quickcart.sqlite');
const selectedId = process.argv[2];
const selectedDefinitions = selectedId
  ? exportDefinitions.filter((definition) => definition.id === selectedId)
  : exportDefinitions;

if (selectedId && selectedDefinitions.length === 0) {
  throw new Error(`Unknown export id: ${selectedId}`);
}

const sha256 = (content) => createHash('sha256').update(content).digest('hex');
const databaseBytes = readFileSync(databasePath);
const databaseSha256 = sha256(databaseBytes);
const database = new DatabaseSync(databasePath, { readOnly: true });

for (const definition of selectedDefinitions) {
  const queryPath = resolve(projectRoot, definition.query);
  const outputPath = resolve(projectRoot, definition.output);
  const query = readFileSync(queryPath, 'utf8').trim();
  const rows = database.prepare(query).all().map((row) => ({ ...row }));
  const document = {
    export_id: definition.id,
    snapshot_id: snapshotId,
    generated_at: generatedAt,
    database: 'data/quickcart.sqlite',
    database_sha256: databaseSha256,
    query: definition.query,
    query_sha256: sha256(query),
    source_tables: definition.sourceTables,
    units: definition.units,
    rows,
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
  console.log(`Exported ${definition.id}: ${rows.length} row(s).`);
}

database.close();
