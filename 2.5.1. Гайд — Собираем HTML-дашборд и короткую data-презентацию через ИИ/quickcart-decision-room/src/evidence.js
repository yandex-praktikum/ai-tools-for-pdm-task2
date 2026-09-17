const root = document.getElementById('evidence-root');
const view = new URLSearchParams(window.location.search).get('view') || 'route';

const titles = {
  route: ['Проверенный файловый маршрут', 'PASS'],
  tree: ['Состав production-пакета', 'PASS'],
  windows: ['Проверенный transcript Windows', 'PASS'],
  agent: ['План четырёх блоков ИИ', 'PASS'],
  smoke: ['Финальная browser smoke-проверка', 'PASS'],
};

function shell(title, status, content) {
  root.innerHTML = `
    <header class="evidence-header">
      <div>
        <p class="evidence-kicker">QuickCart Decision Room · evidence</p>
        <h1>${title}</h1>
      </div>
      <p class="evidence-status">${status}</p>
    </header>
    <section class="evidence-content">${content}</section>
  `;
}

function renderExcluded(title, message) {
  shell(title, 'НЕ ВКЛЮЧЕНО В DEPLOY', `
    <aside class="evidence-aside">
      <h2>Проверочные материалы не включены</h2>
      <p>${message}</p>
    </aside>
  `);
}

async function renderRoute() {
  const [keyMetricResponse, decisionLimitResponse] = await Promise.all([
    fetch('/exports/key-metric.json', { cache: 'no-store' }),
    fetch('/exports/decision-limit.json', { cache: 'no-store' }),
  ]);
  if (!keyMetricResponse.ok || !decisionLimitResponse.ok) {
    throw new Error('Не удалось загрузить проверенный контекст route map.');
  }
  const keyMetric = await keyMetricResponse.json();
  const decisionLimit = await decisionLimitResponse.json();
  const context = decisionLimit.rows[0];
  const verified = decisionLimit.rows.find((row) => row.evidence_status === 'verified');
  if (!context || context.target_rate_pct !== keyMetric.rows[0]?.target_rate_pct) {
    throw new Error('Порог route map расходится между экспортами.');
  }

  shell(titles.route[0], titles.route[1], `
    <div class="route-layout">
      <p class="route-question" id="route-question"></p>
      <div class="route-flow">
        <div class="route-node"><span>Вопрос</span><strong>Расширение в июле</strong></div>
        <div class="route-node"><span>Показатель</span><strong id="route-target"></strong></div>
        <div class="route-node source"><span>SQL</span><strong>4 проверенных запроса</strong></div>
        <div class="route-node source"><span>JSON</span><strong>4 экспорта одного snapshot</strong></div>
        <div class="route-node"><span>HTML</span><strong>4 блока · 4 экрана</strong></div>
        <div class="route-node decision"><span>Решение</span><strong id="route-decision"></strong></div>
      </div>
      <p class="route-note" id="route-limit"></p>
    </div>
  `);
  root.querySelector('#route-question').textContent = context.product_question;
  root.querySelector('#route-target').textContent = `SLA не ниже ${String(context.target_rate_pct).replace('.', ',')}%`;
  root.querySelector('#route-decision').textContent = verified?.decision_effect || context.decision_text;
  root.querySelector('#route-limit').textContent = decisionLimit.rows
    .filter((row) => row.evidence_status === 'not_available')
    .map((row) => row.evidence_text)
    .join(' ');
}

function renderTree() {
  const tree = `quickcart-decision-room/
├── README.md              команды и диагностика
├── AGENTS.md              границы IDE-агента
├── SPEC.md                вопрос, 4 блока, решение
├── audience-brief.md      аудитория и действие
├── design-spec.md         16:9, шкалы, палитра
├── evidence-manifest.md   утверждение → источник
├── package.json / package-lock.json
├── data/
│   ├── quickcart.sqlite   1470 synthetic orders
│   ├── data-dictionary.md
│   └── provenance.md
├── queries/               4 проверенных SQL
├── exports/               4 проверенных JSON
├── scripts/               seed, export, verify, server
├── src/                   HTML/CSS/JS + SVG ECharts
├── evidence/              plan и скрипты проверки
└── smoke-checklist.md`;
  shell(titles.tree[0], titles.tree[1], `
    <div class="tree-layout">
      <pre class="code-surface">${tree}</pre>
      <aside class="evidence-aside">
        <h2>Проверенная граница</h2>
        <ul>
          <li>Один synthetic snapshot.</li>
          <li>Одна библиотека визуализации: Apache ECharts 6.1.0.</li>
          <li>Одни JSON для обзора и презентации.</li>
          <li>Новая аналитика в браузере отсутствует.</li>
          <li>SQL/JSON сверяются автоматически.</li>
        </ul>
      </aside>
    </div>
  `);
}

async function renderTerminal() {
  const response = await fetch('/evidence/windows-powershell-run.txt', { cache: 'no-store' });
  if (!response.ok) {
    renderExcluded(
      titles.windows[0],
      'Локальный transcript не хранится в репозитории. Его можно создать перед проверкой на Windows.',
    );
    return;
  }
  const transcript = await response.text();
  shell(titles.windows[0], titles.windows[1], `
    <div class="terminal-layout">
      <pre class="code-surface"></pre>
      <aside class="evidence-aside">
        <h2>Что подтверждено</h2>
        <p>Локальный transcript создан из фактического чистого npm ci, проверки данных, npm list и запуска health-check на Windows.</p>
        <ul>
          <li>Node.js v22.18.0</li>
          <li>npm 10.9.3</li>
          <li>Apache ECharts 6.1.0</li>
          <li>http://localhost:4173/</li>
        </ul>
      </aside>
    </div>
  `);
  root.querySelector('.code-surface').textContent = transcript;
}

async function renderAgentPlan() {
  const response = await fetch('/evidence/agent-plan.json', { cache: 'no-store' });
  const plan = await response.json();
  const rows = plan.rows.map((row) => `
    <tr>
      <td>${row.block}</td>
      <td>${row.metric}</td>
      <td><code>${row.query}</code></td>
      <td><code>${row.json}</code></td>
      <td>${row.check}</td>
    </tr>
  `).join('');
  shell(titles.agent[0], titles.agent[1], `
    <table class="plan-table">
      <thead><tr><th>Блок</th><th>Сущность</th><th>SQL</th><th>JSON</th><th>Контроль</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `);
}

async function renderSmoke() {
  const response = await fetch('/evidence/browser-smoke.json', { cache: 'no-store' });
  if (!response.ok) {
    renderExcluded(
      titles.smoke[0],
      'Скриншоты и отчёт smoke-проверки не входят в deploy. Для локального создания выполните npm run browser:smoke.',
    );
    return;
  }
  const summary = await response.json();
  const items = summary.checks.map((check) => `<li>${check}</li>`).join('');
  shell(titles.smoke[0], titles.smoke[1], `
    <div class="evidence-aside">
      <h2>Результат последней локальной проверки</h2>
      <ul class="check-list">${items}</ul>
    </div>
  `);
}

async function start() {
  if (view === 'route') await renderRoute();
  else if (view === 'tree') renderTree();
  else if (view === 'windows') await renderTerminal();
  else if (view === 'agent') await renderAgentPlan();
  else if (view === 'smoke') await renderSmoke();
  else throw new Error(`Unknown evidence view: ${view}`);
  window.__EVIDENCE_READY__ = { ready: true, view };
}

start().catch((error) => {
  root.textContent = error.message;
  window.__EVIDENCE_READY__ = { ready: false, view, error: error.message };
  console.error(error);
});
