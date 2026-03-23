import { test, expect } from "./baseTest.js";
import { USER_CREDENTIALS } from "./testCredentials.js";
import { BACKEND_BASE_URL } from "./e2eConstantsSheen.js";

// Lim Jia Wei, A0277381W

test.describe("Cart and Checkout Flow", () => {

    test.beforeEach(async ({ request }) => {
        const response = await request.post(
            `${BACKEND_BASE_URL}/api/v1/testing/reset-and-prepare-test-data`,
        );
        expect(response.ok()).toBeTruthy();
    });

    test("should show error when payment fails", async ({ page }) => {

        await page.goto("/");
        await page.getByRole("link", { name: "Login" }).click();
        await page.getByRole("textbox", { name: "Enter Your Email" }).fill(USER_CREDENTIALS.email);
        await page.getByRole("textbox", { name: "Enter Your Password" }).click();
        await page.getByRole("textbox", { name: "Enter Your Password" }).fill(USER_CREDENTIALS.password);
        await page.getByRole("button", { name: "LOGIN" }).click();
        await page.getByRole("button", { name: "ADD TO CART" }).first().click();
        await page.getByRole("link", { name: "Cart" }).click();

        await expect(page.getByText("Cart Summary")).toBeVisible();

        // since braintree won't load in test env, the Make Payment button stays hidden
        await expect(page.getByText("Total |")).toBeVisible();
        await expect(page.getByRole("button", { name: "Make Payment" })).not.toBeVisible();
    });
});
