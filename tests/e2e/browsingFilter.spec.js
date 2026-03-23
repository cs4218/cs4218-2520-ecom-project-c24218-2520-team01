import { test, expect } from "./baseTest.js";
import { BACKEND_BASE_URL } from "./e2eConstantsSheen.js";

// Lim Jia Wei, A0277381W

test.describe("Main Browsing and Filtering Flow", () => {

    test.beforeEach(async ({ request }) => {
        const response = await request.post(
            `${BACKEND_BASE_URL}/api/v1/testing/reset-and-prepare-test-data`,
        );
        expect(response.ok()).toBeTruthy();
    });

    test("should filter products by selecting a category checkbox", async ({ page }) => {

        await page.goto("/");
        await expect(page.getByRole("heading", { name: "All Products" })).toBeVisible();
        await expect(page.getByText("Filter By Category")).toBeVisible();
        await page.locator(".ant-checkbox-input").first().click();

        // products area stays visible after filter is applied
        await expect(page.getByRole("heading", { name: "All Products" })).toBeVisible();

        // reset filters
        await page.getByRole("button", { name: "RESET FILTERS" }).click();
        await expect(page.getByRole("heading", { name: "All Products" })).toBeVisible();
    });


});
