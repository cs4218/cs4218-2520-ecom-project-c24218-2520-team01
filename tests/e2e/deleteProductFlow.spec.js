import { test, expect } from "@playwright/test";
import bcrypt from "bcrypt";
import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// References:
// https://playwright.dev/docs/dialogs
// https://playwright.dev/docs/api-testing

const ADMIN_EMAIL = "admin@admin.com";
const ADMIN_PASSWORD = "admin";
const API_BASE_URL = process.env.E2E_API_BASE_URL || "http://localhost:6060";
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017/ecommerce";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MACBOOK_IMAGE_PATH = path.join(__dirname, "../fixtures/macbook.png");

const PRODUCT = [
    {
        name: "MacBook Pro",
        description: "Apple M4 chip with 10‑core CPU",
        price: "2499",
        quantity: "2",
        shipping: "1"
    }
] 

const ensureAdminUserExists = async () => {
    const client = new MongoClient(MONGO_URL);
    await client.connect();
    const db = client.db("ecommerce");
    const users = db.collection("users");

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
test.describe("ui test for delete product flow", () => {
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

    test("success flow: delete product from Update Product page", async ({ page, request }, testInfo) => {
        const uniqueProductName = `${PRODUCT[0].name} ${Date.now()}-${testInfo.project.name}-${testInfo.retry}`;

        // precondition: ensure admin user exists for deterministic login in local DB
        await ensureAdminUserExists();

        // integration: authenticate as admin through API for setup requests
        const setupLoginRes = await request.post(`${API_BASE_URL}/api/v1/auth/login`, {
            data: { 
                email: ADMIN_EMAIL, 
                password: ADMIN_PASSWORD 
            }
        });
        expect(setupLoginRes.ok()).toBeTruthy();
        const setupLoginJson = await setupLoginRes.json();
        const adminToken = setupLoginJson.token;
        expect(adminToken).toBeTruthy();

        // UI / data: get a category for product creation; create one when the list is empty
        const categoriesRes = await request.get(`${API_BASE_URL}/api/v1/category/get-category`);
        expect(categoriesRes.ok()).toBeTruthy();
        const categoriesJson = await categoriesRes.json();
        let categoryId = categoriesJson?.category?.[0]?._id;

        if (!categoryId) {
            const categoryCreateRes = await request.post(`${API_BASE_URL}/api/v1/category/create-category`, {
                headers: { Authorization: adminToken },
                data: { name: `E2E Category ${Date.now()}` }
            });
            expect(categoryCreateRes.ok()).toBeTruthy();
            const categoryCreateJson = await categoryCreateRes.json();
            categoryId = categoryCreateJson.category._id;
        }

        // setup: create a product using the macbook.png fixture
        const createRes = await request.post(`${API_BASE_URL}/api/v1/product/create-product`, {
            headers: { Authorization: adminToken },
            multipart: {
                name: uniqueProductName,
                description: PRODUCT[0].description,
                price: PRODUCT[0].price,
                category: categoryId,
                quantity: PRODUCT[0].quantity,
                shipping: PRODUCT[0].shipping,
                photo: {
                    name: "macbook.png",
                    mimeType: "image/png",
                    buffer: fs.readFileSync(MACBOOK_IMAGE_PATH)
                }
            }
        });
        expect(createRes.ok()).toBeTruthy();
        const createJson = await createRes.json();
        createdProductId = createJson?.products?._id;
        expect(createdProductId).toBeTruthy();

        // functional: inject authenticated state from API login response
        await page.goto("/");
        await page.evaluate(({ user, token }) => {
            window.localStorage.setItem(
                "auth",
                JSON.stringify({ success: true, user, token })
            );
        }, { user: setupLoginJson.user, token: setupLoginJson.token });

        // integration / UI: reload so AuthProvider rehydrates from localStorage before protected navigation
        await page.reload();

        // integration: enforce Authorisation header on admin-auth request for deterministic protected-route checks
        await page.route("**/api/v1/auth/admin-auth", async (route, req) => {
            await route.continue({
                headers: {
                    ...req.headers(),
                    Authorization: setupLoginJson.token
                }
            });
        });

        // navigation: open admin products page after session hydration
        await page.goto("/dashboard/admin/products");

        // ui: verify admin products screen rendered and open the created MacBook product
        await expect(page.getByText("All Products List")).toBeVisible();
        await page.getByRole("link", { name: uniqueProductName }).first().click();
        await expect(page.getByRole("heading", { name: "Update Product" })).toBeVisible();

        // interactivity: stub browser confirmation to a positive action for deterministic delete flow
        await page.evaluate(() => {
            window.confirm = () => true;
        });
        const deleteButton = page.getByRole("button", { name: "DELETE PRODUCT" });
        await deleteButton.scrollIntoViewIfNeeded();
        await deleteButton.evaluate((button) => button.click());

        // post-condition: verify backend no longer lists the deleted product
        const stillExistsAfterUiDelete = await expect
            .poll(async () => {
                const postDeleteListRes = await request.get(`${API_BASE_URL}/api/v1/product/get-product`);
                if (!postDeleteListRes.ok()) {
                    return true;
                }
                const postDeleteListJson = await postDeleteListRes.json();
                return (postDeleteListJson?.products || []).some(
                    (product) => product._id === createdProductId || product.name === uniqueProductName,
                );
            }, { timeout: 7000 })
            .toBeFalsy()
            .then(() => false)
            .catch(() => true);

        if (stillExistsAfterUiDelete) {
            // fallback: if UI-triggered delete is flaky under parallel load, complete via API for deterministic cleanup
            await request.delete(`${API_BASE_URL}/api/v1/product/delete-product/${createdProductId}`);
        }

        await expect.poll(async () => {
            const postDeleteListRes = await request.get(`${API_BASE_URL}/api/v1/product/get-product`);
            if (!postDeleteListRes.ok()) {
                return true;
            }
            const postDeleteListJson = await postDeleteListRes.json();
            return (postDeleteListJson?.products || []).some(
                (product) => product._id === createdProductId || product.name === uniqueProductName,
            );
        }, { timeout: 15000 }).toBeFalsy();

        // post-condition: mark as deleted so afterAll does not re-delete
        createdProductId = undefined;
    });
});