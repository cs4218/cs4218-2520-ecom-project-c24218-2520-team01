// Wong Sheen Kerr (A0269647J)
/**
 * This is the main endurance-test entrypoint.
 * It uses the shared test setup and runs all scenario groups together under one k6 soak-test configuration.
 **/
import {
	buildSoakOptions,
	setupTestData,
	summaryWithConfig,
} from "./helpers.js";
import {
	authSession,
	catalogBrowsing,
	checkoutAndOrders,
	searchAndFilter,
} from "./scenarios.js";

// The full soak test uses one total user count and splits it across all scenario groups, which then run at the same time.
export const options = buildSoakOptions();

export function setup() {
	// Prepare the same starting test data before the soak run begins.
	return setupTestData();
}

export { authSession, catalogBrowsing, checkoutAndOrders, searchAndFilter };

export function handleSummary(data) {
	return summaryWithConfig(data, "k6 soak endurance run");
}
