export default {
	// display name
	displayName: "integration",

	// integration tests in this suite exercise React component interactions.
	testEnvironment: "jest-environment-jsdom",

	// which test to run
	testMatch: [
		"<rootDir>/tests/integration/**/*.test.js",
	],

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

	setupFilesAfterEnv: ["<rootDir>/client/src/setupTests.js"],

	// keep integration runs focused on behavior verification.
	collectCoverage: false,
};
