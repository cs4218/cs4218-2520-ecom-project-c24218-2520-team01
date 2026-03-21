export default {
	// display name
	displayName: "integration",

	// when testing backend
	testEnvironment: "node",

	testMatch: ["<rootDir>/tests/integration/**/*.test.js"],

	// transform files with babel
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
		"^@remix-run/router$": "<rootDir>/node_modules/@remix-run/router/dist/router.cjs.js",
	},

	// module file extensions
	moduleFileExtensions: ["js", "json"],

	setupFiles: ["<rootDir>/jest.setup.js"],

	// test environment options
	testEnvironmentOptions: {
		experimentalEsmSupport: true,
	},

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
