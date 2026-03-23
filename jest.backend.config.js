export default {
    // display name
    displayName: "backend",

    // when testing backend
    testEnvironment: "node",

	// which test to run
	testMatch: [
		"<rootDir>/controllers/*.test.js",
		"<rootDir>/helpers/*.test.js",
		"<rootDir>/middlewares/*.test.js",
		"<rootDir>/config/*.test.js",
		"<rootDir>/models/*.test.js"
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
	collectCoverageFrom: ["controllers/**", "helpers/**", "middlewares/**", "config/**", "models/**"],
	coverageThreshold: {
		global: {
			lines: 96,
			functions: 93,
		},
	},
};
