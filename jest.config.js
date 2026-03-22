// jest.config.js  (root)
export default {
    // Run each sub‑project with its own config / displayName
    projects: [
        "<rootDir>/jest.backend.config.js",
        "<rootDir>/jest.frontend-unit.config.js",
        "<rootDir>/jest.integration.config.js",
    ],

    // Collect coverage across all projects into a single report
    collectCoverage: true,
    collectCoverageFrom: [
        "controllers/**/*.js",
        "helpers/**/*.js",
        "middlewares/**/*.js",
        "config/**/*.js",
        "models/**/*.js",
        "routes/**/*.js",
        "client/src/**/*.js",
    ],
    coverageReporters: ["lcov", "text-summary"],
};
