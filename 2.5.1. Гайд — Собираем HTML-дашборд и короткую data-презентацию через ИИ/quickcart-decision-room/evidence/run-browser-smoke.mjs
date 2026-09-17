import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const branchRoot = resolve(projectRoot, '..');
const assetsDirectory = resolve(branchRoot, 'assets/sprint-2/2.5.1');
const baseUrl = 'http://127.0.0.1:4173';
const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const chromePath = chromeCandidates.find((candidate) => existsSync(candidate));

mkdirSync(assetsDirectory, { recursive: true });
assert.ok(chromePath, `Google Chrome not found. Checked: ${chromeCandidates.join(', ')}`);

const sqlVerification = spawnSync(process.execPath, ['scripts/verify-data.mjs'], {
  cwd: projectRoot,
  encoding: 'utf8',
});
assert.equal(
  sqlVerification.status,
  0,
  `SQL/JSON verification failed.\n${sqlVerification.stdout}\n${sqlVerification.stderr}`,
);

async function healthReady() {
  try {
    const response = await fetch(`${baseUrl}/health.json`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(1000),
    });
    if (!response.ok) return false;
    const payload = await response.json();
    return payload.status === 'ok' && payload.snapshot === 'quickcart-evening-pilot-v1';
  } catch {
    return false;
  }
}

