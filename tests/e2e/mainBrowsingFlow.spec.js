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

// Written by Nicholas Cheng, A0269648H

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURE_IMAGE = path.resolve(__dirname, "../fixtures/test-image.jpg");
const USER_EMAIL = "jane@test.com";
const USER_PASSWORD = "Password";
const DUMMY_PRODUCT_COUNT = 4;

let user, category;
let products = [];

test.describe.configure({ mode: "parallel" });

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

    await page.goto("http://localhost:3000/");
});


test.afterAll(async ({ }) => {
    // Clean up the dummy data
    await userModel.findByIdAndDelete(user._id);
    await categoryModel.findByIdAndDelete(category._id);

    await mongoose.disconnect();
});

test.describe("Category Browsing Flow", () => {
    test.describe("Pagination", () => {

        test.beforeEach(async ({ page }) => {
            // Inject some extra products for pagination testing
            for (let i = 0; i < DUMMY_PRODUCT_COUNT; i++) {
                const product = await new productModel({
                    name: "Product " + i,
                    slug: "product-" + i,
                    description: "Dummy" + i,
                    price: i * 100,
                    category: category._id,
                    quantity: 5,
                    photo: {
                        data: fs.readFileSync(FIXTURE_IMAGE),
                        contentType: FIXTURE_IMAGE.type
                    }
                }).save();
                products.push(product);
            }

            // Refresh the page to get updates on the products
            await page.goto("http://localhost:3000/");
        });

        test.afterAll(async ({ }) => {
            // Clean up the dummy data
            for (let i = 0; i < products.length; i++) {
                await productModel.findByIdAndDelete(products[i]._id);
            }
        });

        test("Users should be able to load more produts on the main page when clicking on the load more button", async ({ page }) => {

            // No need to simulate login as the Main page is accessible to all users and you can view products
            // Since we injected some number of dummy products, we should be able to load more products
            await expect(page.getByRole("button", { name: "Loadmore" })).toBeVisible();

            // Just ensure that the additional products are loaded (Just check for one of them)
            await page.getByRole("button", { name: "Loadmore" }).click();
            await expect(page.getByRole("button", { name: "Loading" })).toBeHidden();

            await expect(page.locator("div").filter({ hasText: "Laptop$1,499.99A powerful" }).nth(5)).toBeVisible();
        });
    });
});
