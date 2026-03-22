// muhammad zaidan bin sani (A0273278U)

import express from "express";
import JWT from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import supertest from "supertest";

import orderModel from "../../../models/orderModel.js";
import productModel from "../../../models/productModel.js";
import userModel from "../../../models/userModel.js";
import authRoutes from "../../../routes/authRoute.js";

let mongod;

let products, orders;
let adminUser, regularUser;
let adminToken, userToken;

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());

    adminUser = await userModel.create({
        name: "Admin",
        email: "admin@test.com",
        password: "password",
        phone: "12345678",
        address: "123 Street",
        answer: "answer",
        role: 1,
    });
    adminToken = JWT.sign({ _id: adminUser._id }, process.env.JWT_SECRET);

    regularUser = await userModel.create({
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

beforeEach(async () => {
    const categoryId = new mongoose.Types.ObjectId();
    const STATUSES = [
        "Not Process",
        "Processing",
        "Shipped",
        "Delivered",
        "Cancel",
    ];

    products = await productModel.insertMany(
        Array.from({ length: 4 }, (_, i) => ({
            name: `Product ${i + 1}`,
            slug: `product-${i + 1}`,
            description: `Description for product ${i + 1}`,
            price: (i + 1) * 10,
            category: categoryId,
            quantity: (i + 1) * 5,
            shipping: true,
        })),
    );

    orders = await orderModel.insertMany(
        Array.from({ length: 4 }, (_, i) => ({
            products: [products[i]._id],
            payment: { success: true, transactionId: `txn_test_00${i + 1}` },
            buyer: regularUser,
            status: STATUSES[i],
        })),
    );
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
});

const app = express();
app.use(express.json());
app.use("/api/v1/auth/", authRoutes);

describe("GET /api/v1/auth/orders", () => {
    it("returns 200 with user token", async () => {
        const res = await supertest(app)
            .get("/api/v1/auth/orders")
            .set("Authorization", userToken);

        expect(res.status).toBe(200);
    });
    it("returns 401 with no user token", async () => {
        const res = await supertest(app).get("/api/v1/auth/orders");

        expect(res.status).toBe(401);
    });
});

describe("GET /api/v1/auth/all-orders", () => {
    it("returns 200 with valid admin token", async () => {
        const res = await supertest(app)
            .get("/api/v1/auth/all-orders")
            .set("Authorization", adminToken);

        expect(res.status).toBe(200);
    });
    it("returns 401 with no user token", async () => {
        const res = await supertest(app).get("/api/v1/auth/all-orders");

        expect(res.status).toBe(401);
    });
    it("returns 401 with non-admin user token", async () => {
        const res = await supertest(app)
            .get("/api/v1/auth/all-orders")
            .set("Authorization", userToken);

        expect(res.status).toBe(401);
    });
});

describe("PUT /api/v1/auth/order-status/:orderId", () => {
    it("returns 200 with valid admin token", async () => {
        const orderId = orders[0]._id;
        const res = await supertest(app)
            .put(`/api/v1/auth/order-status/${orderId}`)
            .set("Authorization", adminToken)
            .send({ status: "Processing" });

        expect(res.status).toBe(200);
    });
    it("returns 401 with no user token", async () => {
        const orderId = orders[0]._id;
        const res = await supertest(app)
            .put(`/api/v1/auth/order-status/${orderId}`)
            .send({ status: "Processing" });

        expect(res.status).toBe(401);
    });
    it("returns 401 with non-admin user token", async () => {
        const orderId = orders[0]._id;
        const res = await supertest(app)
            .put(`/api/v1/auth/order-status/${orderId}`)
            .set("Authorization", userToken)
            .send({ status: "Processing" });

        expect(res.status).toBe(401);
    });
});
