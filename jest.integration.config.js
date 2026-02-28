export default {
	// display name
	displayName: "integration",

	// when testing backend
	testEnvironment: "node",

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
