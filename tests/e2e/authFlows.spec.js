/**
 * AI Usage Declaration
 *
 * Tool Used: GPT-5.4
 *
 * Prompt:
 * - Asked for reference ideas on how to structure Playwright tests for registration, recovery, redirects, and validation while keeping the flows deterministic
 *
 * How the AI Output Was Used:
 * - Used a small portion of the suggestions as reference for scenario coverage only.
 * - Used for how to find the html validation pop up and locate it, as I couldn't find it on code gen
 * Wong Sheen Kerr (A0269647J)
 */

import { expect, test } from "@playwright/test";
import {
	BACKEND_BASE_URL,
	TEST_SHOPPER_ANSWER,
	TEST_SHOPPER_EMAIL,
} from "./e2eConstantsSheen.js";

test.describe("Registration Flow Error Handling UI", () => {
	test.beforeEach(async ({ page, request }) => {
		// Reset the backend data before each registration flow test.
		const response = await request.post(
			`${BACKEND_BASE_URL}/api/v1/testing/reset-and-prepare-test-data`,
		);
		expect(response.ok()).toBeTruthy();

		// Open the registration page for the next scenario.
		await page.goto("/register");
	});

	test("should navigate to the register page through the header link", async ({
		page,
	}) => {
		// Navigate from the homepage into the registration flow.
		await page.goto("/");
		await page.getByRole("link", { name: "Register" }).click();
		await page.waitForURL("**/register");

		// Confirm the register form loads after the navigation.
		await expect(
			page.getByRole("heading", { name: "REGISTER FORM" }),
		).toBeVisible();
	});

	test("should display the registration form with all fields", async ({
		page,
	}) => {
		// Confirm the full registration form is visible to the user.
		await expect(
			page.getByRole("heading", { name: "REGISTER FORM" }),
		).toBeVisible();
		await expect(page.locator("#exampleInputName1")).toBeVisible();
		await expect(
			page.getByRole("textbox", { name: "Enter Your Email" }),
		).toBeVisible();
		await expect(
			page.getByRole("textbox", { name: "Enter Your Password" }),
		).toBeVisible();
		await expect(page.locator("#exampleInputPhone1")).toBeVisible();
		await expect(page.locator("#exampleInputaddress1")).toBeVisible();
		await expect(page.locator("#exampleInputDOB1")).toBeVisible();
		await expect(page.locator("#exampleInputanswer1")).toBeVisible();
		await expect(page.getByRole("button", { name: "REGISTER" })).toBeVisible();
	});

	test("should show browser validation when submitting an empty registration form", async ({
		page,
	}) => {
		// Submit the form without entering any values.
		await page.getByRole("button", { name: "REGISTER" }).click();

		// Check that the browser keeps focus on the first required field.
		await expect(page).toHaveURL(/\/register$/);
		await expect(page.locator("#exampleInputName1")).toBeFocused();
		const validationMessage = await page
			.locator("#exampleInputName1")
			.evaluate((element) => {
				return element.validationMessage;
			});
		expect(validationMessage).not.toBe("");
	});
});

