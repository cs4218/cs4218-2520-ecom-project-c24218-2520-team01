#!/usr/bin/env node
import fs from "fs";
import path from "path";

function findLatestJtl() {
  const rootDir = path.resolve(process.cwd());
  const resultsDir = path.join(rootDir, "tests", "nft", "load-testing", "results");
  if (!fs.existsSync(resultsDir)) return null;

  const candidates = fs
    .readdirSync(resultsDir)
    .filter((name) => name.startsWith("browsing-flow-") && name.endsWith(".jtl"))
    .map((name) => ({
      file: path.join(resultsDir, name),
      mtime: fs.statSync(path.join(resultsDir, name)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  return candidates[0]?.file || null;
}

const jtlPath = process.argv[2] || findLatestJtl();

if (!jtlPath) {
  console.error("No JTL file provided and no browsing-flow JTL file found in tests/nft/load-testing/results");
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
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function summarize(records) {
  const elapsed = records.map((r) => r.elapsed);
  const errors = records.filter((r) => !r.success).length;
  const minTs = Math.min(...records.map((r) => r.ts));
  const maxTs = Math.max(...records.map((r) => r.ts));
  const durationSec = Math.max(1, (maxTs - minTs) / 1000);

  return {
    count: records.length,
    errorRate: (errors / records.length) * 100,
    avg: elapsed.reduce((a, b) => a + b, 0) / records.length,
    p90: percentile(elapsed, 90),
    p95: percentile(elapsed, 95),
    max: Math.max(...elapsed),
    throughput: records.length / durationSec,
  };
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

const rows = lines.slice(1).filter(Boolean).map((line) => {
  const parts = parseCsvLine(line);
  return {
    ts: Number(parts[idx.ts]),
    elapsed: Number(parts[idx.elapsed]),
    label: parts[idx.label],
    success: String(parts[idx.success]).toLowerCase() === "true",
  };
});

if (!rows.length) {
  console.error("No samples found in JTL file");
  process.exit(1);
}

const overall = summarize(rows);
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

console.log("\nLoad Test Summary");
console.log(`JTL: ${path.resolve(jtlPath)}`);
console.log(`Samples: ${overall.count}`);
console.log(`Avg response: ${overall.avg.toFixed(2)} ms`);
console.log(`P90 response: ${overall.p90.toFixed(2)} ms`);
console.log(`P95 response: ${overall.p95.toFixed(2)} ms`);
console.log(`Max response: ${overall.max.toFixed(2)} ms`);
console.log(`Error rate: ${overall.errorRate.toFixed(2)} %`);
console.log(`Throughput: ${overall.throughput.toFixed(2)} req/s\n`);

console.log("Per Flow (sorted by P95 descending)");
for (const stat of labelStats) {
  console.log(
    `${stat.label} | count=${stat.count} avg=${stat.avg.toFixed(1)}ms p95=${stat.p95.toFixed(1)}ms max=${stat.max.toFixed(1)}ms err=${stat.errorRate.toFixed(2)}% tput=${stat.throughput.toFixed(2)} req/s`,
  );
}

console.log("\nPrimary Bottleneck Candidate");
console.log(
  `${bottleneck.label} with p95=${bottleneck.p95.toFixed(1)}ms and max=${bottleneck.max.toFixed(1)}ms`,
);
