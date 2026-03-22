import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Lim Jia Wei, A0277381W

const dirName = dirname(fileURLToPath(import.meta.url));
const CREDENTIALS_FILE = join(dirName, ".test-credentials.json");

function loadCredentials() {

    if (existsSync(CREDENTIALS_FILE)) {

        return JSON.parse(readFileSync(CREDENTIALS_FILE, "utf-8"));

    }

    // in the event setup fails - use hardcoded admin and user details
    return {
        admin: { email: "testadmin@gmail.com", password: "123" },
        user: { email: "testuser@gmail.com", password: "123" },
    };
}

const credentials = loadCredentials();

export const ADMIN_CREDENTIALS = credentials.admin;
export const USER_CREDENTIALS = credentials.user;

export async function loginAs(page, credentials) {

    await page.goto("/login");
    await page.fill('[placeholder="Enter Your Email"]', credentials.email);
    await page.fill('[placeholder="Enter Your Password"]', credentials.password);
    await page.click('button:has-text("LOGIN")');
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15000 });

}
