export default {
	// display name
	displayName: "integration",

	// integration tests in this suite exercise React component interactions.
	testEnvironment: "jest-environment-jsdom",

	// which test to run
	testMatch: [
		"<rootDir>/tests/integration/models/*.test.js",
	],

	// transform files with babel
	transform: {
		"^.+\\.js$": "babel-jest",
	},

	// module file extensions
	moduleFileExtensions: ["js", "json"],

	setupFiles: ["<rootDir>/jest.setup.js"],

	setupFilesAfterEnv: [
		"<rootDir>/client/src/setupTests.js",
		"<rootDir>/tests/integration/setup/jest.integration.setup.js",
	],

	// avoid cross-file mock/module leakage in integration suite
	resetModules: true,
	clearMocks: true,
	restoreMocks: true,

	// run integration tests serially to avoid test DB/server collisions
	maxWorkers: 1,

	// keep integration runs focused on behavior verification.
	collectCoverage: false,
};
