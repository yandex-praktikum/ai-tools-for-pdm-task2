const echartsApi = window.echarts;

if (!echartsApi) {
  throw new Error('Apache ECharts was not loaded. Run npm ci before npm run dev.');
}

const exportPaths = {
  keyMetric: '/exports/key-metric.json',
  monthlyTrend: '/exports/monthly-trend.json',
  districtComparison: '/exports/district-comparison.json',
  decisionLimit: '/exports/decision-limit.json',
};

const palette = {
  ink: '#17202a',
  muted: '#5f6b76',
  line: '#d8dee5',
  blue: '#1769aa',
  green: '#16856b',
  coral: '#d45d3f',
  amber: '#b7791f',
};

const charts = new Map();
const state = {
  data: null,
  mode: 'dashboard',
  slideIndex: 0,
};

const formatPercent = (value) => `${Number(value).toFixed(1).replace('.', ',')}%`;

async function readExport(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

function verifyExportEnvelope(documents) {
  const snapshots = new Set(documents.map((document) => document.snapshot_id));
  const databaseHashes = new Set(documents.map((document) => document.database_sha256));
  if (snapshots.size !== 1 || !snapshots.has('quickcart-evening-pilot-v1')) {
    throw new Error('JSON-экспорты относятся к разным snapshot.');
  }
  if (databaseHashes.size !== 1) {
    throw new Error('JSON-экспорты относятся к разным версиям базы.');
  }
}

function decisionContext(data) {
  const rows = data.decisionLimit.rows;
  if (rows.length === 0) throw new Error('Экспорт ограничения решения пуст.');

  const [first] = rows;
  const fields = ['product_question', 'decision_text', 'target_rate_pct'];
  for (const field of fields) {
    if (first[field] === null || first[field] === undefined || first[field] === '') {
      throw new Error(`В decision-limit.json отсутствует поле ${field}.`);
    }
    if (rows.some((row) => row[field] !== first[field])) {
      throw new Error(`В decision-limit.json расходится поле ${field}.`);
    }
  }

  const metricTarget = data.keyMetric.rows[0]?.target_rate_pct;
  if (first.target_rate_pct !== metricTarget) {
    throw new Error('Целевой SLA расходится между key-metric.json и decision-limit.json.');
  }

  return {
    question: first.product_question,
    decision: first.decision_text,
    targetRatePct: first.target_rate_pct,
  };
}

function baseOption() {
  return {
    animation: false,
    textStyle: {
      color: palette.ink,
      fontFamily: 'Inter, system-ui, sans-serif',
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: '#ffffff',
      borderColor: palette.line,
      textStyle: { color: palette.ink, fontSize: 12 },
    },
  };
}

function keyMetricOption(data) {
  const row = data.keyMetric.rows[0];
  return {
    ...baseOption(),
    grid: { left: 6, right: 64, top: 22, bottom: 24, containLabel: true },
    xAxis: {
      type: 'value',
      min: 0,
      max: 100,
      interval: 25,
      axisLabel: { formatter: '{value}%', color: palette.muted, fontSize: 10 },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#e7ebef' } },
    },
    yAxis: {
      type: 'category',
      data: [row.period_label],
      axisLabel: { color: palette.ink, fontSize: 11, fontWeight: 700 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: [row.on_time_rate_pct],
        barWidth: 24,
        itemStyle: { color: palette.blue, borderRadius: [0, 3, 3, 0] },
        label: {
          show: true,
          position: 'right',
          distance: 8,
          formatter: formatPercent(row.on_time_rate_pct),
          color: palette.ink,
          fontWeight: 800,
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: palette.green, width: 2, type: 'dashed' },
          label: { show: false },
          data: [{ xAxis: row.target_rate_pct }],
        },
      },
    ],
  };
}

