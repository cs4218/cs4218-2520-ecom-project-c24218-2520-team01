import { expect, test } from "@playwright/test";

const { describe } = test;

describe("Product viewing flow", () => {
    test("checks related products work and categories are correctly linked", async ({
        page,
    }) => {
        await page.goto("/");
        await page.getByRole("button", { name: "More Details" }).nth(1).click();

        let categoryText = await page
            .locator("h6", { hasText: "Category:" })
            .first()
            .textContent();

        await page
            .getByRole("button", { name: "More Details" })
            .first()
            .click();
        await expect(page.getByRole("main")).toContainText(categoryText);

        categoryText = await page
            .locator("h6", { hasText: "Category:" })
            .first()
            .textContent();

        await page
            .getByRole("button", { name: "More Details" })
            .first()
            .click();
        await expect(page.getByRole("main")).toContainText(categoryText);
    });
});
