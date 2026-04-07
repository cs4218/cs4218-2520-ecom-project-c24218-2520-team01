export default {
    displayName: "security",

    testEnvironment: "node",

    testMatch: ["<rootDir>/tests/security/**/*.test.js"],

    transform: {
        "^.+\\.js$": "babel-jest",
    },

    moduleFileExtensions: ["js", "json"],

    setupFiles: ["<rootDir>/jest.setup.js"],

    setupFilesAfterEnv: [
        "<rootDir>/tests/integration/setup/jest.integration.setup.js",
    ],

    testEnvironmentOptions: {
        experimentalEsmSupport: true,
    },

    resetModules: true,
    clearMocks: true,
    restoreMocks: true,
    silent: true, // <-- suppresses all console output
    verbose: false,

    maxWorkers: 1,

    collectCoverage: true,
    collectCoverageFrom: [
        "routes/**/*.js",
        "controllers/**/*.js",
        "middlewares/**/*.js",
    ],
    coverageDirectory: "coverage/security",
};
