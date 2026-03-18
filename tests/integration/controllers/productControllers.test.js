// muhammad ZAIDAN bin sani (A0273278U)

import fs from "fs";
import path from "path";

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

import {
    createProductController,
    deleteProductController,
    getSingleProductController,
    productCountController,
    productFiltersController,
    productListController,
    productPhotoController,
    relatedProductController,
    searchProductController,
    updateProductController,
} from "../../../controllers/productController.js";
import categoryModel from "../../../models/categoryModel.js";
import productModel from "../../../models/productModel.js";

const FIXTURE_IMAGE = path.resolve(__dirname, "../fixtures/test-image.jpg");

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.set = jest.fn().mockReturnValue(res);
    return res;
};

let mongod;

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
});

/*
    Tests the Product Creation flow.
    * `controllers/productController.js` (specifically `createProductController`)
    * `models/productModel.js`, `models/categoryModel.js`
*/
describe("Admin create product (controller + db)", () => {
    let categoryId;

    beforeAll(async () => {
        const category = await categoryModel.create({
            name: "Category 1",
            slug: "category-1",
        });
        categoryId = category._id.toString();
    });

    afterAll(async () => {
        await categoryModel.deleteMany({});
    });

    afterEach(async () => {
        await productModel.deleteMany({});
    });

    describe("createProductController", () => {
        it("creates a product and persists it with correct slug, category, and photo", async () => {
            const req = {
                fields: {
                    name: "Test Laptop",
                    description: "A great laptop",
                    price: "999",
                    category: categoryId,
                    quantity: "5",
                },
                files: {
                    photo: {
                        path: FIXTURE_IMAGE,
                        type: "image/jpeg",
                        size: fs.statSync(FIXTURE_IMAGE).size,
                    },
                },
            };
            const res = mockRes();

            await createProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            const body = res.send.mock.calls[0][0];
            expect(body.success).toBe(true);
            expect(body.products.slug).toBe("Test-Laptop");

            const saved = await productModel.findOne({ name: "Test Laptop" });
            expect(saved).not.toBeNull();
            expect(saved.slug).toBe("Test-Laptop");
            expect(saved.category.toString()).toBe(categoryId);
            expect(saved.photo.data).toBeTruthy();
            expect(saved.photo.contentType).toMatch(/image/);
        });

        it("returns 500 when name is missing", async () => {
            const req = {
                fields: {
                    description: "A great laptop",
                    price: "999",
                    category: categoryId,
                    quantity: "5",
                },
                files: {
                    photo: {
                        path: FIXTURE_IMAGE,
                        type: "image/jpeg",
                        size: fs.statSync(FIXTURE_IMAGE).size,
                    },
                },
            };
            const res = mockRes();

            await createProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            const body = res.send.mock.calls[0][0];
            expect(body.error).toBe("Name is Required");
        });

        it("returns 500 when photo is missing", async () => {
            const req = {
                fields: {
                    name: "Test Laptop",
                    description: "A great laptop",
                    price: "999",
                    category: categoryId,
                    quantity: "5",
                },
                files: {},
            };
            const res = mockRes();

            await createProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            const body = res.send.mock.calls[0][0];
            expect(body.error).toBe("Photo is Required");
        });
    });
});

