import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Setup for Playwright e2e tests
// Creates temporary admin, user, and test product accounts before tests run

// Lim Jia Wei, A0277381W

/**
* AI Usage Declaration
*
* Tool Used: Gemini 3.1 Pro
*
* Prompt: How do I create a setup file for Playwright e2e tests that creates temporary admin, user, and test product accounts before tests run so I do not have to use hardcoded values
*
* How the AI Output Was Used:
* - Used some of the AI output as reference to develop the setup file as shown below
*/

const __dirname = dirname(fileURLToPath(import.meta.url));

// Store setup data so tests and teardown can read them
export const CREDENTIALS_FILE = join(__dirname, ".test-credentials.json");

// Store registration test emails for teardown
export const EMAIL_LOG = join(__dirname, ".test-emails.json");

export default async function setup() {

    dotenv.config({ path: join(__dirname, "../../.env.local") });

    const mongoUrl = process.env.MONGO_URL;
    if (!mongoUrl) throw new Error("[setup] MONGO_URL not found in .env.local");

    await mongoose.connect(mongoUrl);
    const db = mongoose.connection.db;

    // users
    const users = db.collection("users");
    const password = "thisIsMyPassword67!";
    const hashedPassword = await bcrypt.hash(password, 10);
    const ts = Date.now();

    const adminEmail = `e2eAdmin_${ts}@test.com`;
    const userEmail = `e2eUser_${ts}@test.com`;

    await users.insertOne({
        name: "E2E Admin",
        email: adminEmail,
        password: hashedPassword,
        phone: "11111111",
        address: "67 Admin Street",
        answer: "hellyea",
        role: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    await users.insertOne({
        name: "E2E User",
        email: userEmail,
        password: hashedPassword,
        phone: "22222222",
        address: "6767 User Street",
        answer: "hellyea",
        role: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    // write all setup data to a single file for tests and teardown
    writeFileSync(CREDENTIALS_FILE, JSON.stringify({
        admin: { email: adminEmail, password },
        user: { email: userEmail, password },
    }));

    console.log(`[setup] Created admin:   ${adminEmail}`);
    console.log(`[setup] Created user:    ${userEmail}`);
}
