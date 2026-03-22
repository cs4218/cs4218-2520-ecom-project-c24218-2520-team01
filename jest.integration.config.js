export default {
	// display name
	displayName: "integration",

	// integration tests in this suite exercise React component interactions.
	testEnvironment: "jest-environment-jsdom",

	// run all integration specs
	testMatch: ["<rootDir>/tests/integration/**/*.test.js"],

	// transform files with babel
	transform: {
		"^.+\\.js$": "babel-jest",
	},

	moduleNameMapper: {
		"\\.(css|scss)$": "<rootDir>/__mocks__/styleMock.js",
		"^react$": "<rootDir>/node_modules/react",
		"^react-dom$": "<rootDir>/node_modules/react-dom",
		"^react-router$": "<rootDir>/node_modules/react-router",
		"^react-router-dom$": "<rootDir>/node_modules/react-router-dom",
	},

	// module file extensions
	moduleFileExtensions: ["js", "json"],

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
