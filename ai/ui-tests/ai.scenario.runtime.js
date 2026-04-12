/**
 * AI Usage Declaration
 *
 * Tool Used:
 * - OpenAI 5.4
 *
 * Prompt:
 * - Asked for help designing and refining an AI-assisted Stagehand scenario workflow.
 * - Asked for help splitting the implementation into smaller modules and improving generation, replay, and validation behavior.
 *
 * How the AI Output Was Used:
 * - Used the AI output as a reference and drafting aid for code organization, helper extraction, and wording.
 */

/**
 * High-Level Overview
 *
 * This file contains the Stagehand runtime helpers used by generation-time
 * validation and replay. It handles browser setup, waits, selector checks,
 * and execution of already-resolved steps.
 */

// Written by: A0273278U Zaidan & Wong Sheen Kerr (A0269647J)

import { LLMClient } from "@browserbasehq/stagehand";
import { DEFAULT_LOAD_STATE_TIMEOUT_MS } from "./ai.scenario.config.js";
import {
    normalizeComparisonText,
    normalizeWhitespace,
    sleep,
} from "./ai.scenario.shared.js";

// Runtime helpers configure Stagehand as a browser controller only. Replay
// must never make natural-language calls back into a model.
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

export function createStagehandConfig(runtimeConfig) {
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

export async function settlePage(page) {
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

export async function waitForCondition(predicate, timeoutMs, failureMessage) {
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

export function isNonCssSelector(selector) {
    const trimmedSelector = selector.trim();

    return (
        /^xpath=/i.test(trimmedSelector) ||
        trimmedSelector.startsWith("/") ||
        trimmedSelector.startsWith("(") ||
        /^text=/i.test(trimmedSelector)
    );
}

export async function waitForResolvedSelector(page, selector, timeoutMs) {
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
        `Expected selector "${selector}" to resolve to one visible element.`,
    );
}

export async function ensureSelectorIsUnique(page, selector, label) {
    const count = await page.locator(selector).count();

    if (count !== 1) {
        throw new Error(`${label} resolved to ${count} elements for selector "${selector}".`);
    }
}

export function createExecutionLogEntry(stepNumber, type, detail, status) {
    return {
        detail,
        status,
        step: stepNumber,
        type,
    };
}

export function resolveScenarioUrl(baseUrl, relativeUrl) {
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

async function runResolvedAssertion(page, step, timeoutMs) {
    await settlePage(page);

    if (step.type === "assertUrl") {
        await waitForCondition(
            async () => page.url().includes(step.includes),
            timeoutMs,
            `Expected URL to include "${step.includes}" but received "${page.url()}".`,
        );
        return;
    }

    if (step.type === "assertVisible") {
        await waitForResolvedSelector(page, step.selector, timeoutMs);
        return;
    }

    await waitForResolvedSelector(page, step.selector, timeoutMs);
    const expectedText = normalizeComparisonText(step.contains);

    await waitForCondition(
        async () => {
            const actualText = await readLocatorText(page, step.selector);
            return normalizeComparisonText(actualText).includes(expectedText);
        },
        timeoutMs,
        `Expected selector "${step.selector}" to include "${step.contains}".`,
    );
}

export async function executeResolvedStep(page, step, runtimeConfig) {
    // Resolved steps already contain concrete selectors or URLs. This layer just executes them
    // against the live page and waits for the DOM to settle between actions.
    switch (step.type) {
        case "goto":
            await page.goto(resolveScenarioUrl(runtimeConfig.appUrl, step.url), {
                timeoutMs: runtimeConfig.navigationTimeoutMs,
                waitUntil: "domcontentloaded",
            });
            await settlePage(page);
            return;
        case "click":
            await waitForResolvedSelector(page, step.selector, runtimeConfig.selectorTimeoutMs);
            await page.locator(step.selector).click();
            await settlePage(page);
            return;
        case "fill":
            await waitForResolvedSelector(page, step.selector, runtimeConfig.selectorTimeoutMs);
            await page.locator(step.selector).fill(step.value);
            await settlePage(page);
            return;
        case "select":
            await waitForResolvedSelector(page, step.selector, runtimeConfig.selectorTimeoutMs);
            await page.locator(step.selector).selectOption(step.value);
            await settlePage(page);
            return;
        case "assertUrl":
        case "assertText":
        case "assertVisible":
            await runResolvedAssertion(page, step, runtimeConfig.assertTimeoutMs);
            return;
        default:
            throw new Error(`Unsupported resolved step type "${step.type}".`);
    }
}
