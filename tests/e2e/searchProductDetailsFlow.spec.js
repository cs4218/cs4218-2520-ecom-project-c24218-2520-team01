import { test, expect } from "@playwright/test";
import bcrypt from "bcrypt";
import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ADMIN_EMAIL = "admin@admin.com";
const ADMIN_PASSWORD = "admin";
const API_BASE_URL = process.env.E2E_API_BASE_URL || "http://localhost:6060";
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017/ecommerce";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_IMAGE_PATH = path.join(__dirname, "../fixtures/macbook.png");

const ensureAdminUserExists = async () => {
    const client = new MongoClient(MONGO_URL);
    await client.connect();

    const users = client.db("ecommerce").collection("users");
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    await users.updateOne(
        { email: ADMIN_EMAIL },
        {
            $setOnInsert: {
                name: "Admin",
                email: ADMIN_EMAIL,
                phone: "99999999",
                address: "Admin Address",
                answer: "admin"
            },
            $set: {
                password: hashedPassword,
                role: 1
            }
        },
        { upsert: true }
    );

    await client.close();
};

// Rachel Tai Ke Jia, A0258603A
test.describe("ui test for search to product details flow", () => {
    let createdProductId;

    test.afterAll(async ({ request }) => {
        if (!createdProductId) {
            return;
        }

        const loginRes = await request.post(`${API_BASE_URL}/api/v1/auth/login`, {
            data: {
                email: ADMIN_EMAIL,
                password: ADMIN_PASSWORD
            }
        });

        if (!loginRes.ok()) {
            return;
        }

        const { token } = await loginRes.json();
        if (!token) {
            return;
        }

        await request.delete(`${API_BASE_URL}/api/v1/product/delete-product/${createdProductId}`, {
            headers: { Authorization: token }
        });
    });


    test("success flow: search a product then open that searched product's details", async ({ page, request }, testInfo) => {
        const runTag = `${Date.now()}-${testInfo.project.name}-${testInfo.retry}`;
        const uniqueKeyword = `SEARCHFLOW-${runTag}`;
        const productName = `Laptop ${uniqueKeyword}`;

        // tart / precondition: ensure admin account and auth token are available
        await ensureAdminUserExists();

        const loginRes = await request.post(`${API_BASE_URL}/api/v1/auth/login`, {
            data: {
                email: ADMIN_EMAIL,
                password: ADMIN_PASSWORD
            }
        });
        expect(loginRes.ok()).toBeTruthy();

        const loginJson = await loginRes.json();
        const adminToken = loginJson?.token;
        expect(adminToken).toBeTruthy();

        // ui / data: create or reuse a category, then create a product with a unique search keyword
        const categoriesRes = await request.get(`${API_BASE_URL}/api/v1/category/get-category`);
        expect(categoriesRes.ok()).toBeTruthy();

        const categoriesJson = await categoriesRes.json();
        let categoryId = categoriesJson?.category?.[0]?._id;

        if (!categoryId) {
            const createCategoryRes = await request.post(`${API_BASE_URL}/api/v1/category/create-category`, {
                headers: { Authorization: adminToken },
                data: { name: `E2E Search Category ${runTag}` }
            });
            expect(createCategoryRes.ok()).toBeTruthy();

            const createCategoryJson = await createCategoryRes.json();
            categoryId = createCategoryJson?.category?._id;
        }

        const createProductRes = await request.post(`${API_BASE_URL}/api/v1/product/create-product`, {
            headers: { Authorization: adminToken },
            multipart: {
                name: productName,
                description: "Searchable product",
                price: "199",
                category: categoryId,
                quantity: "5",
                shipping: "1",
                photo: {
                    name: "macbook.png",
                    mimeType: "image/png",
                    buffer: fs.readFileSync(FIXTURE_IMAGE_PATH)
                }
            }
        });
        expect(createProductRes.ok()).toBeTruthy();

        const createProductJson = await createProductRes.json();
        createdProductId = createProductJson?.products?._id;
        const createdProductSlug = createProductJson?.products?.slug;
        expect(createdProductId).toBeTruthy();
        expect(createdProductSlug).toBeTruthy();

        // functional / interactivity: navigate to home, run product search through header input and submit button
        await page.goto("/");
        await expect(page.getByRole("heading", { name: "All Products" })).toBeVisible();

        const searchInput = page.getByPlaceholder("Search");
        const searchButton = page.getByRole("button", { name: "Search" });

        // responsiveness: on mobile layouts, search is inside collapsed navbar content
        if (!(await searchInput.isVisible())) {
            await page.getByRole("button", { name: "Toggle navigation" }).click();
        }

        await expect(searchInput).toBeVisible();
        await expect(searchButton).toBeVisible();

        await searchInput.fill(uniqueKeyword);
        await expect(searchInput).toHaveValue(uniqueKeyword);

        await Promise.all([
            page.waitForURL(/\/search$/),
            searchButton.click()
        ]);

        // layout & data: verify search results page and target product card are rendered.
        await expect(page.getByText(/Search Results/i)).toBeVisible();
        await expect(page.getByText(/Found \d+/i)).toBeVisible();
        await expect(page.locator(".card", { hasText: productName })).toBeVisible();

        // end-to-end: click "More Details" on searched product card and verify product details screen opens
        const searchedProductCard = page.locator(".card", { hasText: productName });
        await searchedProductCard.getByRole("button", { name: "More Details" }).click();

        await expect(page).toHaveURL(new RegExp(`/product/${createdProductSlug}$`));
        await expect(page.getByRole("heading", { name: "Product Details" })).toBeVisible();
        await expect(page.getByText(`Name: ${productName}`)).toBeVisible();

        // post-condition: ensure primary product image is visible on details page
        await expect(page.locator(".product-details .card-img-top")).toBeVisible();
    });
});