// jest.config.js  (root)
export default {
  // Run each sub‑project with its own config / displayName
  projects: [
    "<rootDir>/jest.backend.config.js",
    "<rootDir>/jest.frontend-unit.config.js",
    "<rootDir>/jest.integration.config.js"
  ],

  // Collect coverage across all projects into a single report
  collectCoverage: true,
  collectCoverageFrom: [
    "controllers/**/*.js",
    "helpers/**/*.js",
    "middlewares/**/*.js",
    "config/**/*.js",
    "models/**/*.js",
    "client/src/pages/Auth/**/*.js",
    "client/src/context/**/*.js",
    "client/src/components/Routes/**/*.js",
    "client/src/components/UserMenu.js",
    "client/src/components/AdminMenu.js",
    "client/src/components/Form/CategoryForm.js",
    "client/src/pages/user/**/*.js",
    "client/src/pages/admin/**/*.js",
  ],
  coverageReporters: ["lcov", "text-summary"],
};
