export default {
	// display name
	displayName: "integration",

	// use jsdom to support both Node backend tests and browser-like tests (with @jest-environment jsdom pragma)
	testEnvironment: "jsdom",

	// Run tests serially to avoid database conflicts
	maxWorkers: 1,

	// which test to run
	testMatch: [
		"<rootDir>/tests/integration/**/*.test.js",
	],

	// keep backend integration tests isolated from frontend jsdom tests
	testPathIgnorePatterns: ["<rootDir>/tests/integration/frontend/"],

	// transform files with babel
	transform: {
		"^.+\\.js$": "babel-jest",
	},

	// ensure a single React instance when integration tests import client components
	moduleNameMapper: {
		"^react$": "<rootDir>/node_modules/react",
		"^react-dom$": "<rootDir>/node_modules/react-dom",
		"^react/jsx-runtime$": "<rootDir>/node_modules/react/jsx-runtime.js",
		"^axios$": "<rootDir>/node_modules/axios/dist/node/axios.cjs",
	},

	// module file extensions
	moduleFileExtensions: ["js", "json"],

	// test environment options
	testEnvironmentOptions: {
		experimentalEsmSupport: true,
	},

	// ensure env is loaded before imports in tests
	setupFiles: ["<rootDir>/tests/integration/setup/jest.integration.setup.js"],

	// jest code coverage
	collectCoverage: true,
	collectCoverageFrom: ["models/**"],
	coverageThreshold: {
		global: {
			lines: 100,
			functions: 100,
		},
	},
};
