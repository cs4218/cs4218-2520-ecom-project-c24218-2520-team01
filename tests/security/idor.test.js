// Zaidan, A0273278U
// IDOR (Insecure Direct Object Reference) Security Tests
// Verifies users cannot access or modify resources belonging to other users.
//
// Report references:
//   AUTHZ-VULN-03 (Critical): Non-admin authenticated users can delete any product
//     in the database via IDOR, causing data loss. Covered in "Vertical IDOR: product deletion".

import express from "express";
import JWT from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import supertest from "supertest";

import orderModel from "../../models/orderModel.js";
import productModel from "../../models/productModel.js";
import userModel from "../../models/userModel.js";
import authRoutes from "../../routes/authRoute.js";
import productRoutes from "../../routes/productRoutes.js";
import { users } from "./fixtures.js";

let mongod;
let userA, userB, adminUser;
let tokenA, tokenB, adminToken;
let userAOrder, userBOrder;

const app = express();
app.use(express.json());
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/product", productRoutes);

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());

    userA = await userModel.create(users.userA);
    userB = await userModel.create(users.userB);
    adminUser = await userModel.create(users.admin);

    tokenA = JWT.sign({ _id: userA._id }, process.env.JWT_SECRET);
    tokenB = JWT.sign({ _id: userB._id }, process.env.JWT_SECRET);
    adminToken = JWT.sign({ _id: adminUser._id }, process.env.JWT_SECRET);

    const categoryId = new mongoose.Types.ObjectId();
    const product = await productModel.create({
        name: "Widget",
        slug: "widget",
        description: "A widget",
        price: 10,
        category: categoryId,
        quantity: 5,
        shipping: true,
    });

    userAOrder = await orderModel.create({
        products: [product._id],
        payment: { success: true, transactionId: "txn_a" },
        buyer: userA._id,
        status: "Not Process",
    });
    userBOrder = await orderModel.create({
        products: [product._id],
        payment: { success: true, transactionId: "txn_b" },
        buyer: userB._id,
        status: "Not Process",
    });
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
});

// Horizontal IDOR
// Checks for IDOR vulnerabilities horizontally (within users (same level of privilege))
describe("Horizontal IDOR", () => {
    describe("IDOR: GET /api/v1/auth/orders — users only see their own orders", () => {
        it("returns only User A's orders when authenticated as User A", async () => {
            const res = await supertest(app)
                .get("/api/v1/auth/orders")
                .set("Authorization", tokenA);

            expect(res.status).toBe(200);
            const orderIds = res.body.map((o) => o._id.toString());
            expect(orderIds).toContain(userAOrder._id.toString());
            expect(orderIds).not.toContain(userBOrder._id.toString());
        });

        it("returns only User B's orders when authenticated as User B", async () => {
            const res = await supertest(app)
                .get("/api/v1/auth/orders")
                .set("Authorization", tokenB);

            expect(res.status).toBe(200);
            const orderIds = res.body.map((o) => o._id.toString());
            expect(orderIds).toContain(userBOrder._id.toString());
            expect(orderIds).not.toContain(userAOrder._id.toString());
        });

        it("returns 401 with no token", async () => {
            const res = await supertest(app).get("/api/v1/auth/orders");
            expect(res.status).toBe(401);
        });
    });

    describe("IDOR: PUT /api/v1/auth/profile — users can only update their own profile", () => {
        it("allows User A to update her own profile", async () => {
            const res = await supertest(app)
                .put("/api/v1/auth/profile")
                .set("Authorization", tokenA)
                .send({ name: "User A Updated", phone: "99999999" });

            expect(res.status).toBe(200);
            expect(res.body.updatedUser.name).toBe("User A Updated");
        });

        it("does not modify User B's profile when User A updates her own", async () => {
            await supertest(app)
                .put("/api/v1/auth/profile")
                .set("Authorization", tokenA)
                .send({ name: "User A Again" });

            const localUserB = await userModel.findById(userB._id);
            expect(localUserB.name).toBe(users.userB.name);
        });

        it("returns 401 with no token", async () => {
            const res = await supertest(app)
                .put("/api/v1/auth/profile")
                .send({ name: "Hacker" });

            expect(res.status).toBe(401);
        });
    });
});