test.describe("Password Recovery Flow UI", () => {
	test.beforeEach(async ({ page, request }) => {
		// Reset the backend data before each password recovery flow test.
		const response = await request.post(
			`${BACKEND_BASE_URL}/api/v1/testing/reset-and-prepare-test-data`,
		);
		expect(response.ok()).toBeTruthy();

		// Open the forgot password page for the next scenario.
		await page.goto("/forgot-password");
	});

	test("should display the forgot password form with all fields", async ({
		page,
	}) => {
		// Confirm the full reset password form is visible to the user.
		await expect(
			page.getByRole("heading", { name: "RESET PASSWORD" }),
		).toBeVisible();
		await expect(
			page.getByRole("textbox", { name: "Enter Your Email" }),
		).toBeVisible();
		await expect(
			page.getByRole("textbox", { name: "Enter Your favorite Sport Name" }),
		).toBeVisible();
		await expect(
			page.getByRole("textbox", { name: "Enter Your New Password" }),
		).toBeVisible();
		await expect(page.getByRole("button", { name: "RESET" })).toBeVisible();
	});

	test("should show browser validation when submitting an empty reset form", async ({
		page,
	}) => {
		// Submit the reset form without entering any values.
		await page.getByRole("button", { name: "RESET" }).click();

		// Check that the browser focuses the first required reset field.
		await expect(page).toHaveURL(/\/forgot-password$/);
		await expect(
			page.getByRole("textbox", { name: "Enter Your Email" }),
		).toBeFocused();
		const validationMessage = await page
			.locator("#exampleInputEmail1")
			.evaluate((element) => {
				return element.validationMessage;
			});
		expect(validationMessage).not.toBe("");
	});

	test("should show an error when resetting with the wrong email", async ({
		page,
	}) => {
		// Enter an incorrect email with the correct recovery answer.
		await page
			.getByRole("textbox", { name: "Enter Your Email" })
			.fill("wrong-shopper@example.com");
		await page
			.getByRole("textbox", { name: "Enter Your favorite Sport Name" })
			.fill(TEST_SHOPPER_ANSWER);
		await page
			.getByRole("textbox", { name: "Enter Your New Password" })
			.fill("newPassword123");
		const forgotPasswordResponse = page.waitForResponse((response) => {
			return (
				response.url().includes("/api/v1/auth/forgot-password") &&
				response.request().method() === "POST"
			);
		});
		await page.getByRole("button", { name: "RESET" }).click();
		const response = await forgotPasswordResponse;
		const responseBody = await response.json();

		// Confirm the reset request is rejected and the user remains on the form.
		expect(response.status()).toBe(404);
		expect(responseBody.message).toBe("Wrong email or answer");
		await expect(page).toHaveURL(/\/forgot-password$/);
	});

	test("should show an error when resetting with the wrong security answer", async ({
		page,
	}) => {
		// Enter the correct email with an incorrect recovery answer.
		await page
			.getByRole("textbox", { name: "Enter Your Email" })
			.fill(TEST_SHOPPER_EMAIL);
		await page
			.getByRole("textbox", { name: "Enter Your favorite Sport Name" })
			.fill("wrong-answer");
		await page
			.getByRole("textbox", { name: "Enter Your New Password" })
			.fill("newPassword123");
		const forgotPasswordResponse = page.waitForResponse((response) => {
			return (
				response.url().includes("/api/v1/auth/forgot-password") &&
				response.request().method() === "POST"
			);
		});
		await page.getByRole("button", { name: "RESET" }).click();
		const response = await forgotPasswordResponse;
		const responseBody = await response.json();

		// Confirm the reset request is rejected and the user remains on the form.
		expect(response.status()).toBe(404);
		expect(responseBody.message).toBe("Wrong email or answer");
		await expect(page).toHaveURL(/\/forgot-password$/);
	});

	test("should navigate to forgot password from the login page", async ({
		page,
	}) => {
		// Navigate from the login page into the password recovery flow.
		await page.goto("/login");
		await page.getByRole("button", { name: "Forgot Password" }).click();
		await page.waitForURL("**/forgot-password");

		// Confirm the reset form loads after the navigation.
		await expect(
			page.getByRole("heading", { name: "RESET PASSWORD" }),
		).toBeVisible();
	});

	test("should successfully reset the password and redirect back to login", async ({
		page,
	}) => {
		// Submit a valid password reset for the test shopper account.
		await page
			.getByRole("textbox", { name: "Enter Your Email" })
			.fill(TEST_SHOPPER_EMAIL);
		await page
			.getByRole("textbox", { name: "Enter Your favorite Sport Name" })
			.fill(TEST_SHOPPER_ANSWER);
		await page
			.getByRole("textbox", { name: "Enter Your New Password" })
			.fill("newpassword456");
		await page.getByRole("button", { name: "RESET" }).click();
		await expect(page.getByText("Password reset successfully")).toBeVisible();
		await page.waitForURL("**/login");

		// Confirm the user is sent back to the login page afterward.
		await expect(
			page.getByRole("heading", { name: "LOGIN FORM" }),
		).toBeVisible();
	});

});
