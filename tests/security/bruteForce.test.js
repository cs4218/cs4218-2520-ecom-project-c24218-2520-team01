// Brute-Force / Rate-Limiting Security Tests
// Zaidan, A0273278U
//
// Report references:
//   AUTHZ-VULN-01 (Critical): Weak password reset mechanism allows account takeover
//     via guessed security answers with no rate limiting or brute force protection.
//     Fix: express-rate-limit middleware keyed by IP+email on POST /forgot-password.

import express from "express";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import supertest from "supertest";

import { hashPassword } from "../../helpers/authHelper.js";
import userModel from "../../models/userModel.js";
import authRoutes from "../../routes/authRoute.js";
import { users } from "./fixtures.js";

const app = express();
app.use(express.json());
app.use("/api/v1/auth", authRoutes);

let mongod;
let targetUser;

// The rate limiter allows 5 attempts per IP+email window (15 min).
const RATE_LIMIT = 5;

const resetAttempt = (email, answer) =>
    supertest(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email, answer, newPassword: "hacked123" });

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());

    targetUser = await userModel.create({
        ...users.userA,
        password: await hashPassword(users.userA.password),
    });
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
});

describe("Brute-force protection on POST /api/v1/auth/forgot-password", () => {
    // AUTHZ-VULN-01: Without rate limiting an attacker can submit unlimited guesses
    // for a security answer until they find the correct one.

    it("allows up to the rate-limit threshold of attempts", async () => {
        for (let i = 0; i < RATE_LIMIT; i++) {
            const res = await resetAttempt(targetUser.email, "wrong-answer");
            // Each attempt should be processed (404 = wrong answer, not 429)
            expect(res.status).toBe(404);
        }
    });

    it("returns 429 once the threshold is exceeded for the same email", async () => {
        // The previous test exhausted the 5 allowed attempts.
        // The next request must be rate-limited.
        const res = await resetAttempt(targetUser.email, users.userA.answer);
        expect(res.status).toBe(429);
        expect(res.body.success).toBe(false);
    });

    it("does not reset the password when rate-limited, even with the correct answer", async () => {
        // Confirm the password was not changed by the blocked attempt above.
        const res = await supertest(app)
            .post("/api/v1/auth/login")
            .send({ email: targetUser.email, password: users.userA.password });

        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
    });
});
