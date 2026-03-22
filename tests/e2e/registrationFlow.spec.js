import { test, expect } from "./baseTest.js";
import { writeFileSync, existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Lim Jia Wei, A0277381W

const dirName = dirname(fileURLToPath(import.meta.url));
const EMAIL_LOG = join(dirName, ".test-emails.json");

// log the registered email so teardown can delete it from DB later
function logTestEmail(email) {
    const existing = existsSync(EMAIL_LOG) ? JSON.parse(readFileSync(EMAIL_LOG, "utf-8")) : [];
    writeFileSync(EMAIL_LOG, JSON.stringify([...existing, email]));
}

test.describe("Registration Flow", () => {

    test("should register a new user with valid details", async ({ page }) => {

        const uniqueEmail = `testUser_${Date.now()}@test.com`;
        logTestEmail(uniqueEmail);

        await page.goto("/register");
        await expect(page.getByRole("heading", { name: "REGISTER FORM" })).toBeVisible();

        await page.getByPlaceholder("Enter Your Name").fill("Test User");
        await page.getByPlaceholder("Enter Your Email").fill(uniqueEmail);
        await page.getByPlaceholder("Enter Your Password").fill("password123");
        await page.getByPlaceholder("Enter Your Phone").fill("12345678");
        await page.getByPlaceholder("Enter Your Address").fill("123 Test Street");
        await page.getByPlaceholder("Enter Your DOB").fill("2000-01-01");
        await page.getByPlaceholder("What is Your Favorite Sport").fill("Football");
        await page.getByRole("button", { name: "REGISTER" }).click();

        // assert that redirection to login was done
        await page.waitForURL("**/login", { timeout: 10000 });
        await expect(page.getByRole("heading", { name: "LOGIN FORM" })).toBeVisible();
    });
});
