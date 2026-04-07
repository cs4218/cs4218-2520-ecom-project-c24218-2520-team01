// Session Replay Security Tests
// Zaidan, A0273278U
//
// A session replay attack occurs when an attacker captures a valid session token
// and reuses ("replays") it after it should no longer be trusted — e.g., after
// expiry, after the account is deleted, or after a password change.
//
// Tests cover:
//   1. Expired tokens are rejected.
//   2. Tokens for deleted users are rejected on all routes.
//   3. Tokens signed with a different secret are rejected.
//   4. A captured token cannot be replayed to impersonate a different user.
//   5. Privilege escalation via a replayed user token on admin-only routes.
//   6. Tokens captured before a password change must be invalidated.

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
import authRoutes from "../../routes/authRoute.js";
import { categories, products, users } from "./fixtures.js";

const app = express();
app.use(express.json());
app.use("/api/v1/auth", authRoutes);

let mongod;
let userA, userB, adminUser;
let tokenA, tokenB, adminToken;
let order;

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());

    userA = await userModel.create({
        ...users.userA,
        password: await hashPassword(users.userA.password),
    });
    userB = await userModel.create({
        ...users.userB,
        password: await hashPassword(users.userB.password),
    });
    adminUser = await userModel.create({
        ...users.admin,
        password: await hashPassword(users.admin.password),
    });

    tokenA = JWT.sign({ _id: userA._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
    });
    tokenB = JWT.sign({ _id: userB._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
    });
    adminToken = JWT.sign({ _id: adminUser._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
    });

    const category = await categoryModel.create(categories.books);
    const product = await productModel.create({
        ...products.alpha,
        category: category._id,
    });
    order = await orderModel.create({
        products: [product._id],
        payment: { success: true, transactionId: "txn_replay" },
        buyer: userA._id,
        status: "Not Process",
    });
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
});

