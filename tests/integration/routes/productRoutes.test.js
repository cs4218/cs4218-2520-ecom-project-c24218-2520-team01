// muhammad ZAIDAN bin sani (A0273278U)

import path from "path";

import express from "express";
import JWT from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import supertest from "supertest";

import categoryModel from "../../../models/categoryModel.js";
import productModel from "../../../models/productModel.js";
import userModel from "../../../models/userModel.js";
import productRoutes from "../../../routes/productRoutes.js";

const FIXTURE_IMAGE = path.resolve(__dirname, "../fixtures/test-image.jpg");

const app = express();
app.use(express.json());
app.use("/api/v1/product", productRoutes);

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
    Tests the POST /api/v1/product/create-product route.
    * `routes/productRoutes.js` 
    * `auth/middleware.js` (requireSignIn, isAdmin, formidable middlewares)
    * `controllers/productController.js` (createProductController)
    * `models/productModel.js`, `models/categoryModel.js`, `models/userModel.js`
*/
describe("POST /api/v1/product/create-product", () => {
    let categoryId;
    let adminToken;
    let userToken;

    beforeAll(async () => {
        const category = await categoryModel.create({
            name: "Category 1",
            slug: "category-1",
        });
        categoryId = category._id;

        const adminUser = await userModel.create({
            name: "Admin",
            email: "admin@test.com",
            password: "password",
            phone: "12345678",
            address: "123 Street",
            answer: "answer",
            role: 1,
        });
        adminToken = JWT.sign({ _id: adminUser._id }, process.env.JWT_SECRET);

        const regularUser = await userModel.create({
            name: "User",
            email: "user@test.com",
            password: "password",
            phone: "12345678",
            address: "123 Street",
            answer: "answer",
            role: 0,
        });
        userToken = JWT.sign({ _id: regularUser._id }, process.env.JWT_SECRET);
    });

    afterAll(async () => {
        await productModel.deleteMany({});
        await categoryModel.deleteMany({});
        await userModel.deleteMany({});
    });

    afterEach(async () => {
        await productModel.deleteMany({});
    });

    it("creates a product when request is made by an admin", async () => {
        const res = await supertest(app)
            .post("/api/v1/product/create-product")
            .set("Authorization", adminToken)
            .field("name", "Test Laptop")
            .field("description", "A great laptop")
            .field("price", "999")
            .field("category", categoryId.toString())
            .field("quantity", "5")
            .attach("photo", FIXTURE_IMAGE);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.products.name).toBe("Test Laptop");

        const saved = await productModel.findOne({ name: "Test Laptop" });
        expect(saved).not.toBeNull();
    });

    it("returns 401 when no token is provided", async () => {
        const res = await supertest(app)
            .post("/api/v1/product/create-product")
            .field("name", "Test Laptop")
            .field("description", "A great laptop")
            .field("price", "999")
            .field("category", categoryId.toString())
            .field("quantity", "5")
            .attach("photo", FIXTURE_IMAGE);

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });

    it("returns 401 when request is made by a non-admin user", async () => {
        const res = await supertest(app)
            .post("/api/v1/product/create-product")
            .set("Authorization", userToken)
            .field("name", "Test Laptop")
            .field("description", "A great laptop")
            .field("price", "999")
            .field("category", categoryId.toString())
            .field("quantity", "5")
            .attach("photo", FIXTURE_IMAGE);

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });
});

