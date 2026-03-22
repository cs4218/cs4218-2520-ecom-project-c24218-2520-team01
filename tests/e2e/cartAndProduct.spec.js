/**
 * AI Usage Declaration
 *
 * Tool Used: GPT-5.4
 *
 * Prompt:
 * - Asked for reference ideas on how to structure Playwright tests for cart, product-detail, and checkout while keeping the flows deterministic
 *
 * How the AI Output Was Used:
 * - Used a portion of the suggestions as reference for overall flow grouping only.
 * - Used a portion of the suggestions as reference for stable blackbox coverage of repeated homepage actions
 * Wong Sheen Kerr (A0269647J)
 */

import { expect, test } from "@playwright/test";
import {
	BACKEND_BASE_URL,
	TEST_CARD_CVV,
	TEST_CARD_EXPIRY,
	TEST_CARD_NUMBER,
	TEST_SHOPPER_EMAIL,
	TEST_SHOPPER_NAME,
	TEST_SHOPPER_PASSWORD,
} from "./e2eConstantsSheen.js";

const HOMEPAGE_PRODUCT_NAMES = [
	"MacBook Pro M5",
	"Mac Studio M5 Ultra",
	"Mac Studio XDR",
	"iPhone 67",
];

function homepageProductCard(page, productName) {
	return page.locator(".card", {
		has: page.getByRole("heading", { name: productName, exact: true }),
	});
}

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

async function openCart(page) {
	await page.getByRole("link", { name: "Cart" }).click();
	await expect(page.locator(".cart-page")).toBeVisible();
}

test.describe("Shopping Cart & Checkout Flow", () => {
	test.beforeEach(async ({ request, page }) => {
		// Reset the backend data before each cart and checkout scenario.
		const response = await request.post(
			`${BACKEND_BASE_URL}/api/v1/testing/reset-and-prepare-test-data`,
		);
		expect(response.ok()).toBeTruthy();

		// Open the homepage and wait for the product grid to load.
		await page.goto("/");
		await expectHomepageProducts(page);
	});

	test("should add a product to cart from the homepage and see it in the cart page", async ({
		page,
	}) => {
		// Add a homepage product to the cart.
		await homepageProductCard(page, "MacBook Pro M5")
			.getByRole("button", { name: "ADD TO CART" })
			.click();

		// Navigate into the cart page to inspect its contents.
		await openCart(page);
		await expect(page.getByText("You Have 1 items in your cart")).toBeVisible();
		await expect(page.locator(".cart-page")).toContainText("MacBook Pro M5");
		await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(1);
	});

	test("should add multiple products to cart and reflect the updated cart count", async ({
		page,
	}) => {
		// Add two different products from the homepage.
		await homepageProductCard(page, "MacBook Pro M5")
			.getByRole("button", { name: "ADD TO CART" })
			.click();
		await homepageProductCard(page, "iPhone 67")
			.getByRole("button", { name: "ADD TO CART" })
			.click();

		// Navigate into the cart page to verify both items appear.
		await openCart(page);
		await expect(page.getByText("You Have 2 items in your cart")).toBeVisible();
		await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(2);
		await expect(page.locator(".cart-page")).toContainText("MacBook Pro M5");
		await expect(page.locator(".cart-page")).toContainText("iPhone 67");
	});

	test("should remove a product from the cart", async ({ page }) => {
		// Add a product first so the cart has something to remove.
		await homepageProductCard(page, "MacBook Pro M5")
			.getByRole("button", { name: "ADD TO CART" })
			.click();

		// Navigate into the cart page and remove the only item.
		await openCart(page);
		await page.getByRole("button", { name: "Remove" }).first().click();

		// Confirm the cart returns to an empty state.
		await expect(page.getByText("Your Cart Is Empty")).toBeVisible();
		await expect(page.locator(".cart-page")).not.toContainText(
			"MacBook Pro M5",
		);
	});

	test("should show the empty cart message for a guest user", async ({
		page,
	}) => {
		// Navigate directly to the cart without logging in or adding items.
		await page.goto("/cart");

		// Confirm the guest user sees the empty cart state.
		await expect(page.getByText("Hello Guest")).toBeVisible();
		await expect(page.getByText("Your Cart Is Empty")).toBeVisible();
	});

	test("should allow an authenticated user to complete checkout", async ({
		page,
	}) => {
		// Log in as the existing test shopper account.
		await page.goto("/login");
		await page
			.getByRole("textbox", { name: "Enter Your Email" })
			.fill(TEST_SHOPPER_EMAIL);
		await page
			.getByRole("textbox", { name: "Enter Your Password" })
			.fill(TEST_SHOPPER_PASSWORD);
		await page.getByRole("button", { name: "LOGIN" }).click();
		await expect(page.getByText(TEST_SHOPPER_NAME)).toBeVisible();
		await page.waitForURL("**/");

		// Add a product and move into the checkout flow.
		await expectHomepageProducts(page);
		await homepageProductCard(page, "MacBook Pro M5")
			.getByRole("button", { name: "ADD TO CART" })
			.click();

		// Navigate into the cart and open the test card payment form.
		await openCart(page);
		await expect(page.getByText("You Have 1 items in your cart")).toBeVisible();
		await page.getByRole("button", { name: "Paying with Card" }).click();

		// Fill in the E2E card details before making payment.
		await page
			.getByRole("textbox", { name: "Credit Card Number" })
			.fill(TEST_CARD_NUMBER);
		await page
			.getByRole("textbox", { name: "Expiration Date" })
			.fill(TEST_CARD_EXPIRY);
		await page.getByRole("textbox", { name: "CVV" }).fill(TEST_CARD_CVV);

		// Submit the payment after the card form is completed.
		await expect(
			page.getByRole("button", { name: "Make Payment" }),
		).toBeVisible();
		await page.getByRole("button", { name: "Make Payment" }).click();

		// Confirm the checkout finishes and redirects to orders.
		await expect(
			page.getByText("Payment Completed Successfully"),
		).toBeVisible();
		await page.waitForURL("**/dashboard/user/orders");
		await expect(page.getByText("MacBook Pro M5")).toBeVisible();
		await expect(page.getByText("The best laptop ever made!")).toBeVisible();
	});
});

