// Wong Sheen Kerr (A0269647J)
/**
 * AI Usage Declaration
 *
 * Tool Used: GPT-5.4
 *
 * Prompt:
 * - Asked for help drafting and refining the scenario flow for catalog browsing, auth/session, search/filter, and checkout/orders soak tests.
 * - Asked for reference ideas on how to keep the scenario assertions aligned with the repo's seeded test data and existing backend contracts.
 *
 * How the AI Output Was Used:
 * - I wrote the scenarios, verified the target routes, and checked the final request and assertion logic
 * - GPT-5.4 was used as a drafting and refinement assistant for scenario structure like advising me to use the fake nonce path for braintree, assertion wording, and code cleanup.
 */

/**
 * This file contains the shopper workflow iterations used by k6.
 * Each exported function represents one scenario group:
 * - catalog browsing
 * - auth/session
 * - search/filter
 * - checkout/orders
 *
 * Each scenario makes a small set of API calls, records whether that loop
 * worked, and then reports per-scenario metrics.
 */
import http from "k6/http";
import {
	authParams,
	checkedJson,
	jsonParams,
	recordScenarioResult,
	think,
} from "./helpers.js";

function markRequestResult(label, response, predicate, results) {
	const { success, body } = checkedJson(response, label, predicate);
	results.push(success);
	return body;
}

function finishScenario(startTimeMs, results) {
	recordScenarioResult(startTimeMs, results.every(Boolean));
}

// Catalog browsing scenario
// Main browsing flow with repeated product list and product detail requests.
export function catalogBrowsing(data) {
	const startTimeMs = Date.now();
	const results = [];
	const chosenProduct =
		data.products[Math.floor(Math.random() * data.products.length)];

	const listResponse = http.get(`${data.baseUrl}/api/v1/product/get-product`, {
		tags: { name: "catalog-get-product" },
	});
	const listBody = markRequestResult(
		"catalog product list",
		listResponse,
		(payload, response) =>
			response.status === 200 &&
			payload.success === true &&
			Array.isArray(payload.products) &&
			payload.products.length > 0,
		results,
	);

	think();

	const detailResponse = http.get(
		`${data.baseUrl}/api/v1/product/get-product/${chosenProduct.slug}`,
		{ tags: { name: "catalog-get-product-by-slug" } },
	);
	markRequestResult(
		"catalog product detail",
		detailResponse,
		(payload, response) =>
			response.status === 200 &&
			payload.success === true &&
			payload.product?.slug === chosenProduct.slug &&
			payload.product?.name === chosenProduct.name,
		results,
	);

	think();
	finishScenario(startTimeMs, results);

	return listBody;
}

// Auth session scenario
// Repeated login plus a check that the protected route still works.
export function authSession(data) {
	const startTimeMs = Date.now();
	const results = [];

	const loginResponse = http.post(
		`${data.baseUrl}/api/v1/auth/login`,
		JSON.stringify({
			email: data.shopper.email,
			password: "shopperPass123",
		}),
		jsonParams(undefined, { name: "auth-login" }),
	);
	const loginBody = markRequestResult(
		"auth session login",
		loginResponse,
		(payload, response) =>
			response.status === 200 &&
			payload.success === true &&
			!!payload.token &&
			payload.user?.email === data.shopper.email,
		results,
	);

	think();

	// This app expects the plain token in the Authorization header, not
	// "Bearer <token>", so the test follows that rule.
	const userAuthResponse = http.get(
		`${data.baseUrl}/api/v1/auth/user-auth`,
		authParams(loginBody.token, { name: "auth-user-auth" }),
	);
	markRequestResult(
		"auth session protected route",
		userAuthResponse,
		(payload, response) => response.status === 200 && payload.ok === true,
		results,
	);

	think();
	finishScenario(startTimeMs, results);

	return loginBody;
}

// Search and filter scenario
// Product search flow covering keyword search and filter requests.
export function searchAndFilter(data) {
	const startTimeMs = Date.now();
	const results = [];
	const searchTerm = encodeURIComponent(
		data.searchTerms[Math.floor(Math.random() * data.searchTerms.length)],
	);

	const searchResponse = http.get(
		`${data.baseUrl}/api/v1/product/search/${searchTerm}`,
		{ tags: { name: "search-keyword" } },
	);
	markRequestResult(
		"product search",
		searchResponse,
		(payload, response) => response.status === 200 && Array.isArray(payload),
		results,
	);

	think();

	const filterResponse = http.post(
		`${data.baseUrl}/api/v1/product/product-filters`,
		JSON.stringify({
			checked: [data.filterCategoryId],
			radio: data.filterRange,
		}),
		jsonParams(undefined, { name: "search-filter" }),
	);
	markRequestResult(
		"product filters",
		filterResponse,
		(payload, response) =>
			response.status === 200 &&
			payload.success === true &&
			Array.isArray(payload.products),
		results,
	);

	think();
	finishScenario(startTimeMs, results);
}

// Checkout and orders scenario
// Less common shopper flow covering checkout and then order-history loading.
export function checkoutAndOrders(data) {
	const startTimeMs = Date.now();
	const results = [];

	const tokenResponse = http.get(
		`${data.baseUrl}/api/v1/product/braintree/token`,
		authParams(data.token, { name: "checkout-token" }),
	);
	const paymentTokenBody = markRequestResult(
		"braintree token",
		tokenResponse,
		(payload, response) =>
			response.status === 200 &&
			payload.success === true &&
			!!payload.clientToken,
		results,
	);

	think();

	// Use the app's fake payment path so the test does not depend on the real
	// Braintree service during the soak run.
	const checkoutResponse = http.post(
		`${data.baseUrl}/api/v1/product/braintree/payment`,
		JSON.stringify({
			nonce: data.payment.nonce,
			cart: data.checkoutCart,
		}),
		jsonParams(data.token, {
			name: "checkout-payment",
			braintreeToken: paymentTokenBody.clientToken,
		}),
	);
	markRequestResult(
		"checkout payment",
		checkoutResponse,
		(payload, response) =>
			response.status === 200 && payload.ok === true && !!payload.orderId,
		results,
	);

	think();

	const ordersResponse = http.get(
		`${data.baseUrl}/api/v1/auth/orders`,
		authParams(data.token, { name: "orders-list" }),
	);
	markRequestResult(
		"orders list",
		ordersResponse,
		(payload, response) => response.status === 200 && Array.isArray(payload),
		results,
	);

	think();
	finishScenario(startTimeMs, results);
}
