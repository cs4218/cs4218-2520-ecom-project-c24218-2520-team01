#!/usr/bin/env node
// Rachel Tai Ke Jia (A0258603A)

import fs from "fs";
import path from "path";

function findLatestJtl() {
  const rootDir = path.resolve(process.cwd());
  const resultsDir = path.join(rootDir, "tests", "nft", "load-testing", "results");
  if (!fs.existsSync(resultsDir)) return null;

  const candidates = fs
    .readdirSync(resultsDir)
    .filter((name) => name.endsWith(".jtl"))
    .map((name) => ({
      file: path.join(resultsDir, name),
      mtime: fs.statSync(path.join(resultsDir, name)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  return candidates[0]?.file || null;
}

const jtlPath = process.argv[2] || findLatestJtl();

if (!jtlPath) {
  console.error("No JTL file provided and no JTL file found in tests/nft/load-testing/results");
  console.error("Usage: node tests/nft/load-testing/scripts/analyze-jtl.mjs <path-to-jtl>");
  process.exit(1);
}

if (!fs.existsSync(jtlPath)) {
  console.error(`JTL file not found: ${jtlPath}`);
  process.exit(1);
}

function parseCsvLine(line) {
  const out = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  // position = (percentile / 100) * number of data points
  // use nearest-rank indexing for non-integer positions
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function writeResponseTimeSeries(rows, jtlPath, groupByLabel = false) {
  const endpointRows = rows.filter((row) => !row.label.startsWith("Flow ") && row.success);
  if (!endpointRows.length) return null;

  const startTs = Math.min(...endpointRows.map((row) => row.ts));
  const outputPath = jtlPath.replace(
    /\.jtl$/i,
    groupByLabel ? "-response-time-by-endpoint.csv" : "-response-time-over-time.csv",
  );

  let lines;
  if (groupByLabel) {
    const buckets = new Map();
    for (const row of endpointRows) {
      const second = Math.floor((row.ts - startTs) / 1000);
      const key = `${second}::${row.label}`;
      if (!buckets.has(key)) {
        buckets.set(key, { second, label: row.label, values: [] });
      }
      buckets.get(key).values.push(row.elapsed);
    }

    lines = ["t_seconds,label,count,avg_ms,p90_ms,max_ms"];
    const sortedBuckets = [...buckets.values()].sort((a, b) => a.second - b.second || a.label.localeCompare(b.label));
    for (const bucket of sortedBuckets) {
      const values = bucket.values;
      const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
      lines.push([
        bucket.second,
        JSON.stringify(bucket.label),
        values.length,
        avg.toFixed(2),
        percentile(values, 90).toFixed(2),
        Math.max(...values).toFixed(2),
      ].join(","));
    }
  } else {
    const buckets = new Map();

    for (const row of endpointRows) {
      const second = Math.floor((row.ts - startTs) / 1000);
      if (!buckets.has(second)) buckets.set(second, []);
      buckets.get(second).push(row.elapsed);
    }

    lines = ["t_seconds,count,avg_ms,p90_ms,max_ms"];
    for (const second of [...buckets.keys()].sort((a, b) => a - b)) {
      const values = buckets.get(second);
      const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
      lines.push([
        second,
        values.length,
        avg.toFixed(2),
        percentile(values, 90).toFixed(2),
        Math.max(...values).toFixed(2),
      ].join(","));
    }
  }

  fs.writeFileSync(outputPath, lines.join("\n"));
  return outputPath;
}

function summarize(records) {
  const elapsed = records.map((r) => r.elapsed);
  const successful = records.filter((r) => r.success).length;
  const failed = records.length - successful;
  const minTs = Math.min(...records.map((r) => r.ts));
  const maxTs = Math.max(...records.map((r) => r.ts));
  const durationSec = Math.max(1, (maxTs - minTs) / 1000);

  return {
    count: records.length,
    successful,
    failed,
    // Throughput = Total successful requests / total time in seconds
    throughput: successful / durationSec,
    // Error Rate (%) = (Total Failed Requests / Total Requests) * 100
    errorRate: (failed / records.length) * 100,
    avg: elapsed.reduce((a, b) => a + b, 0) / records.length,
    p90: percentile(elapsed, 90),
    p95: percentile(elapsed, 95),
    max: Math.max(...elapsed),
  };
}

function parseThreshold(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function findLabelStat(stats, candidates) {
  const loweredCandidates = candidates.map((candidate) => candidate.toLowerCase());
  return stats.find((stat) => {
    const loweredLabel = stat.label.toLowerCase();
    return loweredCandidates.some((candidate) => loweredLabel.includes(candidate));
  });
}

const file = fs.readFileSync(jtlPath, "utf8").trim();
if (!file) {
  console.error("JTL file is empty");
  process.exit(1);
}

const lines = file.split(/\r?\n/);
const header = parseCsvLine(lines[0]);
const idx = {
  ts: header.indexOf("timeStamp"),
  elapsed: header.indexOf("elapsed"),
  label: header.indexOf("label"),
  success: header.indexOf("success"),
};

for (const key of Object.keys(idx)) {
  if (idx[key] < 0) {
    console.error(`Missing expected JTL column: ${key}`);
    process.exit(1);
  }
}

const rows = lines
  .slice(1)
  .filter(Boolean)
  .map((line) => {
    const parts = parseCsvLine(line);
    return {
      ts: Number(parts[idx.ts]),
      elapsed: Number(parts[idx.elapsed]),
      label: parts[idx.label],
      success: String(parts[idx.success]).toLowerCase() === "true",
    };
  })
  .filter((row) => Number.isFinite(row.ts) && Number.isFinite(row.elapsed) && row.label);

if (!rows.length) {
  console.error("No samples found in JTL file");
  process.exit(1);
}

const overall = summarize(rows);
const responseTimeSeriesPath = writeResponseTimeSeries(rows, jtlPath);
const responseTimeByEndpointPath = writeResponseTimeSeries(rows, jtlPath, true);
const byLabel = new Map();
for (const row of rows) {
  if (!byLabel.has(row.label)) byLabel.set(row.label, []);
  byLabel.get(row.label).push(row);
}

const labelStats = [...byLabel.entries()].map(([label, records]) => ({
  label,
  ...summarize(records),
}));

labelStats.sort((a, b) => b.p95 - a.p95);
const bottleneck = labelStats[0];
const topBottlenecks = labelStats.slice(0, 3);

const cpuBusySeconds = parseThreshold("CPU_BUSY_SECONDS", Number.NaN);
const cpuTotalSeconds = parseThreshold("CPU_TOTAL_SECONDS", Number.NaN);
const cpuUtilisation =
  Number.isFinite(cpuBusySeconds) &&
  Number.isFinite(cpuTotalSeconds) &&
  cpuTotalSeconds > 0
    ? (cpuBusySeconds / cpuTotalSeconds) * 100
    : null;

const thresholds = {
  overallP95Ms: parseThreshold("OVERALL_P95_THRESHOLD_MS", 1500),
  searchP95Ms: parseThreshold("SEARCH_P95_THRESHOLD_MS", 900),
  filterP95Ms: parseThreshold("FILTER_P95_THRESHOLD_MS", 1200),
  authRegisterP95Ms: parseThreshold("AUTH_REGISTER_P95_THRESHOLD_MS", 1200),
  authLoginP95Ms: parseThreshold("AUTH_LOGIN_P95_THRESHOLD_MS", 900),
  authUserAuthP95Ms: parseThreshold("AUTH_USER_AUTH_P95_THRESHOLD_MS", 700),
  errorRatePct: parseThreshold("ERROR_RATE_THRESHOLD_PCT", 1),
  minThroughputReqPerSec: parseThreshold("MIN_THROUGHPUT_REQ_PER_SEC", 5),
};

const searchStat = findLabelStat(labelStats, ["flow 1 - search", "get search products"]);
const filterStat = findLabelStat(labelStats, ["flow 2 - filter results", "flow 4 - price filter", "post product filters"]);
const authRegisterStat = findLabelStat(labelStats, ["flow 1 - register", "post register"]);
const authLoginStat = findLabelStat(labelStats, ["flow 2 - login", "post login"]);
const authUserAuthStat = findLabelStat(labelStats, ["flow 3 - validate auth token", "get user auth"]);

const checks = [
  {
    name: `Overall P95 <= ${thresholds.overallP95Ms}ms`,
    pass: overall.p95 <= thresholds.overallP95Ms,
    actual: `${overall.p95.toFixed(1)}ms`,
  },
  {
    name: `Overall error rate <= ${thresholds.errorRatePct}%`,
    pass: overall.errorRate <= thresholds.errorRatePct,
    actual: `${overall.errorRate.toFixed(2)}%`,
  },
  {
    name: `Overall throughput >= ${thresholds.minThroughputReqPerSec} req/s`,
    pass: overall.throughput >= thresholds.minThroughputReqPerSec,
    actual: `${overall.throughput.toFixed(2)} req/s`,
  },
];

if (searchStat) {
  checks.push({
    name: `Search P95 <= ${thresholds.searchP95Ms}ms`,
    pass: searchStat.p95 <= thresholds.searchP95Ms,
    actual: `${searchStat.p95.toFixed(1)}ms (${searchStat.label})`,
  });
}

if (filterStat) {
  checks.push({
    name: `Filter P95 <= ${thresholds.filterP95Ms}ms`,
    pass: filterStat.p95 <= thresholds.filterP95Ms,
    actual: `${filterStat.p95.toFixed(1)}ms (${filterStat.label})`,
  });
}

if (authRegisterStat) {
  checks.push({
    name: `Auth Register P95 <= ${thresholds.authRegisterP95Ms}ms`,
    pass: authRegisterStat.p95 <= thresholds.authRegisterP95Ms,
    actual: `${authRegisterStat.p95.toFixed(1)}ms (${authRegisterStat.label})`,
  });
}

if (authLoginStat) {
  checks.push({
    name: `Auth Login P95 <= ${thresholds.authLoginP95Ms}ms`,
    pass: authLoginStat.p95 <= thresholds.authLoginP95Ms,
    actual: `${authLoginStat.p95.toFixed(1)}ms (${authLoginStat.label})`,
  });
}

if (authUserAuthStat) {
  checks.push({
    name: `Auth User-Auth P95 <= ${thresholds.authUserAuthP95Ms}ms`,
    pass: authUserAuthStat.p95 <= thresholds.authUserAuthP95Ms,
    actual: `${authUserAuthStat.p95.toFixed(1)}ms (${authUserAuthStat.label})`,
  });
}

const failedChecks = checks.filter((check) => !check.pass);

console.log("\nLoad Test Summary");
console.log(`JTL: ${path.resolve(jtlPath)}`);
console.log(`Samples: ${overall.count}`);
console.log(`Successful requests: ${overall.successful}`);
console.log(`Failed requests: ${overall.failed}`);
console.log(`Avg response: ${overall.avg.toFixed(2)} ms`);
console.log(`P90 response: ${overall.p90.toFixed(2)} ms`);
console.log(`P95 response: ${overall.p95.toFixed(2)} ms`);
console.log(`Max response: ${overall.max.toFixed(2)} ms`);
console.log(`Error rate: ${overall.errorRate.toFixed(2)} %`);
console.log(`Throughput: ${overall.throughput.toFixed(2)} req/s\n`);
if (cpuUtilisation !== null) {
  console.log(`CPU utilisation: ${cpuUtilisation.toFixed(2)} %\n`);
} else {
  console.log("CPU utilisation: not available (set CPU_BUSY_SECONDS and CPU_TOTAL_SECONDS env vars)\n");
}
if (responseTimeSeriesPath) {
  console.log(`Response-time table: ${path.resolve(responseTimeSeriesPath)}\n`);
}
if (responseTimeByEndpointPath) {
  console.log(`Response-time by endpoint table: ${path.resolve(responseTimeByEndpointPath)}\n`);
}

console.log("Per Flow (sorted by P95 descending)");
for (const stat of labelStats) {
  console.log(
    `${stat.label} | count=${stat.count} success=${stat.successful} fail=${stat.failed} avg=${stat.avg.toFixed(1)}ms p95=${stat.p95.toFixed(1)}ms max=${stat.max.toFixed(1)}ms err=${stat.errorRate.toFixed(2)}% tput=${stat.throughput.toFixed(2)} req/s`,
  );
}

console.log("\nTop Bottleneck Candidates");
for (const stat of topBottlenecks) {
  console.log(`${stat.label} -> p95=${stat.p95.toFixed(1)}ms, max=${stat.max.toFixed(1)}ms, err=${stat.errorRate.toFixed(2)}%`);
}

if (bottleneck) {
  console.log("\nPrimary Bottleneck Candidate");
  console.log(`${bottleneck.label} with p95=${bottleneck.p95.toFixed(1)}ms and max=${bottleneck.max.toFixed(1)}ms`);
}

console.log("\nNFR Verdict");
for (const check of checks) {
  const status = check.pass ? "PASS" : "FAIL";
  console.log(`[${status}] ${check.name} | actual=${check.actual}`);
}

if (failedChecks.length > 0) {
  console.error(`\nResult: FAIL (${failedChecks.length} NFR checks failed)`);
  process.exit(2);
}

console.log("\nResult: PASS (all NFR checks satisfied)");
