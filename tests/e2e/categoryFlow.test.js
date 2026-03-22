import { expect, test } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { describe } = test;

const ADMIN = { email: "admin.e2e@example.com", password: "adminPass123" };
const CATEGORY_NAME = `E2E Furniture ${Date.now()}`;

describe("Category flow", () => {
    let authToken;
    let createdCategoryId;
    let createdProductId;

    test.beforeAll(async ({ request }) => {
        const loginRes = await request.post("/api/v1/auth/login", {
            data: { email: ADMIN.email, password: ADMIN.password },
        });
        ({ token: authToken } = await loginRes.json());
    });

    test.afterAll(async ({ request }) => {
        if (createdProductId) {
            await request.delete(
                `/api/v1/product/delete-product/${createdProductId}`,
                { headers: { Authorization: authToken } },
            );
        }
        if (createdCategoryId) {
            await request.delete(
                `/api/v1/category/delete-category/${createdCategoryId}`,
                { headers: { Authorization: authToken } },
            );
        }
    });

    // muhammad ZAIDAN bin sani (A0273278U)
    test("creates a category, and a product within new category", async ({
        page,
    }) => {
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

        await page.getByRole("button", { name: "Playwright Admin" }).click();
        await page.getByRole("link", { name: "Dashboard" }).click();
        await page.getByRole("link", { name: "Create Category" }).click();
        await page
            .getByRole("textbox", { name: "Enter new category" })
            .fill(CATEGORY_NAME);

        const [categoryRes] = await Promise.all([
            page.waitForResponse(
                (r) =>
                    r.url().includes("/api/v1/category/create-category") &&
                    r.status() === 201,
            ),
            page.getByRole("button", { name: "Submit" }).click(),
        ]);
        createdCategoryId = (await categoryRes.json()).category._id;

        await page.getByRole("link", { name: "Create Product" }).click();
        await page.locator("#rc_select_0").click();
        await page.locator(".ant-select-item-option-content", { hasText: CATEGORY_NAME }).waitFor({ state: "visible" });
        await page.locator(".ant-select-item-option-content", { hasText: CATEGORY_NAME }).click();
        await page
            .locator("input[type='file'][name='photo']")
            .setInputFiles(path.join(__dirname, "fixtures/gaming_chair.jpeg"));
        await page
            .getByRole("textbox", { name: "write a name" })
            .fill("Gaming Chair");
        await page
            .getByRole("textbox", { name: "write a description" })
            .fill("chair for gaming");
        await page.getByPlaceholder("write a price").fill("50");
        await page.getByPlaceholder("write a quantity").fill("2");
        await page.locator("#rc_select_1").click();
        await page.getByTitle("No").click();

        const [productRes] = await Promise.all([
            page.waitForResponse(
                (r) =>
                    r.url().includes("/api/v1/product/create-product") &&
                    r.status() === 201,
            ),
            page.getByRole("button", { name: "CREATE PRODUCT" }).click(),
        ]);
        createdProductId = (await productRes.json()).products._id;

        await page.getByRole("link", { name: "Categories" }).click();
        await expect(
            page.locator(".dropdown-menu .dropdown-item", {
                hasText: CATEGORY_NAME,
            }),
        ).toBeVisible();

        await page.getByRole("link", { name: CATEGORY_NAME }).click();
        await expect(page.getByRole("main")).toContainText("Gaming Chair");
    });
});