function monthlyTrendOption(data) {
  const rows = data.monthlyTrend.rows;
  return {
    ...baseOption(),
    grid: { left: 12, right: 14, top: 38, bottom: 24, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: rows.map((row) => row.month_label.slice(0, 3)),
      axisLabel: { color: palette.muted, fontSize: 10 },
      axisLine: { lineStyle: { color: palette.line } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      interval: 25,
      axisLabel: { formatter: '{value}%', color: palette.muted, fontSize: 10 },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#e7ebef' } },
    },
    series: [
      {
        name: 'Доставки вовремя',
        type: 'line',
        data: rows.map((row) => row.on_time_rate_pct),
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { color: palette.blue, width: 3 },
        itemStyle: { color: '#ffffff', borderColor: palette.blue, borderWidth: 3 },
        label: {
          show: true,
          position: 'top',
          distance: 8,
          formatter: ({ value }) => formatPercent(value),
          color: palette.ink,
          fontSize: 10,
          fontWeight: 700,
        },
      },
    ],
  };
}

function districtComparisonOption(data) {
  const rows = data.districtComparison.rows;
  const targetRatePct = decisionContext(data).targetRatePct;
  return {
    ...baseOption(),
    grid: { left: 8, right: 64, top: 12, bottom: 24, containLabel: true },
    xAxis: {
      type: 'value',
      min: 0,
      max: 100,
      interval: 25,
      axisLabel: { formatter: '{value}%', color: palette.muted, fontSize: 10 },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#e7ebef' } },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: rows.map((row) => row.district_name),
      axisLabel: { color: palette.ink, fontSize: 11, fontWeight: 700 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        barWidth: 18,
        data: rows.map((row, index) => ({
          value: row.on_time_rate_pct,
          itemStyle: {
            color: index === 0 ? palette.blue : palette.coral,
            borderRadius: [0, 3, 3, 0],
          },
        })),
        label: {
          show: true,
          position: 'right',
          distance: 8,
          formatter: ({ value }) => formatPercent(value),
          color: palette.ink,
          fontSize: 11,
          fontWeight: 800,
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: palette.green, width: 2, type: 'dashed' },
          label: { show: false },
          data: [{ xAxis: targetRatePct }],
        },
      },
    ],
  };
}

function decisionLimitOption(data) {
  const rows = data.decisionLimit.rows;
  return {
    ...baseOption(),
    grid: { left: 8, right: 32, top: 18, bottom: 30, containLabel: true },
    xAxis: {
      type: 'category',
      data: ['Нет в данных', 'Проверено'],
      axisLabel: { color: palette.muted, fontSize: 10 },
      axisLine: { lineStyle: { color: palette.line } },
      axisTick: { show: false },
      splitLine: { show: true, lineStyle: { color: '#e7ebef' } },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: rows.map((row) => row.dimension_label),
      axisLabel: {
        color: palette.ink,
        fontSize: 10,
        width: 150,
        overflow: 'break',
        lineHeight: 12,
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'scatter',
        symbolSize: 17,
        data: rows.map((row, index) => {
          const verified = row.evidence_status === 'verified';
          return {
            value: [verified ? 1 : 0, index],
            symbol: verified ? 'circle' : 'diamond',
            itemStyle: { color: verified ? palette.green : palette.amber },
          };
        }),
        label: {
          show: true,
          position: 'right',
          formatter: ({ value }) => (value[0] === 1 ? 'есть' : 'нет'),
          color: palette.ink,
          fontSize: 10,
          fontWeight: 700,
        },
      },
    ],
  };
}

function renderChart(elementId, option) {
  const element = document.getElementById(elementId);
  let chart = charts.get(elementId);
  if (!chart) {
    chart = echartsApi.init(element, null, { renderer: 'svg' });
    charts.set(elementId, chart);
  }
  chart.clear();
  chart.setOption(option, { notMerge: true });
  chart.resize();
  return chart;
}

function renderDashboard() {
  const data = state.data;
  const metric = data.keyMetric.rows[0];
  const trendRows = data.monthlyTrend.rows;
  const districts = data.districtComparison.rows;
  const limits = data.decisionLimit.rows;
  const context = decisionContext(data);
  const delta = trendRows.at(-1).on_time_rate_pct - trendRows[0].on_time_rate_pct;
  const year = trendRows.at(-1).month_id.slice(0, 4);
  const missingLimits = limits.filter((row) => row.evidence_status === 'not_available');

  document.getElementById('dashboard-title').textContent = context.decision;
  document.getElementById('target-value').textContent = formatPercent(context.targetRatePct);
  document.getElementById('product-question').textContent = `Вопрос: ${context.question}`;
  document.getElementById('metric-value').textContent = metric.on_time_rate_pct.toFixed(1).replace('.', ',');
  document.getElementById('metric-conclusion').textContent =
    `${metric.on_time_orders} из ${metric.completed_orders} завершённых доставок выполнены вовремя.`;
  document.getElementById('trend-period').textContent = `${trendRows[0].month_label}–${trendRows.at(-1).month_label} ${year}`;
  document.getElementById('trend-delta').textContent = `${delta >= 0 ? '+' : ''}${delta.toFixed(1).replace('.', ',')} п. п.`;
  document.getElementById('trend-conclusion').textContent =
    `${delta >= 0 ? 'Наблюдается рост' : 'Наблюдается снижение'} SLA; источник не объясняет причину изменения.`;
  document.getElementById('district-conclusion').textContent = districts.every(
    (row) => row.on_time_rate_pct >= context.targetRatePct,
  )
    ? `Оба района достигли порога ${formatPercent(context.targetRatePct)}; запас различается.`
    : `Не все районы достигли порога ${formatPercent(context.targetRatePct)}.`;
  document.getElementById('limit-conclusion').textContent = missingLimits
    .map((row) => row.evidence_text)
    .join(' ');

  renderChart('chart-key-metric', keyMetricOption(data));
  renderChart('chart-monthly-trend', monthlyTrendOption(data));
  renderChart('chart-district-comparison', districtComparisonOption(data));
  renderChart('chart-decision-limit', decisionLimitOption(data));
}

