import mongoose from "mongoose";
import dotenv from "dotenv";
import { readFileSync, unlinkSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Teardown for Playwright e2e tests
// Deletes all accounts and products created by setup and any users registered during tests

// Lim Jia Wei, A0277381W

/**
* AI Usage Declaration
*
* Tool Used: Gemini 3.1 Pro
*
* Prompt: How do I create a teardown file for Playwright e2e tests that deletes temporary admin, user, and test product accounts after tests run so I do not have to use hardcoded values
*
* How the AI Output Was Used:
* - Used some of the AI output as reference to develop the teardown file as shown below
*/

const __dirname = dirname(fileURLToPath(import.meta.url));
const CREDENTIALS_FILE = join(__dirname, ".test-credentials.json");
const EMAIL_LOG = join(__dirname, ".test-emails.json");

export default async function teardown() {

    dotenv.config({ path: join(__dirname, "../../.env.local") });

    const mongoUrl = process.env.MONGO_URL;
    if (!mongoUrl) {
        console.warn("[teardown] MONGO_URL not found, skipping DB cleanup");
        return;
    }

    const emailsToDelete = [];

    // for credentials
    if (existsSync(CREDENTIALS_FILE)) {
        try {
            const creds = JSON.parse(readFileSync(CREDENTIALS_FILE, "utf-8"));
            if (creds.admin?.email) emailsToDelete.push(creds.admin.email);
            if (creds.user?.email) emailsToDelete.push(creds.user.email);
        } catch { }
    }

    // for created emails
    if (existsSync(EMAIL_LOG)) {
        try {
            const registered = JSON.parse(readFileSync(EMAIL_LOG, "utf-8"));
            emailsToDelete.push(...registered);
        } catch { }
    }

    try {
        await mongoose.connect(mongoUrl);
        const db = mongoose.connection.db;

        // delete test users
        if (emailsToDelete.length > 0) {
            const userResult = await db.collection("users").deleteMany({ email: { $in: emailsToDelete } });
            console.log(`[teardown] Deleted ${userResult.deletedCount} test user(s): ${emailsToDelete.join(", ")}`);
        }

    } catch (err) {
        console.error("[teardown] DB cleanup failed:", err.message);
    } finally {
        await mongoose.disconnect();
        if (existsSync(CREDENTIALS_FILE)) unlinkSync(CREDENTIALS_FILE);
        if (existsSync(EMAIL_LOG)) unlinkSync(EMAIL_LOG);
    }
}
