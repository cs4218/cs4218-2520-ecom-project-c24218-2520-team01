import { test, expect } from "@playwright/test";
import { hashPassword } from "../../helpers/authHelper";
import userModel from "../../models/userModel";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const USER_EMAIL = "jane@test.com";
const USER_PASSWORD = "Password";

let user;

test.beforeAll(async ({ }) => {

    await mongoose.connect(process.env.MONGO_URL);

    // Create a user
    user = await new userModel({
        name: "Jane Doe",
        email: USER_EMAIL,
        password: await hashPassword(USER_PASSWORD),
        phone: "123456789",
        address: "123 Main St",
        answer: "yes"
    }).save();
});

test.beforeEach(async ({ page }) => {

    await page.goto("http://localhost:3000/");
});

test.afterAll(async ({ }) => {
    // Clean up the dummy data
    await userModel.findByIdAndDelete(user._id);

    await mongoose.disconnect();
});

test.describe("Checkout Flow", () => {
    // Written by Nicholas Cheng, A0269648H
    test("Users who are not authenticated should not be able to checkout", async ({ page }) => {
        // Login to an account
        await page.getByRole("link", { name: "Login" }).click();
        await page.getByRole("textbox", { name: "Enter Your Email" }).click();
        await page.getByRole("textbox", { name: "Enter Your Email" }).fill(USER_EMAIL);
        await page.getByRole("textbox", { name: "Enter Your Password" }).click();
        await page.getByRole("textbox", { name: "Enter Your Password" }).fill(USER_PASSWORD);
        await page.getByRole("button", { name: "LOGIN" }).click();

        // Simulate adding an item to cart
        await page.getByRole("button", { name: "ADD TO CART" }).first().click();

        // Move to the cart page
        await page.getByRole("link", { name: "Cart" }).click();
        // We should see an checkout or make payment button since we are currently authenticated
        await expect(page.getByRole("button", { name: "Make Payment" })).toBeVisible();

        // Logout
        await page.getByRole("button", { name: "Jane Doe" }).click();
        await page.getByRole("link", { name: "Logout" }).click();

        // Move to the cart page
        await page.getByRole("link", { name: "Cart" }).click();

        // There should also be an option to ask the unauthenticated person to login
        await expect(page.getByRole("button", { name: "Please Login to checkout" })).toBeVisible();
        // We should not see an checkout or make payment button since we are currently not authenticated
        await expect(page.getByRole("button", { name: "Make Payment" })).toBeHidden();
    });
})