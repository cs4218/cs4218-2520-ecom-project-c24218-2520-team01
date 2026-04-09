#!/usr/bin/env bash

# AI Usage Declaration
#
# Tool Used:
# - GPT-5.3-Codex
#
# Prompt:
# - Help me design and refine a runner script for the order-checkout flow load test.
# - Help me structure user credential handling, payment nonce configuration, thresholds, and analysis steps.
#
# How the AI Output Was Used:
# - Used the AI output as a reference for this checkout runner script

## Rachel Tai Ke Jia (A0258603A)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../../../.." && pwd)"
PLAN="${ROOT_DIR}/tests/nft/load-testing/jmeter/order-checkout-flow.jmx"
RESULTS_DIR="${ROOT_DIR}/tests/nft/load-testing/results"

HOST="${HOST:-localhost}"
PORT="${PORT:-6060}"
PROTOCOL="${PROTOCOL:-http}"
USERS="${USERS:-100}"
RAMP_UP_SECONDS="${RAMP_UP_SECONDS:-60}"
LOOPS="${LOOPS:-3}"
DURATION_SECONDS="${DURATION_SECONDS:-900}"

# Comma-separated pre-created user pool format: email:password,email:password
# NOTE: Ensure these users exist in your backend before running this test.
# Default user (created by e2e setup): shopper67@example.com / shopperPass123
LOAD_USER_CREDS="${LOAD_USER_CREDS:-shopper67@example.com:shopperPass123}"
PAYMENT_NONCE="${PAYMENT_NONCE:-fake-valid-nonce}"
AUTO_CPU_UTILIZATION="${AUTO_CPU_UTILIZATION:-1}"

ORDER_PLACEMENT_P95_THRESHOLD_MS="${ORDER_PLACEMENT_P95_THRESHOLD_MS:-2500}"
PAYMENT_FLOW_P95_THRESHOLD_MS="${PAYMENT_FLOW_P95_THRESHOLD_MS:-2200}"
CHECKOUT_FLOW_P95_THRESHOLD_MS="${CHECKOUT_FLOW_P95_THRESHOLD_MS:-3000}"
OVERALL_P95_THRESHOLD_MS="${OVERALL_P95_THRESHOLD_MS:-3500}"
ERROR_RATE_THRESHOLD_PCT="${ERROR_RATE_THRESHOLD_PCT:-1}"
MIN_THROUGHPUT_REQ_PER_SEC="${MIN_THROUGHPUT_REQ_PER_SEC:-3}"

if ! command -v jmeter >/dev/null 2>&1; then
  echo "JMeter is required but not found in PATH."
  echo "Install Apache JMeter and ensure the 'jmeter' command is available."
  exit 1
fi

prune_old_order_artifacts() {
  shopt -s nullglob
  local files=(
    "${RESULTS_DIR}/order-checkout-"*.jtl
    "${RESULTS_DIR}/order-checkout-"*-response-time-over-time.csv
    "${RESULTS_DIR}/order-checkout-"*-response-time-by-endpoint.csv
  )
  local dirs=("${RESULTS_DIR}/order-checkout-report-"*)
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

  mkdir -p "${RESULTS_DIR}"
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

run_single_profile() {
  local profile_name="$1"
  local users="$2"
  local ramp_up="$3"
  local loops="$4"
  local duration="$5"

  local timestamp
  timestamp="$(date +%Y%m%d-%H%M%S)"

  local jtl_file="${RESULTS_DIR}/order-checkout-${profile_name}-${timestamp}.jtl"
  local report_dir="${RESULTS_DIR}/order-checkout-report-${profile_name}-${timestamp}"

  mkdir -p "${RESULTS_DIR}"
  prune_old_order_artifacts

  echo "Running order-checkout load test profile: ${profile_name}"
  echo "Target: ${PROTOCOL}://${HOST}:${PORT}"
  echo "Users=${users}, RampUp=${ramp_up}s, Loops=${loops}, Duration=${duration}s"

  local health_url="${PROTOCOL}://${HOST}:${PORT}/api/v1/product/product-list/1"
  if command -v curl >/dev/null 2>&1; then
    if ! curl --silent --show-error --fail --max-time 3 "$health_url" >/dev/null; then
      echo "Target API is unreachable at ${health_url}"
      echo "Start your backend first (for example: npm run server), then rerun this load test."
      echo ""
      echo "IMPORTANT: Before running order-checkout flow, ensure pre-created users exist."
      echo "Default user (created by: npm run test:ui): shopper67@example.com / shopperPass123"
      exit 1
    fi
  fi

  trap cleanup EXIT
  start_cpu_sampler

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
    -JloadUserCreds="${LOAD_USER_CREDS}" \
    -JpaymentNonce="${PAYMENT_NONCE}" \
    -Jjmeter.save.saveservice.output_format=csv \
    -Jjmeter.save.saveservice.print_field_names=true \
    -Jjmeter.save.saveservice.timestamp_format=ms

  stop_cpu_sampler

  echo "JTL saved to: ${jtl_file}"
  echo "HTML report: ${report_dir}/index.html"

  if command -v node >/dev/null 2>&1; then
    if [[ -n "$CPU_BUSY_SECONDS" && -n "$CPU_TOTAL_SECONDS" ]]; then
      echo "CPU sample window: busy=${CPU_BUSY_SECONDS}s total=${CPU_TOTAL_SECONDS}s"
      CPU_BUSY_SECONDS="$CPU_BUSY_SECONDS" \
      CPU_TOTAL_SECONDS="$CPU_TOTAL_SECONDS" \
      ORDER_PLACEMENT_P95_THRESHOLD_MS="$ORDER_PLACEMENT_P95_THRESHOLD_MS" \
      PAYMENT_FLOW_P95_THRESHOLD_MS="$PAYMENT_FLOW_P95_THRESHOLD_MS" \
      CHECKOUT_FLOW_P95_THRESHOLD_MS="$CHECKOUT_FLOW_P95_THRESHOLD_MS" \
      OVERALL_P95_THRESHOLD_MS="$OVERALL_P95_THRESHOLD_MS" \
      ERROR_RATE_THRESHOLD_PCT="$ERROR_RATE_THRESHOLD_PCT" \
      MIN_THROUGHPUT_REQ_PER_SEC="$MIN_THROUGHPUT_REQ_PER_SEC" \
      node "${ROOT_DIR}/tests/nft/load-testing/scripts/analyze-jtl.mjs" "${jtl_file}"
    else
      ORDER_PLACEMENT_P95_THRESHOLD_MS="$ORDER_PLACEMENT_P95_THRESHOLD_MS" \
      PAYMENT_FLOW_P95_THRESHOLD_MS="$PAYMENT_FLOW_P95_THRESHOLD_MS" \
      CHECKOUT_FLOW_P95_THRESHOLD_MS="$CHECKOUT_FLOW_P95_THRESHOLD_MS" \
      OVERALL_P95_THRESHOLD_MS="$OVERALL_P95_THRESHOLD_MS" \
      ERROR_RATE_THRESHOLD_PCT="$ERROR_RATE_THRESHOLD_PCT" \
      MIN_THROUGHPUT_REQ_PER_SEC="$MIN_THROUGHPUT_REQ_PER_SEC" \
      node "${ROOT_DIR}/tests/nft/load-testing/scripts/analyze-jtl.mjs" "${jtl_file}"
    fi
  else
    echo "Node.js not found; skipping JTL analysis script."
  fi
}

run_single_profile "custom" "${USERS}" "${RAMP_UP_SECONDS}" "${LOOPS}" "${DURATION_SECONDS}"
