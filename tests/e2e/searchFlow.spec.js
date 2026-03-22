import { test, expect } from "@playwright/test";

// Lim Jia Wei, A0277381W

test.describe("Search Flow", () => {

    test("should search for a product and see matching results", async ({ page }) => {

        await page.goto("/");
        await expect(page.getByRole("heading", { name: "All Products" })).toBeVisible();

        // get the first product's name to use for searching
        const firstCard = page.locator(".card-title").first();
        await firstCard.waitFor({ state: "visible" });
        const searchTerm = await firstCard.textContent();

        await page.getByPlaceholder("Search").fill(searchTerm);
        await page.getByRole("button", { name: "Search" }).click();

        // Assert
        await page.waitForURL("**/search", { timeout: 10000 });
        await expect(page.getByRole("heading", { name: "Search Results" })).toBeVisible();
        await expect(page.getByText(/Found \d+/)).toBeVisible();
        await expect(page.getByText(searchTerm).first()).toBeVisible();
    });
});