/*
    Tests the UPDATE /api/v1/product/update-product/:pid route
    * `routes/productRoutes.js`
    * `auth/middleware.js` (requireSignIn, isAdmin, formidable middlewares)
    * `controllers/productController.js` (updateProductController)
    * `models/productModel.js`, `models/categoryModel.js`
*/
describe("PUT /api/v1/product/update-product/:pid", () => {
    let categoryId;
    let productId;
    let adminToken;
    let userToken;

    beforeAll(async () => {
        const category = await categoryModel.create({
            name: "Category 2",
            slug: "category-2",
        });
        categoryId = category._id;

        const adminUser = await userModel.create({
            name: "Admin2",
            email: "admin2@test.com",
            password: "password",
            phone: "12345678",
            address: "123 Street",
            answer: "answer",
            role: 1,
        });
        adminToken = JWT.sign({ _id: adminUser._id }, process.env.JWT_SECRET);

        const regularUser = await userModel.create({
            name: "User2",
            email: "user2@test.com",
            password: "password",
            phone: "12345678",
            address: "123 Street",
            answer: "answer",
            role: 0,
        });
        userToken = JWT.sign({ _id: regularUser._id }, process.env.JWT_SECRET);
    });

    beforeEach(async () => {
        const product = await productModel.create({
            name: "Original Product",
            slug: "original-product",
            description: "Original description",
            price: 100,
            category: categoryId,
            quantity: 10,
            photo: { data: Buffer.from("fake"), contentType: "image/jpeg" },
        });
        productId = product._id;
    });

    afterEach(async () => {
        await productModel.deleteMany({});
    });

    afterAll(async () => {
        await categoryModel.deleteMany({ slug: "category-2" });
        await userModel.deleteMany({
            email: { $in: ["admin2@test.com", "user2@test.com"] },
        });
    });

    it("updates a product when request is made by an admin", async () => {
        const res = await supertest(app)
            .put(`/api/v1/product/update-product/${productId}`)
            .set("Authorization", adminToken)
            .field("name", "Updated Product")
            .field("description", "Updated description")
            .field("price", "200")
            .field("category", categoryId.toString())
            .field("quantity", "20")
            .attach("photo", FIXTURE_IMAGE);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.products.name).toBe("Updated Product");

        const saved = await productModel.findById(productId);
        expect(saved.name).toBe("Updated Product");
    });

    it("returns 401 when no token is provided", async () => {
        const res = await supertest(app)
            .put(`/api/v1/product/update-product/${productId}`)
            .field("name", "Updated Product")
            .field("description", "Updated description")
            .field("price", "200")
            .field("category", categoryId.toString())
            .field("quantity", "20")
            .attach("photo", FIXTURE_IMAGE);

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);

        const saved = await productModel.findById(productId);
        expect(saved.name).toBe("Original Product");
    });

    it("returns 401 when request is made by a non-admin user", async () => {
        const res = await supertest(app)
            .put(`/api/v1/product/update-product/${productId}`)
            .set("Authorization", userToken)
            .field("name", "Updated Product")
            .field("description", "Updated description")
            .field("price", "200")
            .field("category", categoryId.toString())
            .field("quantity", "20")
            .attach("photo", FIXTURE_IMAGE);

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);

        const saved = await productModel.findById(productId);
        expect(saved.name).toBe("Original Product");
    });
});

/*
    Tests the GET /api/v1/product/get-product route.
    * `routes/productRoutes.js`
    * `controllers/productController.js` (getProductController)
    * `models/productModel.js`, `models/categoryModel.js`
*/
describe("GET /api/v1/product/get-product", () => {
    let categoryId;

    beforeAll(async () => {
        const category = await categoryModel.create({
            name: "Category 1",
            slug: "category-1",
        });
        categoryId = category._id;

        await productModel.insertMany(
            Array.from({ length: 3 }, (_, i) => ({
                name: `Product ${i + 1}`,
                slug: `product-${i + 1}`,
                description: `Description ${i + 1}`,
                price: (i + 1) * 10,
                category: categoryId,
                quantity: i + 1,
                photo: { data: Buffer.from("fake"), contentType: "image/jpeg" },
            })),
        );
    });

    afterAll(async () => {
        await productModel.deleteMany({});
        await categoryModel.deleteMany({});
    });

    it("returns 200 with a list of products", async () => {
        const res = await supertest(app).get("/api/v1/product/get-product");

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.products.length).toBe(3);
        // photo field should be excluded
        res.body.products.forEach((p) => {
            expect(p.photo).toBeUndefined();
        });
    });
});