test.describe("Product Viewing Flow", () => {
	test.beforeEach(async ({ request, page }) => {
		// Reset the backend data before each product viewing scenario.
		const response = await request.post(
			`${BACKEND_BASE_URL}/api/v1/testing/reset-and-prepare-test-data`,
		);
		expect(response.ok()).toBeTruthy();

		// Open the homepage and wait for the product grid to load.
		await page.goto("/");
		await expectHomepageProducts(page);
	});

	test("should navigate to the product details page when clicking More Details", async ({
		page,
	}) => {
		// Navigate from the homepage into the chosen product details page.
		await homepageProductCard(page, "MacBook Pro M5")
			.getByRole("button", { name: "More Details" })
			.click();
		await page.waitForURL("**/product/**");

		// Confirm the details page renders the expected product information.
		await expect(page.locator(".product-details")).toBeVisible();
		await expect(page.locator(".product-details-info")).toContainText(
			"MacBook Pro M5",
		);
		await expect(page.locator(".product-details-info")).toContainText("Name:");
		await expect(page.locator(".product-details-info")).toContainText(
			"Description:",
		);
		await expect(page.locator(".product-details-info")).toContainText("Price:");
	});

	test("should add a product to cart from the product details page", async ({
		page,
	}) => {
		// Navigate from the homepage into the chosen product details page.
		await homepageProductCard(page, "MacBook Pro M5")
			.getByRole("button", { name: "More Details" })
			.click();
		await page.waitForURL("**/product/**");

		// Add the product to the cart from inside the details page.
		await expect(page.locator(".product-details")).toBeVisible();
		await page
			.locator(".product-details-info")
			.getByRole("button", { name: "ADD TO CART" })
			.click();

		// Navigate into the cart to verify the added product appears.
		await openCart(page);
		await expect(page.getByText("You Have 1 items in your cart")).toBeVisible();
		await expect(page.locator(".cart-page")).toContainText("MacBook Pro M5");
	});

	test("should display the similar products section on the product details page", async ({
		page,
	}) => {
		// Navigate from the homepage into the chosen product details page.
		await homepageProductCard(page, "MacBook Pro M5")
			.getByRole("button", { name: "More Details" })
			.click();
		await page.waitForURL("**/product/**");

		// Confirm the similar products section shows related items.
		await expect(page.locator(".product-details")).toBeVisible();
		await expect(
			page.getByRole("heading", { name: "Similar Products" }),
		).toBeVisible();
		await expect(page.getByText("Mac Studio M5 Ultra")).toBeVisible();
	});
});