// Vertical IDOR
// Checks for IDOR vulnerabilities vertically (within users to admin)
describe("Vertical IDOR", () => {
    describe("IDOR: PUT /api/v1/auth/order-status/:orderId — only admin can update", () => {
        it("blocks User A from updating her own order status", async () => {
            const res = await supertest(app)
                .put(`/api/v1/auth/order-status/${userAOrder._id}`)
                .set("Authorization", tokenA)
                .send({ status: "Shipped" });

            expect(res.status).toBe(401);
        });

        it("blocks User A from updating User B's order status", async () => {
            const res = await supertest(app)
                .put(`/api/v1/auth/order-status/${userBOrder._id}`)
                .set("Authorization", tokenA)
                .send({ status: "Shipped" });

            expect(res.status).toBe(401);
        });

        it("allows admin to update any order's status", async () => {
            const res = await supertest(app)
                .put(`/api/v1/auth/order-status/${userAOrder._id}`)
                .set("Authorization", adminToken)
                .send({ status: "Processing" });

            expect(res.status).toBe(200);
        });

        it("returns 401 with no token", async () => {
            const res = await supertest(app)
                .put(`/api/v1/auth/order-status/${userAOrder._id}`)
                .send({ status: "Shipped" });

            expect(res.status).toBe(401);
        });
    });
    describe("IDOR: GET /api/v1/auth/all-orders — only admin can view all orders", () => {
        it("blocks regular user from viewing all orders", async () => {
            const res = await supertest(app)
                .get("/api/v1/auth/all-orders")
                .set("Authorization", tokenA);

            expect(res.status).toBe(401);
        });

        it("allows admin to view all orders", async () => {
            const res = await supertest(app)
                .get("/api/v1/auth/all-orders")
                .set("Authorization", adminToken);

            expect(res.status).toBe(200);
            const orderIds = res.body.map((o) => o._id.toString());
            expect(orderIds).toContain(userAOrder._id.toString());
            expect(orderIds).toContain(userBOrder._id.toString());
        });

        it("returns 401 with no token", async () => {
            const res = await supertest(app).get("/api/v1/auth/all-orders");
            expect(res.status).toBe(401);
        });
    });
    describe("IDOR: GET /api/v1/auth/all-users — only admin can list all users", () => {
        it("blocks regular user from listing all users", async () => {
            const res = await supertest(app)
                .get("/api/v1/auth/all-users")
                .set("Authorization", tokenA);

            expect(res.status).toBe(401);
        });

        it("allows admin to list all users", async () => {
            const res = await supertest(app)
                .get("/api/v1/auth/all-users")
                .set("Authorization", adminToken);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            const userIds = res.body.users.map((u) => u._id.toString());
            expect(userIds).toContain(userA._id.toString());
            expect(userIds).toContain(userB._id.toString());
        });

        it("returns 401 with no token", async () => {
            const res = await supertest(app).get("/api/v1/auth/all-users");
            expect(res.status).toBe(401);
        });
    });

    // AUTHZ-VULN-03 (Critical): Non-admin authenticated users could delete any product
    // via DELETE /api/v1/product/delete-product/:pid because the isAdmin middleware
    // was not properly enforced, allowing role=0 users to permanently destroy inventory.
    describe("IDOR: DELETE /api/v1/product/delete-product/:pid — only admin can delete", () => {
        let targetProduct;

        beforeAll(async () => {
            targetProduct = await productModel.create({
                name: "Deletable Widget",
                slug: "deletable-widget",
                description: "A product that should not be deletable by regular users",
                price: 99,
                category: new mongoose.Types.ObjectId(),
                quantity: 10,
                shipping: true,
            });
        });

        it("blocks a regular user from deleting a product (401)", async () => {
            const res = await supertest(app)
                .delete(`/api/v1/product/delete-product/${targetProduct._id}`)
                .set("Authorization", tokenA);

            expect(res.status).toBe(401);
        });

        it("does not remove the product from the database when a regular user attempts deletion", async () => {
            await supertest(app)
                .delete(`/api/v1/product/delete-product/${targetProduct._id}`)
                .set("Authorization", tokenA);

            const still = await productModel.findById(targetProduct._id);
            expect(still).not.toBeNull();
        });

        it("returns 401 with no token", async () => {
            const res = await supertest(app)
                .delete(`/api/v1/product/delete-product/${targetProduct._id}`);

            expect(res.status).toBe(401);
        });

        it("allows admin to delete a product (200)", async () => {
            const res = await supertest(app)
                .delete(`/api/v1/product/delete-product/${targetProduct._id}`)
                .set("Authorization", adminToken);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
});