/*
    Tests the GET /api/v1/product/get-product/:slug route.
    * `routes/productRoutes.js`
    * `controllers/productController.js` (getSingleProductController)
    * `models/productModel.js`, `models/categoryModel.js`
*/
describe("GET /api/v1/product/get-product/:slug", () => {
    let categoryId;

    beforeAll(async () => {
        const category = await categoryModel.create({
            name: "Category 1",
            slug: "category-1",
        });
        categoryId = category._id;

        await productModel.insertMany(
            Array.from({ length: 3 }, (_, i) => ({
                name: `Product ${i + 1}`,
                slug: `product-${i + 1}`,
                description: `Description ${i + 1}`,
                price: (i + 1) * 10,
                category: categoryId,
                quantity: i + 1,
                photo: { data: Buffer.from("fake"), contentType: "image/jpeg" },
            })),
        );
    });

    afterAll(async () => {
        await productModel.deleteMany({});
        await categoryModel.deleteMany({});
    });

    it("returns 200 with a list of products", async () => {
        const res = await supertest(app).get(
            "/api/v1/product/get-product/product-1",
        );

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.product.name).toBe("Product 1");
    });
});

/*
    Tests the GET /api/v1/product/product-photo/:pid route.
    * `routes/productRoutes.js`
    * `controllers/productController.js` (productPhotoController)
    * `models/productModel.js`, `models/categoryModel.js`
*/
describe("GET /api/v1/product/product-photo/:pid", () => {
    let categoryId, productId;
    let photo = { data: Buffer.from("fake"), contentType: "image/jpeg" };

    beforeAll(async () => {
        const category = await categoryModel.create({
            name: "Category 1",
            slug: "category-1",
        });
        categoryId = category._id;

        const products = await productModel.insertMany(
            Array.from({ length: 3 }, (_, i) => ({
                name: `Product ${i + 1}`,
                slug: `product-${i + 1}`,
                description: `Description ${i + 1}`,
                price: (i + 1) * 10,
                category: categoryId,
                quantity: i + 1,
                photo: photo,
            })),
        );
        productId = products[0]._id;
    });

    afterAll(async () => {
        await productModel.deleteMany({});
        await categoryModel.deleteMany({});
    });

    it("returns 200 with a list of products", async () => {
        const res = await supertest(app).get(
            `/api/v1/product/product-photo/${productId}`,
        );

        expect(res.body).toEqual(Buffer.from("fake"));
    });
});

/*
    Tests the DELETE /delete-product/:pid route
    * `routes/productRoutes.js`
    * `auth/middleware.js` (requireSignIn, isAdmin, formidable middlewares)
    * `controllers/productController.js` (deleteProductController)
    * `models/productModel.js`, `models/categoryModel.js`
*/
describe("DELETE /delete-product/:pid", () => {
    let categoryId;
    let productId;
    let adminToken;
    let userToken;

    beforeAll(async () => {
        const category = await categoryModel.create({
            name: "Category 2",
            slug: "category-2",
        });
        categoryId = category._id;

        const adminUser = await userModel.create({
            name: "Admin2",
            email: "admin2@test.com",
            password: "password",
            phone: "12345678",
            address: "123 Street",
            answer: "answer",
            role: 1,
        });
        adminToken = JWT.sign({ _id: adminUser._id }, process.env.JWT_SECRET);

        const regularUser = await userModel.create({
            name: "User2",
            email: "user2@test.com",
            password: "password",
            phone: "12345678",
            address: "123 Street",
            answer: "answer",
            role: 0,
        });
        userToken = JWT.sign({ _id: regularUser._id }, process.env.JWT_SECRET);
    });

    beforeEach(async () => {
        const product = await productModel.create({
            name: "Original Product",
            slug: "original-product",
            description: "Original description",
            price: 100,
            category: categoryId,
            quantity: 10,
            photo: { data: Buffer.from("fake"), contentType: "image/jpeg" },
        });
        productId = product._id;
    });

    afterEach(async () => {
        await productModel.deleteMany({});
    });

    afterAll(async () => {
        await categoryModel.deleteMany({ slug: "category-2" });
        await userModel.deleteMany({
            email: { $in: ["admin2@test.com", "user2@test.com"] },
        });
    });

    it("deletes a product when request is made by an admin", async () => {
        const res = await supertest(app)
            .delete(`/api/v1/product/delete-product/${productId}`)
            .set("Authorization", adminToken);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.product.name).toBe("Original Product");

        const saved = await productModel.findById(productId);
        expect(saved).toBeNull();
    });

    it("returns 401 when no token is provided", async () => {
        const res = await supertest(app).delete(
            `/api/v1/product/delete-product/${productId}`,
        );

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);

        const saved = await productModel.findById(productId);
        expect(saved).not.toBeNull();
    });

    it("returns 401 when request is made by a non-admin user", async () => {
        const res = await supertest(app)
            .delete(`/api/v1/product/delete-product/${productId}`)
            .set("Authorization", userToken);

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);

        const saved = await productModel.findById(productId);
        expect(saved).not.toBeNull();
    });
});