/*
    Tests the Product Pagination and Listing
    * `controllers/productController.js` (specifically `productListController`, `productCountController`)
    * `models/productModel.js`, `models/categoryModel.js`
*/
describe("Product pagination and listing (controller + db)", () => {
    let categoryId;
    const TOTAL_PRODUCTS = 9;

    describe("productListController", () => {
        beforeAll(async () => {
            const category = await categoryModel.create({
                name: "Category 1",
                slug: "category-1",
            });
            categoryId = category._id;

            // Page size 6 determined in productController.js
            // 9 products so page 1 has 6 and page 2 has 3
            const products = Array.from({ length: TOTAL_PRODUCTS }, (_, i) => ({
                name: `Product ${i + 1}`,
                slug: `product-${i + 1}`,
                description: `Description for product ${i + 1}`,
                price: (i + 1) * 10,
                category: categoryId,
                quantity: i + 1,
                photo: {
                    data: Buffer.from("fake"),
                    contentType: "image/jpeg",
                },
            }));
            await productModel.insertMany(products);
        });

        afterAll(async () => {
            await productModel.deleteMany({});
            await categoryModel.deleteMany({});
        });

        it("gets page 1 with 6 entries", async () => {
            const req = { params: { page: "1" } };
            const res = mockRes();

            await productListController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const body = res.send.mock.calls[0][0];
            expect(body.success).toBe(true);
            expect(body.products.length).toBe(6);
        });

        it("gets page 2 with 3 entries", async () => {
            const req = { params: { page: "2" } };
            const res = mockRes();

            await productListController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const body = res.send.mock.calls[0][0];
            expect(body.success).toBe(true);
            expect(body.products.length).toBe(3);
        });

        it("gets page 3, out of bounds, with 0 entries", async () => {
            const req = { params: { page: "3" } };
            const res = mockRes();

            await productListController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const body = res.send.mock.calls[0][0];
            expect(body.success).toBe(true);
            expect(body.products.length).toBe(0);
        });

        it("gets page 4, out of bounds, with 0 entries", async () => {
            const req = { params: { page: "4" } };
            const res = mockRes();

            await productListController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const body = res.send.mock.calls[0][0];
            expect(body.success).toBe(true);
            expect(body.products.length).toBe(0);
        });

        it("returns error with page 0", async () => {
            const req = { params: { page: "0" } };
            const res = mockRes();

            await productListController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            const body = res.send.mock.calls[0][0];
            expect(body.success).toBe(false);
            expect(body.message).toBe("error in per page ctrl");
        });

        it("returns error with page -1", async () => {
            const req = { params: { page: "-1" } };
            const res = mockRes();

            await productListController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            const body = res.send.mock.calls[0][0];
            expect(body.success).toBe(false);
            expect(body.message).toBe("error in per page ctrl");
        });
    });

    describe("productCountController", () => {
        afterEach(async () => {
            await productModel.deleteMany();
            await categoryModel.deleteMany();
        });

        it("gets the correct product count with items", async () => {
            const category = await categoryModel.create({
                name: "Category 1",
                slug: "category-1",
            });

            const products = Array.from({ length: TOTAL_PRODUCTS }, (_, i) => ({
                name: `Product ${i + 1}`,
                slug: `product-${i + 1}`,
                description: `Description for product ${i + 1}`,
                price: (i + 1) * 10,
                category: category._id,
                quantity: i + 1,
                photo: {
                    data: Buffer.from("fake"),
                    contentType: "image/jpeg",
                },
            }));
            await productModel.insertMany(products);

            const req = {};
            const res = mockRes();

            await productCountController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const body = res.send.mock.calls[0][0];
            expect(body.success).toBe(true);
            expect(body.total).toBe(TOTAL_PRODUCTS);
        });

        it("gets the correct product count with empty collection", async () => {
            const req = {};
            const res = mockRes();

            await productCountController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const body = res.send.mock.calls[0][0];
            expect(body.success).toBe(true);
            expect(body.total).toBe(0);
        });
    });
});

