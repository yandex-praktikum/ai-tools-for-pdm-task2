# QuickCart Decision Room

Локальный проект QuickCart Decision Room. Он отвечает на один вопрос:

> Стоит ли QuickCart в июле 2026 года ограниченно расширить вечерний экспресс-слот 18:00–22:00 в Северном и Восточном районах, сохранив долю доставок вовремя не ниже 90%?

Проект использует только подготовленный синтетический snapshot `quickcart-evening-pilot-v1`. Он не получает данные из сети и не выполняет новую аналитику в браузере.

Production-скрипты базы используют встроенный модуль `node:sqlite` на зафиксированной версии Node.js. Node.js 22.18.0 выводит для этого модуля `ExperimentalWarning`; предупреждение ожидаемо, не скрывается и не считается ошибкой SQL/JSON-проверки.

## Проверенное окружение

* Node.js `v22.18.0`
* npm `10.9.3`
* Apache ECharts `6.1.0`
* локальный адрес `http://localhost:4173/`

## Windows PowerShell

```powershell
Set-Location "<LOCAL_DRIVE>\\path\to\quickcart-decision-room"
node --version
npm --version
npm ci
npm list echarts
npm run verify
npm run browser:smoke
npm run dev
```

## macOS Terminal

```bash
cd "/path/to/quickcart-decision-room"
node --version
npm --version
npm ci
npm list echarts
npm run verify
npm run browser:smoke
npm run dev
```

Обе ветки используют один `package-lock.json`. Команда `npm ci` должна завершаться без изменения lock-файла. Сервер сообщает `Local: http://localhost:4173/`, а `http://localhost:4173/health.json` возвращает `{"status":"ok"}`.

## Чистая копия репозитория

В репозитории не хранятся `node_modules`, логи, снимки браузерной проверки и
локальные transcript-файлы. После клонирования установите зависимости командой
`npm ci`. Команда `npm run browser:smoke` при необходимости создаёт эти
проверочные артефакты локально; `.gitignore` не даёт добавить их в коммит.

## Экспорт результатов SQL в JSON

Дашборд не выполняет SQL в браузере. Скрипт `scripts/export-data.mjs` открывает `data/quickcart.sqlite` в режиме чтения, берёт SQL-запросы из `queries/`, выполняет их и сохраняет результаты в `exports/*.json`.

Если изменились SQL-запрос или исходные данные, сначала обновите JSON, затем проверьте его и только после этого запускайте дашборд:

```bash
npm run data:export -- key-metric
npm run data:verify
npm run dev
```

Соответствие файлов для одного блока выглядит так:

```text
queries/01-key-metric.sql
→ data/quickcart.sqlite
→ exports/key-metric.json
→ дашборд
```

Экспорт всех четырёх SQL-запросов в JSON:

```bash
npm run data:export
```

Экспорт одного блока:

```bash
npm run data:export -- key-metric
npm run data:export -- monthly-trend
npm run data:export -- district-comparison
npm run data:export -- decision-limit
```

Полная пересборка базы и четырёх экспортов нужна только при изменении исходных данных:

```bash
npm run data:build
```

## Критерий завершения

Проект готов, если `npm run verify` и `npm run browser:smoke` завершаются успешно, сервер отвечает на health-check, четыре графика созданы как SVG, оба режима используют те же JSON, навигация работает, а browser smoke-check не находит ошибок консоли, пустых блоков и наложений текста. Smoke-команда сама выполняет `verify-data.mjs`, поднимает локальный сервер при необходимости и использует точно зафиксированный `playwright-core@1.61.1` с локальным Google Chrome.
