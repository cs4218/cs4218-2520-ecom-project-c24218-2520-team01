// @ts-check
import dotenv from "dotenv";
import { defineConfig, devices } from "@playwright/test";

dotenv.config({
	path: process.env.NODE_ENV === "production" ? ".env" : ".env.local",
});

export default defineConfig({
	testDir: "./tests/e2e",
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: 1,
	reporter: [["html", { open: "never" }]],
	webServer: [
		{
			command: "node scripts/start-server-e2e.mjs",
			url: "http://localhost:6060",
			name: "Backend",
			reuseExistingServer: !process.env.CI,
			timeout: 120 * 1000,
		},
		{
			command: "node scripts/start-client-e2e.mjs",
			url: "http://localhost:3000",
			name: "Frontend",
			reuseExistingServer: !process.env.CI,
			timeout: 180 * 1000,
		},
	],
	use: {
		baseURL: "http://localhost:3000",
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
		testIdAttribute: "data-testid",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	timeout: 60_000,
	expect: {
		timeout: 10000,
	},
});
