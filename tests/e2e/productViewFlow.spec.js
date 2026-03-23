import { test, expect } from "@playwright/test";
import { hashPassword } from "../../helpers/authHelper";
import categoryModel from "../../models/categoryModel";
import userModel from "../../models/userModel";
import productModel from "../../models/productModel";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURE_IMAGE = path.resolve(__dirname, "../fixtures/test-image.jpg");
const USER_EMAIL = "jane@test.com";
const USER_PASSWORD = "Password";
const ADMIN_EMAIL = "admin@test.com";
const ADMIN_PASSWORD = "Password";

let user, admin, category, product;

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

    // Create an admin
    admin = await new userModel({
        name: "Admin",
        email: ADMIN_EMAIL,
        password: await hashPassword(ADMIN_PASSWORD),
        phone: "123456789",
        address: "123 Main St",
        answer: "yes",
        role: 1
    }).save();

    category = await new categoryModel({
        name: "Toys",
        slug: "toys",
    }).save();
});

test.beforeEach(async ({ page }) => {

    product = await new productModel({
        name: "Ball",
        slug: "ball",
        description: "A round GOLDEN ball",
        price: 3000,
        category: category._id,
        quantity: 5,
        photo: {
            data: fs.readFileSync(FIXTURE_IMAGE),
            contentType: FIXTURE_IMAGE.type
        }
    }).save();

    await page.goto("/");
});

test.afterEach(async ({ page }) => {
    // Clean up the dummy product
    await productModel.findByIdAndDelete(product._id);
});

test.afterAll(async ({ }) => {
    // Clean up the dummy data
    await userModel.findByIdAndDelete(user._id);
    await userModel.findByIdAndDelete(admin._id);
    await categoryModel.findByIdAndDelete(category._id);
    await productModel.findByIdAndDelete(product._id);

    await mongoose.disconnect();
});

test.describe("Product View Flow", () => {
    // Written by Nicholas Cheng, A0269648H
    test("System should handle gracefully when user views a non-existent product by showing the appropriate UI", async ({ page }) => {

        // Simulate a user logging in
        await page.getByRole("link", { name: "Login" }).click();
        await page.getByRole("textbox", { name: "Enter Your Email" }).fill(USER_EMAIL);
        await page.getByRole("textbox", { name: "Enter Your Password" }).click();
        await page.getByRole("textbox", { name: "Enter Your Password" }).fill(USER_PASSWORD);
        await page.getByRole("button", { name: "LOGIN" }).click();

        // Simulate a user viewing a product
        await page.getByRole("button", { name: "More Details" }).first().click();
        await expect(page.getByText("Product DetailsName:")).toBeVisible();
        // It should show our dummy product details
        await expect(page.getByRole("main")).toContainText("Name: Ball");
        await expect(page.getByRole("main")).toContainText("Description: A round GOLDEN ball");
        await expect(page.getByRole("main")).toContainText("Price:$3,000.00");

        // Simulate a user going back to the home page
        await page.getByRole("link", { name: "Home" }).click();

        // Simulate a user logging out
        await page.getByText("Jane DoeDashboardLogout").click();
        await page.getByRole("link", { name: "Logout" }).click();

        // Simulate an admin logging in
        await page.getByRole("link", { name: "Login" }).click();
        await page.getByRole("textbox", { name: "Enter Your Email" }).fill(ADMIN_EMAIL);
        await page.getByRole("textbox", { name: "Enter Your Password" }).click();
        await page.getByRole("textbox", { name: "Enter Your Password" }).fill(ADMIN_PASSWORD);
        await page.getByRole("button", { name: "LOGIN" }).click();

        // Delete the item
        await page.getByText("AdminDashboardLogout").click();
        await page.getByRole("link", { name: "Dashboard" }).click();
        await page.getByRole("link", { name: "Products" }).click();

        // Wait for the page to load this product
        await expect(page.getByRole("link", { name: "Ball Ball A round GOLDEN ball" })).toBeVisible();

        await page.getByRole("link", { name: "Ball Ball A round GOLDEN ball" }).click();

        // Wait for the page to render before clicking
        await expect(page.getByRole("button", { name: "DELETE PRODUCT" })).toBeVisible();
        page.once("dialog", dialog => {
            dialog.accept("confirm delete");
        });
        await page.getByRole("button", { name: "DELETE PRODUCT" }).click();

        // Simulate the admin logging out
        await page.getByText("AdminDashboardLogout").click();
        await page.getByRole("link", { name: "Logout" }).click();

        // Simulate a user logging in
        await page.getByRole("textbox", { name: "Enter Your Email" }).fill(USER_EMAIL);
        await page.getByRole("textbox", { name: "Enter Your Password" }).click();
        await page.getByRole("textbox", { name: "Enter Your Password" }).fill(USER_PASSWORD);
        await page.getByRole("button", { name: "LOGIN" }).click();

        // Simulate a user viewing the product again by going to that page directly
        await page.goto("/product/Ball");

        // Now the product should not exist
        await expect(page.getByRole("heading", { name: "Product not found" })).toBeVisible();
        await expect(page.getByText("Product not found")).toBeVisible();

        // If we go back to the home page we should not see a Ball product
        await page.getByRole("link", { name: "Home" }).click();

        // Ensure the home page is loaded in before checking the next element
        await expect(page.getByRole("heading", { name: "All Products" })).toBeVisible();

        await expect(page.getByRole("main")).not.toContainText("Ball");
    });
});
