import { test, expect } from "@playwright/test";
import { hashPassword } from "../../helpers/authHelper";
import userModel from "../../models/userModel";
import productModel from "../../models/productModel";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURE_IMAGE = path.resolve(__dirname, "../fixtures/test-image.jpg");
const ADMIN_EMAIL = "admin@test.com";
const ADMIN_PASSWORD = "Password";

let admin;

test.beforeAll(async ({ }) => {

    await mongoose.connect(process.env.MONGO_URL);

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
});

test.beforeEach(async ({ page }) => {

    await page.goto("/");
});

test.afterAll(async ({ }) => {
    // Clean up the dummy data
    await userModel.findByIdAndDelete(admin._id);
    await mongoose.disconnect();
});

test.describe("Product Creation Flow", () => {
    test.describe("Missing arguments", () => {

        test.afterEach(async ({ page }) => {

            // In cause our test fails it will delete the added item in the database
            const product = await productModel.findOne({ name: "Mouse" });
            if (product) {
                await productModel.findByIdAndDelete(product._id);
            }

            // Logout after each test so we can simulate logging in again
            await page.getByText("AdminDashboardLogout").click();
            await page.getByRole("link", { name: "Logout" }).click();
        });

        // Written by Nicholas Cheng, A0269648H
        test("Product cannot be created if there is a missing category", async ({ page }) => {

            // Login to an admin account
            await page.getByRole("link", { name: "Login" }).click();
            await page.getByRole("textbox", { name: "Enter Your Email" }).fill(ADMIN_EMAIL);
            await page.getByRole("textbox", { name: "Enter Your Password" }).click();
            await page.getByRole("textbox", { name: "Enter Your Password" }).fill(ADMIN_PASSWORD);
            await page.getByRole("button", { name: "LOGIN" }).click();

            // Wait for the page to render first
            await expect(page.getByRole("heading", { name: "All Products" })).toBeVisible();

            // Navigate to the create product page
            await page.getByText("AdminDashboardLogout").click();
            await page.getByRole("link", { name: "Dashboard" }).click();
            await page.getByRole("link", { name: "Products" }).click();
            await page.getByRole("link", { name: "Create Product" }).click();

            // Fill up the product form, but leave out the category

            // Upload the image file
            const fileChooserPromise = page.waitForEvent("filechooser");
            await page.getByText("Upload Photo").click();
            const fileChooser = await fileChooserPromise;
            await fileChooser.setFiles(FIXTURE_IMAGE);

            // Indicate product name
            await page.getByRole("textbox", { name: "write a name" }).click();
            await page.getByRole("textbox", { name: "write a name" }).fill("Mouse");

            // Indicate product description
            await page.getByRole("textbox", { name: "write a description" }).click();
            await page.getByRole("textbox", { name: "write a description" }).fill("A wireless mouse");

            // Indicate product price
            await page.getByPlaceholder("write a price").click();
            await page.getByPlaceholder("write a price").fill("100");

            // Indicate product quantity
            await page.getByPlaceholder("write a quantity").click();
            await page.getByPlaceholder("write a quantity").fill("10");

            // Indicate shipping
            await page.locator("#rc_select_1").click();
            await page.getByText("No").click();

            // Send a reques to create a product
            await page.getByRole("button", { name: "CREATE PRODUCT" }).click();

            // Expect an error message to appear
            await expect(page.locator("div").filter({ hasText: "Something went wrong" }).nth(4)).toBeVisible();
        });

        // Written by Nicholas Cheng, A0269648H
        test("Product cannot be created if there is a missing image", async ({ page }) => {

            // Login to an admin account
            await page.getByRole("link", { name: "Login" }).click();
            await page.getByRole("textbox", { name: "Enter Your Email" }).fill(ADMIN_EMAIL);
            await page.getByRole("textbox", { name: "Enter Your Password" }).click();
            await page.getByRole("textbox", { name: "Enter Your Password" }).fill(ADMIN_PASSWORD);
            await page.getByRole("button", { name: "LOGIN" }).click();

            // Wait for the page to render first
            await expect(page.getByRole("heading", { name: "All Products" })).toBeVisible();

            // Navigate to the create product page
            await page.getByText("AdminDashboardLogout").click();
            await page.getByRole("link", { name: "Dashboard" }).click();
            await page.getByRole("link", { name: "Products" }).click();
            await page.getByRole("link", { name: "Create Product" }).click();

            // Fill up the product form

            // Indicate category
            await page.locator("#rc_select_0").click();
            await page.getByTitle("Book").click();

            // Indicate product name
            await page.getByRole("textbox", { name: "write a name" }).click();
            await page.getByRole("textbox", { name: "write a name" }).fill("Mouse");

            // Indicate product description
            await page.getByRole("textbox", { name: "write a description" }).click();
            await page.getByRole("textbox", { name: "write a description" }).fill("A wireless mouse");

            // Indicate product price
            await page.getByPlaceholder("write a price").click();
            await page.getByPlaceholder("write a price").fill("100");

            // Indicate product quantity
            await page.getByPlaceholder("write a quantity").click();
            await page.getByPlaceholder("write a quantity").fill("10");

            // Indicate shipping
            await page.locator("#rc_select_1").click();
            await page.getByText("No").click();

            // Send a reques to create a product
            await page.getByRole("button", { name: "CREATE PRODUCT" }).click();

            // Expect an error message to appear
            await expect(page.locator("div").filter({ hasText: "Something went wrong" }).nth(4)).toBeVisible();
        });

        // Written by Nicholas Cheng, A0269648H
        test("Product cannot be created if there is a missing name", async ({ page }) => {

            // Login to an admin account
            await page.getByRole("link", { name: "Login" }).click();
            await page.getByRole("textbox", { name: "Enter Your Email" }).fill(ADMIN_EMAIL);
            await page.getByRole("textbox", { name: "Enter Your Password" }).click();
            await page.getByRole("textbox", { name: "Enter Your Password" }).fill(ADMIN_PASSWORD);
            await page.getByRole("button", { name: "LOGIN" }).click();

            // Wait for the page to render first
            await expect(page.getByRole("heading", { name: "All Products" })).toBeVisible();

            // Navigate to the create product page
            await page.getByText("AdminDashboardLogout").click();
            await page.getByRole("link", { name: "Dashboard" }).click();
            await page.getByRole("link", { name: "Products" }).click();
            await page.getByRole("link", { name: "Create Product" }).click();

            // Fill up the product form

            // Indicate category
            await page.locator("#rc_select_0").click();
            await page.getByTitle("Book").click();

            // Upload the image file
            const fileChooserPromise = page.waitForEvent("filechooser");
            await page.getByText("Upload Photo").click();
            const fileChooser = await fileChooserPromise;
            await fileChooser.setFiles(FIXTURE_IMAGE);

            // Indicate product description
            await page.getByRole("textbox", { name: "write a description" }).click();
            await page.getByRole("textbox", { name: "write a description" }).fill("A wireless mouse");

            // Indicate product price
            await page.getByPlaceholder("write a price").click();
            await page.getByPlaceholder("write a price").fill("100");

            // Indicate product quantity
            await page.getByPlaceholder("write a quantity").click();
            await page.getByPlaceholder("write a quantity").fill("10");

            // Indicate shipping
            await page.locator("#rc_select_1").click();
            await page.getByText("No").click();

            // Send a reques to create a product
            await page.getByRole("button", { name: "CREATE PRODUCT" }).click();

            // Expect an error message to appear
            await expect(page.locator("div").filter({ hasText: "Something went wrong" }).nth(4)).toBeVisible();
        });

        // Written by Nicholas Cheng, A0269648H
        test("Product cannot be created if there is a missing description", async ({ page }) => {

            // Login to an admin account
            await page.getByRole("link", { name: "Login" }).click();
            await page.getByRole("textbox", { name: "Enter Your Email" }).fill(ADMIN_EMAIL);
            await page.getByRole("textbox", { name: "Enter Your Password" }).click();
            await page.getByRole("textbox", { name: "Enter Your Password" }).fill(ADMIN_PASSWORD);
            await page.getByRole("button", { name: "LOGIN" }).click();

            // Wait for the page to render first
            await expect(page.getByRole("heading", { name: "All Products" })).toBeVisible();

            // Navigate to the create product page
            await page.getByText("AdminDashboardLogout").click();
            await page.getByRole("link", { name: "Dashboard" }).click();
            await page.getByRole("link", { name: "Products" }).click();
            await page.getByRole("link", { name: "Create Product" }).click();

            // Fill up the product form

            // Indicate category
            await page.locator("#rc_select_0").click();
            await page.getByTitle("Book").click();

            // Upload the image file
            const fileChooserPromise = page.waitForEvent("filechooser");
            await page.getByText("Upload Photo").click();
            const fileChooser = await fileChooserPromise;
            await fileChooser.setFiles(FIXTURE_IMAGE);

            // Indicate product name
            await page.getByRole("textbox", { name: "write a name" }).click();
            await page.getByRole("textbox", { name: "write a name" }).fill("Mouse");

            // Indicate product price
            await page.getByPlaceholder("write a price").click();
            await page.getByPlaceholder("write a price").fill("100");

            // Indicate product quantity
            await page.getByPlaceholder("write a quantity").click();
            await page.getByPlaceholder("write a quantity").fill("10");

            // Indicate shipping
            await page.locator("#rc_select_1").click();
            await page.getByText("No").click();

            // Send a reques to create a product
            await page.getByRole("button", { name: "CREATE PRODUCT" }).click();

            // Expect an error message to appear
            await expect(page.locator("div").filter({ hasText: "Something went wrong" }).nth(4)).toBeVisible();
        });

        // Written by Nicholas Cheng, A0269648H
        test("Product cannot be created if there is a missing price", async ({ page }) => {

            // Login to an admin account
            await page.getByRole("link", { name: "Login" }).click();
            await page.getByRole("textbox", { name: "Enter Your Email" }).fill(ADMIN_EMAIL);
            await page.getByRole("textbox", { name: "Enter Your Password" }).click();
            await page.getByRole("textbox", { name: "Enter Your Password" }).fill(ADMIN_PASSWORD);
            await page.getByRole("button", { name: "LOGIN" }).click();

            // Wait for the page to render first
            await expect(page.getByRole("heading", { name: "All Products" })).toBeVisible();

            // Navigate to the create product page
            await page.getByText("AdminDashboardLogout").click();
            await page.getByRole("link", { name: "Dashboard" }).click();
            await page.getByRole("link", { name: "Products" }).click();
            await page.getByRole("link", { name: "Create Product" }).click();

            // Fill up the product form

            // Indicate category
            await page.locator("#rc_select_0").click();
            await page.getByTitle("Book").click();

            // Upload the image file
            const fileChooserPromise = page.waitForEvent("filechooser");
            await page.getByText("Upload Photo").click();
            const fileChooser = await fileChooserPromise;
            await fileChooser.setFiles(FIXTURE_IMAGE);

            // Indicate product name
            await page.getByRole("textbox", { name: "write a name" }).click();
            await page.getByRole("textbox", { name: "write a name" }).fill("Mouse");

            // Indicate product description
            await page.getByRole("textbox", { name: "write a description" }).click();
            await page.getByRole("textbox", { name: "write a description" }).fill("A wireless mouse");

            // Indicate product quantity
            await page.getByPlaceholder("write a quantity").click();
            await page.getByPlaceholder("write a quantity").fill("10");

            // Indicate shipping
            await page.locator("#rc_select_1").click();
            await page.getByText("No").click();

            // Send a reques to create a product
            await page.getByRole("button", { name: "CREATE PRODUCT" }).click();

            // Expect an error message to appear
            await expect(page.locator("div").filter({ hasText: "Something went wrong" }).nth(4)).toBeVisible();
        });

        // Written by Nicholas Cheng, A0269648H
        test("Product cannot be created if there is a missing quantity", async ({ page }) => {

            // Login to an admin account
            await page.getByRole("link", { name: "Login" }).click();
            await page.getByRole("textbox", { name: "Enter Your Email" }).fill(ADMIN_EMAIL);
            await page.getByRole("textbox", { name: "Enter Your Password" }).click();
            await page.getByRole("textbox", { name: "Enter Your Password" }).fill(ADMIN_PASSWORD);
            await page.getByRole("button", { name: "LOGIN" }).click();

            // Wait for the page to render first
            await expect(page.getByRole("heading", { name: "All Products" })).toBeVisible();

            // Navigate to the create product page
            await page.getByText("AdminDashboardLogout").click();
            await page.getByRole("link", { name: "Dashboard" }).click();
            await page.getByRole("link", { name: "Products" }).click();
            await page.getByRole("link", { name: "Create Product" }).click();

            // Fill up the product form

            // Indicate category
            await page.locator("#rc_select_0").click();
            await page.getByTitle("Book").click();

            // Upload the image file
            const fileChooserPromise = page.waitForEvent("filechooser");
            await page.getByText("Upload Photo").click();
            const fileChooser = await fileChooserPromise;
            await fileChooser.setFiles(FIXTURE_IMAGE);

            // Indicate product name
            await page.getByRole("textbox", { name: "write a name" }).click();
            await page.getByRole("textbox", { name: "write a name" }).fill("Mouse");

            // Indicate product description
            await page.getByRole("textbox", { name: "write a description" }).click();
            await page.getByRole("textbox", { name: "write a description" }).fill("A wireless mouse");

            // Indicate product price
            await page.getByPlaceholder("write a price").click();
            await page.getByPlaceholder("write a price").fill("100");

            // Indicate shipping
            await page.locator("#rc_select_1").click();
            await page.getByText("No").click();

            // Send a reques to create a product
            await page.getByRole("button", { name: "CREATE PRODUCT" }).click();

            // Expect an error message to appear
            await expect(page.locator("div").filter({ hasText: "Something went wrong" }).nth(4)).toBeVisible();
        });

        // Written by Nicholas Cheng, A0269648H
        test("Product cannot be created if there is a missing shipping option", async ({ page }) => {

            // Login to an admin account
            await page.getByRole("link", { name: "Login" }).click();
            await page.getByRole("textbox", { name: "Enter Your Email" }).fill(ADMIN_EMAIL);
            await page.getByRole("textbox", { name: "Enter Your Password" }).click();
            await page.getByRole("textbox", { name: "Enter Your Password" }).fill(ADMIN_PASSWORD);
            await page.getByRole("button", { name: "LOGIN" }).click();

            // Wait for the page to render first
            await expect(page.getByRole("heading", { name: "All Products" })).toBeVisible();

            // Navigate to the create product page
            await page.getByText("AdminDashboardLogout").click();
            await page.getByRole("link", { name: "Dashboard" }).click();
            await page.getByRole("link", { name: "Products" }).click();
            await page.getByRole("link", { name: "Create Product" }).click();

            // Fill up the product form

            // Indicate category
            await page.locator("#rc_select_0").click();
            await page.getByTitle("Book").click();

            // Upload the image file
            const fileChooserPromise = page.waitForEvent("filechooser");
            await page.getByText("Upload Photo").click();
            const fileChooser = await fileChooserPromise;
            await fileChooser.setFiles(FIXTURE_IMAGE);

            // Indicate product name
            await page.getByRole("textbox", { name: "write a name" }).click();
            await page.getByRole("textbox", { name: "write a name" }).fill("Mouse");

            // Indicate product description
            await page.getByRole("textbox", { name: "write a description" }).click();
            await page.getByRole("textbox", { name: "write a description" }).fill("A wireless mouse");

            // Indicate product price
            await page.getByPlaceholder("write a price").click();
            await page.getByPlaceholder("write a price").fill("100");

            // Indicate product quantity
            await page.getByPlaceholder("write a quantity").click();
            await page.getByPlaceholder("write a quantity").fill("10");

            // Send a reques to create a product
            await page.getByRole("button", { name: "CREATE PRODUCT" }).click();

            // Expect an error message to appear
            await expect(page.locator("div").filter({ hasText: "Something went wrong" }).nth(4)).toBeVisible();
        });

        // Written by Nicholas Cheng, A0269648H
        test("Product cannot be created if a negative price is given", async ({ page }) => {

            // Login to an admin account
            await page.getByRole("link", { name: "Login" }).click();
            await page.getByRole("textbox", { name: "Enter Your Email" }).fill(ADMIN_EMAIL);
            await page.getByRole("textbox", { name: "Enter Your Password" }).click();
            await page.getByRole("textbox", { name: "Enter Your Password" }).fill(ADMIN_PASSWORD);
            await page.getByRole("button", { name: "LOGIN" }).click();

            // Wait for the page to render first
            await expect(page.getByRole("heading", { name: "All Products" })).toBeVisible();

            // Navigate to the create product page
            await page.getByText("AdminDashboardLogout").click();
            await page.getByRole("link", { name: "Dashboard" }).click();
            await page.getByRole("link", { name: "Products" }).click();
            await page.getByRole("link", { name: "Create Product" }).click();

            // Fill up the product form

            // Indicate category
            await page.locator("#rc_select_0").click();
            await page.getByTitle("Book").click();

            // Upload the image file
            const fileChooserPromise = page.waitForEvent("filechooser");
            await page.getByText("Upload Photo").click();
            const fileChooser = await fileChooserPromise;
            await fileChooser.setFiles(FIXTURE_IMAGE);

            // Indicate product name
            await page.getByRole("textbox", { name: "write a name" }).click();
            await page.getByRole("textbox", { name: "write a name" }).fill("Mouse");

            // Indicate product description
            await page.getByRole("textbox", { name: "write a description" }).click();
            await page.getByRole("textbox", { name: "write a description" }).fill("A wireless mouse");

            // Indicate product price
            await page.getByPlaceholder("write a price").click();
            await page.getByPlaceholder("write a price").fill("-100");

            // Indicate product quantity
            await page.getByPlaceholder("write a quantity").click();
            await page.getByPlaceholder("write a quantity").fill("10");

            // Indicate shipping
            await page.locator("#rc_select_1").click();
            await page.getByText("Yes").click();

            // Send a reques to create a product
            await page.getByRole("button", { name: "CREATE PRODUCT" }).click();

            // Expect an error message to appear
            await expect(page.locator("div").filter({ hasText: "Something went wrong" }).nth(4)).toBeVisible();
        });

        // Written by Nicholas Cheng, A0269648H
        test("Product cannot be created if a negative quantity is given", async ({ page }) => {

            // Login to an admin account
            await page.getByRole("link", { name: "Login" }).click();
            await page.getByRole("textbox", { name: "Enter Your Email" }).fill(ADMIN_EMAIL);
            await page.getByRole("textbox", { name: "Enter Your Password" }).click();
            await page.getByRole("textbox", { name: "Enter Your Password" }).fill(ADMIN_PASSWORD);
            await page.getByRole("button", { name: "LOGIN" }).click();

            // Wait for the page to render first
            await expect(page.getByRole("heading", { name: "All Products" })).toBeVisible();

            // Navigate to the create product page
            await page.getByText("AdminDashboardLogout").click();
            await page.getByRole("link", { name: "Dashboard" }).click();
            await page.getByRole("link", { name: "Products" }).click();
            await page.getByRole("link", { name: "Create Product" }).click();

            // Fill up the product form

            // Indicate category
            await page.locator("#rc_select_0").click();
            await page.getByTitle("Book").click();

            // Upload the image file
            const fileChooserPromise = page.waitForEvent("filechooser");
            await page.getByText("Upload Photo").click();
            const fileChooser = await fileChooserPromise;
            await fileChooser.setFiles(FIXTURE_IMAGE);

            // Indicate product name
            await page.getByRole("textbox", { name: "write a name" }).click();
            await page.getByRole("textbox", { name: "write a name" }).fill("Mouse");

            // Indicate product description
            await page.getByRole("textbox", { name: "write a description" }).click();
            await page.getByRole("textbox", { name: "write a description" }).fill("A wireless mouse");

            // Indicate product price
            await page.getByPlaceholder("write a price").click();
            await page.getByPlaceholder("write a price").fill("100");

            // Indicate product quantity
            await page.getByPlaceholder("write a quantity").click();
            await page.getByPlaceholder("write a quantity").fill("-5");

            // Indicate shipping
            await page.locator("#rc_select_1").click();
            await page.getByText("Yes").click();

            // Send a reques to create a product
            await page.getByRole("button", { name: "CREATE PRODUCT" }).click();

            // Expect an error message to appear
            await expect(page.getByText("Something went wrong")).toBeVisible();
        });
    });
});