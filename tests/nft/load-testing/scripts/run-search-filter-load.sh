#!/usr/bin/env bash

# AI Usage Declaration
#
# Tool Used:
# - GPT-5.3-Codex
#
# Prompt:
# - Help me design and refine a runner script for the search-and-filter flow load test.
# - Help me structure search/filter data files, thresholds, and reporting for repeatable measurements.
#
# How the AI Output Was Used:
# - Used the AI output as a reference for this search-filter runner script 

## Rachel Tai Ke Jia (A0258603A)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../../../.." && pwd)"
PLAN="${ROOT_DIR}/tests/nft/load-testing/jmeter/search-filter-flow.jmx"
RESULTS_DIR="${ROOT_DIR}/tests/nft/load-testing/results"

HOST="${HOST:-localhost}"
PORT="${PORT:-6060}"
PROTOCOL="${PROTOCOL:-http}"
USERS="${USERS:-100}"
RAMP_UP_SECONDS="${RAMP_UP_SECONDS:-60}"
LOOPS="${LOOPS:-3}"
DURATION_SECONDS="${DURATION_SECONDS:-900}"

SEARCH_DATA_FILE="${SEARCH_DATA_FILE:-${ROOT_DIR}/tests/nft/load-testing/data/search-keywords.csv}"
PRICE_DATA_FILE="${PRICE_DATA_FILE:-${ROOT_DIR}/tests/nft/load-testing/data/price-ranges.csv}"

SEARCH_P95_THRESHOLD_MS="${SEARCH_P95_THRESHOLD_MS:-900}"
FILTER_P95_THRESHOLD_MS="${FILTER_P95_THRESHOLD_MS:-1200}"
OVERALL_P95_THRESHOLD_MS="${OVERALL_P95_THRESHOLD_MS:-1500}"
ERROR_RATE_THRESHOLD_PCT="${ERROR_RATE_THRESHOLD_PCT:-1}"
MIN_THROUGHPUT_REQ_PER_SEC="${MIN_THROUGHPUT_REQ_PER_SEC:-5}"

if ! command -v jmeter >/dev/null 2>&1; then
  echo "JMeter is required but not found in PATH."
  echo "Install Apache JMeter and ensure the 'jmeter' command is available."
  exit 1
fi

prune_old_search_filter_artifacts() {
  shopt -s nullglob
  local files=(
    "${RESULTS_DIR}/search-filter-"*.jtl
    "${RESULTS_DIR}/search-filter-"*-response-time-over-time.csv
    "${RESULTS_DIR}/search-filter-"*-response-time-by-endpoint.csv
  )
  local dirs=("${RESULTS_DIR}/search-filter-report-"*)
  if ((${#files[@]} > 0)); then
    rm -f "${files[@]}"
  fi
  if ((${#dirs[@]} > 0)); then
    rm -rf "${dirs[@]}"
  fi
  shopt -u nullglob
}

run_single_profile() {
  local profile_name="$1"
  local users="$2"
  local ramp_up="$3"
  local loops="$4"
  local duration="$5"

  local timestamp
  timestamp="$(date +%Y%m%d-%H%M%S)"

  local jtl_file="${RESULTS_DIR}/search-filter-${profile_name}-${timestamp}.jtl"
  local report_dir="${RESULTS_DIR}/search-filter-report-${profile_name}-${timestamp}"

  mkdir -p "${RESULTS_DIR}"
  prune_old_search_filter_artifacts

  echo "Running search-filter load test profile: ${profile_name}"
  echo "Target: ${PROTOCOL}://${HOST}:${PORT}"
  echo "Users=${users}, RampUp=${ramp_up}s, Loops=${loops}, Duration=${duration}s"

  jmeter -n \
    -t "${PLAN}" \
    -l "${jtl_file}" \
    -e -o "${report_dir}" \
    -Jhost="${HOST}" \
    -Jport="${PORT}" \
    -Jprotocol="${PROTOCOL}" \
    -Jusers="${users}" \
    -JrampUpSeconds="${ramp_up}" \
    -Jloops="${loops}" \
    -JdurationSeconds="${duration}" \
    -JsearchDataFile="${SEARCH_DATA_FILE}" \
    -JpriceDataFile="${PRICE_DATA_FILE}" \
    -Jjmeter.save.saveservice.output_format=csv \
    -Jjmeter.save.saveservice.print_field_names=true \
    -Jjmeter.save.saveservice.timestamp_format=ms

  echo "JTL saved to: ${jtl_file}"
  echo "HTML report: ${report_dir}/index.html"

  if command -v node >/dev/null 2>&1; then
    SEARCH_P95_THRESHOLD_MS="${SEARCH_P95_THRESHOLD_MS}" \
    FILTER_P95_THRESHOLD_MS="${FILTER_P95_THRESHOLD_MS}" \
    OVERALL_P95_THRESHOLD_MS="${OVERALL_P95_THRESHOLD_MS}" \
    ERROR_RATE_THRESHOLD_PCT="${ERROR_RATE_THRESHOLD_PCT}" \
    MIN_THROUGHPUT_REQ_PER_SEC="${MIN_THROUGHPUT_REQ_PER_SEC}" \
    node "${ROOT_DIR}/tests/nft/load-testing/scripts/analyze-jtl.mjs" "${jtl_file}"
  else
    echo "Node.js not found; skipping JTL analysis script."
  fi
}

run_single_profile "custom" "${USERS}" "${RAMP_UP_SECONDS}" "${LOOPS}" "${DURATION_SECONDS}"
