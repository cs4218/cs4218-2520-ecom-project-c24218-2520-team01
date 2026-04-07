#!/usr/bin/env bash
## Rachel Tai Ke Jia (A0258603A)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../../../.." && pwd)"

HOST="${HOST:-localhost}"
PORT="${PORT:-6060}"
PROTOCOL="${PROTOCOL:-http}"
USERS="${USERS:-100}"
RAMP_UP_SECONDS="${RAMP_UP_SECONDS:-60}"
LOOPS="${LOOPS:-3}"
DURATION_SECONDS="${DURATION_SECONDS:-900}"

echo "Running all load tests (load testing profile)"
echo ""

echo "[1/3] Running browsing flow load test..."
echo "------"
HOST="${HOST}" \
PORT="${PORT}" \
PROTOCOL="${PROTOCOL}" \
USERS="${USERS}" \
RAMP_UP_SECONDS="${RAMP_UP_SECONDS}" \
LOOPS="${LOOPS}" \
DURATION_SECONDS="${DURATION_SECONDS}" \
bash "${SCRIPT_DIR}/run-browsing-load.sh"

echo ""
echo "[2/3] Running search-filter flow load test..."
echo "------"
HOST="${HOST}" \
PORT="${PORT}" \
PROTOCOL="${PROTOCOL}" \
USERS="${USERS}" \
RAMP_UP_SECONDS="${RAMP_UP_SECONDS}" \
LOOPS="${LOOPS}" \
DURATION_SECONDS="${DURATION_SECONDS}" \
bash "${SCRIPT_DIR}/run-search-filter-load.sh"

echo ""
echo "[3/3] Running auth flow load test..."
echo "------"
HOST="${HOST}" \
PORT="${PORT}" \
PROTOCOL="${PROTOCOL}" \
USERS="${USERS}" \
RAMP_UP_SECONDS="${RAMP_UP_SECONDS}" \
LOOPS="${LOOPS}" \
DURATION_SECONDS="${DURATION_SECONDS}" \
bash "${SCRIPT_DIR}/run-auth-load.sh"

echo ""
echo "All load tests completed"
echo "Results: tests/nft/load-testing/results/"
