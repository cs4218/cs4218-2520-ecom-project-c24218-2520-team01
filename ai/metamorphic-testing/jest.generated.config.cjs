// Configuration for Jest to run the generated metamorphic tests

module.exports = {
    displayName: "generated-mt",
    rootDir: "../..",
    testEnvironment: "node",
    testMatch: ["<rootDir>/ai/metamorphic-testing/output/*.test.js"],
    transform: {
        "^.+\\.js$": "babel-jest",
    },
    moduleFileExtensions: ["js", "json"],
    moduleNameMapper: {
        "^\\.\\./controllers/(.*)$": "<rootDir>/controllers/$1",
        "^\\.\\./models/(.*)$": "<rootDir>/models/$1",
    },
    collectCoverage: false
};
