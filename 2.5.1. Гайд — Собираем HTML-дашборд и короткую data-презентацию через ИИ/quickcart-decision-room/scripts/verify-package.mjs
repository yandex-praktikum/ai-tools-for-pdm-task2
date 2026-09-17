import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const requiredFiles = [
  'README.md',
  'AGENTS.md',
  'SPEC.md',
  'audience-brief.md',
  'design-spec.md',
  'evidence-manifest.md',
  'package.json',
  'package-lock.json',
  'data/quickcart.sqlite',
  'queries/01-key-metric.sql',
  'queries/02-monthly-trend.sql',
  'queries/03-district-comparison.sql',
  'queries/04-decision-limit.sql',
  'exports/key-metric.json',
  'exports/monthly-trend.json',
  'exports/district-comparison.json',
  'exports/decision-limit.json',
  'src/main.js',
  'src/styles.css',
  'evidence/run-browser-smoke.mjs',
  'evidence/capture-windows-terminal.ps1',
  'evidence/show-windows-clean.ps1',
  'smoke-checklist.md',
];

for (const relativePath of requiredFiles) {
  assert.ok(existsSync(resolve(projectRoot, relativePath)), `Missing ${relativePath}`);
}

const packageJson = JSON.parse(readFileSync(resolve(projectRoot, 'package.json'), 'utf8'));
assert.deepEqual(packageJson.dependencies, { echarts: '6.1.0' });
assert.deepEqual(packageJson.devDependencies, { 'playwright-core': '1.61.1' });
assert.equal(packageJson.engines.node, '22.18.0');
assert.equal(packageJson.engines.npm, '10.9.3');
assert.equal(packageJson.scripts['browser:smoke'], 'node evidence/run-browser-smoke.mjs');

const mainSource = readFileSync(resolve(projectRoot, 'src/main.js'), 'utf8');
assert.match(mainSource, /renderer:\s*'svg'/);
assert.doesNotMatch(mainSource, /renderer:\s*'canvas'/);
assert.match(mainSource, /exports\/key-metric\.json/);
assert.match(mainSource, /exports\/monthly-trend\.json/);
assert.match(mainSource, /exports\/district-comparison\.json/);
assert.match(mainSource, /exports\/decision-limit\.json/);
assert.doesNotMatch(mainSource, /xAxis:\s*90\b/);
assert.match(mainSource, /targetRatePct/);

const indexSource = readFileSync(resolve(projectRoot, 'index.html'), 'utf8');
assert.doesNotMatch(indexSource, />90(?:[,.]0)?%?</);
assert.match(indexSource, /id="target-value"/);
assert.match(indexSource, /id="product-question"/);

const smokeSource = readFileSync(resolve(projectRoot, 'evidence/run-browser-smoke.mjs'), 'utf8');
assert.match(smokeSource, /scripts\/verify-data\.mjs/);
assert.match(smokeSource, /new Date\(\)\.toISOString\(\)/);
assert.doesNotMatch(smokeSource, /generated_at:\s*'2026-/);

const placeholderPattern = /\{(?:ПРОВЕРЕН|СКРИНШОТ|УТВЕРЖД|ПУТЬ|ИМЯ|ID_|ТАБЛИЦА)[^}]*\}/u;
for (const relativePath of ['README.md', 'SPEC.md', 'audience-brief.md', 'design-spec.md', 'evidence-manifest.md']) {
  const content = readFileSync(resolve(projectRoot, relativePath), 'utf8');
  assert.doesNotMatch(content, placeholderPattern, `Production placeholder in ${relativePath}`);
}

console.log('PASS: package structure, exact versions, SVG renderer and source paths verified.');
