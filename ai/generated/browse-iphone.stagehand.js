import { LLMClient, Stagehand } from "@browserbasehq/stagehand";
import dotenv from "dotenv";
import { pathToFileURL } from "node:url";

dotenv.config({ path: ".env.local" });
dotenv.config();

const SCENARIO = {
  "metadata": {
    "baseUrl": "http://localhost:3000",
    "generatedAt": "2026-04-10T16:43:12.400Z",
    "generatorModel": "glm-4.5-air:free",
    "goal": "Open the homepage, search for iPhone, and verify the results page",
    "name": "Browse iPhone"
  },
  "steps": [
    {
      "type": "goto",
      "url": "/"
    },
    {
      "selector": "input[aria-label=\"Search\"]",
      "type": "fill",
      "value": "iPhone"
    },
    {
      "selector": "button[type=\"submit\"]",
      "type": "click"
    },
    {
      "contains": "Search Results",
      "selector": "xpath=//h1[normalize-space(.)=\"Search Results\"]",
      "type": "assertText"
    }
  ]
};
const DEFAULT_ASSERT_TIMEOUT_MS = 10000;
const DEFAULT_FINAL_WAIT_MS = 10000;
const DEFAULT_LOAD_STATE_TIMEOUT_MS = 5000;
const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

class ReplayGuardLLMClient extends LLMClient {
  constructor() {
    super("stub/replay-only");
    this.type = "stub";
    this.hasVision = false;
    this.clientOptions = {};
  }

  async createChatCompletion() {
    throw new Error("LLM APIs are disabled during replay.");
  }
}

function getOptionalEnv(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }

  return undefined;
}

function readIntegerEnv(name, fallback) {
  const rawValue = process.env[name]?.trim();
  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  if (Number.isNaN(parsedValue)) {
    throw new Error('Environment variable ' + name + ' must be an integer. Received "' + rawValue + '".');
  }

  return parsedValue;
}

function readBooleanEnv(name, fallback = false) {
  const rawValue = process.env[name]?.trim().toLowerCase();
  if (!rawValue) {
    return fallback;
  }

  return TRUE_VALUES.has(rawValue);
}

function clampVerboseLevel(value) {
  if (value <= 0) {
    return 0;
  }

  if (value >= 2) {
    return 2;
  }

  return 1;
}

