export default {
    // display name
    displayName: "integration",

    // when testing backend
    testEnvironment: "node",

    // which test to run
    testMatch: ["<rootDir>/tests/integration/**/*.test.js"],

    // load environment variables for tests
    setupFiles: ["<rootDir>/tests/integration/setup.js"],

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
    collectCoverageFrom: ["models/**", "controllers/**", "middlewares/**"],
};
