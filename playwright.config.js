// @ts-check
import dotenv from "dotenv";
import { defineConfig, devices } from "@playwright/test";

dotenv.config({
	path: process.env.NODE_ENV === "production" ? ".env" : ".env.local",
});

const frontendWebServerCommand =
	process.platform === "win32"
		? `cmd /c "set PORT=3000&& set REACT_APP_E2E_TEST=true&& set DANGEROUSLY_DISABLE_HOST_CHECK=true&& set BROWSER=none&& set CI=true&& npm start --prefix ./client"`
		: `PORT=3000 REACT_APP_E2E_TEST=true DANGEROUSLY_DISABLE_HOST_CHECK=true BROWSER=none CI=true npm start --prefix ./client`;

export default defineConfig({
	testDir: "./tests/e2e",
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: 1,
	reporter: [["html", { open: "never" }]],
	webServer: [
		{
			command: `node -e "process.env.NODE_ENV='test'; import('./server.js')"`,
			url: "http://localhost:6060",
			name: "Backend",
			reuseExistingServer: !process.env.CI,
			timeout: 120 * 1000,
		},
		{
			command: frontendWebServerCommand,
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
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	timeout: 20_000,
	expect: {
		timeout: 10000,
	},
});
