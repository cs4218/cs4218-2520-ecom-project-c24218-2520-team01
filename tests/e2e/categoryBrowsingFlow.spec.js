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

let user, category, product;

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

    category = await new categoryModel({
        name: "Test",
        slug: "test",
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

    await page.goto("http://localhost:3000/");
});


test.afterAll(async ({ }) => {
    // Clean up the dummy data
    await userModel.findByIdAndDelete(user._id);
    await categoryModel.findByIdAndDelete(category._id);
    await productModel.findByIdAndDelete(product._id);

    await mongoose.disconnect();
});

test.describe("Category Browsing Flow", () => {
    // Written by Nicholas Cheng, A0269648H
    test("Users should be able to see items from a specific category selected", async ({ page }) => {

        // Simulate a user logging in
        await page.getByRole("link", { name: "Login" }).click();
        await page.getByRole("textbox", { name: "Enter Your Email" }).fill(USER_EMAIL);
        await page.getByRole("textbox", { name: "Enter Your Password" }).click();
        await page.getByRole("textbox", { name: "Enter Your Password" }).fill(USER_PASSWORD);
        await page.getByRole("button", { name: "LOGIN" }).click();

        // Wait till we reach the home page first
        await expect(page.getByRole("heading", { name: "All Products" })).toBeVisible();

        // Simulate user selected a catrgory to view
        await page.getByRole("link", { name: "Categories" }).click();
        await page.getByRole("link", { name: "All Categories" }).click();

        // Wait for the page to load
        await expect(page.getByRole("link", { name: "Test" })).toBeVisible();
        await page.getByRole("link", { name: "Test" }).click();

        await expect(page.getByRole("main")).toContainText("Category - Test");
        await expect(page.getByRole("heading", { name: "1 result found" })).toBeVisible();

        // Expect the product to be visible
        await expect(page.getByRole('heading', { name: 'Ball' })).toBeVisible();
        await expect(page.getByRole('heading', { name: '$3,000.00' })).toBeVisible();
        await expect(page.getByText('A round GOLDEN ball')).toBeVisible();
        await expect(page.getByRole('img', { name: 'Ball' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'More Details' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'ADD TO CART' })).toBeVisible();
    });
});