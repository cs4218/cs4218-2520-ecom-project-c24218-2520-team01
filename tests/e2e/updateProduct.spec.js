import { test, expect } from "@playwright/test";
import { ADMIN_CREDENTIALS } from "./testCredentials.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const dirName = dirname(fileURLToPath(import.meta.url));

// Lim Jia Wei, A0277381W

/**
* AI Usage Declaration
*
* Tool Used: Gemini 3.1 Pro
*
* Prompt: For updateProduct flow, what flows should I test for UI testing to ensure good coverage
*
* How the AI Output Was Used:
* - Used some of the AI output as reference to develop the updateProduct flow ui tests as shown below
*/

test.describe("Update Product Flow", () => {

    // Localized to updateProduct instead of globalSetup to allow for cross browser testing
    let testProduct = {
        name: "",
        id: "",
    };

    // Creates new test product for the UI tests (to be deleted after ui testing)
    test.beforeAll(async () => {

        dotenv.config({ path: join(dirName, "../../.env.local") });
        const mongoUrl = process.env.MONGO_URL;

        if (!mongoUrl) throw new Error("MONGO_URL not found");

        await mongoose.connect(mongoUrl);
        const db = mongoose.connection.db;

        const categories = db.collection("categories");
        const anyCategory = await categories.findOne({});

        if (!anyCategory) throw new Error("No categories found in DB");

        const products = db.collection("products");
        const datetime = Date.now();
        const productName = `Update-TestProd-${datetime}`;
        const productSlug = `update-testprod-${datetime}`;

        const insertedProduct = await products.insertOne({
            name: productName,
            slug: productSlug,
            description: "Test product for UI testing",
            price: 67,
            category: anyCategory._id,
            quantity: 67,
            shipping: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        testProduct.name = productName;
        testProduct.id = insertedProduct.insertedId.toString();

        await mongoose.disconnect();
    });

    // Deletes the temporary product after ui testing
    test.afterAll(async () => {

        const mongoUrl = process.env.MONGO_URL;

        if (mongoUrl) {

            await mongoose.connect(mongoUrl);
            const db = mongoose.connection.db;
            const { ObjectId } = mongoose.Types;

            // delete the testProduct via its id
            await db.collection("products").deleteOne({ _id: new ObjectId(testProduct.id) });
            await mongoose.disconnect();
        }
    });

    // logs in as admin and navigates to the update product page for the test product
    test.beforeEach(async ({ page }) => {

        await page.goto("/");
        await page.getByRole("link", { name: "Login" }).click();
        await page.getByRole("textbox", { name: "Enter Your Email" }).fill(ADMIN_CREDENTIALS.email);
        await page.getByRole("textbox", { name: "Enter Your Password" }).fill(ADMIN_CREDENTIALS.password);
        await page.getByRole("button", { name: "LOGIN" }).click();
        await page.getByRole("button", { name: /E2E Admin|testadmin/i }).click();
        await page.getByRole("link", { name: "Dashboard" }).click();
        await page.getByRole("link", { name: "Products" }).click();

        await expect(page.getByRole("heading", { name: "All Products List" })).toBeVisible({ timeout: 10000 });
        await page.getByRole("link", { name: testProduct.name }).click();

        await expect(page.getByRole("heading", { name: "Update Product" })).toBeVisible({ timeout: 10000 });
        await expect(page.getByPlaceholder("write a name")).toHaveValue(testProduct.name);

    });

    test("should modify the product description", async ({ page }) => {

        await page.getByPlaceholder("write a description").fill("Updated by Playwright e2e test");
        await page.getByRole("button", { name: "UPDATE PRODUCT" }).click();
        await expect(page.getByText("Product Updated Successfully")).toBeVisible({ timeout: 10000 });

    });

    test("should modify the product price", async ({ page }) => {

        await page.getByPlaceholder("write a price").clear();
        await page.getByPlaceholder("write a price").fill("99.99");
        await page.getByRole("button", { name: "UPDATE PRODUCT" }).click();
        await expect(page.getByText("Product Updated Successfully")).toBeVisible({ timeout: 10000 });

    });

    test("should modify the product quantity", async ({ page }) => {

        await page.getByPlaceholder("write a quantity").clear();
        await page.getByPlaceholder("write a quantity").fill("150");
        await page.getByRole("button", { name: "UPDATE PRODUCT" }).click();
        await expect(page.getByText("Product Updated Successfully")).toBeVisible({ timeout: 10000 });

    });

    test("should modify the product name", async ({ page }) => {

        await page.getByPlaceholder("write a name").clear();
        await page.getByPlaceholder("write a name").fill(`${testProduct.name} - Updated`);
        await page.getByRole("button", { name: "UPDATE PRODUCT" }).click();
        await expect(page.getByText("Product Updated Successfully")).toBeVisible({ timeout: 10000 });

        // revert name locally in the browser to avoid failing subsequent tests in the same run
        await page.getByPlaceholder("write a name").clear();
        await page.getByPlaceholder("write a name").fill(testProduct.name);
        await page.getByRole("button", { name: "UPDATE PRODUCT" }).click();
        await expect(page.getByText("Product Updated Successfully")).toBeVisible({ timeout: 10000 });

    });

});