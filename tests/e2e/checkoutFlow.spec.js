import { test, expect } from "@playwright/test";

// Written by Nicholas Cheng, A0269648H

test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/");
});

test.describe("Checkout Flow", () => {
    test("Users who input invalid email should not be able to login", async ({ page }) => {
        // Redirect to the login page
        await page.getByRole("link", { name: "Login" }).click();
        // Input an invalid email
        await page.getByRole("textbox", { name: "Enter Your Email" }).click();
        await page.getByRole("textbox", { name: "Enter Your Email" }).fill("faker@fake.com");
        // Input some password
        await page.getByRole("textbox", { name: "Enter Your Password" }).click();
        await page.getByRole("textbox", { name: "Enter Your Password" }).fill("Password");

        // Click on the login button
        await page.getByRole("button", { name: "LOGIN" }).click();

        // Expect an error message to be visible
        await expect(page.locator("div").filter({ hasText: "Something went wrong" }).nth(4)).toBeVisible();

        // Expect to still be on the login page
        await expect(page.getByText("LOGIN FORMForgot PasswordLOGIN")).toBeVisible();
    });

    test("Users who input invalid password should not be able to login", async ({ page }) => {
        // Redirect to the login page
        await page.getByRole("link", { name: "Login" }).click();

        // Input a valid email
        await page.getByRole("textbox", { name: "Enter Your Email" }).click();
        await page.getByRole("textbox", { name: "Enter Your Email" }).fill("admin@gmail.com");

        // Input an invalid password
        await page.getByRole("textbox", { name: "Enter Your Password" }).click();
        await page.getByRole("textbox", { name: "Enter Your Password" }).fill("WrongPassword");

        // Click on the login button
        await page.getByRole("button", { name: "LOGIN" }).click();

        // Expect an error message to be visible
        await expect(page.locator("div").filter({ hasText: "Something went wrong" }).nth(4)).toBeVisible();

        // Expect to still be on the login page
        await expect(page.getByText("LOGIN FORMForgot PasswordLOGIN")).toBeVisible();
    });

    test("Users who did not input an email will not be able to login", async ({ page }) => {
        // Redirect to the login page
        await page.getByRole("link", { name: "Login" }).click();


        // Input some password
        await page.getByRole("textbox", { name: "Enter Your Password" }).click();
        await page.getByRole("textbox", { name: "Enter Your Password" }).fill("Password");

        // Click on the login button
        await page.getByRole("button", { name: "LOGIN" }).click();

        // Expect to still be on the login page
        await expect(page.getByText("LOGIN FORMForgot PasswordLOGIN")).toBeVisible();
    });

    test("Users who did not input a password will not be able to login", async ({ page }) => {
        // Redirect to the login page
        await page.getByRole("link", { name: "Login" }).click();

        // Input a valid email
        await page.getByRole("textbox", { name: "Enter Your Email" }).click();
        await page.getByRole("textbox", { name: "Enter Your Email" }).fill("admin@gmail.com");

        // Click on the login button
        await page.getByRole("button", { name: "LOGIN" }).click();

        // Expect to still be on the login page
        await expect(page.getByText("LOGIN FORMForgot PasswordLOGIN")).toBeVisible();
    });
});
