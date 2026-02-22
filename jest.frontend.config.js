export default {
	// name displayed during tests
	displayName: "frontend",

	// simulates browser environment in jest
	// e.g., using document.querySelector in your tests
	testEnvironment: "jest-environment-jsdom",

	// jest does not recognise jsx files by default, so we use babel to transform any jsx files
	transform: {
		"^.+\\.jsx?$": "babel-jest",
	},

	// tells jest how to handle css/scss imports in your tests
	moduleNameMapper: {
		"\\.(css|scss)$": "identity-obj-proxy",
	},

	// ignore all node_modules except styleMock (needed for css imports)
	transformIgnorePatterns: ["/node_modules/(?!(styleMock\\.js)$)"],

  // only run these tests
  testMatch: [
  	"<rootDir>/client/src/pages/Auth/*.test.js",
		"<rootDir>/client/src/context/*.test.js",
		"<rootDir>/client/src/components/Routes/*.test.js",
    "<rootDir>/client/src/components/Footer.test.js",
    "<rootDir>/client/src/components/Header.test.js",
    "<rootDir>/client/src/components/Layout.test.js",
    "<rootDir>/client/src/components/Spinner.test.js",
    "<rootDir>/client/src/pages/Contact.test.js",
    "<rootDir>/client/src/pages/Policy.test.js",
    "<rootDir>/client/src/pages/About.test.js",
    "<rootDir>/client/src/pages/Pagenotfound.test.js"
  ],

  // jest code coverage
  collectCoverage: true,
  collectCoverageFrom: [
    	"client/src/pages/Auth/**",
		"client/src/context/**",
		"client/src/components/Routes/**",
    "client/src/components/Footer.js",
    "client/src/components/Header.js",
    "client/src/components/Layout.js",
    "client/src/components/Spinner.js",
    "client/src/pages/Contact.js",
    "client/src/pages/Policy.js",
    "client/src/pages/About.js",
    "client/src/pages/Pagenotfound.js"
  ],
  coverageThreshold: {
    global: {
      lines: 100,
      functions: 100,
    },
  },
  setupFilesAfterEnv: ["<rootDir>/client/src/setupTests.js"],
};
