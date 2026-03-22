import { expect, test } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { describe } = test;

describe("Category flow", () => {
    let authToken;
    let createdCategoryId;
    let createdProductId;

    test.afterAll(async ({ request }) => {
        if (createdProductId) {
            await request.delete(
                `/api/v1/product/delete-product/${createdProductId}`,
                {
                    headers: { Authorization: authToken },
                },
            );
        }
        if (createdCategoryId) {
            await request.delete(
                `/api/v1/category/delete-category/${createdCategoryId}`,
                {
                    headers: { Authorization: authToken },
                },
            );
        }
    });

    // muhammad ZAIDAN bin sani (A0273278U)
    test("creates a category, and a product within new category", async ({
        page,
    }) => {
        await page.goto("/");
        await page.getByRole("link", { name: "Categories" }).click();
        await page.getByRole("link", { name: "Login" }).click();
        await page
            .getByRole("textbox", { name: "Enter Your Email" })
            .fill("admin@admin.com");
        await page
            .getByRole("textbox", { name: "Enter Your Password" })
            .fill("admin");

        const [loginRes] = await Promise.all([
            page.waitForResponse(
                (r) =>
                    r.url().includes("/api/v1/auth/login") &&
                    r.status() === 200,
            ),
            page.getByRole("button", { name: "LOGIN" }).click(),
        ]);
        authToken = (await loginRes.json()).token;

        await page.getByRole("button", { name: "admin" }).click();
        await page.getByRole("link", { name: "Dashboard" }).click();
        await page.getByRole("link", { name: "Create Category" }).click();
        await page.getByRole("textbox", { name: "Enter new category" }).click();
        await page
            .getByRole("textbox", { name: "Enter new category" })
            .press("CapsLock");
        await page
            .getByRole("textbox", { name: "Enter new category" })
            .fill("");
        await page
            .getByRole("textbox", { name: "Enter new category" })
            .press("CapsLock");
        await page
            .getByRole("textbox", { name: "Enter new category" })
            .fill("Furniture");

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
        await page.getByText("Furniture").nth(2).click();
        await page
            .locator("input[type='file'][name='photo']")
            .setInputFiles(path.join(__dirname, "fixtures/gaming_chair.jpeg"));
        await page.getByRole("textbox", { name: "write a name" }).click();
        await page
            .getByRole("textbox", { name: "write a name" })
            .press("CapsLock");
        await page
            .getByRole("textbox", { name: "write a name" })
            .fill("Gaming ");
        await page
            .getByRole("textbox", { name: "write a name" })
            .press("CapsLock");
        await page
            .getByRole("textbox", { name: "write a name" })
            .fill("Gaming Chair");
        await page.getByRole("textbox", { name: "write a name" }).press("Tab");
        await page
            .getByRole("textbox", { name: "write a description" })
            .fill("chair for gaming");
        await page
            .getByRole("textbox", { name: "write a description" })
            .press("Tab");
        await page.getByPlaceholder("write a price").fill("50");
        await page.getByPlaceholder("write a price").press("Tab");
        await page.getByPlaceholder("write a quantity").fill("2");
        await page
            .locator("div")
            .filter({ hasText: /^Select Shipping$/ })
            .nth(1)
            .click();
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

        await page.getByRole("link", { name: "Categories" }).click();
        // Check that category shows up in dropdown
        await expect(
            page.locator(".dropdown-menu .dropdown-item", {
                hasText: "Furniture",
            }),
        ).toBeVisible();

        await page.getByRole("link", { name: "Furniture" }).click();
        // Check that product shows within category
        await expect(page.getByRole("main")).toContainText("Gaming Chair");
    });
});