/*
Tests the Product Filters and Search
    * `controllers/productController.js` (specifically `productFiltersController`, `searchProductController`)
    * `models/productModel.js`, `models/categoryModel.js`
*/
describe("Product search and filters (controller + db)", () => {
    const PRODUCTS_PER_CATEGORY = 5;
    const CATEGORIES = 3;
    let insertedCategories;

    beforeAll(async () => {
        insertedCategories = await categoryModel.insertMany(
            Array.from({ length: CATEGORIES }, (_, i) => ({
                name: `Category ${i + 1}`,
                slug: `category-${i + 1}`,
            })),
        );

        const products = insertedCategories.flatMap((category, ci) =>
            Array.from({ length: PRODUCTS_PER_CATEGORY }, (_, i) => ({
                name: `Product ${ci * PRODUCTS_PER_CATEGORY + i + 1}`,
                slug: `product-${ci * PRODUCTS_PER_CATEGORY + i + 1}`,
                description: `Product ${ci * PRODUCTS_PER_CATEGORY + i + 1}. Item of Category ${ci + 1}`,
                price: (i + 1) * 10,
                category: category._id,
                quantity: ci * PRODUCTS_PER_CATEGORY + i + 1,
                photo: {
                    data: Buffer.from("fake"),
                    contentType: "image/jpeg",
                },
            })),
        );
        await productModel.insertMany(products);
    });

    afterAll(async () => {
        await productModel.deleteMany({});
        await categoryModel.deleteMany({});
    });

    describe("productFiltersController", () => {
        it("runs successfully without filters", async () => {
            const req = { body: { checked: [], radio: [] } };
            const res = mockRes();

            await productFiltersController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const body = res.send.mock.calls[0][0];
            expect(body.success).toBe(true);
            expect(body.products.length).toBe(
                PRODUCTS_PER_CATEGORY * CATEGORIES,
            );
        });

        it("runs successfully with just price filter", async () => {
            const PRODUCTS_PER_CATEGORY_IN_RANGE = 3;
            const req = { body: { checked: [], radio: [10, 30] } };
            const res = mockRes();

            await productFiltersController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const body = res.send.mock.calls[0][0];
            expect(body.success).toBe(true);
            expect(body.products.length).toBe(
                PRODUCTS_PER_CATEGORY_IN_RANGE * CATEGORIES,
            );
            body.products.forEach((p) => {
                expect(p.price).toBeGreaterThanOrEqual(10);
                expect(p.price).toBeLessThanOrEqual(30);
            });
        });

        describe("category filter", () => {
            it("runs successfully with 1 category filter", async () => {
                const req = {
                    body: { checked: [insertedCategories[0]._id], radio: [] },
                };
                const res = mockRes();

                await productFiltersController(req, res);

                expect(res.status).toHaveBeenCalledWith(200);
                const body = res.send.mock.calls[0][0];
                expect(body.success).toBe(true);
                expect(body.products.length).toBe(PRODUCTS_PER_CATEGORY);
                body.products.forEach((p) => {
                    expect(p.category.toString()).toBe(
                        insertedCategories[0]._id.toString(),
                    );
                });
            });

            it("runs successfully with >1 category filter", async () => {
                const req = {
                    body: {
                        checked: [
                            insertedCategories[0]._id,
                            insertedCategories[1]._id,
                        ],
                        radio: [],
                    },
                };
                const res = mockRes();

                await productFiltersController(req, res);

                expect(res.status).toHaveBeenCalledWith(200);
                const body = res.send.mock.calls[0][0];
                expect(body.success).toBe(true);
                expect(body.products.length).toBe(PRODUCTS_PER_CATEGORY * 2);
                body.products.forEach((p) => {
                    expect([
                        insertedCategories[0]._id.toString(),
                        insertedCategories[1]._id.toString(),
                    ]).toContain(p.category.toString());
                });
            });
        });

        it("runs successfully with both filters", async () => {
            const PRODUCTS_PER_CATEGORY_IN_RANGE = 3; // prices are (i+1)*10, range [10,30] matches i=0,1,2
            const req = {
                body: { checked: [insertedCategories[0]._id], radio: [10, 30] },
            };
            const res = mockRes();

            await productFiltersController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const body = res.send.mock.calls[0][0];
            expect(body.success).toBe(true);
            expect(body.products.length).toBe(PRODUCTS_PER_CATEGORY_IN_RANGE);
            body.products.forEach((p) => {
                expect(p.category.toString()).toBe(
                    insertedCategories[0]._id.toString(),
                );
                expect(p.price).toBeGreaterThanOrEqual(10);
                expect(p.price).toBeLessThanOrEqual(30);
            });
        });

        it("returns empty results with inverted price range", async () => {
            const req = { body: { checked: [], radio: [30, 10] } };
            const res = mockRes();

            await productFiltersController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const body = res.send.mock.calls[0][0];
            expect(body.success).toBe(true);
            expect(body.products.length).toBe(0);
        });

        it("returns empty results with non-existent category ID", async () => {
            const req = {
                body: { checked: [new mongoose.Types.ObjectId()], radio: [] },
            };
            const res = mockRes();

            await productFiltersController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const body = res.send.mock.calls[0][0];
            expect(body.success).toBe(true);
            expect(body.products.length).toBe(0);
        });

        it("returns 500 with invalid categoryID format", async () => {
            const req = { body: { checked: ["category1"], radio: [] } };
            const res = mockRes();

            await productFiltersController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            const body = res.send.mock.calls[0][0];
            expect(body.success).toBe(false);
            expect(body.message).toBe("Error while filtering products");
        });
    });

    describe("searchProductController", () => {
        it("returns results when keyword partially matches name", async () => {
            const req = { params: { keyword: "Product" } };
            const res = mockRes();

            await searchProductController(req, res);

            const results = res.json.mock.calls[0][0];
            expect(results.length).toBe(PRODUCTS_PER_CATEGORY * CATEGORIES);
            results.forEach((p) => {
                expect(p.name).toContain("Product");
            });
        });

        it("returns results when keyword matches description only", async () => {
            const req = { params: { keyword: "Category 1" } };
            const res = mockRes();

            await searchProductController(req, res);

            const results = res.json.mock.calls[0][0];
            expect(results.length).toBe(PRODUCTS_PER_CATEGORY);
            results.forEach((p) => {
                expect(p.description).toContain("Category 1");
            });
        });

        it("returns results case-insensitively", async () => {
            const req = { params: { keyword: "PRODUCT" } };
            const res = mockRes();

            await searchProductController(req, res);

            const results = res.json.mock.calls[0][0];
            expect(results.length).toBe(PRODUCTS_PER_CATEGORY * CATEGORIES);
            results.forEach((p) => {
                expect(p.description.toUpperCase()).toContain("PRODUCT");
            });
        });

        it("returns nothing when no match found", async () => {
            const req = { params: { keyword: "xyz" } };
            const res = mockRes();

            await searchProductController(req, res);

            const results = res.json.mock.calls[0][0];
            expect(results.length).toBe(0);
        });

        it("returns 400 when invalid regex character", async () => {
            const req = { params: { keyword: "(" } };
            const res = mockRes();

            await searchProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            const body = res.send.mock.calls[0][0];
            expect(body.success).toBe(false);
            expect(body.message).toBe("Error In Search Product API");
        });
    });
});

