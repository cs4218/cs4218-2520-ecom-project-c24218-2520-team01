import { test } from "@playwright/test";

const { describe, expect } = test;

describe("Auth flow", () => {
    test("ensure user cannot access admin panel", async ({ page }) => {
        await page.goto("/");
        await page.getByRole("link", { name: "Login" }).click();
        await page
            .getByRole("textbox", { name: "Enter Your Email" })
            .fill("cs4218@test.com");
        await page
            .getByRole("textbox", { name: "Enter Your Password" })
            .click();
        await page
            .getByRole("textbox", { name: "Enter Your Password" })
            .fill("cs4218@test.com");
        await page.goto("/dashboard/admin");

        await expect(page.getByText(/redirecting to you in/)).toBeVisible();

        await expect(page).toHaveURL("/login", { timeout: 5000 });

        await expect(page.getByText("Admin Panel")).not.toBeVisible();
    });
});
