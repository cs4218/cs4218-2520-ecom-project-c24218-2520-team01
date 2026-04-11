#!/usr/bin/env bash

# AI Usage Declaration
#
# Tool Used:
# - GPT-5.3-Codex
#
# Prompt:
# - Help me design and refine a runner script for the product-browsing flow load test.
# - Help me structure CSV data inputs, CPU sampling, report output, and post-run JTL analysis integration.
#
# How the AI Output Was Used:
# - Used the AI output as a reference for this browsing runner script 

## Rachel Tai Ke Jia (A0258603A)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../../../.." && pwd)"
PLAN="${ROOT_DIR}/tests/nft/load-testing/jmeter/product-browsing-flow.jmx"
RESULTS_DIR="${ROOT_DIR}/tests/nft/load-testing/results"

HOST="${HOST:-localhost}"
PORT="${PORT:-6060}"
PROTOCOL="${PROTOCOL:-http}"
LOAD_PROFILE="${LOAD_PROFILE:-baseline}"
case "${LOAD_PROFILE}" in
  baseline) DEFAULT_USERS=100 ;;
  funnel) DEFAULT_USERS=100 ;;
  *) DEFAULT_USERS=100 ;;
esac
USERS="${USERS:-${DEFAULT_USERS}}"
RAMP_UP_SECONDS="${RAMP_UP_SECONDS:-60}"
LOOPS="${LOOPS:-3}"
DURATION_SECONDS="${DURATION_SECONDS:-900}"
PROFILE_RESULTS_DIR="${RESULTS_DIR}/${LOAD_PROFILE}"

SEARCH_DATA_FILE="${SEARCH_DATA_FILE:-${ROOT_DIR}/tests/nft/load-testing/data/search-keywords.csv}"
CATEGORY_DATA_FILE="${CATEGORY_DATA_FILE:-${ROOT_DIR}/tests/nft/load-testing/data/category-slugs.csv}"
PRICE_DATA_FILE="${PRICE_DATA_FILE:-${ROOT_DIR}/tests/nft/load-testing/data/price-ranges.csv}"
AUTO_CPU_UTILIZATION="${AUTO_CPU_UTILIZATION:-1}"

if ! command -v jmeter >/dev/null 2>&1; then
  echo "JMeter is required but not found in PATH."
  echo "Install Apache JMeter and ensure the 'jmeter' command is available."
  exit 1
fi

