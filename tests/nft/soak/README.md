# Soak/Endurance Testing

Written by Wong Sheen Kerr (A0269647J)

## Overview

This folder contains API-level soak/endurance tests for the shopper workflows in this repo.

Files:

- `helpers.js`: shared setup, auth, fixture, request, and metric helpers
- `scenarios.js`: scenario functions for catalog browsing, auth/session, search/filter, and checkout/orders
- `soak.k6.js`: main endurance suite
- `run-soak.ps1`: PowerShell wrapper that runs k6 and saves CSV outputs
- `monitor-process-memory.ps1`: optional process-level memory sampler for the backend PID
- `analyze_k6_results.py`: Python summary script for the latest k6 CSV export plus its matching process-memory CSV

## What Each File Does

- `helpers.js`
  Shared k6 utilities, seeded-data setup, mixed-workload VU allocation, and summary formatting.
- `scenarios.js`
  The actual shopper workflow iterations that call the repo's API routes.
- `soak.k6.js`
  The main endurance-test entrypoint for the fixed manual-stop soak run.
- `run-soak.ps1`
  Optional Windows convenience runner for launching k6 with CSV output and memory-monitoring support.
- `monitor-process-memory.ps1`
  Optional process-level memory sampler for the backend PID during long runs.
- `analyze_k6_results.py`
  Streaming analyzer for the latest soak run in `tests/nft/soak/results/`. It computes statistics for overall, per-scenario, per-window, failure-breakdown, and process-memory summary data and outputs a JSON file in the same folder.

## Prerequisites

- `k6` installed on your machine
- backend running in test mode so the reset route is available

## How to Run (windows only)

1. Start the backend in test mode in one terminal:

```powershell
$env:NODE_ENV = "test"
node server.js
```

2. If you want memory tracking, get the backend PID in another terminal:

```powershell
Get-CimInstance Win32_Process -Filter "name = 'node.exe'" | Select-Object ProcessId, CommandLine
```

Pick the `ProcessId` for the entry that contains `node server.js`.

3. Run the soak test (in a separate terminal from the above server):

Without memory tracking:

```powershell
npm run test:soak
```

With memory tracking:

```powershell
npm run test:soak -- -ServerPid <pid>
```

4. Stop the soak run with `Ctrl+C` once you have collected enough data.

## Fixed Soak Defaults

- base URL: `http://localhost:6060`
- total VUs: `100`
- run style: `manual stop`
- fallback duration: `365d`
- think time: `1s`
- think-time jitter: `0.5s`

## Commands

NPM shortcuts:

```powershell
npm run test:soak
```

Notes:

- Keep the backend running in `NODE_ENV=test` before using these commands.
- The npm scripts use the fixed soak defaults in `helpers.js`.
- The PowerShell runner now waits for the backend to become reachable before starting k6, which avoids the common startup race when the backend was launched only a few seconds earlier.

Runner-only arguments still available:

```powershell
npm run test:soak -- -ServerPid 12345
npm run test:soak -- -WaitForBackendSeconds 120 -HealthPath /
```

If you need custom arguments, call the PowerShell runner directly:

```powershell
.\tests\nft\soak\run-soak.ps1 -ServerPid 12345
```

## Output Files

The PowerShell runner writes timestamped files into `tests/nft/soak/results/`:

- `soak-YYYYMMDD-HHMMSS.csv`
- `soak-YYYYMMDD-HHMMSS-process-memory.csv` when `-ServerPid` is used

You can then analyze the latest run with:

```powershell
python .\tests\nft\soak\analyze_k6_results.py
```

The analyzer auto-discovers the latest soak CSV in `tests/nft/soak/results/`, finds its matching `-process-memory.csv` file, and writes the matching `-summary.json` file beside them.

## Scenarios Covered

- catalog browsing
- auth/session
- search/filter
- checkout/orders

## Primary Metrics

- response time
- throughput
- HTTP error rate

## Optional Process Memory Monitoring

If you pass `-ServerPid` to the PowerShell runner, it samples the backend process only, not whole-machine RAM.

Recorded fields:

- `rss_bytes`
- `private_memory_bytes`
- `virtual_memory_bytes`
- `paged_memory_bytes`
- `handle_count`
- `thread_count`

This is intended as **supporting evidence** for memory-leak discussion in the report.
