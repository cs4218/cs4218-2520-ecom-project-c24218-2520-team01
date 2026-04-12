// Wong Sheen Kerr (A0269647J)
/**
 * AI Usage Declaration
 *
 * Tool Used: GPT-5.4
 *
 * Prompt:
 * - Asked for help drafting and refining the structure of the soak/endurance test suite, including shared helpers, scenario allocation & runner flow.
 *
 * How the AI Output Was Used:
 * - Used AI advice on how to structure the fixed soak profile, including think-time behavior and how to make the test manually stoppable.
 * - Output was used as a reference to draft on the code structure.
 */

/**
 * This file contains the shared building blocks for the soak suite.
 * It is responsible for:
 * - preparing repeatable test data in k6 `setup()`
 * - logging in the test shopper and returning reusable data
 * - defining how the total virtual users are split across the scenarios
 * - recording shared scenario-level metrics and summary output
 */
import http from "k6/http";
import { check, fail, sleep } from "k6";
import exec from "k6/execution";
import { Counter, Rate, Trend } from "k6/metrics";

const DEFAULT_BASE_URL = "http://localhost:6060";
const DEFAULT_VC_TOTAL = 100;
// A very long duration used when the run is meant to continue until Ctrl+C.
const DEFAULT_CONTINUOUS_DURATION = "365d";
// Basic pause between actions so the test behaves more like real users.
const DEFAULT_THINK_TIME_SECONDS = 1;
// Small random change so each loop is not exactly the same.
const DEFAULT_THINK_TIME_JITTER_SECONDS = 0.5;

// All four shopper flows run at the same time, and these weights decide what percentage of the total user count goes to each one.
const SCENARIO_WEIGHTS = {
	catalogBrowsing: 0.4,
	authSession: 0.2,
	searchAndFilter: 0.25,
	checkoutAndOrders: 0.15,
};
const SCENARIO_NAMES = Object.keys(SCENARIO_WEIGHTS);

export const scenarioIterationDuration = new Trend(
	"scenario_iteration_duration_ms",
	true,
);
export const scenarioIterationSuccess = new Rate("scenario_iteration_success");
export const scenarioIterationFailures = new Counter(
	"scenario_iteration_failures",
);

function buildUrl(path) {
	return `${DEFAULT_BASE_URL.replace(/\/$/, "")}${path}`;
}

export function jsonParams(token, tags = {}) {
	const headers = {
		"Content-Type": "application/json",
	};

	if (token) {
		headers.Authorization = token;
	}

	return {
		headers,
		tags,
	};
}

export function authParams(token, tags = {}) {
	const headers = {};

	if (token) {
		headers.Authorization = token;
	}

	return {
		headers,
		tags,
	};
}

export function think(multiplier = 1) {
	const duration =
		DEFAULT_THINK_TIME_SECONDS * multiplier +
		Math.random() * DEFAULT_THINK_TIME_JITTER_SECONDS;
	sleep(Math.max(0, duration));
}

function parseJson(response, label) {
	try {
		return response.json();
	} catch (error) {
		fail(`${label} did not return valid JSON. Status: ${response.status}`);
	}
}

export function checkedJson(response, label, predicate) {
	const body = parseJson(response, label);
	const success = check(response, {
		[`${label} returned expected response`]: () => predicate(body, response),
	});

	return { body, success };
}

function loginShopper(email, password) {
	const response = http.post(
		buildUrl("/api/v1/auth/login"),
		JSON.stringify({ email, password }),
		jsonParams(undefined, { name: "auth-login" }),
	);

	const { body, success } = checkedJson(
		response,
		"shopper login",
		(payload, res) =>
			res.status === 200 && payload.success === true && !!payload.token,
	);

	if (!success) {
		fail(`Unable to log in the seeded shopper. Status: ${response.status}`);
	}

	return body.token;
}

function normalizeSearchTerms(fixtures) {
	const productTerms = fixtures.products.flatMap((product) => {
		const nameParts = product.name.split(/\s+/).slice(0, 2);
		return [product.name, ...nameParts];
	});
	const categoryTerms = fixtures.categories.map(
		(category) => category.name.split(/\s+/)[0],
	);
	const uniqueTerms = new Set([...productTerms, ...categoryTerms]);

	return [...uniqueTerms].filter(Boolean);
}

function buildCheckoutCart(products) {
	return products.slice(0, 2).map((product) => ({
		_id: product._id,
		name: product.name,
		price: product.price,
	}));
}

