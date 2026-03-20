import { expect, test } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { describe } = test;

describe("Category flow", () => {
    let createdProductId;

    test.afterAll(async ({ request }) => {
        if (createdProductId) {
            const loginRes = await request.post("/api/v1/auth/login", {
                data: { email: "admin@admin.com", password: "admin" },
            });
            const { token } = await loginRes.json();
            await request.delete(
                `/api/v1/product/delete-product/${createdProductId}`,
                { headers: { Authorization: token } },
            );
        }
    });

    // muhammad ZAIDAN bin sani (A0273278U)
    test("creates a product and checks details", async ({ page }) => {
        await page.goto("/");
        await page.getByRole("link", { name: "Login" }).click();
        await page
            .getByRole("textbox", { name: "Enter Your Email" })
            .fill("admin@admin.com");
        await page
            .getByRole("textbox", { name: "Enter Your Email" })
            .press("Tab");
        await page
            .getByRole("textbox", { name: "Enter Your Password" })
            .fill("admin");

        await Promise.all([
            page.waitForResponse(
                (r) => r.url().includes("/api/v1/auth/login") && r.status() === 200,
            ),
            page.getByRole("button", { name: "LOGIN" }).click(),
        ]);
        await page.getByRole("link", { name: "Categories" }).click();
        await page.getByRole("button", { name: "admin" }).click();
        await page.getByRole("link", { name: "Dashboard" }).click();
        await page.getByRole("link", { name: "Create Product" }).click();
        await page.locator("#rc_select_0").click();
        await page.getByText("Clothing").nth(1).click();
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
        await page
            .getByText(
                "Create ProductClothinggaming_chair.jpegChair for gamingSelect ShippingCREATE",
            )
            .click();
        await page.getByText("Clothinggaming_chair.").click();
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
            "Category: Clothing",
        );
    });
});
