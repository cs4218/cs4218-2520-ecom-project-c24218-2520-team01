#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../../../.." && pwd)"
PLAN="${ROOT_DIR}/tests/nft/load-testing/jmeter/product-browsing-flow.jmx"
RESULTS_DIR="${ROOT_DIR}/tests/nft/load-testing/results"

HOST="${HOST:-localhost}"
PORT="${PORT:-6060}"
PROTOCOL="${PROTOCOL:-http}"
USERS="${USERS:-100}"
RAMP_UP_SECONDS="${RAMP_UP_SECONDS:-60}"
LOOPS="${LOOPS:-3}"
DURATION_SECONDS="${DURATION_SECONDS:-900}"

SEARCH_DATA_FILE="${SEARCH_DATA_FILE:-${ROOT_DIR}/tests/nft/load-testing/data/search-keywords.csv}"
CATEGORY_DATA_FILE="${CATEGORY_DATA_FILE:-${ROOT_DIR}/tests/nft/load-testing/data/category-slugs.csv}"
PRICE_DATA_FILE="${PRICE_DATA_FILE:-${ROOT_DIR}/tests/nft/load-testing/data/price-ranges.csv}"

if ! command -v jmeter >/dev/null 2>&1; then
  echo "JMeter is required but not found in PATH."
  echo "Install Apache JMeter and ensure the 'jmeter' command is available."
  exit 1
fi

timestamp="$(date +%Y%m%d-%H%M%S)"
JTL_FILE="${RESULTS_DIR}/browsing-flow-${timestamp}.jtl"
REPORT_DIR="${RESULTS_DIR}/browsing-flow-report-${timestamp}"

mkdir -p "${RESULTS_DIR}"

echo "Running browsing-flow load test"
echo "Target: ${PROTOCOL}://${HOST}:${PORT}"
echo "Users=${USERS}, RampUp=${RAMP_UP_SECONDS}s, Loops=${LOOPS}, Duration=${DURATION_SECONDS}s"

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

echo "JTL saved to: ${JTL_FILE}"
echo "HTML report: ${REPORT_DIR}/index.html"

if command -v node >/dev/null 2>&1; then
  node "${ROOT_DIR}/tests/nft/load-testing/scripts/analyze-jtl.mjs" "${JTL_FILE}"
else
  echo "Node.js not found; skipping JTL analysis script."
fi
