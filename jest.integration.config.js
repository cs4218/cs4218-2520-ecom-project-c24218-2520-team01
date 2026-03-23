export default {
	displayName: "integration",

	// Integration specs include backend HTTP flows and jsdom-based UI flows.
	testEnvironment: "jest-environment-jsdom",

	// Run all integration specs from the shared integration folder.
	testMatch: ["<rootDir>/tests/integration/**/*.test.js", "<rootDir>/client/src/tests/integration/**/*.test.js"],

	transform: {
		"^.+\\.js$": "babel-jest",
	},

	moduleNameMapper: {
		"\\.(css|scss)$": "identity-obj-proxy",
		"^react$": "<rootDir>/node_modules/react/index.js",
		"^react/jsx-runtime$": "<rootDir>/node_modules/react/jsx-runtime.js",
		"^react/jsx-dev-runtime$": "<rootDir>/node_modules/react/jsx-dev-runtime.js",
		"^react-dom$": "<rootDir>/node_modules/react-dom/index.js",
		"^react-dom/test-utils$": "<rootDir>/node_modules/react-dom/test-utils.js",
		"^react-router$": "<rootDir>/node_modules/react-router/dist/main.js",
		"^react-router-dom$": "<rootDir>/node_modules/react-router-dom/dist/main.js",
		"^@remix-run/router$":
			"<rootDir>/node_modules/@remix-run/router/dist/router.cjs.js",
		"^moment$": "<rootDir>/node_modules/moment/moment.js",
	},

	moduleFileExtensions: ["js", "json"],

	// Run before test files are evaluated so shared polyfills exist early.
	setupFiles: ["<rootDir>/jest.setup.js"],

	// Extend jsdom matchers and integration-specific environment setup.
	setupFilesAfterEnv: [
		"<rootDir>/client/src/setupTests.js",
		"<rootDir>/tests/integration/setup/jest.integration.setup.js",
	],

	testEnvironmentOptions: {
		experimentalEsmSupport: true,
		customExportConditions: ["node", "node-addons"],
		url: "http://127.0.0.1:3000/",
	},

	resetModules: true,
	clearMocks: true,
	restoreMocks: true,

	maxWorkers: 1,

	collectCoverage: true,
	collectCoverageFrom: ["routes/**/*.js"],
	coverageDirectory: "coverage/integration",
};
