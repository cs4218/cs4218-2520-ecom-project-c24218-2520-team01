/**
 * AI Usage Declaration
 *
 * Tool Used: GPT-5.4
 *
 * Prompt:
 * - Asked for reference ideas on how to write Playwright tests for search, category filters, price filters, and reset behavior without depending on unstable live database contents.
 *
 * How the AI Output Was Used:
 * - Used the suggestions on adding the test id on specific UI components like product for easier locating during testing.
 * - Used a portion of the suggestions as reference for general test structure only.
 * Wong Sheen Kerr (A0269647J)
 */

import { expect, test } from "@playwright/test";
import { BACKEND_BASE_URL } from "./e2eConstantsSheen.js";

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
		// Open the homepage and wait for the product grid to load.
		await page.goto("/");
		await expect(page.getByTestId("product-grid")).toBeVisible();

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
		// Open the homepage and wait for the product grid to load.
		await page.goto("/");
		await expect(page.getByTestId("product-grid")).toBeVisible();

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

		// Open the homepage and wait for the product grid to load.
		await page.goto("/");
		await expect(
			page
				.getByTestId("product-grid")
				.locator('[data-testid^="product-card-"]'),
		).toHaveCount(4);
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
		await page.getByRole("checkbox", { name: "Mac Computers" }).check();

		// Confirm only the Mac products remain visible in the grid.
		await expect(
			page
				.getByTestId("product-grid")
				.locator('[data-testid^="product-card-"]'),
		).toHaveCount(3);
		await expect(page.getByTestId("product-card-macbook-pro-m5")).toBeVisible();
		await expect(
			page.getByTestId("product-card-mac-studio-m5-ultra"),
		).toBeVisible();
		await expect(page.getByTestId("product-card-mac-studio-xdr")).toBeVisible();
	});

	test("should filter products when a price range is selected", async ({
		page,
	}) => {
		// Apply the $40 to $59 price filter on the homepage.
		await page.getByText("$40 to 59").click();

		// Confirm only the matching iPhone product remains visible.
		await expect(
			page
				.getByTestId("product-grid")
				.locator('[data-testid^="product-card-"]'),
		).toHaveCount(1);
		await expect(page.getByTestId("product-card-iphone-67")).toBeVisible();
	});

	test("should reset filters and restore the original homepage product list", async ({
		page,
	}) => {
		// Apply a category filter first so there is filtered state to clear.
		await page.getByRole("checkbox", { name: "Mac Computers" }).check();
		await expect(
			page
				.getByTestId("product-grid")
				.locator('[data-testid^="product-card-"]'),
		).toHaveCount(3);

		// Reset the homepage filters back to the default state.
		await page.getByRole("button", { name: "RESET FILTERS" }).click();

		// Confirm the full original product set is visible again.
		await expect(
			page
				.getByTestId("product-grid")
				.locator('[data-testid^="product-card-"]'),
		).toHaveCount(4);
		await expect(page.getByTestId("product-card-macbook-pro-m5")).toBeVisible();
		await expect(
			page.getByTestId("product-card-mac-studio-m5-ultra"),
		).toBeVisible();
		await expect(page.getByTestId("product-card-mac-studio-xdr")).toBeVisible();
		await expect(page.getByTestId("product-card-iphone-67")).toBeVisible();
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
