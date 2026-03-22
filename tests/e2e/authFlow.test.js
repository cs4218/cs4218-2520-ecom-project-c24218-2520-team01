import { test } from "@playwright/test";

const { describe, expect } = test;

const e2eUsers = {
    shopper: {
        name: "Playwright Shopper",
        email: "shopper67@example.com",
        password: "shopperPass123",
        phone: "90000001",
        address: "42 Test Arcade",
        answer: "swimming",
        role: 0,
    },
    admin: {
        name: "Playwright Admin",
        email: "admin.e2e@example.com",
        password: "adminPass123",
        phone: "90000002",
        address: "84 Test Arcade",
        answer: "tennis",
        role: 1,
    },
};

describe("Auth flow", () => {
    test("ensure user cannot access admin panel", async ({ page }) => {
        // muhammad ZAIDAN bin sani (A0273278U)
        await page.goto("/");
        await page.getByRole("link", { name: "Login" }).click();
        await page
            .getByRole("textbox", { name: "Enter Your Email" })
            .fill(e2eUsers.shopper.email);
        await page
            .getByRole("textbox", { name: "Enter Your Password" })
            .fill(e2eUsers.shopper.password);
        await page.goto("/dashboard/admin");

        await expect(page.getByText(/redirecting to you in/)).toBeVisible();

        await expect(page).toHaveURL("/login", { timeout: 5000 });

        await expect(page.getByText("Admin Panel")).not.toBeVisible();
    });
});
