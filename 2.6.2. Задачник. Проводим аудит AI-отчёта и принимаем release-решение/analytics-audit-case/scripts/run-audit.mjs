import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import initSqlJs from "sql.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const inputDir = path.join(rootDir, "input");
const databasePath = path.join(rootDir, "input", "orbitdesk-audit.sqlite");
const checksDir = path.join(rootDir, "checks");
const decisionPath = path.join(rootDir, "release-decision.md");
const startMarker = "<!-- AUDIT_RESULTS_START -->";
const endMarker = "<!-- AUDIT_RESULTS_END -->";
const allowedStatuses = new Set(["pass", "fail", "not-checkable"]);
const expectedDatasetVersion = "v2";
const immutableInputNames = [
  "ai-report.md",
  "control-counts.md",
  "hypotheses.md",
  "metric-definitions.md",
  "orbitdesk-audit.sqlite",
  "schema.md",
];
const expectedChecks = new Map([
  ["01-denominator.sql", "H-01"],
  ["02-join-duplicates.sql", "H-02"],
  ["03-period.sql", "H-03"],
  ["04-null.sql", "H-04"],
  ["05-control-counts.sql", "H-05"],
]);

async function sha256(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

function rowFromResult(result, fileName) {
  if (result.length !== 1 || result[0].values.length !== 1) {
    throw new Error(`${fileName}: expected exactly one result row`);
  }

  const [resultSet] = result;
  const row = Object.fromEntries(
    resultSet.columns.map((column, index) => [column, resultSet.values[0][index]]),
  );
  const requiredColumns = [
    "hypothesis_id",
    "check_name",
    "status",
    "observed",
    "expected",
    "evidence",
  ];

  for (const column of requiredColumns) {
    if (row[column] === undefined || row[column] === null) {
      throw new Error(`${fileName}: missing result column ${column}`);
    }
  }

  if (!allowedStatuses.has(String(row.status))) {
    throw new Error(`${fileName}: unsupported status ${row.status}`);
  }

  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, String(value)]),
  );
}

function markdownCell(value) {
  return value.replaceAll("|", "\\|").replaceAll(/\r?\n/g, " ").trim();
}

function renderResults(rows, datasetVersion) {
  const header = [
    "| Гипотеза | Проверка SQL | Технический статус | Наблюдение | Условие | Evidence |",
    "|---|---|---|---|---|---|",
  ];
  const body = rows.map((row) =>
    `| ${markdownCell(row.hypothesis_id)} | ${markdownCell(row.check_name)} | ${markdownCell(row.status)} | ${markdownCell(row.observed)} | ${markdownCell(row.expected)} | ${markdownCell(row.evidence)} |`,
  );

  return [
    "## Технические результаты audit-runner",
    "",
    `Версия набора данных: \`${datasetVersion}\`. Технический статус не является release-решением.`,
    "",
    ...header,
    ...body,
  ].join("\n");
}

function replaceMarkedBlock(document, replacement) {
  const startIndex = document.indexOf(startMarker);
  const endIndex = document.indexOf(endMarker);
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error("release-decision.md: audit result markers are missing or invalid");
  }

  const before = document.slice(0, startIndex + startMarker.length);
  const after = document.slice(endIndex);
  return `${before}\n\n${replacement}\n\n${after}`;
}

async function main() {
  const immutableBefore = new Map();
  for (const fileName of immutableInputNames) {
    const filePath = path.join(inputDir, fileName);
    immutableBefore.set(filePath, await sha256(filePath));
  }
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(rootDir, "node_modules", "sql.js", "dist", file),
  });
  const database = new SQL.Database(new Uint8Array(await readFile(databasePath)));

  try {
    const metadata = database.exec(
      "SELECT dataset_version FROM dataset_metadata WHERE dataset_id = 'orbitdesk-onboarding-audit'",
    );
    if (metadata.length !== 1 || metadata[0].values.length !== 1) {
      throw new Error("Database metadata is missing or ambiguous");
    }
    const datasetVersion = String(metadata[0].values[0][0]);
    if (datasetVersion !== expectedDatasetVersion) {
      throw new Error(
        `Unexpected dataset version ${datasetVersion}; expected ${expectedDatasetVersion}`,
      );
    }

    const checkFiles = (await readdir(checksDir))
      .filter((file) => file.endsWith(".sql"))
      .sort();
    if (checkFiles.length !== 5) {
      throw new Error(`Expected five SQL checks, found ${checkFiles.length}`);
    }

    const rows = [];
    for (const fileName of checkFiles) {
      const sql = await readFile(path.join(checksDir, fileName), "utf8");
      const row = rowFromResult(database.exec(sql), fileName);
      if (
        row.hypothesis_id !== expectedChecks.get(fileName) ||
        row.check_name !== `checks/${fileName}`
      ) {
        throw new Error(`${fileName}: result identity does not match the check file`);
      }
      rows.push(row);
    }

    const originalDecision = await readFile(decisionPath, "utf8");
    const firstLine = originalDecision.split(/\r?\n/, 1)[0];
    const validStatusField = /^status: (\{publish \| hold \| rework\}|publish|hold|rework)$/;
    if (!validStatusField.test(firstLine)) {
      throw new Error(
        "The first field must be the status template or one selected release status",
      );
    }
    const updatedDecision = replaceMarkedBlock(
      originalDecision,
      renderResults(rows, datasetVersion),
    );
    await writeFile(decisionPath, updatedDecision, "utf8");

    for (const [filePath, beforeHash] of immutableBefore) {
      if ((await sha256(filePath)) !== beforeHash) {
        throw new Error(`Immutable input changed during audit: ${filePath}`);
      }
    }

    const counts = rows.reduce(
      (accumulator, row) => {
        accumulator[row.status] += 1;
        return accumulator;
      },
      { pass: 0, fail: 0, "not-checkable": 0 },
    );
    console.table(
      rows.map(({ hypothesis_id, check_name, status, observed }) => ({
        hypothesis_id,
        check_name,
        status,
        observed,
      })),
    );
    console.log(
      `Audit completed: pass=${counts.pass}, fail=${counts.fail}, not-checkable=${counts["not-checkable"]}`,
    );
    console.log(
      `Immutable inputs unchanged during audit: ${immutableInputNames.join(", ")}`,
    );
    console.log("Release status was not selected by the runner");
  } finally {
    database.close();
  }
}

main().catch((error) => {
  console.error(`Audit failed: ${error.message}`);
  process.exitCode = 1;
});
