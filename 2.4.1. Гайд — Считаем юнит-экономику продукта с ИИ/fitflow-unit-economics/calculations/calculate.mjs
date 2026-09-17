import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(scriptDirectory, "..");
const DATABASE = resolve(ROOT, "data", "fitflow.sqlite");
const QUERY = resolve(ROOT, "queries", "01_source_aggregates.sql");
const OUTPUT = resolve(ROOT, "results", "unit-economics.csv");

function asInteger(value, name) {
  if (typeof value === "bigint") {
    return value;
  }
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return BigInt(value);
  }
  throw new TypeError(name + " must be a safe integer, got " + String(value));
}

function divide(numerator, denominator, name) {
  if (denominator <= 0n) {
    throw new RangeError(
      name + ": denominator must be positive, got " + denominator.toString(),
    );
  }
  return { numerator, denominator };
}

function divideFractions(numerator, denominator, name) {
  if (denominator.numerator <= 0n) {
    throw new RangeError(name + ": denominator must be positive");
  }
  return {
    numerator: numerator.numerator * denominator.denominator,
    denominator: numerator.denominator * denominator.numerator,
  };
}

function roundedScaled(value, decimalPlaces) {
  const scale = 10n ** BigInt(decimalPlaces);
  const sign = value.numerator < 0n ? -1n : 1n;
  const absoluteNumerator =
    value.numerator < 0n ? -value.numerator : value.numerator;
  const rounded =
    (absoluteNumerator * scale * 2n + value.denominator) /
    (value.denominator * 2n);
  return sign * rounded;
}

function formatFixed(value, decimalPlaces = 2) {
  const scaled = roundedScaled(value, decimalPlaces);
  const sign = scaled < 0n ? "-" : "";
  const absoluteScaled = scaled < 0n ? -scaled : scaled;
  const scale = 10n ** BigInt(decimalPlaces);
  const whole = absoluteScaled / scale;
  const fraction = (absoluteScaled % scale)
    .toString()
    .padStart(decimalPlaces, "0");
  return sign + whole.toString() + "." + fraction;
}

function formatMoney(value) {
  return formatFixed(
    {
      numerator: value.numerator,
      denominator: value.denominator * 100n,
    },
    2,
  );
}

async function calculate() {
  const query = await readFile(QUERY, "utf8");
  const database = new DatabaseSync(DATABASE, { readOnly: true });
  let sourceRows;
  try {
    sourceRows = database.prepare(query).all();
  } finally {
    database.close();
  }

  if (sourceRows.length === 0) {
    throw new Error("Source query returned no rows");
  }

  return sourceRows.map((source) => {
    const spend = asInteger(source.spend_cents, "spend_cents");
    const netRevenue = asInteger(source.net_revenue_cents, "net_revenue_cents");
    const variableCosts = asInteger(
      source.variable_costs_cents,
      "variable_costs_cents",
    );
    const paying = asInteger(
      source.new_paying_customers,
      "new_paying_customers",
    );
    const activeMonths = asInteger(
      source.active_customer_months,
      "active_customer_months",
    );
    const contribution = netRevenue - variableCosts;

    const cac = divide(spend, paying, "CAC");
    const monthlyArpu = divide(netRevenue, activeMonths, "monthly ARPU");
    const monthlyMargin = divide(
      contribution,
      activeMonths,
      "monthly contribution margin",
    );
    const ltv6m = divide(contribution, paying, "LTV_6m");
    const ltvCac = divideFractions(ltv6m, cac, "LTV/CAC");
    const payback = divideFractions(cac, monthlyMargin, "CAC payback");

    return {
      channel: String(source.channel),
      cac: formatMoney(cac),
      monthly_arpu: formatMoney(monthlyArpu),
      monthly_contribution_margin_per_customer: formatMoney(monthlyMargin),
      ltv_6m: formatMoney(ltv6m),
      ltv_cac: formatFixed(ltvCac),
      cac_payback_months: formatFixed(payback),
    };
  });
}

async function main() {
  const rows = await calculate();
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map((row) => headers.map(
    (header) => row[header],
  ).join(","))].join("\n") + "\n";

  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, csv, "utf8");
  console.log("Wrote " + rows.length + " rows to results/unit-economics.csv");
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
