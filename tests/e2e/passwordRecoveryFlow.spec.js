import { test, expect } from "@playwright/test";
import bcrypt from "bcrypt";
import { MongoClient } from "mongodb";

const TEST_USER_EMAIL = "recovery@test.com";
const TEST_USER_PASSWORD = "originalPassword123";
const TEST_USER_NEW_PASSWORD = "newPassword456";
const TEST_USER_ANSWER = "tennis";
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017/ecommerce";

const ensureTestUserExists = async () => {
    const client = new MongoClient(MONGO_URL);
    await client.connect();

    const users = client.db("ecommerce").collection("users");
    const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10);

    await users.updateOne(
        { email: TEST_USER_EMAIL },
        {
            $setOnInsert: {
                name: "Recovery Test User",
                email: TEST_USER_EMAIL,
                phone: "88888888",
                address: "Recovery Test Address",
                answer: TEST_USER_ANSWER
            },
            $set: {
                password: hashedPassword,
                role: 0
            }
        },
        { upsert: true }
    );

    await client.close();
};

// Rachel Tai Ke Jia, A0258603A
test.describe("ui test for password recovery flow", () => {
    test("success flow: reset password with correct email, security answer, and new password", async ({ page }) => {
        // precondition: ensure test user exists in database with known credentials
        await ensureTestUserExists();

        // navigation: navigate to the forgot password page
        await page.goto("/forgot-password");

        // ui: verify forgot password page is rendered correctly with form elements
        await expect(page.getByRole("heading", { name: "RESET PASSWORD" })).toBeVisible();
        const emailInput = page.locator("input[placeholder='Enter Your Email']");
        const answerInput = page.locator("input[placeholder='Enter Your favorite Sport Name']");
        const passwordInput = page.locator("input[placeholder='Enter Your New Password']");
        const submitButton = page.getByRole("button", { name: "RESET" });

        await expect(emailInput).toBeVisible();
        await expect(answerInput).toBeVisible();
        await expect(passwordInput).toBeVisible();
        await expect(submitButton).toBeVisible();

        // interactivity: fill in the forgot password form with valid credentials
        await emailInput.fill(TEST_USER_EMAIL);
        await answerInput.fill(TEST_USER_ANSWER);
        await passwordInput.fill(TEST_USER_NEW_PASSWORD);

        // layout and data: verify form fields contain the entered values
        await expect(emailInput).toHaveValue(TEST_USER_EMAIL);
        await expect(answerInput).toHaveValue(TEST_USER_ANSWER);
        await expect(passwordInput).toHaveValue(TEST_USER_NEW_PASSWORD);

        // functional: submit the form
        await submitButton.click();

        // ui / integration: verify successful password reset redirects to login page
        await expect(page).toHaveURL(/\/login/);
        await expect(page.getByRole("heading", { name: "LOGIN FORM" })).toBeVisible();

        // post-condition: verify that login with original password fails
        const loginEmailInput = page.locator("input[placeholder='Enter Your Email']");
        const loginPasswordInput = page.locator("input[placeholder='Enter Your Password']");
        const loginButton = page.getByRole("button", { name: "LOGIN" });

        await loginEmailInput.fill(TEST_USER_EMAIL);
        await loginPasswordInput.fill(TEST_USER_PASSWORD);
        await loginButton.click();

        // ui: verify error message is shown for incorrect password
        await expect(page.getByText(/invalid email or password|Something went wrong/i)).toBeVisible({ timeout: 5000 });

        // post-condition: verify login with new password succeeds
        // clear the login form and retry with new password
        await loginEmailInput.clear();
        await loginPasswordInput.clear();
        await loginEmailInput.fill(TEST_USER_EMAIL);
        await loginPasswordInput.fill(TEST_USER_NEW_PASSWORD);
        await loginButton.click();

        // ui / functional: verify successful login redirects to home page (user dashboard)
        await expect(page).toHaveURL(/\/$|\/home/, { timeout: 5000 });
        await expect(page.getByRole("heading", { name: "All Products" })).toBeVisible({ timeout: 5000 });
    });
});
