// Price Tampering / Checkout Security Tests
// Zaidan, A0273278U
//
// Report references:
//   AUTHZ-VULN-06 (Critical): Server trusted client-supplied prices without database
//     validation, allowing buyers to purchase items at arbitrary prices (e.g. $2,499
//     item for $0.01). Covered throughout "Manipulation of Prices" and "Server-Side Guardrails".

import express from "express";
import JWT from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import supertest from "supertest";

import { hashPassword } from "../../helpers/authHelper.js";
import categoryModel from "../../models/categoryModel.js";
import orderModel from "../../models/orderModel.js";
import productModel from "../../models/productModel.js";
import userModel from "../../models/userModel.js";
import productRoutes from "../../routes/productRoutes.js";
import { categories, products, users } from "./fixtures.js";

const app = express();
app.use(express.json());
app.use("/api/v1/product", productRoutes);

let mongod;
let userDoc, userToken;
let categoryDoc;
let productA, productB;

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());

    // Seed a regular user
    userDoc = await userModel.create({
        ...users.userA,
        password: await hashPassword(users.userA.password),
    });
    userToken = JWT.sign({ _id: userDoc._id }, process.env.JWT_SECRET);

    // Seed a category and two products with known prices
    categoryDoc = await categoryModel.create(categories.books);

    productA = await productModel.create({
        ...products.alpha,
        category: categoryDoc._id,
    });

    productB = await productModel.create({
        ...products.beta,
        category: categoryDoc._id,
    });
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
});

afterEach(async () => {
    await orderModel.deleteMany({});
});

// Helper functions to send over the requests

const cartItem = (product, overridePrice) => ({
    _id: product._id.toString(),
    name: product.name,
    price: overridePrice !== undefined ? overridePrice : product.price,
});

const pay = (nonce, cart) =>
    supertest(app)
        .post("/api/v1/product/braintree/payment")
        .set("Authorization", userToken)
        .send({ nonce, cart });

describe("Checkout", () => {
    describe("Authentication", () => {
        it("rejects payment with no Authorization header (401)", async () => {
            const res = await supertest(app)
                .post("/api/v1/product/braintree/payment")
                .send({
                    nonce: "valid-nonce",
                    cart: [cartItem(productA)],
                });

            expect(res.status).toBe(401);
        });

        it("rejects payment with a forged/invalid JWT (401)", async () => {
            const res = await supertest(app)
                .post("/api/v1/product/braintree/payment")
                .set("Authorization", "Bearer this.is.not.a.valid.jwt")
                .send({
                    nonce: "valid-nonce",
                    cart: [cartItem(productA)],
                });

            expect(res.status).toBe(401);
        });

        it("rejects payment with an expired JWT (401)", async () => {
            const expiredToken = JWT.sign(
                { _id: userDoc._id },
                process.env.JWT_SECRET,
                { expiresIn: "0s" },
            );

            const res = await supertest(app)
                .post("/api/v1/product/braintree/payment")
                .set("Authorization", expiredToken)
                .send({
                    nonce: "valid-nonce",
                    cart: [cartItem(productA)],
                });

            expect(res.status).toBe(401);
        });
    });

    describe("Input Validation", () => {
        it("rejects an empty cart (400)", async () => {
            const res = await pay("valid-nonce", []);
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it("rejects a missing cart field (400)", async () => {
            const res = await supertest(app)
                .post("/api/v1/product/braintree/payment")
                .set("Authorization", userToken)
                .send({ nonce: "valid-nonce" });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it("rejects a missing nonce field (400)", async () => {
            const res = await supertest(app)
                .post("/api/v1/product/braintree/payment")
                .set("Authorization", userToken)
                .send({ cart: [cartItem(productA)] });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    describe("Manipulation of Prices", () => {
        it("rejects a zero-price cart item (400)", async () => {
            const tamperedCart = [cartItem(productA, 0)];
            const res = await pay("fake-nonce-for-test", tamperedCart);
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it("rejects a negative price (400)", async () => {
            const tamperedCart = [
                cartItem(productA, productA.price), // 50
                cartItem(productB, -productB.price), // -30
            ];
            const res = await pay("fake-nonce-for-test", tamperedCart);
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it("rejects a drastically reduced price (400)", async () => {
            const tamperedCart = [cartItem(productA, 0.01)]; // real price is 50
            const res = await pay("fake-nonce-for-test", tamperedCart);
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it("rejects a NaN price (400)", async () => {
            const tamperedCart = [cartItem(productA, NaN)];
            const res = await pay("fake-nonce-for-test", tamperedCart);
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it("rejects a string price (400)", async () => {
            const tamperedCart = [{ ...cartItem(productA), price: "0" }];
            const res = await pay("fake-nonce-for-test", tamperedCart);
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it("rejects a cart containing a non-existent product (400)", async () => {
            const fakeId = new mongoose.Types.ObjectId().toString();
            const tamperedCart = [
                { _id: fakeId, name: "Ghost Item", price: 1 },
            ];
            const res = await pay("fake-nonce-for-test", tamperedCart);
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    describe("Server-Side Guardrails", () => {
        it("does not allow unauthenticated users to place any order", async () => {
            const before = await orderModel.countDocuments();

            await supertest(app)
                .post("/api/v1/product/braintree/payment")
                .send({ nonce: "nonce", cart: [cartItem(productA)] });

            const after = await orderModel.countDocuments();
            expect(after).toBe(before); // no order created
        });

        it("does not save an order for an empty cart", async () => {
            const before = await orderModel.countDocuments();

            await pay("nonce", []);

            const after = await orderModel.countDocuments();
            expect(after).toBe(before);
        });

        it("does not save an order when the nonce is missing", async () => {
            const before = await orderModel.countDocuments();

            await supertest(app)
                .post("/api/v1/product/braintree/payment")
                .set("Authorization", userToken)
                .send({ cart: [cartItem(productA)] });

            const after = await orderModel.countDocuments();
            expect(after).toBe(before);
        });
    });
});
