export default {
	// display name
	displayName: "integration",

	// when testing backend
	testEnvironment: "node",

	// which test to run
	testMatch: [
		"<rootDir>/tests/integration/models/*.test.js",
		"<rootDir>/tests/integration/controllers/*.test.js",
	],

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

	// jest code coverage
	collectCoverage: true,
	collectCoverageFrom: ["models/**", "controllers/**"],
	coverageThreshold: {
		global: {
			lines: 100,
			functions: 100,
		},
	},
};