describe("Session Replay", () => {
    describe("Expired-token replay", () => {
        it("rejects an expired token on a user-only route (401)", async () => {
            const expired = JWT.sign(
                { _id: userA._id },
                process.env.JWT_SECRET,
                {
                    expiresIn: "0s",
                },
            );

            const res = await supertest(app)
                .get("/api/v1/auth/user-auth")
                .set("Authorization", expired);

            expect(res.status).toBe(401);
        });

        it("rejects an expired token on an admin-only route (401)", async () => {
            const expired = JWT.sign(
                { _id: adminUser._id },
                process.env.JWT_SECRET,
                { expiresIn: "0s" },
            );

            const res = await supertest(app)
                .get("/api/v1/auth/all-orders")
                .set("Authorization", expired);

            expect(res.status).toBe(401);
        });

        it("rejects an expired token on a protected profile update (401)", async () => {
            const expired = JWT.sign(
                { _id: userA._id },
                process.env.JWT_SECRET,
                {
                    expiresIn: "0s",
                },
            );

            const res = await supertest(app)
                .put("/api/v1/auth/profile")
                .set("Authorization", expired)
                .send({ name: "Replay Attacker" });

            expect(res.status).toBe(401);
        });
    });

    describe("Deleted-user token replay", () => {
        // After an account is removed, its tokens are structurally valid but the
        // user no longer exists in the database.  Routes that look up req.user._id
        // (e.g. isAdmin, getOrders) should fail gracefully rather than granting access.

        let ghostToken;

        beforeAll(async () => {
            // Create a temporary user, capture a long-lived token, then delete the user.
            const ghost = await userModel.create({
                name: "Ghost",
                email: "ghost@test.com",
                password: await hashPassword("ghostpass"),
                phone: "99999999",
                address: "Ghost St",
                answer: "ghost",
                role: 0,
            });
            ghostToken = JWT.sign({ _id: ghost._id }, process.env.JWT_SECRET, {
                expiresIn: "7d",
            });
            await userModel.findByIdAndDelete(ghost._id);
        });

        it("does not grant access to user-auth with a deleted user's token (401)", async () => {
            const res = await supertest(app)
                .get("/api/v1/auth/user-auth")
                .set("Authorization", ghostToken);

            expect(res.status).toBe(401);
        });

        it("does not grant admin access with a deleted user's token (401)", async () => {
            // isAdmin calls userModel.findById — if the user is gone, user.role throws,
            // which is caught and returned as 401.
            const res = await supertest(app)
                .get("/api/v1/auth/all-orders")
                .set("Authorization", ghostToken);

            expect(res.status).toBe(401);
        });

        it("does not allow order-status update with a deleted user's token (401)", async () => {
            const res = await supertest(app)
                .put(`/api/v1/auth/order-status/${order._id}`)
                .set("Authorization", ghostToken)
                .send({ status: "Shipped" });

            expect(res.status).toBe(401);
        });
    });

    describe("Tampered-token replay", () => {
        // An attacker who captures a token and re-signs it with a different key, or
        // who simply alters the payload, should always be rejected.

        it("rejects a token signed with the wrong secret (401)", async () => {
            const forged = JWT.sign(
                { _id: userA._id },
                "this-is-not-the-real-secret",
                { expiresIn: "7d" },
            );

            const res = await supertest(app)
                .get("/api/v1/auth/orders")
                .set("Authorization", forged);

            expect(res.status).toBe(401);
        });

        it("rejects a token with an altered payload (role escalation) (401)", async () => {
            // Decode the header and payload without verification, mutate the role,
            // then reassemble with an invalid signature.
            const [header, , sig] = tokenA.split(".");
            const payload = JSON.parse(
                Buffer.from(tokenA.split(".")[1], "base64url").toString(),
            );
            payload.role = 1; // attempt privilege escalation
            const tamperedPayload = Buffer.from(
                JSON.stringify(payload),
            ).toString("base64url");
            const tamperedToken = `${header}.${tamperedPayload}.${sig}`;

            const res = await supertest(app)
                .get("/api/v1/auth/all-orders")
                .set("Authorization", tamperedToken);

            expect(res.status).toBe(401);
        });

        it("rejects a completely malformed token string (401)", async () => {
            const res = await supertest(app)
                .get("/api/v1/auth/orders")
                .set("Authorization", "not.a.valid.jwt.at.all");

            expect(res.status).toBe(401);
        });
    });

    describe("Cross-user token replay", () => {
        // Verifies that a valid token issued to one user cannot be replayed to act as
        // a different user or gain that user's data.

        it("User B's token cannot read User A's orders", async () => {
            const resA = await supertest(app)
                .get("/api/v1/auth/orders")
                .set("Authorization", tokenA);

            const resB = await supertest(app)
                .get("/api/v1/auth/orders")
                .set("Authorization", tokenB);

            const aOrders = resA.body.map((o) => o._id.toString());
            const bOrders = resB.body.map((o) => o._id.toString());

            // User A's order must appear only in User A's response
            expect(aOrders).toContain(order._id.toString());
            expect(bOrders).not.toContain(order._id.toString());
        });

        it("User A's token cannot update User B's profile (bound to token owner)", async () => {
            const before = await userModel.findById(userB._id);

            // tokenA is scoped to userA; profile updates use req.user._id from the token.
            // Even if an attacker sends tokenA hoping to modify userB, the server will
            // update userA's profile — userB's record must remain unchanged.
            await supertest(app)
                .put("/api/v1/auth/profile")
                .set("Authorization", tokenA)
                .send({ name: "Hijacked Name" });

            const after = await userModel.findById(userB._id);
            expect(after.name).toBe(before.name);
        });

        it("a regular user's token cannot be replayed on admin routes (401)", async () => {
            // tokenA belongs to a non-admin user; replaying it on admin-only routes
            // must be rejected even though the token itself is a valid, non-expired JWT.
            const res = await supertest(app)
                .get("/api/v1/auth/all-users")
                .set("Authorization", tokenA);

            expect(res.status).toBe(401);
        });

        it("a regular user's token cannot replay as admin to change order status (401)", async () => {
            const res = await supertest(app)
                .put(`/api/v1/auth/order-status/${order._id}`)
                .set("Authorization", tokenA)
                .send({ status: "Delivered" });

            expect(res.status).toBe(401);
        });
    });

    describe("Post-password-change token replay", () => {
        // Tokens embed a fingerprint (last 8 chars of the bcrypt hash) at issue time.
        // requireSignIn rejects any token whose fingerprint no longer matches the
        // current stored hash, invalidating tokens captured before a password change.

        it("rejects a token captured before a password change (401)", async () => {
            const victim = await userModel.create({
                name: "Victim",
                email: "victim@test.com",
                password: await hashPassword("originalPass"),
                phone: "55555555",
                address: "Victim St",
                answer: "victim",
                role: 0,
            });

            // Simulate a token issued at login: includes the password fingerprint
            // from the original password hash.
            const capturedToken = JWT.sign(
                { _id: victim._id, pwdFingerprint: victim.password.slice(-8) },
                process.env.JWT_SECRET,
                { expiresIn: "7d" },
            );

            await userModel.findByIdAndUpdate(victim._id, {
                password: await hashPassword("newPassword123"),
            });

            const res = await supertest(app)
                .get("/api/v1/auth/user-auth")
                .set("Authorization", capturedToken);

            expect(res.status).toBe(401);

            await userModel.findByIdAndDelete(victim._id);
        });

        it("rejects a token captured before account deletion on user-auth (401)", async () => {
            // requireSignIn must verify the user still exists in the DB, not just
            // that the JWT signature is valid.
            const transient = await userModel.create({
                name: "Transient",
                email: "transient@test.com",
                password: await hashPassword("pass"),
                phone: "44444444",
                address: "Transient St",
                answer: "transient",
                role: 0,
            });

            const capturedToken = JWT.sign(
                { _id: transient._id },
                process.env.JWT_SECRET,
                { expiresIn: "7d" },
            );

            await userModel.findByIdAndDelete(transient._id);

            const res = await supertest(app)
                .get("/api/v1/auth/user-auth")
                .set("Authorization", capturedToken);

            expect(res.status).toBe(401);
        });
    });
});
