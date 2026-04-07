// MongoDB Injection Security Tests
// Zaidan, A0273278U
//
// Report references:
//   INJ-VULN-01 (Critical):  Login authentication bypass via $ne/$gt/$regex NoSQL operators.
//   INJ-VULN-02 (High):      Registration DoS via $ne on email — always matches an existing user.
//   INJ-VULN-03 (Critical):  Account takeover via $ne on forgot-password answer field.
//   INJ-VULN-04 (Medium):    User enumeration via $regex on login email field.

import express from "express";
import JWT from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import supertest from "supertest";

import { hashPassword } from "../../helpers/authHelper.js";
import categoryModel from "../../models/categoryModel.js";
import userModel from "../../models/userModel.js";
import authRoutes from "../../routes/authRoute.js";
import categoryRoutes from "../../routes/categoryRoutes.js";
import { users } from "./fixtures.js";

let mongod;
let existingUser, adminUser;
let adminToken;

const app = express();
app.use(express.json());
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/category", categoryRoutes);

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());

    existingUser = await userModel.create({
        ...users.userA,
        password: await hashPassword(users.userA.password),
    });
    adminUser = await userModel.create({
        ...users.admin,
        password: await hashPassword(users.admin.password),
    });
    adminToken = JWT.sign({ _id: adminUser._id }, process.env.JWT_SECRET);

    await categoryModel.create({ name: "Electronics", slug: "electronics" });
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
});

describe("MongoDB Injection", () => {
    // INJ-VULN-01: Login bypass — userModel.findOne({ email }) accepted operator objects
    // because only truthiness was checked, not type. $ne, $gt, $regex all matched arbitrary users.
    // INJ-VULN-04: User enumeration — $regex patterns on email leaked which users exist.
    describe("POST /api/v1/auth/login", () => {
        it("does not authenticate when email is a $gt operator object", async () => {
            const res = await supertest(app)
                .post("/api/v1/auth/login")
                .send({ email: { $gt: "" }, password: "anything" });

            expect(res.status).not.toBe(200);
            expect(res.body.token).toBeUndefined();
        });

        it("does not authenticate when email is a $ne operator object", async () => {
            const res = await supertest(app)
                .post("/api/v1/auth/login")
                .send({ email: { $ne: null }, password: "anything" });

            expect(res.status).not.toBe(200);
            expect(res.body.token).toBeUndefined();
        });

        it("does not authenticate when email is a $regex operator object", async () => {
            const res = await supertest(app)
                .post("/api/v1/auth/login")
                .send({ email: { $regex: ".*" }, password: "anything" });

            expect(res.status).not.toBe(200);
            expect(res.body.token).toBeUndefined();
        });

        it("does not authenticate when password is an operator object", async () => {
            const res = await supertest(app)
                .post("/api/v1/auth/login")
                .send({ email: users.userA.email, password: { $gt: "" } });
            expect(res.body.token).toBeUndefined();
        });

        it("still authenticates correctly with valid credentials", async () => {
            const res = await supertest(app).post("/api/v1/auth/login").send({
                email: users.userA.email,
                password: users.userA.password,
            });

            expect(res.status).toBe(200);
            expect(res.body.token).toBeDefined();
        });
    });

    // INJ-VULN-03: Account takeover — userModel.findOne({ email, answer }) accepted operator
    // objects for both fields. $ne: null on answer always matched, bypassing the security check.
    describe("POST /api/v1/auth/forgot-password", () => {
        it("does not reset password when email is a $gt operator object", async () => {
            const res = await supertest(app)
                .post("/api/v1/auth/forgot-password")
                .send({
                    email: { $gt: "" },
                    answer: users.userA.answer,
                    newPassword: "hacked",
                });

            expect(res.status).not.toBe(200);
            expect(res.body.success).not.toBe(true);
        });

        it("does not reset password when answer is a $gt operator object", async () => {
            const res = await supertest(app)
                .post("/api/v1/auth/forgot-password")
                .send({
                    email: users.userA.email,
                    answer: { $gt: "" },
                    newPassword: "hacked",
                });

            expect(res.status).not.toBe(200);
            expect(res.body.success).not.toBe(true);
        });

        it("does not reset password when both email and answer are operator objects", async () => {
            const res = await supertest(app)
                .post("/api/v1/auth/forgot-password")
                .send({
                    email: { $ne: null },
                    answer: { $ne: null },
                    newPassword: "hacked",
                });

            expect(res.status).not.toBe(200);
            expect(res.body.success).not.toBe(true);
        });

        it("confirms the original password was not changed by injection attempts", async () => {
            // After the injection attempts above, the user should still log in with
            // their original password.
            const res = await supertest(app).post("/api/v1/auth/login").send({
                email: users.userA.email,
                password: users.userA.password,
            });

            expect(res.status).toBe(200);
            expect(res.body.token).toBeDefined();
        });
    });

    // INJ-VULN-02: Registration DoS — userModel.findOne({ email: {"$ne": null} }) always
    // returned a match, making the server treat every registration as a duplicate.
    describe("POST /api/v1/auth/register", () => {
        it("does not accept an operator object as the email field", async () => {
            const res = await supertest(app)
                .post("/api/v1/auth/register")
                .send({
                    name: "Injector",
                    email: { $gt: "" },
                    password: "password123",
                    phone: "55555555",
                    address: "Hack St",
                    answer: "hack",
                });

            // Should not create a user — either a validation error or a cast error.
            expect(res.status).not.toBe(201);
            expect(res.body.success).not.toBe(true);
        });
    });

    describe("GET /api/v1/category/single-category/:slug", () => {
        it("returns 404 for a non-existent slug, not a leaked document", async () => {
            const res = await supertest(app).get(
                "/api/v1/category/single-category/%24gt",
            );

            // $gt encoded as a URL segment is just the string "$gt" — no real category
            // has that slug, so the response must be 404 not a data leak.
            expect(res.status).toBe(404);
            expect(res.body.category).toBeUndefined();
        });

        it("returns the correct category for a valid slug", async () => {
            const res = await supertest(app).get(
                "/api/v1/category/single-category/electronics",
            );

            expect(res.status).toBe(200);
            expect(res.body.category.slug).toBe("electronics");
        });
    });
});
