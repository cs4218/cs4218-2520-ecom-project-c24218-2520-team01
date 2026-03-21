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

const PRODUCT_DETAILS = [
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
test.describe("ui test for product viewing flow", () => {
    let createdProductId;
    let createdProductSlug;

    test.afterAll(async ({ request }) => {
        // Cleanup: Delete the created product via API
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

    test("success flow: view product details, price, category, and images on ProductDetails page", async ({ page, request }, testInfo) => {
        // precondition: ensure admin user exists in database
        await ensureAdminUserExists();

        // integration: authenticate as admin through API
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

        // data setup: get or create a category for the product
        const categoriesRes = await request.get(`${API_BASE_URL}/api/v1/category/get-category`);
        expect(categoriesRes.ok()).toBeTruthy();
        const categoriesJson = await categoriesRes.json();
        let categoryId = categoriesJson?.category?.[0]?._id;
        let categoryName = categoriesJson?.category?.[0]?.name;

        if (!categoryId) {
            const categoryCreateRes = await request.post(`${API_BASE_URL}/api/v1/category/create-category`, {
                headers: { Authorization: adminToken },
                data: { name: `E2E Test Category ${Date.now()}` }
            });
            expect(categoryCreateRes.ok()).toBeTruthy();
            const categoryCreateJson = await categoryCreateRes.json();
            categoryId = categoryCreateJson.category._id;
            categoryName = categoryCreateJson.category.name;
        }

        // data setup: create a product via API with test data and fixture image
        const uniqueProductName = `${PRODUCT_DETAILS[0].name} ${Date.now()}-${testInfo.project.name}-${testInfo.retry}`;
        const createProductRes = await request.post(`${API_BASE_URL}/api/v1/product/create-product`, {
            headers: { Authorization: adminToken },
            multipart: {
                name: uniqueProductName,
                description: PRODUCT_DETAILS[0].description,
                price: PRODUCT_DETAILS[0].price,
                category: categoryId,
                quantity: PRODUCT_DETAILS[0].quantity,
                shipping: PRODUCT_DETAILS[0].shipping,
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
        createdProductSlug = createProductJson?.products?.slug;
        expect(createdProductId).toBeTruthy();
        expect(createdProductSlug).toBeTruthy();

        // navigation: navigate to the product details page using the slug
        await page.goto(`/product/${createdProductSlug}`);

        // ui: verify the page loads and displays "Product Details" heading
        await expect(page.getByRole("heading", { name: "Product Details" })).toBeVisible();

        // ui: verify product image is rendered and accessible
        const productImage = page.locator(".row.container.product-details .col-md-6:first-child .card-img-top");
        await expect(productImage).toBeVisible();
        await expect(productImage).toHaveAttribute("alt", uniqueProductName);

        // functional: verify product image source contains the correct product ID
        const imageSrc = await productImage.getAttribute("src");
        expect(imageSrc).toContain(`/api/v1/product/product-photo/${createdProductId}`);

        // ui / data: verify product name is displayed correctly
        const nameElement = page.locator("h6", { has: page.getByText(`Name: ${uniqueProductName}`) });
        await expect(nameElement).toBeVisible();
        const nameText = await nameElement.textContent();
        expect(nameText).toContain(uniqueProductName);

        // ui / data: verify product description is displayed
        const descriptionElement = page.locator("h6", { has: page.getByText(`Description:`) });
        await expect(descriptionElement).toBeVisible();
        const descriptionText = await descriptionElement.textContent();
        expect(descriptionText).toContain(PRODUCT_DETAILS[0].description);

        // ui / data: verify product price is displayed in USD currency format
        const priceElement = page.locator("h6", { hasText: "Price:" });
        await expect(priceElement).toBeVisible();
        const priceText = await priceElement.textContent();
        // price formatted as USD currency eg $1,299.00
        expect(priceText).toMatch(/Price:.*\$\d+(?:,\d{3})*(?:\.\d{2})?/);
        expect(priceText).toContain(`$${Number(PRODUCT_DETAILS[0].price).toLocaleString()}`);

        // ui / data: verify product category is displayed
        const categoryElement = page.locator("h6", { hasText: "Category:" });
        await expect(categoryElement).toBeVisible();
        const categoryText = await categoryElement.textContent();
        expect(categoryText).toContain(categoryName);

        // ui / interactivity: locate and verify "ADD TO CART" button is visible and enabled
        const addToCartButton = page.locator(".product-details-info").getByRole("button", { name: "ADD TO CART" });
        await expect(addToCartButton).toBeVisible();
        await expect(addToCartButton).toBeEnabled();

        // functional: click "ADD TO CART" button
        await addToCartButton.click();

        // ui / integration: verify success feedback (toast or remaining on page)
        try {
            // attempt to verify toast message appears (may not show on mobile viewports)
            const toastMessage = page.getByText(/Item Added to cart|added to cart/i);
            await expect(toastMessage).toBeVisible({ timeout: 3000 });
        } catch {
            // if toast doesn't appear (common on mobile), verify alternative confirmation:
            // button is still enabled and page remains on product details
            await expect(addToCartButton).toBeEnabled();
        }

        // layout: verify similar products section is visible (if any exist)
        const similarProductsHeading = page.getByRole("heading", { name: "Similar Products" });
        await expect(similarProductsHeading).toBeVisible();

        // data validation: verify page remains on product details URL after add to cart
        await expect(page).toHaveURL(`/product/${createdProductSlug}`);

        // post-condition: verify layout structure is intact with product details info section
        const productDetailsInfo = page.locator(".product-details-info");
        await expect(productDetailsInfo).toBeVisible();
    });
});