/*
    Tests the POST /api/v1/product/product-filters route.
    * `routes/productRoutes.js`
    * `controllers/productController.js` (productFiltersController)
    * `models/productModel.js`, `models/categoryModel.js`
*/
describe("POST /api/v1/product/product-filters", () => {
    let categoryId;

    beforeAll(async () => {
        const category = await categoryModel.create({
            name: "Category 1",
            slug: "category-1",
        });
        categoryId = category._id;

        await productModel.insertMany(
            Array.from({ length: 3 }, (_, i) => ({
                name: `Product ${i + 1}`,
                slug: `product-${i + 1}`,
                description: `Description ${i + 1}`,
                price: (i + 1) * 10,
                category: categoryId,
                quantity: i + 1,
                photo: { data: Buffer.from("fake"), contentType: "image/jpeg" },
            })),
        );
    });

    afterAll(async () => {
        await productModel.deleteMany({});
        await categoryModel.deleteMany({});
    });

    it("returns 200 with a list of products", async () => {
        const res = await supertest(app)
            .post("/api/v1/product/product-filters")
            .send({
                radio: [10, 20],
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.products.length).toBe(2);
        res.body.products.forEach((p) => {
            expect(p.price).toBeGreaterThanOrEqual(10);
            expect(p.price).toBeLessThanOrEqual(20);
        });
    });
});

/*
    Tests the GET /api/v1/product/product-count route.
    * `routes/productRoutes.js`
    * `controllers/productController.js` (productCountController)
    * `models/productModel.js`, `models/categoryModel.js`
*/
describe("GET /api/v1/product-count", () => {
    let categoryId;

    beforeAll(async () => {
        const category = await categoryModel.create({
            name: "Category 1",
            slug: "category-1",
        });
        categoryId = category._id;

        await productModel.insertMany(
            Array.from({ length: 3 }, (_, i) => ({
                name: `Product ${i + 1}`,
                slug: `product-${i + 1}`,
                description: `Description ${i + 1}`,
                price: (i + 1) * 10,
                category: categoryId,
                quantity: i + 1,
                photo: { data: Buffer.from("fake"), contentType: "image/jpeg" },
            })),
        );
    });

    afterAll(async () => {
        await productModel.deleteMany({});
        await categoryModel.deleteMany({});
    });

    it("returns 200 with a list of products", async () => {
        const res = await supertest(app).get("/api/v1/product/product-count");

        expect(res.status).toBe(200);
        expect(res.body.total).toBe(3);
    });
});

/*
    Tests the GET /product-list/:page route.
    * `routes/productRoutes.js`
    * `controllers/productController.js` (productListController)
    * `models/productModel.js`, `models/categoryModel.js`
*/
describe("GET /api/v1/product/product-list/:page", () => {
    let categoryId;
    const PAGE_SIZE = 6;
    beforeAll(async () => {
        const category = await categoryModel.create({
            name: "Category 1",
            slug: "category-1",
        });
        categoryId = category._id;

        await productModel.insertMany(
            Array.from({ length: 10 }, (_, i) => ({
                name: `Product ${i + 1}`,
                slug: `product-${i + 1}`,
                description: `Description ${i + 1}`,
                price: (i + 1) * 10,
                category: categoryId,
                quantity: i + 1,
                photo: { data: Buffer.from("fake"), contentType: "image/jpeg" },
            })),
        );
    });

    afterAll(async () => {
        await productModel.deleteMany({});
        await categoryModel.deleteMany({});
    });

    it("returns 200 with a list of products", async () => {
        const res = await supertest(app).get(`/api/v1/product/product-list/1`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.products.length).toBe(PAGE_SIZE);
    });
});

/*
    Tests the GET /api/v1/product/search/:keyword route.
    * `routes/productRoutes.js`
    * `controllers/productController.js` (searchProductController)
    * `models/productModel.js`, `models/categoryModel.js`
*/
describe("GET /api/v1/product/search/:keyword", () => {
    let categoryId;
    const searchTerm = "Description 1";
    beforeAll(async () => {
        const category = await categoryModel.create({
            name: "Category 1",
            slug: "category-1",
        });
        categoryId = category._id;

        await productModel.insertMany(
            Array.from({ length: 3 }, (_, i) => ({
                name: `Product ${i + 1}`,
                slug: `product-${i + 1}`,
                description: `Description ${i + 1}`,
                price: (i + 1) * 10,
                category: categoryId,
                quantity: i + 1,
                photo: { data: Buffer.from("fake"), contentType: "image/jpeg" },
            })),
        );
    });

    afterAll(async () => {
        await productModel.deleteMany({});
        await categoryModel.deleteMany({});
    });

    it("returns 200 with a list of products", async () => {
        const res = await supertest(app).get(
            `/api/v1/product/search/${searchTerm}`,
        );

        expect(res.status).toBe(200);
        expect(res.body.length).toBe(1);
        res.body.forEach((p) => {
            expect(
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.description
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()),
            ).toBe(true);
        });
    });
});

