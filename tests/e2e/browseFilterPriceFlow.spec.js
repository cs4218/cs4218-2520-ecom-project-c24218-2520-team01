import { test, expect } from "@playwright/test";
import bcrypt from "bcrypt";
import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ADMIN_EMAIL = "admin@admin.com";
const ADMIN_PASSWORD = "admin";
const API_BASE_URL = process.env.E2E_API_BASE_URL || "http://localhost:6060";
const BACKEND_BASE_URL = API_BASE_URL;
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
test.describe("ui test for browsing and price filtering", () => {
    const createdProductIds = [];

    test.beforeAll(async ({ request }) => {
        // Reset test data first
        const resetRes = await request.post(`${BACKEND_BASE_URL}/api/v1/testing/reset-and-prepare-test-data`);
        if (!resetRes.ok()) {
            console.warn("Reset failed, continuing...");
        }
    });

    test.afterAll(async ({ request }) => {
        if (!createdProductIds.length) {
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

        for (const productId of createdProductIds) {
            await request.delete(`${API_BASE_URL}/api/v1/product/delete-product/${productId}`, {
                headers: { Authorization: token }
            });
        }
    });


    test("success flow: user filters products by selecting specific price ranges", async ({ page, request }, testInfo) => {
        const runTag = `${Date.now()}-${testInfo.project.name}-${testInfo.retry}`;
        const lowPriceProductName = `E2E Low Price ${runTag}`;
        const highPriceProductName = `E2E High Price ${runTag}`;

        // precondition: create deterministic admin account and auth token
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

        // ui / data precondition: ensure category exists for product creation
        const categoriesRes = await request.get(`${API_BASE_URL}/api/v1/category/get-category`);
        expect(categoriesRes.ok()).toBeTruthy();

        const categoriesJson = await categoriesRes.json();
        let categoryId = categoriesJson?.category?.[0]?._id;

        if (!categoryId) {
            const createCategoryRes = await request.post(`${API_BASE_URL}/api/v1/category/create-category`, {
                headers: { Authorization: adminToken },
                data: { name: `E2E Filter Category ${runTag}` }
            });
            expect(createCategoryRes.ok()).toBeTruthy();
            const createCategoryJson = await createCategoryRes.json();
            categoryId = createCategoryJson?.category?._id;
        }

        // setup: create one product in "$0 to 19" and one in "$100 or more"
        const createLowPriceRes = await request.post(`${API_BASE_URL}/api/v1/product/create-product`, {
            headers: { Authorization: adminToken },
            multipart: {
                name: lowPriceProductName,
                description: "Low-price product for radio filter scenario",
                price: "10",
                category: categoryId,
                quantity: "2",
                shipping: "1",
                photo: {
                    name: "macbook.png",
                    mimeType: "image/png",
                    buffer: fs.readFileSync(FIXTURE_IMAGE_PATH),
                }
            }
        });
        expect(createLowPriceRes.ok()).toBeTruthy();

        const createLowPriceJson = await createLowPriceRes.json();
        const lowProductId = createLowPriceJson?.products?._id;
        expect(lowProductId).toBeTruthy();
        createdProductIds.push(lowProductId);

        const createHighPriceRes = await request.post(`${API_BASE_URL}/api/v1/product/create-product`, {
            headers: { Authorization: adminToken },
            multipart: {
                name: highPriceProductName,
                description: "High-price product for radio filter scenario",
                price: "120",
                category: categoryId,
                quantity: "2",
                shipping: "1",
                photo: {
                    name: "macbook.png",
                    mimeType: "image/png",
                    buffer: fs.readFileSync(FIXTURE_IMAGE_PATH)
                }
            }
        });
        expect(createHighPriceRes.ok()).toBeTruthy();

        const createHighPriceJson = await createHighPriceRes.json();
        const highProductId = createHighPriceJson?.products?._id;
        expect(highProductId).toBeTruthy();
        createdProductIds.push(highProductId);

        // ui / functional: open the main browsing screen where filters and cards are displayed.
        await page.goto("/");
        await expect(page.getByRole("heading", { name: "All Products" })).toBeVisible();
        await expect(page.getByText("Filter By Price")).toBeVisible();

        // interactivity / end-to-end: select "$0 to 19" and verify list updates to matching price range
        const lowPriceRadio = page.getByRole("radio", { name: "$0 to 19" });
        await lowPriceRadio.scrollIntoViewIfNeeded();
        const lowFilterResponse = await Promise.all([
            page.waitForResponse((res) =>
                res.url().includes("/api/v1/product/product-filters") && res.status() === 200,
            ),
            lowPriceRadio.click()
        ]);
        const lowFilterJson = await lowFilterResponse[0].json();
        const lowFilteredProducts = lowFilterJson?.products || [];
        expect(lowFilteredProducts.length).toBeGreaterThan(0);
        expect(lowFilteredProducts.every((product) => product.price >= 0 && product.price <= 19)).toBeTruthy();
        await expect(page.locator(".card")).toHaveCount(lowFilteredProducts.length);

        // interactivity / end-to-end: switch to "$100 or more" and verify the opposite result.
        const highPriceRadio = page.getByRole("radio", { name: "$100 or more" });
        await highPriceRadio.scrollIntoViewIfNeeded();
        const highFilterResponse = await Promise.all([
            page.waitForResponse((res) =>
                res.url().includes("/api/v1/product/product-filters") && res.status() === 200,
            ),
            highPriceRadio.click()
        ]);
        const highFilterJson = await highFilterResponse[0].json();
        const highFilteredProducts = highFilterJson?.products || [];
        expect(highFilteredProducts.length).toBeGreaterThan(0);
        expect(highFilteredProducts.every((product) => product.price >= 100)).toBeTruthy();
        await expect(page.locator(".card")).toHaveCount(highFilteredProducts.length);

        // post-Condition: confirm user remains on the same screen after filtering actions
        await expect(page).toHaveURL(/\/$/);
        await expect(page.getByRole("heading", { name: "All Products" })).toBeVisible();
    });
});