function normalizeWhitespace(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeComparisonText(value) {
  return normalizeWhitespace(value).toLowerCase().replace(/[^a-z0-9@._/-]+/g, " ").trim();
}

function createRuntimeConfig() {
  return {
    appUrl: getOptionalEnv("APP_BASE_URL") ?? SCENARIO.metadata.baseUrl,
    assertTimeoutMs: readIntegerEnv("AI_TEST_ASSERT_TIMEOUT_MS", DEFAULT_ASSERT_TIMEOUT_MS),
    finalWaitMs: readIntegerEnv("AI_TEST_FINAL_WAIT_MS", DEFAULT_FINAL_WAIT_MS),
    headless: readBooleanEnv("STAGEHAND_HEADLESS", false),
    verbose: clampVerboseLevel(readIntegerEnv("STAGEHAND_VERBOSE", 1)),
  };
}

function createStagehandConfig(runtimeConfig) {
  return {
    disableAPI: true,
    disablePino: true,
    env: "LOCAL",
    llmClient: new ReplayGuardLLMClient(),
    localBrowserLaunchOptions: {
      headless: runtimeConfig.headless,
    },
    verbose: runtimeConfig.verbose,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function settlePage(page) {
  try {
    await page.waitForLoadState("domcontentloaded", DEFAULT_LOAD_STATE_TIMEOUT_MS);
  } catch {
    // Ignore short navigation races.
  }

  try {
    await page.waitForLoadState("networkidle", DEFAULT_LOAD_STATE_TIMEOUT_MS);
  } catch {
    // Some pages keep polling; best effort is good enough here.
  }
}

async function waitForCondition(predicate, timeoutMs, failureMessage) {
  const deadline = Date.now() + timeoutMs;
  let lastError;

  while (Date.now() < deadline) {
    try {
      if (await predicate()) {
        return;
      }
    } catch (error) {
      lastError = error;
    }

    await sleep(200);
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error(failureMessage);
}

function isNonCssSelector(selector) {
  const trimmedSelector = selector.trim();

  return /^xpath=/i.test(trimmedSelector) || trimmedSelector.startsWith("/") || trimmedSelector.startsWith("(") || /^text=/i.test(trimmedSelector);
}

async function waitForResolvedSelector(page, selector, timeoutMs) {
  if (!isNonCssSelector(selector)) {
    await page.waitForSelector(selector, {
      state: "visible",
      timeout: timeoutMs,
    });
    return;
  }

  await waitForCondition(
    async () => {
      const locator = page.locator(selector);
      const count = await locator.count();
      if (count !== 1) {
        return false;
      }

      return locator.isVisible();
    },
    timeoutMs,
    'Expected selector "' + selector + '" to resolve to one visible element.',
  );
}

function resolveScenarioUrl(baseUrl, relativeUrl) {
  return new URL(relativeUrl, baseUrl).toString();
}

async function readLocatorText(page, selector) {
  const locator = page.locator(selector);

  try {
    return normalizeWhitespace(await locator.innerText());
  } catch {
    return normalizeWhitespace(await locator.textContent());
  }
}

function logEntry(stepNumber, step, detail, status) {
  return {
    detail,
    status,
    step: stepNumber,
    type: step.type,
  };
}

function describeStep(step) {
  switch (step.type) {
    case "goto":
      return step.url;
    case "click":
      return step.selector;
    case "fill":
      return step.selector + " => " + step.value;
    case "select":
      return step.selector + " => " + step.value;
    case "assertUrl":
      return step.includes;
    case "assertText":
      return step.selector + " => " + step.contains;
    case "assertVisible":
      return step.selector;
    default:
      return step.type;
  }
}

async function runResolvedAssertion(page, step, runtimeConfig) {
  await settlePage(page);

  if (step.type === "assertUrl") {
    await waitForCondition(
      async () => page.url().includes(step.includes),
      runtimeConfig.assertTimeoutMs,
      'Expected URL to include "' + step.includes + '" but received "' + page.url() + '".',
    );
    return;
  }

  if (step.type === "assertVisible") {
    await waitForResolvedSelector(page, step.selector, runtimeConfig.assertTimeoutMs);
    return;
  }

  await waitForResolvedSelector(page, step.selector, runtimeConfig.assertTimeoutMs);
  const expectedText = normalizeComparisonText(step.contains);

  await waitForCondition(
    async () => {
      const actualText = await readLocatorText(page, step.selector);
      return normalizeComparisonText(actualText).includes(expectedText);
    },
    runtimeConfig.assertTimeoutMs,
    'Expected selector "' + step.selector + '" to include "' + step.contains + '".',
  );
}

export async function runScenario() {
  const runtimeConfig = createRuntimeConfig();
  const executionLog = [];
  let stagehand;
  let page;

  try {
    stagehand = new Stagehand(createStagehandConfig(runtimeConfig));
    await stagehand.init();

    page = stagehand.context.pages()[0];
    if (!page) {
      throw new Error("Stagehand did not expose an active page after initialization.");
    }

    console.log("Scenario:", SCENARIO.metadata.name);
    console.log("Goal:", SCENARIO.metadata.goal);
    console.log("Generator model:", SCENARIO.metadata.generatorModel);

    await page.goto(resolveScenarioUrl(runtimeConfig.appUrl, "/"), {
      timeoutMs: 30000,
      waitUntil: "domcontentloaded",
    });
    await settlePage(page);

    for (const [index, step] of SCENARIO.steps.entries()) {
      const stepNumber = index + 1;
      console.log("Running step " + stepNumber + "/" + SCENARIO.steps.length + ": " + step.type + " -> " + describeStep(step));

      switch (step.type) {
        case "goto":
          await page.goto(resolveScenarioUrl(runtimeConfig.appUrl, step.url), {
            timeoutMs: 30000,
            waitUntil: "domcontentloaded",
          });
          await settlePage(page);
          break;
        case "click":
          await waitForResolvedSelector(page, step.selector, runtimeConfig.assertTimeoutMs);
          await page.locator(step.selector).click();
          await settlePage(page);
          break;
        case "fill":
          await waitForResolvedSelector(page, step.selector, runtimeConfig.assertTimeoutMs);
          await page.locator(step.selector).fill(step.value);
          await settlePage(page);
          break;
        case "select":
          await waitForResolvedSelector(page, step.selector, runtimeConfig.assertTimeoutMs);
          await page.locator(step.selector).selectOption(step.value);
          await settlePage(page);
          break;
        case "assertUrl":
        case "assertText":
        case "assertVisible":
          await runResolvedAssertion(page, step, runtimeConfig);
          break;
        default:
          throw new Error('Unsupported replay step type "' + step.type + '".');
      }

      executionLog.push(logEntry(stepNumber, step, describeStep(step), "passed"));
    }

    console.table(executionLog);
  } finally {
    if (page && runtimeConfig.finalWaitMs > 0) {
      await page.waitForTimeout(runtimeConfig.finalWaitMs);
    }

    if (stagehand) {
      await stagehand.close().catch(() => {});
    }
  }
}

async function main() {
  try {
    await runScenario();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