/*
    Tests the GET /api/v1/product/related-product/:pid/:cid route.
    * `routes/productRoutes.js`
    * `controllers/productController.js` (relatedProductController)
    * `models/productModel.js`, `models/categoryModel.js`
*/
describe("GET /api/v1/product/related-product/:pid/:cid", () => {
    let categoryId;
    let currentProductId;

    beforeAll(async () => {
        const category = await categoryModel.create({
            name: "Category 1",
            slug: "category-1",
        });
        categoryId = category._id;

        const inserted = await productModel.insertMany(
            Array.from({ length: 3 }, (_, i) => ({
                name: `Product ${i + 1}`,
                slug: `product-${i + 1}`,
                description: `Description ${i + 1}`,
                price: (i + 1) * 10,
                category: categoryId,
                quantity: i + 1,
                photo: { data: Buffer.from("fake"), contentType: "image/jpeg" },
            })),
        );
        currentProductId = inserted[0]._id;
    });

    afterAll(async () => {
        await productModel.deleteMany({});
        await categoryModel.deleteMany({});
    });

    it("returns 200 with related products excluding the current product", async () => {
        const res = await supertest(app).get(
            `/api/v1/product/related-product/${currentProductId}/${categoryId}`,
        );

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.products.length).toBe(2);
        res.body.products.forEach((p) => {
            expect(p._id.toString()).not.toBe(currentProductId.toString());
            expect(p.photo).toBeUndefined();
        });
    });
});

/*
    Tests the GET /api/v1/product/product-category/:slug route.
    * `routes/productRoutes.js`
    * `controllers/productController.js` (productCategoryController)
    * `models/productModel.js`, `models/categoryModel.js`
*/
describe("GET /api/v1/product/product-category/:slug", () => {
    let categoryId;
    const slug = "category-1";

    beforeAll(async () => {
        const category = await categoryModel.create({
            name: "Category 1",
            slug: "category-1",
        });
        categoryId = category._id;

        await productModel.insertMany(
            Array.from({ length: 3 }, (_, i) => ({
                name: `Product ${i + 1}`,
                slug: `product-${i + 1}`,
                description: `Description ${i + 1}`,
                price: (i + 1) * 10,
                category: categoryId,
                quantity: i + 1,
                photo: { data: Buffer.from("fake"), contentType: "image/jpeg" },
            })),
        );
    });

    afterAll(async () => {
        await productModel.deleteMany({});
        await categoryModel.deleteMany({});
    });

    it("returns 200 with category and products", async () => {
        const res = await supertest(app).get(
            `/api/v1/product/product-category/${slug}`,
        );

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.category.name).toBe("Category 1");
        expect(res.body.products.length).toBe(3);
    });
});
