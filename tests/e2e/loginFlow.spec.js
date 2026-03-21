import { test, expect } from "@playwright/test";
import { hashPassword } from "../../helpers/authHelper";
import userModel from "../../models/userModel";
import dotenv from "dotenv";
import mongoose from "mongoose";

// Written by Nicholas Cheng, A0269648H

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

test.describe("Login Flow", () => {
    test("Users who input invalid email should not be able to login", async ({ page }) => {
        // Redirect to the login page
        await page.getByRole("link", { name: "Login" }).click();
        // Input an invalid email
        await page.getByRole("textbox", { name: "Enter Your Email" }).click();
        await page.getByRole("textbox", { name: "Enter Your Email" }).fill("RandomEmail@gmail.com");
        // Input some password
        await page.getByRole("textbox", { name: "Enter Your Password" }).click();
        await page.getByRole("textbox", { name: "Enter Your Password" }).fill(USER_PASSWORD);

        // Click on the login button
        await page.getByRole("button", { name: "LOGIN" }).click();

        // Expect an error message to be visible
        await expect(page.getByText("Something went wrong")).toBeVisible();

        // Expect to still be on the login page
        await expect(page.getByText("LOGIN FORMForgot PasswordLOGIN")).toBeVisible();
    });

    test("Users who input invalid password should not be able to login", async ({ page }) => {
        // Redirect to the login page
        await page.getByRole("link", { name: "Login" }).click();

        // Input a valid email
        await page.getByRole("textbox", { name: "Enter Your Email" }).click();
        await page.getByRole("textbox", { name: "Enter Your Email" }).fill(USER_EMAIL);

        // Input an invalid password
        await page.getByRole("textbox", { name: "Enter Your Password" }).click();
        await page.getByRole("textbox", { name: "Enter Your Password" }).fill("WrongPASSWORD!");

        // Click on the login button
        await page.getByRole("button", { name: "LOGIN" }).click();

        // Expect an error message to be visible
        await expect(page.getByText("Something went wrong")).toBeVisible();

        // Expect to still be on the login page
        await expect(page.getByText("LOGIN FORMForgot PasswordLOGIN")).toBeVisible();
    });

    test("Users who did not input an email will not be able to login", async ({ page }) => {
        // Redirect to the login page
        await page.getByRole("link", { name: "Login" }).click();


        // Input some password
        await page.getByRole("textbox", { name: "Enter Your Password" }).click();
        await page.getByRole("textbox", { name: "Enter Your Password" }).fill(USER_PASSWORD);

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
        await page.getByRole("textbox", { name: "Enter Your Email" }).fill(USER_EMAIL);

        // Click on the login button
        await page.getByRole("button", { name: "LOGIN" }).click();

        // Expect to still be on the login page
        await expect(page.getByText("LOGIN FORMForgot PasswordLOGIN")).toBeVisible();
    });
});