/*
Tests the Product Details
    * `controllers/productController.js` (specifically `getSingleProductController`, `relatedProductController`, `productPhotoController`)
    * `models/productModel.js`, `models/categoryModel.js`
*/
describe("Product details and related product (controller + db)", () => {
    let categoryId;
    let insertedProduct;

    beforeAll(async () => {
        const category = await categoryModel.create({
            name: "Category 1",
            slug: "category-1",
        });
        categoryId = category._id;

        insertedProduct = await productModel.create({
            name: "Product 1",
            slug: "product-1",
            description: "product-1",
            price: 999,
            category: categoryId,
            quantity: 5,
            photo: {
                data: Buffer.from("fake"),
                contentType: "image/jpeg",
            },
        });
    });

    afterAll(async () => {
        await productModel.deleteMany({});
        await categoryModel.deleteMany({});
    });

    describe("getSingleProductController", () => {
        it("returns the product when slug exists", async () => {
            const req = { params: { slug: "product-1" } };
            const res = mockRes();

            await getSingleProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const body = res.send.mock.calls[0][0];
            expect(body.success).toBe(true);
            expect(body.message).toBe("Single Product Fetched");
            expect(body.product.name).toBe("Product 1");
            expect(body.product.category._id.toString()).toBe(
                categoryId.toString(),
            );
        });

        it("returns 404 when slug does not exist", async () => {
            const req = { params: { slug: "non-existent-slug" } };
            const res = mockRes();

            await getSingleProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            const body = res.send.mock.calls[0][0];
            expect(body.success).toBe(false);
            expect(body.message).toBe("Product not found");
        });
    });

    describe("relatedProductController", () => {
        it("returns related products in the same category excluding the current product", async () => {
            await productModel.insertMany([
                {
                    name: "Product 2",
                    slug: "product-2",
                    description: "desc",
                    price: 50,
                    category: categoryId,
                    quantity: 1,
                    photo: {
                        data: Buffer.from("fake"),
                        contentType: "image/jpeg",
                    },
                },
                {
                    name: "Product 3",
                    slug: "product-3",
                    description: "desc",
                    price: 60,
                    category: categoryId,
                    quantity: 1,
                    photo: {
                        data: Buffer.from("fake"),
                        contentType: "image/jpeg",
                    },
                },
            ]);

            const req = {
                params: { pid: insertedProduct._id, cid: categoryId },
            };
            const res = mockRes();

            await relatedProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const body = res.send.mock.calls[0][0];
            expect(body.success).toBe(true);
            expect(body.products.length).toBe(2);
            body.products.forEach((p) => {
                expect(p._id.toString()).not.toBe(
                    insertedProduct._id.toString(),
                );
                expect(p.category._id.toString()).toBe(categoryId.toString());
            });

            await productModel.deleteMany({
                slug: { $in: ["product-2", "product-3"] },
            });
        });

        it("returns at most 3 related products", async () => {
            await productModel.insertMany(
                Array.from({ length: 4 }, (_, i) => ({
                    name: `Related ${i + 1}`,
                    slug: `related-${i + 1}`,
                    description: "desc",
                    price: 10,
                    category: categoryId,
                    quantity: 1,
                    photo: {
                        data: Buffer.from("fake"),
                        contentType: "image/jpeg",
                    },
                })),
            );

            const req = {
                params: { pid: insertedProduct._id, cid: categoryId },
            };
            const res = mockRes();

            await relatedProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const body = res.send.mock.calls[0][0];
            expect(body.products.length).toBe(3);

            await productModel.deleteMany({ slug: /^related-/ });
        });

        it("returns empty array when no related products exist", async () => {
            const req = {
                params: { pid: insertedProduct._id, cid: categoryId },
            };
            const res = mockRes();

            await relatedProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const body = res.send.mock.calls[0][0];
            expect(body.success).toBe(true);
            expect(body.products.length).toBe(0);
        });
    });

    describe("productPhotoController", () => {
        it("returns the photo when product exists and has photo data", async () => {
            const req = { params: { pid: insertedProduct._id } };
            const res = mockRes();

            await productPhotoController(req, res);

            expect(res.set).toHaveBeenCalledWith("Content-type", "image/jpeg");
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it("returns 404 when product does not exist", async () => {
            const req = { params: { pid: new mongoose.Types.ObjectId() } };
            const res = mockRes();

            await productPhotoController(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            const body = res.send.mock.calls[0][0];
            expect(body.success).toBe(false);
            expect(body.message).toBe("Product not found");
        });

        it("returns 404 when product exists but has no photo", async () => {
            const noPhotoProduct = await productModel.create({
                name: "No Photo",
                slug: "no-photo",
                description: "desc",
                price: 10,
                category: categoryId,
                quantity: 1,
                photo: { data: null, contentType: null },
            });

            const req = { params: { pid: noPhotoProduct._id } };
            const res = mockRes();

            await productPhotoController(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            const body = res.send.mock.calls[0][0];
            expect(body.success).toBe(false);
            expect(body.message).toBe("No photo available");

            // Cleanup
            await productModel.findByIdAndDelete(noPhotoProduct._id);
        });
    });
});

/*
    Tests the Updation and Deletion
    * `controllers/productController.js` (specifically `updateProductController`, `deleteProductController`)
    * `models/productModel.js`, `models/categoryModel.js`
*/
describe("Update and delete product (controller + db)", () => {
    let categoryId;
    let productId;

    beforeAll(async () => {
        const category = await categoryModel.create({
            name: "Category 1",
            slug: "category-1",
        });
        categoryId = category._id;
    });

    afterAll(async () => {
        await productModel.deleteMany({});
        await categoryModel.deleteMany({});
    });

    beforeEach(async () => {
        const product = await productModel.create({
            name: "Original Product",
            slug: "original-product",
            description: "Original description",
            price: 100,
            category: categoryId,
            quantity: 10,
            photo: {
                data: Buffer.from("fake"),
                contentType: "image/jpeg",
            },
        });
        productId = product._id;
    });

    afterEach(async () => {
        await productModel.deleteMany({});
    });

    describe("updateProductController", () => {
        it("updates product fields and persists changes to db", async () => {
            const req = {
                params: { pid: productId },
                fields: {
                    name: "Updated Product",
                    description: "Updated description",
                    price: "200",
                    category: categoryId.toString(),
                    quantity: "20",
                },
                files: {
                    photo: {
                        path: FIXTURE_IMAGE,
                        type: "image/jpeg",
                        size: fs.statSync(FIXTURE_IMAGE).size,
                    },
                },
            };
            const res = mockRes();

            await updateProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            const body = res.send.mock.calls[0][0];
            expect(body.success).toBe(true);
            expect(body.message).toBe("Product Updated Successfully");
            expect(body.products.name).toBe("Updated Product");

            const saved = await productModel.findById(productId);
            expect(saved.name).toBe("Updated Product");
            expect(saved.slug).toBe("Updated-Product");
            expect(saved.price).toBe(200);
            expect(saved.photo.data).toBeTruthy();
        });

        it("returns 500 when name is missing", async () => {
            const req = {
                params: { pid: productId },
                fields: {
                    description: "Updated description",
                    price: "200",
                    category: categoryId.toString(),
                    quantity: "20",
                },
                files: {
                    photo: {
                        path: FIXTURE_IMAGE,
                        type: "image/jpeg",
                        size: fs.statSync(FIXTURE_IMAGE).size,
                    },
                },
            };
            const res = mockRes();

            await updateProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            const body = res.send.mock.calls[0][0];
            expect(body.error).toBe("Name is Required");
        });

        it("returns 500 when photo is missing", async () => {
            const req = {
                params: { pid: productId },
                fields: {
                    name: "Updated Product",
                    description: "Updated description",
                    price: "200",
                    category: categoryId.toString(),
                    quantity: "20",
                },
                files: {},
            };
            const res = mockRes();

            await updateProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            const body = res.send.mock.calls[0][0];
            expect(body.error).toBe("Photo is Required");
        });

        it("returns 500 when product does not exist", async () => {
            const nonExistentId = new mongoose.Types.ObjectId();
            const req = {
                params: { pid: nonExistentId },
                fields: {
                    name: "Updated Product",
                    description: "Updated description",
                    price: "200",
                    category: categoryId.toString(),
                    quantity: "20",
                },
                files: {
                    photo: {
                        path: FIXTURE_IMAGE,
                        type: "image/jpeg",
                        size: fs.statSync(FIXTURE_IMAGE).size,
                    },
                },
            };
            const res = mockRes();

            await updateProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe("deleteProductController", () => {
        it("deletes an existing product and removes it from db", async () => {
            const req = { params: { pid: productId } };
            const res = mockRes();

            await deleteProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const body = res.send.mock.calls[0][0];
            expect(body.success).toBe(true);
            expect(body.message).toBe("Product deleted successfully");

            const deleted = await productModel.findById(productId);
            expect(deleted).toBeNull();
        });

        it("returns 404 when product does not exist", async () => {
            const nonExistentId = new mongoose.Types.ObjectId();
            const req = { params: { pid: nonExistentId } };
            const res = mockRes();

            await deleteProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            const body = res.send.mock.calls[0][0];
            expect(body.success).toBe(false);
            expect(body.message).toBe("Product does not exist");
        });

        it("returns 400 when product ID has invalid format", async () => {
            const req = { params: { pid: "not-a-valid-id" } };
            const res = mockRes();

            await deleteProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            const body = res.send.mock.calls[0][0];
            expect(body.success).toBe(false);
            expect(body.message).toBe("Invalid product ID format");
        });
    });
});
