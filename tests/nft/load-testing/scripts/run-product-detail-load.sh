#!/usr/bin/env bash

# AI Usage Declaration
#
# Tool Used:
# - GPT-5.3-Codex
#
# Prompt:
# - Help me design and refine a runner script for the product-detail flow load test.
# - Help me structure thresholds, output artifacts, and analyzer invocation for product detail performance checks.
#
# How the AI Output Was Used:
# - Used the AI output as a reference for this product-detail runner script 

## Rachel Tai Ke Jia (A0258603A)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../../../.." && pwd)"
PLAN="${ROOT_DIR}/tests/nft/load-testing/jmeter/product-detail-flow.jmx"
RESULTS_DIR="${ROOT_DIR}/tests/nft/load-testing/results"

HOST="${HOST:-localhost}"
PORT="${PORT:-6060}"
PROTOCOL="${PROTOCOL:-http}"
USERS="${USERS:-100}"
RAMP_UP_SECONDS="${RAMP_UP_SECONDS:-60}"
LOOPS="${LOOPS:-3}"
DURATION_SECONDS="${DURATION_SECONDS:-900}"

PRODUCT_DETAIL_P95_THRESHOLD_MS="${PRODUCT_DETAIL_P95_THRESHOLD_MS:-800}"
OVERALL_P95_THRESHOLD_MS="${OVERALL_P95_THRESHOLD_MS:-1500}"
ERROR_RATE_THRESHOLD_PCT="${ERROR_RATE_THRESHOLD_PCT:-1}"
MIN_THROUGHPUT_REQ_PER_SEC="${MIN_THROUGHPUT_REQ_PER_SEC:-8}"

if ! command -v jmeter >/dev/null 2>&1; then
  echo "JMeter is required but not found in PATH."
  echo "Install Apache JMeter and ensure the 'jmeter' command is available."
  exit 1
fi

prune_old_product_detail_artifacts() {
  shopt -s nullglob
  local files=(
    "${RESULTS_DIR}/product-detail-"*.jtl
    "${RESULTS_DIR}/product-detail-"*-response-time-over-time.csv
    "${RESULTS_DIR}/product-detail-"*-response-time-by-endpoint.csv
  )
  local dirs=("${RESULTS_DIR}/product-detail-report-"*)
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

  local jtl_file="${RESULTS_DIR}/product-detail-${profile_name}-${timestamp}.jtl"
  local report_dir="${RESULTS_DIR}/product-detail-report-${profile_name}-${timestamp}"

  mkdir -p "${RESULTS_DIR}"
  prune_old_product_detail_artifacts

  echo "Running product-detail load test profile: ${profile_name}"
  echo "Target: ${PROTOCOL}://${HOST}:${PORT}"
  echo "Users=${users}, RampUp=${ramp_up}s, Loops=${loops}, Duration=${duration}s"

  # Health check before starting test
  if ! curl --silent --fail "${PROTOCOL}://${HOST}:${PORT}/api/v1/product/product-list/1" >/dev/null 2>&1; then
    echo "Error: Product API endpoint unreachable at ${PROTOCOL}://${HOST}:${PORT}"
    echo "Ensure backend server is running and product data is available."
    exit 1
  fi

  # CPU sampling in background (macOS/Linux compatible)
  local cpu_pid
  local cpu_log
  cpu_log=$(mktemp)
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS: use 'top'
    (while true; do
      top -l 1 -u -s 0 | grep -E "^CPU" | awk '{print $3}' | sed 's/%.*//' >> "$cpu_log" 2>/dev/null || true
      sleep 1
    done) &
    cpu_pid=$!
  else
    # Linux: use 'mpstat' or fallback to /proc/stat
    (while true; do
      if command -v mpstat >/dev/null 2>&1; then
        mpstat 1 1 | tail -1 | awk '{print 100 - $NF}' >> "$cpu_log" 2>/dev/null || true
      else
        awk '/^cpu / {print int(100 * (1 - ($5 + $6) / ($2 + $3 + $4 + $5 + $6 + $7 + $8 + $9)))}' /proc/stat >> "$cpu_log" 2>/dev/null || true
      fi
      sleep 1
    done) &
    cpu_pid=$!
  fi

  trap "kill -9 $cpu_pid 2>/dev/null || true; rm -f '$cpu_log'" EXIT

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
    -JdurationSeconds="${duration}"

  # Stop CPU sampling
  kill -9 "$cpu_pid" 2>/dev/null || true

  # Compute average CPU utilization
  local avg_cpu=0
  if [[ -s "$cpu_log" ]]; then
    avg_cpu=$(awk '{sum += $1; count++} END {if (count > 0) printf "%.2f", sum / count; else print 0}' "$cpu_log")
  fi

  echo ""
  echo "Test complete. Results saved to:"
  echo "  JTL: ${jtl_file}"
  echo "  Report: ${report_dir}/index.html"
  echo ""

  # Run analyzer with thresholds
  node "${ROOT_DIR}/tests/nft/load-testing/scripts/analyze-jtl.mjs" \
    "${jtl_file}" \
    "${avg_cpu}" \
    PRODUCT_DETAIL_P95_THRESHOLD_MS="${PRODUCT_DETAIL_P95_THRESHOLD_MS}" \
    OVERALL_P95_THRESHOLD_MS="${OVERALL_P95_THRESHOLD_MS}" \
    ERROR_RATE_THRESHOLD_PCT="${ERROR_RATE_THRESHOLD_PCT}" \
    MIN_THROUGHPUT_REQ_PER_SEC="${MIN_THROUGHPUT_REQ_PER_SEC}"
}

if [[ $# -eq 0 ]]; then
  # Default: single profile mode
  run_single_profile "custom" "${USERS}" "${RAMP_UP_SECONDS}" "${LOOPS}" "${DURATION_SECONDS}"
else
  # Multi-profile mode: $1=profile_name, $2=users, $3=ramp_up, $4=loops, $5=duration
  run_single_profile "$1" "$2" "$3" "$4" "$5"
fi
