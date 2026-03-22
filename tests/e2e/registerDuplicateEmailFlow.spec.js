import { test, expect } from "@playwright/test";
import bcrypt from "bcrypt";
import { MongoClient } from "mongodb";

const EXISTING_USER_EMAIL = "existingEmail@test.com";
const EXISTING_USER_PASSWORD = "existingPassword";
const EXISTING_USER_ANSWER = "badminton";
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017/ecommerce";

const ensureExistingUserForDuplicateEmailScenario = async () => {
    const client = new MongoClient(MONGO_URL);
    await client.connect();

    const users = client.db("ecommerce").collection("users");
    const hashedPassword = await bcrypt.hash(EXISTING_USER_PASSWORD, 10);

    await users.updateOne(
        { email: EXISTING_USER_EMAIL },
        {
            $setOnInsert: {
                name: "Existing user",
                email: EXISTING_USER_EMAIL,
                phone: "91234444",
                address: "Existing address",
                answer: EXISTING_USER_ANSWER
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

// Rachel Tai Ke Jia
test.describe("ui test for registering duplicate email (error) flow", () => {
    test("register with an existing email and verify clear error feedback", async ({ page }) => {
        // precondition: ensure an existing account already uses this email
        await ensureExistingUserForDuplicateEmailScenario();

        // ui / navigation: open the register screen
        await page.goto("/register");

        // layout and data: verify registration form is visible before interacting
        await expect(page.getByRole("heading", { name: "REGISTER FORM" })).toBeVisible();

        const nameInput = page.locator("input[placeholder='Enter Your Name']");
        const emailInput = page.locator("input[placeholder='Enter Your Email']");
        const passwordInput = page.locator("input[placeholder='Enter Your Password']");
        const phoneInput = page.locator("input[placeholder='Enter Your Phone']");
        const addressInput = page.locator("input[placeholder='Enter Your Address']");
        const dobInput = page.locator("input#exampleInputDOB1");
        const answerInput = page.locator("input[placeholder='What is Your Favorite Sport']");
        const registerButton = page.getByRole("button", { name: "REGISTER" });

        await expect(nameInput).toBeVisible();
        await expect(emailInput).toBeVisible();
        await expect(passwordInput).toBeVisible();
        await expect(phoneInput).toBeVisible();
        await expect(addressInput).toBeVisible();
        await expect(dobInput).toBeVisible();
        await expect(answerInput).toBeVisible();
        await expect(registerButton).toBeVisible();

        // edge case / ui data: fill long but valid text in non-email fields to ensure field handling remains stable
        await nameInput.fill("A very long display name to test ui handling without breaking the form layout");
        await emailInput.fill(EXISTING_USER_EMAIL);
        await passwordInput.fill("strongPass!123");
        await phoneInput.fill("90000000");
        await addressInput.fill("Example long address, Example Block, Example Unit, Example City, Example Street, Example postal code");
        await dobInput.fill("1999-12-01");
        await answerInput.fill("swimming");

        // interactivity: confirm typed values before submitting 
        await expect(emailInput).toHaveValue(EXISTING_USER_EMAIL);
        await expect(passwordInput).toHaveValue("strongPass!123");

        // functional / end-to-end: submit registration with duplicate email
        await registerButton.click();

        // ui / error handling: verify clear duplicate-email feedback is shown to the user
        await expect(page.getByText(/Already registered, please login|already registered/i)).toBeVisible({ timeout: 5000 });

        // post-condition: user should remain on register page (registration did not proceed)
        await expect(page).toHaveURL(/\/register$/);
        await expect(page.getByRole("heading", { name: "REGISTER FORM" })).toBeVisible();
    });
});