export function setupTestData() {
	// Call the app's reset route so each run starts with the same shopper, products, categories, and fake payment setup.
	const resetResponse = http.post(
		buildUrl("/api/v1/testing/reset-and-prepare-test-data"),
		null,
		{ tags: { name: "testing-reset" } },
	);

	const { body, success } = checkedJson(
		resetResponse,
		"reset and prepare test data",
		(payload, res) =>
			res.status === 200 &&
			payload.success === true &&
			payload.fixtures &&
			Array.isArray(payload.fixtures.products) &&
			payload.fixtures.products.length > 0 &&
			Array.isArray(payload.fixtures.categories) &&
			payload.fixtures.categories.length > 0 &&
			payload.fixtures.users?.shopper,
	);

	if (!success) {
		fail(
			`Failed to prepare seeded data. Make sure the backend is running with NODE_ENV=test at ${DEFAULT_BASE_URL}.`,
		);
	}

	const token = loginShopper(
		body.fixtures.users.shopper.email,
		"shopperPass123",
	);

	// Return one shared data object so every scenario uses the same test data during this run.
	return {
		baseUrl: DEFAULT_BASE_URL,
		token,
		shopper: body.fixtures.users.shopper,
		categories: body.fixtures.categories,
		products: body.fixtures.products,
		payment: body.fixtures.payment,
		searchTerms: normalizeSearchTerms(body.fixtures),
		filterCategoryId: body.fixtures.categories[0]._id,
		filterRange: [0, 3000],
		checkoutCart: buildCheckoutCart(body.fixtures.products),
	};
}

export function recordScenarioResult(startTimeMs, success) {
	const scenario = exec.scenario.name || "unknown";
	scenarioIterationDuration.add(Date.now() - startTimeMs, { scenario });
	scenarioIterationSuccess.add(success, { scenario });

	if (!success) {
		scenarioIterationFailures.add(1, { scenario });
	}
}

function allocateWeightedVus(totalVus) {
	const allocation = {};
	const remainders = [];
	let assigned = 0;

	for (const scenarioName of SCENARIO_NAMES) {
		const weightedValue = totalVus * SCENARIO_WEIGHTS[scenarioName];
		const wholeValue = Math.floor(weightedValue);
		allocation[scenarioName] = wholeValue;
		remainders.push({
			scenarioName,
			remainder: weightedValue - wholeValue,
		});
		assigned += wholeValue;
	}

	let remaining = Math.max(0, totalVus - assigned);
	remainders.sort((left, right) => right.remainder - left.remainder);

	for (const { scenarioName } of remainders) {
		if (remaining <= 0) {
			break;
		}

		allocation[scenarioName] += 1;
		remaining -= 1;
	}

	// If the total user count is not too small, keep every scenario active so the run still covers the full shopper journey.
	for (const scenarioName of SCENARIO_NAMES) {
		if (allocation[scenarioName] === 0 && totalVus >= SCENARIO_NAMES.length) {
			allocation[scenarioName] = 1;
		}
	}

	return allocation;
}

function createContinuousScenario(execName, targetVus) {
	return {
		exec: execName,
		executor: "constant-vus",
		vus: targetVus,
		duration: DEFAULT_CONTINUOUS_DURATION,
		tags: { scenario: execName },
	};
}

export function buildSoakOptions() {
	const totalVus = Math.max(1, Math.floor(DEFAULT_VC_TOTAL));
	const allocation = allocateWeightedVus(totalVus);

	return {
		scenarios: {
			// Each scenario keeps the same number of virtual users until the run is stopped with Ctrl+C.
			catalogBrowsing: createContinuousScenario(
				"catalogBrowsing",
				allocation.catalogBrowsing,
			),
			authSession: createContinuousScenario(
				"authSession",
				allocation.authSession,
			),
			searchAndFilter: createContinuousScenario(
				"searchAndFilter",
				allocation.searchAndFilter,
			),
			checkoutAndOrders: createContinuousScenario(
				"checkoutAndOrders",
				allocation.checkoutAndOrders,
			),
		},
		thresholds: {
			http_req_failed: ["rate<0.01"],
			http_req_duration: ["p(95)<1000"],
			"http_req_duration{scenario:checkoutAndOrders}": ["p(95)<1500"],
			scenario_iteration_success: ["rate>0.99"],
		},
	};
}

export function summaryWithConfig(data, label) {
	const totalVus = Math.max(1, Math.floor(DEFAULT_VC_TOTAL));
	const lines = [
		`${label} completed.`,
		`Base URL: ${DEFAULT_BASE_URL}`,
		`VC_TOTAL: ${totalVus}`,
		`Run style: manual stop (duration ${DEFAULT_CONTINUOUS_DURATION})`,
		"Duration: runs until Ctrl+C",
		"Stop: manual with Ctrl+C",
		`HTTP failure rate: ${data.metrics.http_req_failed?.values?.rate ?? "n/a"}`,
		`HTTP p95 duration: ${data.metrics.http_req_duration?.values?.["p(95)"] ?? "n/a"}`,
	];

	return {
		stdout: `${lines.join("\n")}\n`,
	};
}
