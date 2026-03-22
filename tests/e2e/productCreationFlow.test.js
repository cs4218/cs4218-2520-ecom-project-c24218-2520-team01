import { expect, test } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { describe } = test;

const ADMIN = { email: "admin.e2e@example.com", password: "adminPass123" };
const CATEGORY_NAME = `E2E Test Category ${Date.now()}`;

describe("Product Creation flow", () => {
    let createdProductId;
    let createdCategoryId;
    let adminToken;

    test.beforeAll(async ({ request }) => {
        const loginRes = await request.post("/api/v1/auth/login", {
            data: { email: ADMIN.email, password: ADMIN.password },
        });
        const loginBody = await loginRes.json();
        if (!loginBody.token)
            throw new Error(`Login failed: ${JSON.stringify(loginBody)}`);
        adminToken = loginBody.token;

        const categoryRes = await request.post(
            "/api/v1/category/create-category",
            {
                data: { name: CATEGORY_NAME },
                headers: { Authorization: adminToken },
            },
        );
        const categoryBody = await categoryRes.json();
        if (!categoryBody.category)
            throw new Error(
                `Category creation failed: ${JSON.stringify(categoryBody)}`,
            );
        createdCategoryId = categoryBody.category._id;
    });

    test.afterAll(async ({ request }) => {
        if (createdProductId) {
            await request.delete(
                `/api/v1/product/delete-product/${createdProductId}`,
                { headers: { Authorization: adminToken } },
            );
        }
        if (createdCategoryId) {
            await request.delete(
                `/api/v1/category/delete-category/${createdCategoryId}`,
                { headers: { Authorization: adminToken } },
            );
        }
    });

    // muhammad ZAIDAN bin sani (A0273278U)
    test("creates a product and checks details", async ({ page }) => {
        await page.goto("/");
        await page.getByRole("link", { name: "Login" }).click();
        await page
            .getByRole("textbox", { name: "Enter Your Email" })
            .fill(ADMIN.email);
        await page
            .getByRole("textbox", { name: "Enter Your Password" })
            .fill(ADMIN.password);

        await Promise.all([
            page.waitForResponse(
                (r) =>
                    r.url().includes("/api/v1/auth/login") &&
                    r.status() === 200,
            ),
            page.getByRole("button", { name: "LOGIN" }).click(),
        ]);
        await page.getByRole("link", { name: "Categories" }).click();
        await page.getByRole("button", { name: "admin" }).click();
        await page.getByRole("link", { name: "Dashboard" }).click();
        await page.getByRole("link", { name: "Create Product" }).click();
        await page.locator("#rc_select_0").click();
        await page.getByText(CATEGORY_NAME).nth(1).click();
        await page
            .locator("input[type='file'][name='photo']")
            .setInputFiles(path.join(__dirname, "fixtures/gaming_chair.jpeg"));
        await page.getByRole("textbox", { name: "write a name" }).click();
        await page
            .getByRole("textbox", { name: "write a name" })
            .fill("Gaming chair");
        await page
            .getByRole("textbox", { name: "write a description" })
            .click();
        await page
            .getByRole("textbox", { name: "write a description" })
            .fill("Chair for gaming");
        await page.getByPlaceholder("write a quantity").click();
        await page.getByPlaceholder("write a quantity").fill("2");
        await page.getByPlaceholder("write a price").click();
        await page.getByPlaceholder("write a price").fill("5000");
        await page.locator("#rc_select_1").click();
        await page.getByText("No").click();

        const [productRes] = await Promise.all([
            page.waitForResponse(
                (r) =>
                    r.url().includes("/api/v1/product/create-product") &&
                    r.status() === 201,
            ),
            page.getByRole("button", { name: "CREATE PRODUCT" }).click(),
        ]);
        createdProductId = (await productRes.json()).products._id;

        await page.getByRole("button", { name: "admin" }).click();
        await page.getByRole("link", { name: "Logout" }).click();
        await page.getByRole("link", { name: "Home" }).click();
        await page
            .getByRole("searchbox", { name: "Search" })
            .fill("Gaming chair");
        await page.getByRole("button", { name: "Search" }).click();
        await page
            .getByRole("button", { name: "More Details" })
            .first()
            .click();
        await expect(page.getByRole("main")).toContainText(
            "Name: Gaming chair",
        );
        await expect(page.getByRole("main")).toContainText(
            "Description: Chair for gaming",
        );
        await expect(page.getByRole("main")).toContainText("Price:$5,000.00");
        await expect(page.getByRole("main")).toContainText(
            `Category: ${CATEGORY_NAME}`,
        );
    });
});