function slideDefinitions(data) {
  const metric = data.keyMetric.rows[0];
  const trend = data.monthlyTrend.rows;
  const districts = data.districtComparison.rows;
  const limits = data.decisionLimit.rows;
  const context = decisionContext(data);
  const verifiedLimit = limits.find((row) => row.evidence_status === 'verified');
  const missingLimits = limits.filter((row) => row.evidence_status === 'not_available');
  const delta = trend.at(-1).on_time_rate_pct - trend[0].on_time_rate_pct;
  const allDistrictsMeetTarget = districts.every((row) => row.on_time_rate_pct >= context.targetRatePct);
  return [
    {
      eyebrow: '01 · Ключевой показатель',
      title: metric.target_status === 'above_target' ? 'Июньский SLA выше целевого порога' : 'Июньский SLA ниже целевого порога',
      lead: `${metric.on_time_orders} из ${metric.completed_orders} доставок выполнены вовремя — ${formatPercent(metric.on_time_rate_pct)} при пороге ${formatPercent(metric.target_rate_pct)}.`,
      limit: 'Показатель описывает завершённые заказы пилота и не прогнозирует SLA после роста объёма.',
      source: 'Источник: key-metric.json · 01-key-metric.sql',
      option: keyMetricOption(data),
    },
    {
      eyebrow: '02 · Динамика',
      title: delta >= 0 ? 'Показатель вырос в течение шести месяцев' : 'Показатель снизился в течение шести месяцев',
      lead: `Доля доставок вовремя изменилась с ${formatPercent(trend[0].on_time_rate_pct)} в январе до ${formatPercent(trend.at(-1).on_time_rate_pct)} в июне.`,
      limit: 'Ряд показывает наблюдаемую динамику, но не доказывает, какое изменение её вызвало.',
      source: 'Источник: monthly-trend.json · 02-monthly-trend.sql',
      option: monthlyTrendOption(data),
    },
    {
      eyebrow: '03 · Сравнение сегментов',
      title: allDistrictsMeetTarget ? 'Оба района достигли порога, но запас различается' : 'Не все районы достигли целевого порога',
      lead: `${districts[0].district_name}: ${formatPercent(districts[0].on_time_rate_pct)}. ${districts[1].district_name}: ${formatPercent(districts[1].on_time_rate_pct)}.`,
      limit: 'Знаменатель одинаков: завершённые вечерние доставки в июне. Сравнение не объясняет причину различия.',
      source: 'Источник: district-comparison.json · 03-district-comparison.sql',
      option: districtComparisonOption(data),
    },
    {
      eyebrow: '04 · Ограничение решения',
      title: verifiedLimit?.decision_effect || context.decision,
      lead: [verifiedLimit?.evidence_text, ...missingLimits.map((row) => row.evidence_text)].filter(Boolean).join(' '),
      limit: `Решение из dataset_metadata: ${context.decision} ${missingLimits.map((row) => row.decision_effect).join(' ')}`,
      source: 'Источник: decision-limit.json · 04-decision-limit.sql',
      option: decisionLimitOption(data),
    },
  ];
}

