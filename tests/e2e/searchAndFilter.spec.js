/**
 * AI Usage Declaration
 *
 * Tool Used: GPT-5.4
 *
 * Prompt:
 * - Asked for reference ideas on how to write Playwright tests for search, category filters, price filters, and reset behavior without depending on unstable live database contents.
 *
 * How the AI Output Was Used:
 * - Used the suggestions on keeping the scenarios deterministic while still using visible UI behavior for assertions.
 * - Used a portion of the suggestions as reference for general test structure only.
 * Wong Sheen Kerr (A0269647J)
 */

import { expect, test } from "@playwright/test";
import { BACKEND_BASE_URL } from "./e2eConstantsSheen.js";

const HOMEPAGE_PRODUCT_NAMES = [
	"MacBook Pro M5",
	"Mac Studio M5 Ultra",
	"Mac Studio XDR",
	"iPhone 67",
];

async function expectHomepageProducts(page) {
	await expect(page.getByRole("heading", { name: "All Products" })).toBeVisible();
	for (const productName of HOMEPAGE_PRODUCT_NAMES) {
		await expect(
			page.getByRole("heading", { name: productName, exact: true }),
		).toBeVisible();
	}
	await expect(page.getByRole("button", { name: "ADD TO CART" })).toHaveCount(4);
	await expect(page.getByRole("button", { name: "More Details" })).toHaveCount(4);
}

async function waitForFilterResponse(page, action) {
	const [response] = await Promise.all([
		page.waitForResponse((result) => {
			return (
				result.url().includes("/api/v1/product/product-filters") &&
				result.request().method() === "POST"
			);
		}),
		action(),
	]);

	expect(response.ok()).toBeTruthy();
}

async function waitForHomepageReload(page, action) {
	const [response] = await Promise.all([
		page.waitForResponse((result) => {
			return (
				result.url().includes("/api/v1/product/product-list/1") &&
				result.request().method() === "GET"
			);
		}),
		action(),
	]);

	expect(response.ok()).toBeTruthy();
}

test.describe("Search Flow Edge Cases", () => {
	test.beforeEach(async ({ request }) => {
		// Reset the backend data before each search flow scenario.
		const response = await request.post(
			`${BACKEND_BASE_URL}/api/v1/testing/reset-and-prepare-test-data`,
		);
		expect(response.ok()).toBeTruthy();
	});

	test("should display 'No Products Found' for a nonexistent search query", async ({
		page,
	}) => {
		// Open the homepage and wait for the product list to load.
		await page.goto("/");
		await expectHomepageProducts(page);

		// Submit a search query that should not match any product.
		await page
			.getByRole("searchbox", { name: "Search" })
			.fill("nonexistent-product-xyz-12345");
		await page.getByRole("button", { name: "Search" }).click();
		await page.waitForURL("**/search");

		// Confirm the search results page shows an empty-state message.
		await expect(
			page.getByRole("heading", { name: "Search Results" }),
		).toBeVisible();
		await expect(page.getByText("No Products Found")).toBeVisible();
		await expect(page.getByText("MacBook Pro M5")).not.toBeVisible();
	});

	test("should display results when searching for an existing product", async ({
		page,
	}) => {
		// Open the homepage and wait for the product list to load.
		await page.goto("/");
		await expectHomepageProducts(page);

		// Submit a search query that should match the MacBook product.
		await page.getByRole("searchbox", { name: "Search" }).fill("MacBook");
		await page.getByRole("button", { name: "Search" }).click();
		await page.waitForURL("**/search");

		// Confirm the search results page shows the matching product.
		await expect(page.getByText("Found 1")).toBeVisible();
		await expect(page.getByText("MacBook Pro M5")).toBeVisible();
	});
});

test.describe("Main Browsing & Filtering", () => {
	test.beforeEach(async ({ page, request }) => {
		// Reset the backend data before each homepage filtering scenario.
		const response = await request.post(
			`${BACKEND_BASE_URL}/api/v1/testing/reset-and-prepare-test-data`,
		);
		expect(response.ok()).toBeTruthy();

		// Open the homepage and wait for the product list to load.
		await page.goto("/");
		await expectHomepageProducts(page);
	});

	test("should display filter sections on the homepage", async ({ page }) => {
		// Confirm the homepage shows the category and price filter controls.
		await expect(
			page.getByRole("heading", { name: "Filter By Category" }),
		).toBeVisible();
		await expect(
			page.getByRole("heading", { name: "Filter By Price" }),
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: "RESET FILTERS" }),
		).toBeVisible();
	});

	test("should filter products when a category checkbox is selected", async ({
		page,
	}) => {
		// Apply the Mac Computers category filter on the homepage.
		await waitForFilterResponse(page, async () => {
			await page.getByRole("checkbox", { name: "Mac Computers" }).check();
		});

		// Confirm only the Mac products remain visible in the list.
		await expect(
			page.getByRole("heading", { name: "MacBook Pro M5", exact: true }),
		).toBeVisible();
		await expect(
			page.getByRole("heading", { name: "Mac Studio M5 Ultra", exact: true }),
		).toBeVisible();
		await expect(
			page.getByRole("heading", { name: "Mac Studio XDR", exact: true }),
		).toBeVisible();
		await expect(
			page.getByRole("heading", { name: "iPhone 67", exact: true }),
		).not.toBeVisible();
		await expect(page.getByRole("button", { name: "ADD TO CART" })).toHaveCount(3);
		await expect(page.getByRole("button", { name: "More Details" })).toHaveCount(3);
	});

	test("should filter products when a price range is selected", async ({
		page,
	}) => {
		// Apply the $40 to $59 price filter on the homepage.
		await waitForFilterResponse(page, async () => {
			await page.getByRole("radio", { name: "$40 to 59" }).check();
		});

		// Confirm only the matching iPhone product remains visible.
		await expect(
			page.getByRole("heading", { name: "iPhone 67", exact: true }),
		).toBeVisible();
		await expect(
			page.getByRole("heading", { name: "MacBook Pro M5", exact: true }),
		).not.toBeVisible();
		await expect(
			page.getByRole("heading", { name: "Mac Studio M5 Ultra", exact: true }),
		).not.toBeVisible();
		await expect(
			page.getByRole("heading", { name: "Mac Studio XDR", exact: true }),
		).not.toBeVisible();
		await expect(page.getByRole("button", { name: "ADD TO CART" })).toHaveCount(1);
		await expect(page.getByRole("button", { name: "More Details" })).toHaveCount(1);
	});

	test("should reset filters and restore the original homepage product list", async ({
		page,
	}) => {
		// Apply a category filter first so there is filtered state to clear.
		await waitForFilterResponse(page, async () => {
			await page.getByRole("checkbox", { name: "Mac Computers" }).check();
		});
		await expect(page.getByRole("button", { name: "ADD TO CART" })).toHaveCount(3);
		await expect(page.getByRole("button", { name: "More Details" })).toHaveCount(3);

		// Reset the homepage filters back to the default state.
		await waitForHomepageReload(page, async () => {
			await page.getByRole("button", { name: "RESET FILTERS" }).click();
		});

		// Confirm the full original product set is visible again.
		await expectHomepageProducts(page);
	});

	test("should display the All Products heading on the homepage", async ({
		page,
	}) => {
		// Confirm the homepage shows the main product listing heading.
		await expect(
			page.getByRole("heading", { name: "All Products" }),
		).toBeVisible();
	});
});
