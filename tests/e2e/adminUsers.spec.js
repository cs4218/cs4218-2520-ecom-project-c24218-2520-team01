import { test, expect } from "@playwright/test";
import { ADMIN_CREDENTIALS } from "./testCredentials.js";

// Lim Jia Wei, A0277381W

test.describe("Admin User Management Flow", () => {

    test("should display the list of users", async ({ page }) => {

        await page.goto("/");
        await page.getByRole("link", { name: "Login" }).click();
        await page.getByRole("textbox", { name: "Enter Your Email" }).fill(ADMIN_CREDENTIALS.email);
        await page.getByRole("textbox", { name: "Enter Your Password" }).click();
        await page.getByRole("textbox", { name: "Enter Your Password" }).fill(ADMIN_CREDENTIALS.password);
        await page.getByRole("button", { name: "LOGIN" }).click();
        await page.getByRole("button", { name: /E2E Admin|testadmin/i }).click();
        await page.getByRole("link", { name: "Dashboard" }).click();
        await page.getByRole("link", { name: "Users" }).click();

        // Assert
        await expect(page.getByRole("heading", { name: "All Users" })).toBeVisible({ timeout: 10000 });
        await expect(page.getByText("Loading...")).not.toBeVisible({ timeout: 10000 });
        await expect(page.locator(".card").first()).toBeVisible({ timeout: 10000 });
    });
});