function renderSlide() {
  const slides = slideDefinitions(state.data);
  const slide = slides[state.slideIndex];
  document.getElementById('slide-count').textContent = `Экран ${state.slideIndex + 1} из ${slides.length}`;
  document.getElementById('slide-eyebrow').textContent = slide.eyebrow;
  document.getElementById('slide-title').textContent = slide.title;
  document.getElementById('slide-lead').textContent = slide.lead;
  document.getElementById('slide-limit').textContent = slide.limit;
  document.getElementById('slide-source').textContent = slide.source;
  document.getElementById('previous-slide').disabled = state.slideIndex === 0;
  document.getElementById('next-slide').disabled = state.slideIndex === slides.length - 1;

  document.querySelectorAll('.dot-button').forEach((button, index) => {
    const active = index === state.slideIndex;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-current', active ? 'true' : 'false');
  });

  requestAnimationFrame(() => renderChart('presentation-chart', slide.option));
}

function buildSlideDots() {
  const container = document.getElementById('slide-dots');
  for (let index = 0; index < 4; index += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dot-button';
    button.title = `Экран ${index + 1}`;
    button.setAttribute('aria-label', `Открыть экран ${index + 1}`);
    button.addEventListener('click', () => {
      state.slideIndex = index;
      renderSlide();
      updateReadyState();
    });
    container.append(button);
  }
}

function setMode(mode) {
  state.mode = mode;
  const dashboard = document.getElementById('dashboard-view');
  const presentation = document.getElementById('presentation-view');
  dashboard.hidden = mode !== 'dashboard';
  presentation.hidden = mode !== 'presentation';

  document.querySelectorAll('.mode-button').forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  if (mode === 'dashboard') {
    requestAnimationFrame(renderDashboard);
  } else {
    requestAnimationFrame(renderSlide);
  }
  updateReadyState();
}

function updateReadyState() {
  window.__QUICKCART_READY__ = {
    ready: Boolean(state.data),
    mode: state.mode,
    slide: state.slideIndex + 1,
    snapshot: state.data?.keyMetric.snapshot_id || null,
  };
}

function bindControls() {
  document.querySelectorAll('.mode-button').forEach((button) => {
    button.addEventListener('click', () => setMode(button.dataset.mode));
  });
  document.getElementById('previous-slide').addEventListener('click', () => {
    if (state.slideIndex > 0) state.slideIndex -= 1;
    renderSlide();
    updateReadyState();
  });
  document.getElementById('next-slide').addEventListener('click', () => {
    if (state.slideIndex < 3) state.slideIndex += 1;
    renderSlide();
    updateReadyState();
  });
  document.addEventListener('keydown', (event) => {
    if (state.mode !== 'presentation') return;
    if (event.key === 'ArrowLeft' && state.slideIndex > 0) {
      state.slideIndex -= 1;
      renderSlide();
    }
    if (event.key === 'ArrowRight' && state.slideIndex < 3) {
      state.slideIndex += 1;
      renderSlide();
    }
    updateReadyState();
  });
  window.addEventListener('resize', () => charts.forEach((chart) => chart.resize()));
}

async function start() {
  try {
    buildSlideDots();
    bindControls();
    const [keyMetric, monthlyTrend, districtComparison, decisionLimit] = await Promise.all([
      readExport(exportPaths.keyMetric),
      readExport(exportPaths.monthlyTrend),
      readExport(exportPaths.districtComparison),
      readExport(exportPaths.decisionLimit),
    ]);
    verifyExportEnvelope([keyMetric, monthlyTrend, districtComparison, decisionLimit]);
    const loadedData = { keyMetric, monthlyTrend, districtComparison, decisionLimit };
    decisionContext(loadedData);
    state.data = loadedData;

    const parameters = new URLSearchParams(window.location.search);
    const capture = parameters.get('capture');
    const requestedMode = capture === 'presentation' || parameters.get('mode') === 'presentation'
      ? 'presentation'
      : 'dashboard';
    const requestedSlide = Number(parameters.get('slide') || 1);
    state.slideIndex = Number.isInteger(requestedSlide)
      ? Math.min(3, Math.max(0, requestedSlide - 1))
      : 0;
    if (capture) document.body.classList.add('capture');

    setMode(requestedMode);
    updateReadyState();
  } catch (error) {
    document.getElementById('dashboard-view').hidden = true;
    document.getElementById('presentation-view').hidden = true;
    document.getElementById('error-state').hidden = false;
    document.getElementById('error-message').textContent = error.message;
    window.__QUICKCART_READY__ = { ready: false, error: error.message };
    console.error(error);
  }
}

start();
