#!/usr/bin/env bash

# AI Usage Declaration
#
# Tool Used:
# - GPT-5.3-Codex
#
# Prompt:
# - Help me design and refine a single runner that executes all load-test flows with one command.
# - Help me structure shared environment variables and sequential flow execution for reproducible runs.
#
# How the AI Output Was Used:
# - Used the AI output as a reference for the orchestration script 

## Rachel Tai Ke Jia (A0258603A)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../../../.." && pwd)"

HOST="${HOST:-localhost}"
PORT="${PORT:-6060}"
PROTOCOL="${PROTOCOL:-http}"
RAMP_UP_SECONDS="${RAMP_UP_SECONDS:-60}"
LOOPS="${LOOPS:-3}"
DURATION_SECONDS="${DURATION_SECONDS:-900}"
LOAD_PROFILES="${LOAD_PROFILES:-baseline,funnel}"

echo "Running all load tests"
echo ""

IFS=',' read -r -a profile_list <<< "${LOAD_PROFILES}"

for profile in "${profile_list[@]}"; do
	profile="${profile//[[:space:]]/}"
	if [[ -z "${profile}" ]]; then
		continue
	fi

	echo "=== Profile: ${profile} ==="

	echo "[1/5] Running browsing flow load test..."
	echo "------"
	HOST="${HOST}" \
	PORT="${PORT}" \
	PROTOCOL="${PROTOCOL}" \
	LOAD_PROFILE="${profile}" \
	RAMP_UP_SECONDS="${RAMP_UP_SECONDS}" \
	LOOPS="${LOOPS}" \
	DURATION_SECONDS="${DURATION_SECONDS}" \
	bash "${SCRIPT_DIR}/run-browsing-load.sh"

	echo ""
	echo "[2/5] Running search-filter flow load test..."
	echo "------"
	HOST="${HOST}" \
	PORT="${PORT}" \
	PROTOCOL="${PROTOCOL}" \
	LOAD_PROFILE="${profile}" \
	RAMP_UP_SECONDS="${RAMP_UP_SECONDS}" \
	LOOPS="${LOOPS}" \
	DURATION_SECONDS="${DURATION_SECONDS}" \
	bash "${SCRIPT_DIR}/run-search-filter-load.sh"

	echo ""
	echo "[3/5] Running auth flow load test..."
	echo "------"
	HOST="${HOST}" \
	PORT="${PORT}" \
	PROTOCOL="${PROTOCOL}" \
	LOAD_PROFILE="${profile}" \
	RAMP_UP_SECONDS="${RAMP_UP_SECONDS}" \
	LOOPS="${LOOPS}" \
	DURATION_SECONDS="${DURATION_SECONDS}" \
	bash "${SCRIPT_DIR}/run-auth-load.sh"

	echo ""
	echo "[4/5] Running order-checkout flow load test..."
	echo "------"
	HOST="${HOST}" \
	PORT="${PORT}" \
	PROTOCOL="${PROTOCOL}" \
	LOAD_PROFILE="${profile}" \
	RAMP_UP_SECONDS="${RAMP_UP_SECONDS}" \
	LOOPS="${LOOPS}" \
	DURATION_SECONDS="${DURATION_SECONDS}" \
	bash "${SCRIPT_DIR}/run-order-load.sh"

	echo ""
	echo "[5/5] Running product-detail flow load test..."
	echo "------"
	HOST="${HOST}" \
	PORT="${PORT}" \
	PROTOCOL="${PROTOCOL}" \
	LOAD_PROFILE="${profile}" \
	RAMP_UP_SECONDS="${RAMP_UP_SECONDS}" \
	LOOPS="${LOOPS}" \
	DURATION_SECONDS="${DURATION_SECONDS}" \
	bash "${SCRIPT_DIR}/run-product-detail-load.sh"

	echo ""
done

echo "All load tests completed"
echo "Results: tests/nft/load-testing/results/"
echo "Commands:"
echo "  LOAD_PROFILES=baseline bash ${SCRIPT_DIR}/run-all-load.sh"
echo "  LOAD_PROFILES=funnel bash ${SCRIPT_DIR}/run-all-load.sh"
echo "  LOAD_PROFILES=baseline,funnel bash ${SCRIPT_DIR}/run-all-load.sh"