prune_old_browsing_artifacts() {
  shopt -s nullglob
  local files=(
    "${PROFILE_RESULTS_DIR}/browsing-flow-"*.jtl
    "${PROFILE_RESULTS_DIR}/browsing-flow-"*-response-time-over-time.csv
    "${PROFILE_RESULTS_DIR}/browsing-flow-"*-response-time-by-endpoint.csv
  )
  local dirs=("${PROFILE_RESULTS_DIR}/browsing-flow-report-"*)
  if ((${#files[@]} > 0)); then
    rm -f "${files[@]}"
  fi
  if ((${#dirs[@]} > 0)); then
    rm -rf "${dirs[@]}"
  fi
  shopt -u nullglob
}

CPU_STOP_FILE=""
CPU_STATE_FILE=""
CPU_SAMPLER_PID=""
CPU_BUSY_SECONDS=""
CPU_TOTAL_SECONDS=""

get_cpu_busy_pct() {
  if [[ "$(uname -s)" == "Darwin" ]]; then
    local line idle
    line="$(top -l 1 | grep -m1 "CPU usage" || true)"
    idle="$(echo "$line" | sed -E 's/.* ([0-9]+(\.[0-9]+)?)% idle.*/\1/' || true)"
    if [[ -n "$idle" ]]; then
      awk -v idle="$idle" 'BEGIN { printf "%.4f", 100 - idle }'
      return 0
    fi
  fi
  return 1
}

start_cpu_sampler() {
  if [[ "$AUTO_CPU_UTILIZATION" != "1" ]]; then
    return
  fi

  CPU_STOP_FILE="$(mktemp "${RESULTS_DIR}/cpu-stop-XXXXXX")"
  CPU_STATE_FILE="$(mktemp "${RESULTS_DIR}/cpu-state-XXXXXX")"
  rm -f "$CPU_STOP_FILE"

  (
    local sum="0"
    local count="0"
    while [[ ! -f "$CPU_STOP_FILE" ]]; do
      local busy
      busy="$(get_cpu_busy_pct || true)"
      if [[ -n "$busy" ]]; then
        sum="$(awk -v a="$sum" -v b="$busy" 'BEGIN { printf "%.6f", a + b }')"
        count=$((count + 1))
      fi
      sleep 1
    done
    printf "%s %s\n" "$sum" "$count" > "$CPU_STATE_FILE"
  ) &
  CPU_SAMPLER_PID="$!"
}

stop_cpu_sampler() {
  if [[ -z "$CPU_SAMPLER_PID" ]]; then
    return
  fi

  touch "$CPU_STOP_FILE" 2>/dev/null || true
  wait "$CPU_SAMPLER_PID" 2>/dev/null || true

  if [[ -f "$CPU_STATE_FILE" ]]; then
    local sum count
    read -r sum count < "$CPU_STATE_FILE"
    if [[ -n "${sum:-}" && -n "${count:-}" && "$count" -gt 0 ]]; then
      CPU_BUSY_SECONDS="$(awk -v s="$sum" 'BEGIN { printf "%.6f", s / 100 }')"
      CPU_TOTAL_SECONDS="$(awk -v c="$count" 'BEGIN { printf "%.6f", c }')"
    fi
  fi

  rm -f "$CPU_STOP_FILE" "$CPU_STATE_FILE" 2>/dev/null || true
}

cleanup() {
  stop_cpu_sampler
}

trap cleanup EXIT

timestamp="$(date +%Y%m%d-%H%M%S)"
JTL_FILE="${PROFILE_RESULTS_DIR}/browsing-flow-${timestamp}.jtl"
REPORT_DIR="${PROFILE_RESULTS_DIR}/browsing-flow-report-${timestamp}"

mkdir -p "${RESULTS_DIR}"
mkdir -p "${PROFILE_RESULTS_DIR}"
prune_old_browsing_artifacts

echo "Running browsing-flow load test (${LOAD_PROFILE})"
echo "Target: ${PROTOCOL}://${HOST}:${PORT}"
echo "Users=${USERS}, RampUp=${RAMP_UP_SECONDS}s, Loops=${LOOPS}, Duration=${DURATION_SECONDS}s"

health_url="${PROTOCOL}://${HOST}:${PORT}/api/v1/product/product-count"
if command -v curl >/dev/null 2>&1; then
  if ! curl --silent --show-error --fail --max-time 3 "$health_url" >/dev/null; then
    echo "Target API is unreachable at ${health_url}"
    echo "Start your backend first (for example: npm run server), then rerun this load test."
    exit 1
  fi
fi

start_cpu_sampler

jmeter -n \
  -t "${PLAN}" \
  -l "${JTL_FILE}" \
  -e -o "${REPORT_DIR}" \
  -Jhost="${HOST}" \
  -Jport="${PORT}" \
  -Jprotocol="${PROTOCOL}" \
  -Jusers="${USERS}" \
  -JrampUpSeconds="${RAMP_UP_SECONDS}" \
  -Jloops="${LOOPS}" \
  -JdurationSeconds="${DURATION_SECONDS}" \
  -JsearchDataFile="${SEARCH_DATA_FILE}" \
  -JcategoryDataFile="${CATEGORY_DATA_FILE}" \
  -JpriceDataFile="${PRICE_DATA_FILE}" \
  -Jjmeter.save.saveservice.output_format=csv \
  -Jjmeter.save.saveservice.print_field_names=true \
  -Jjmeter.save.saveservice.timestamp_format=ms

stop_cpu_sampler

echo "JTL saved to: ${JTL_FILE}"
echo "HTML report: ${REPORT_DIR}/index.html"

if command -v node >/dev/null 2>&1; then
  if [[ -n "$CPU_BUSY_SECONDS" && -n "$CPU_TOTAL_SECONDS" ]]; then
    echo "CPU sample window: busy=${CPU_BUSY_SECONDS}s total=${CPU_TOTAL_SECONDS}s"
    CPU_BUSY_SECONDS="$CPU_BUSY_SECONDS" CPU_TOTAL_SECONDS="$CPU_TOTAL_SECONDS" \
      node "${ROOT_DIR}/tests/nft/load-testing/scripts/analyze-jtl.mjs" "${JTL_FILE}"
  else
    node "${ROOT_DIR}/tests/nft/load-testing/scripts/analyze-jtl.mjs" "${JTL_FILE}"
  fi
else
  echo "Node.js not found; skipping JTL analysis script."
fi