let managedServer = null;
if (!(await healthReady())) {
  managedServer = spawn(process.execPath, ['scripts/server.mjs'], {
    cwd: projectRoot,
    stdio: 'ignore',
    windowsHide: true,
  });
  for (let attempt = 0; attempt < 40 && !(await healthReady()); attempt += 1) {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
}
assert.equal(await healthReady(), true, 'Local server did not reach the expected health state.');

function stopManagedServer() {
  if (managedServer && !managedServer.killed) managedServer.kill();
}
process.on('exit', stopManagedServer);

let browser;
try {
browser = await chromium.launch({ executablePath: chromePath, headless: true });
const context = await browser.newContext({ viewport: { width: 1200, height: 675 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
const requestFailures = [];

page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('requestfailed', (request) => requestFailures.push(`${request.url()}: ${request.failure()?.errorText}`));

async function waitForDashboardReady() {
  await page.waitForFunction(() => window.__QUICKCART_READY__?.ready === true);
}

async function inspectLayout() {
  return page.evaluate(() => {
    const intersects = (a, b) =>
      Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1
      && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
    const panels = [...document.querySelectorAll('.analysis-panel')]
      .filter((element) => element.offsetParent !== null)
      .map((element) => element.getBoundingClientRect());
    const panelOverlaps = [];
    for (let left = 0; left < panels.length; left += 1) {
      for (let right = left + 1; right < panels.length; right += 1) {
        if (intersects(panels[left], panels[right])) panelOverlaps.push([left, right]);
      }
    }
    const textOverflow = [...document.querySelectorAll(
      '.decision-band, .question-line, .panel-heading, .panel-conclusion, .source-line, .slide-copy, .slide-lead, .slide-limit',
    )]
      .filter((element) => element.offsetParent !== null)
      .filter((element) => element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1)
      .map((element) => ({
        selector: element.className || element.tagName,
        text: element.textContent.trim().slice(0, 80),
        client: [element.clientWidth, element.clientHeight],
        scroll: [element.scrollWidth, element.scrollHeight],
      }));
    const collisionGroups = [
      ...document.querySelectorAll('.panel-heading'),
      ...document.querySelectorAll('.slide-copy'),
    ];
    const textCollisions = collisionGroups.flatMap((container) => {
      const children = [...container.children]
        .filter((element) => element.offsetParent !== null)
        .map((element) => element.getBoundingClientRect());
      const collisions = [];
      for (let left = 0; left < children.length; left += 1) {
        for (let right = left + 1; right < children.length; right += 1) {
          if (intersects(children[left], children[right])) collisions.push([container.className, left, right]);
        }
      }
      return collisions;
    });
    return {
      viewport: { width: innerWidth, height: innerHeight },
      document: {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
      },
      svgCount: document.querySelectorAll('.chart-host svg').length,
      canvasCount: document.querySelectorAll('.chart-host canvas').length,
      chartCount: document.querySelectorAll('.chart-host').length,
      panelCount: panels.length,
      panelOverlaps,
      textOverflow,
      textCollisions,
      emptyCharts: [...document.querySelectorAll('.chart-host')]
        .filter((element) => element.offsetParent !== null && element.querySelectorAll('svg path, svg polyline, svg rect, svg circle').length === 0)
        .map((element) => element.id),
    };
  });
}

await page.goto(`${baseUrl}/?capture=dashboard`, { waitUntil: 'networkidle' });
await waitForDashboardReady();
const desktopDashboard = await inspectLayout();
assert.equal(desktopDashboard.svgCount, 4);
assert.equal(desktopDashboard.canvasCount, 0);
assert.equal(desktopDashboard.panelCount, 4);
assert.deepEqual(desktopDashboard.panelOverlaps, []);
assert.deepEqual(desktopDashboard.textOverflow, []);
assert.deepEqual(desktopDashboard.textCollisions, []);
assert.deepEqual(desktopDashboard.emptyCharts, []);
assert.ok(desktopDashboard.document.width <= desktopDashboard.viewport.width);
assert.ok(desktopDashboard.document.height <= desktopDashboard.viewport.height);
await page.screenshot({ path: resolve(assetsDirectory, 'quickcart-dashboard.png') });

await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
await waitForDashboardReady();
const presentationButton = page.getByRole('button', { name: 'Презентация', exact: true });
assert.equal(await presentationButton.count(), 1);
await presentationButton.click();
await page.waitForFunction(() => window.__QUICKCART_READY__?.mode === 'presentation');
const nextButton = page.getByRole('button', { name: 'Следующий экран', exact: true });
assert.equal(await nextButton.count(), 1);
for (let index = 0; index < 3; index += 1) await nextButton.click();
await page.waitForFunction(() => window.__QUICKCART_READY__?.slide === 4);
assert.equal(await page.locator('#slide-count').textContent(), 'Экран 4 из 4');
assert.equal(await nextButton.isDisabled(), true);

await page.goto(`${baseUrl}/?capture=presentation&slide=4`, { waitUntil: 'networkidle' });
await waitForDashboardReady();
const desktopPresentation = await inspectLayout();
assert.equal(desktopPresentation.svgCount, 1);
assert.equal(desktopPresentation.canvasCount, 0);
assert.deepEqual(desktopPresentation.textOverflow, []);
assert.deepEqual(desktopPresentation.textCollisions, []);
assert.deepEqual(desktopPresentation.emptyCharts, []);
assert.ok(desktopPresentation.document.width <= desktopPresentation.viewport.width);
assert.ok(desktopPresentation.document.height <= desktopPresentation.viewport.height);
await page.screenshot({ path: resolve(assetsDirectory, 'quickcart-data-presentation.png') });

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
await waitForDashboardReady();
const mobileDashboard = await inspectLayout();
assert.equal(mobileDashboard.svgCount, 4);
assert.equal(mobileDashboard.canvasCount, 0);
assert.deepEqual(mobileDashboard.panelOverlaps, []);
assert.deepEqual(mobileDashboard.textOverflow, []);
assert.deepEqual(mobileDashboard.textCollisions, []);
assert.deepEqual(mobileDashboard.emptyCharts, []);
assert.ok(mobileDashboard.document.width <= mobileDashboard.viewport.width);

await page.goto(`${baseUrl}/?mode=presentation&slide=4`, { waitUntil: 'networkidle' });
await waitForDashboardReady();
const mobilePresentation = await inspectLayout();
assert.equal(mobilePresentation.svgCount, 1);
assert.equal(mobilePresentation.canvasCount, 0);
assert.deepEqual(mobilePresentation.textOverflow, []);
assert.deepEqual(mobilePresentation.textCollisions, []);
assert.deepEqual(mobilePresentation.emptyCharts, []);
assert.ok(mobilePresentation.document.width <= mobilePresentation.viewport.width);

assert.deepEqual(consoleErrors, []);
assert.deepEqual(pageErrors, []);
assert.deepEqual(requestFailures, []);

const summary = {
  generated_at: new Date().toISOString(),
  runner: 'Playwright Core 1.61.1 with local Google Chrome',
  environment: {
    desktop: '1200x675',
    mobile: '390x844',
    url: 'http://localhost:4173/',
  },
  sql_verification: {
    command: 'node scripts/verify-data.mjs',
    exit_code: sqlVerification.status,
  },
  checks: [
    'verify-data.mjs выполнен: 4 SQL совпадают с 4 JSON',
    '4 SVG в обзоре, 0 canvas',
    '4 экрана и кликабельная навигация',
    'Desktop 1200×675: без наложений',
    'Mobile 390×844: без горизонтального overflow',
    '0 ошибок консоли и загрузки',
  ],
  metrics: { desktopDashboard, desktopPresentation, mobileDashboard, mobilePresentation },
};

writeFileSync(resolve(projectRoot, 'evidence/browser-smoke.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

await page.setViewportSize({ width: 1200, height: 675 });
const evidenceViews = [
  ['route', 'quickcart-route-map.png'],
  ['tree', 'quickcart-project-structure.png'],
  ['agent', 'quickcart-agent-plan.png'],
  ['smoke', 'quickcart-smoke-check.png'],
];

for (const [evidenceView, fileName] of evidenceViews) {
  await page.goto(`${baseUrl}/evidence.html?view=${evidenceView}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__EVIDENCE_READY__?.ready === true);
  await page.screenshot({ path: resolve(assetsDirectory, fileName) });
}

console.log(JSON.stringify({ status: 'PASS', assetsDirectory, consoleErrors: 0, pageErrors: 0 }, null, 2));
} finally {
  await browser?.close();
  stopManagedServer();
}
