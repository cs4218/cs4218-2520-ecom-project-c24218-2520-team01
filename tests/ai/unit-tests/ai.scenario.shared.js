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
 * This file contains shared constants and pure helpers.
 * It handles string normalization, template interpolation, semantic-step
 * normalization, and small formatting helpers reused across modules.
 */

import { DEFAULT_APP_URL } from "./ai.scenario.config.js";

// Shared constants and normalization helpers used across planning, resolution,
// runtime validation, and artifact rendering.
export const MAX_CANDIDATE_TEXT_LENGTH = 160;
export const MAX_PROMPT_CANDIDATES = 12;
export const ALLOWED_SEMANTIC_STEP_TYPES = new Set([
    "goto",
    "click",
    "fill",
    "select",
    "assertUrl",
    "assertText",
    "assertVisible",
]);
export const TARGET_STOP_WORDS = new Set([
    "a",
    "an",
    "and",
    "button",
    "click",
    "field",
    "for",
    "form",
    "input",
    "into",
    "link",
    "menu",
    "navigation",
    "nav",
    "of",
    "on",
    "option",
    "page",
    "select",
    "text",
    "the",
    "to",
    "type",
    "with",
]);
export const FORBIDDEN_ARTIFACT_PATTERNS = [
    { label: "OpenAI import", pattern: /\bimport\s+OpenAI\b/ },
    { label: "chat.completions call", pattern: /\bchat\.completions\b/ },
    { label: "stagehand.act call", pattern: /\bstagehand\.act\(/ },
    { label: "stagehand.observe call", pattern: /\bstagehand\.observe\(/ },
];
export const FORBIDDEN_UNRESOLVED_STEP_TOKENS = ['"target":', '"instruction":', '"assertion":'];
export const SELECTOR_STRATEGY_PRIORITY = {
    "data-testid": 100,
    id: 90,
    name: 85,
    href: 82,
    "aria-label": 78,
    placeholder: 74,
    type: 68,
    text: 54,
};
export const RESOLVED_STEP_REQUIRED_FIELDS = {
    goto: ["url"],
    click: ["selector"],
    fill: ["selector", "value"],
    select: ["selector", "value"],
    assertUrl: ["includes"],
    assertText: ["selector", "contains"],
    assertVisible: ["selector"],
};

export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function normalizeWhitespace(value) {
    return `${value ?? ""}`.replace(/\s+/g, " ").trim();
}

export function normalizeComparisonText(value) {
    // Normalize natural-language labels into a form that is stable enough for
    // fuzzy token matching without depending on exact casing or punctuation.
    return normalizeWhitespace(value)
        .toLowerCase()
        .replace(/[^a-z0-9@._/-]+/g, " ")
        .trim();
}

export function tokenizeTarget(value) {
    return (normalizeComparisonText(value).match(/[a-z0-9@._/-]+/g) ?? []).filter(
        (token) => token.length > 1 && !TARGET_STOP_WORDS.has(token),
    );
}

export function buildMeaningfulTarget(value) {
    const tokens = tokenizeTarget(value);
    return tokens.join(" ").trim();
}

export function firstNonEmpty(...values) {
    for (const value of values) {
        const normalized = normalizeWhitespace(value);
        if (normalized) {
            return normalized;
        }
    }

    return "";
}

export function ensureNonEmptyString(value, label) {
    if (typeof value !== "string" || !value.trim()) {
        throw new Error(`${label} must be a non-empty string.`);
    }

    return value.trim();
}

function coerceTemplateValue(key, value) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return `${value}`;
    }

    throw new Error(
        `Variable "${key}" must be a string, number, or boolean to be inlined into the generated scenario.`,
    );
}

export function resolveTemplatedString(value, variables, contextLabel) {
    if (typeof value !== "string" || !value.trim()) {
        throw new Error(`${contextLabel} must be a non-empty string.`);
    }

    // Variable interpolation happens before any browser work so missing inputs
    // fail fast and never produce a partially resolved scenario.
    const placeholderPattern = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

    return value.replace(placeholderPattern, (match, key) => {
        if (!(key in variables)) {
            throw new Error(`Missing variable "${key}" referenced by ${contextLabel}.`);
        }

        return coerceTemplateValue(key, variables[key]);
    });
}

function normalizeRelativeUrl(url, baseUrl) {
    const trimmedUrl = normalizeWhitespace(url);
    if (!trimmedUrl) {
        throw new Error("Scenario URL cannot be empty.");
    }

    if (/^https?:\/\//i.test(trimmedUrl)) {
        const absoluteUrl = new URL(trimmedUrl);
        const base = new URL(baseUrl);

        if (absoluteUrl.origin !== base.origin) {
            throw new Error(`Scenario URLs must stay on ${base.origin}. Received ${trimmedUrl}.`);
        }

        return `${absoluteUrl.pathname}${absoluteUrl.search}${absoluteUrl.hash}` || "/";
    }

    if (trimmedUrl.startsWith("/")) {
        return trimmedUrl;
    }

    if (trimmedUrl.startsWith("?") || trimmedUrl.startsWith("#")) {
        return `/${trimmedUrl}`;
    }

    return `/${trimmedUrl.replace(/^\.?\//, "")}`;
}

function normalizeUrlIncludes(value, baseUrl) {
    const trimmedValue = normalizeWhitespace(value);
    if (!trimmedValue) {
        throw new Error("URL assertion includes cannot be empty.");
    }

    if (/^https?:\/\//i.test(trimmedValue)) {
        return normalizeRelativeUrl(trimmedValue, baseUrl);
    }

    return trimmedValue;
}

function normalizeTargetStep(rawStep, index) {
    return {
        type: rawStep.type,
        target: ensureNonEmptyString(rawStep.target, `Step ${index + 1} target`),
    };
}

function normalizeFillLikeStep(rawStep, index, variables) {
    return {
        ...normalizeTargetStep(rawStep, index),
        value: resolveTemplatedString(
            ensureNonEmptyString(rawStep.value, `Step ${index + 1} value`),
            variables,
            `step ${index + 1} value`,
        ),
    };
}

function assertValidSemanticStep(rawStep, index) {
    if (!rawStep || typeof rawStep !== "object") {
        throw new Error(`Step ${index + 1} is not a valid object.`);
    }

    if (!ALLOWED_SEMANTIC_STEP_TYPES.has(rawStep.type)) {
        throw new Error(`Step ${index + 1} has an unsupported type "${rawStep.type}".`);
    }
}

function normalizeGotoStep(rawStep, index, variables, baseUrl) {
    return {
        type: "goto",
        url: normalizeRelativeUrl(
            resolveTemplatedString(
                ensureNonEmptyString(rawStep.url, `Step ${index + 1} url`),
                variables,
                `step ${index + 1} url`,
            ),
            baseUrl,
        ),
    };
}

function normalizeAssertUrlStep(rawStep, index, variables, baseUrl) {
    return {
        type: "assertUrl",
        includes: normalizeUrlIncludes(
            resolveTemplatedString(
                ensureNonEmptyString(rawStep.includes, `Step ${index + 1} includes`),
                variables,
                `step ${index + 1} includes`,
            ),
            baseUrl,
        ),
    };
}

function normalizeAssertTextStep(rawStep, index, variables) {
    return {
        ...normalizeTargetStep(rawStep, index),
        type: "assertText",
        contains: resolveTemplatedString(
            ensureNonEmptyString(rawStep.contains, `Step ${index + 1} contains`),
            variables,
            `step ${index + 1} contains`,
        ),
    };
}

function normalizeSemanticStep(rawStep, index, variables, baseUrl) {
    assertValidSemanticStep(rawStep, index);

    switch (rawStep.type) {
        case "goto":
            return normalizeGotoStep(rawStep, index, variables, baseUrl);
        case "click":
        case "assertVisible":
            return normalizeTargetStep(rawStep, index);
        case "fill":
        case "select":
            return normalizeFillLikeStep(rawStep, index, variables);
        case "assertUrl":
            return normalizeAssertUrlStep(rawStep, index, variables, baseUrl);
        case "assertText":
            return normalizeAssertTextStep(rawStep, index, variables);
        default:
            throw new Error(`Step ${index + 1} has an unsupported type "${rawStep.type}".`);
    }
}

export function normalizeSemanticScenario(rawScenario, variables = {}, baseUrl = DEFAULT_APP_URL) {
    // Planner output is validated here so the browser only sees a strict DSL.
    if (!rawScenario || typeof rawScenario !== "object") {
        throw new Error("The planner must return a JSON object.");
    }

    if (!Array.isArray(rawScenario.steps) || rawScenario.steps.length === 0) {
        throw new Error('The planner returned no executable steps in the "steps" array.');
    }

    return {
        name: typeof rawScenario.name === "string" ? rawScenario.name.trim() : "",
        steps: rawScenario.steps.map((rawStep, index) =>
            normalizeSemanticStep(rawStep, index, variables, baseUrl),
        ),
    };
}

export function makeSlug(value) {
    const slug = normalizeComparisonText(value)
        .replace(/[@._/]+/g, "-")
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");

    return slug || "generated-scenario";
}

export function describeSemanticStep(step) {
    switch (step.type) {
        case "goto":
            return `goto ${step.url}`;
        case "click":
            return `click ${step.target}`;
        case "fill":
            return `fill ${step.target} => ${step.value}`;
        case "select":
            return `select ${step.target} => ${step.value}`;
        case "assertUrl":
            return `assertUrl ${step.includes}`;
        case "assertText":
            return `assertText ${step.target} => ${step.contains}`;
        case "assertVisible":
            return `assertVisible ${step.target}`;
        default:
            return step.type;
    }
}

export function describeResolvedStep(step) {
    switch (step.type) {
        case "goto":
            return step.url;
        case "click":
            return step.selector;
        case "fill":
            return `${step.selector} => ${step.value}`;
        case "select":
            return `${step.selector} => ${step.value}`;
        case "assertUrl":
            return step.includes;
        case "assertText":
            return `${step.selector} => ${step.contains}`;
        case "assertVisible":
            return step.selector;
        default:
            return step.type;
    }
}

export function createResolvedTargetStep(step, selector) {
    switch (step.type) {
        case "click":
            return {
                selector,
                type: "click",
            };
        case "fill":
            return {
                selector,
                type: "fill",
                value: step.value,
            };
        case "select":
            return {
                selector,
                type: "select",
                value: step.value,
            };
        case "assertText":
            return {
                contains: step.contains,
                selector,
                type: "assertText",
            };
        case "assertVisible":
            return {
                selector,
                type: "assertVisible",
            };
        default:
            throw new Error(`Unsupported target-based step type "${step.type}".`);
    }
}

export function getDefaultScenarioName(goal, plannerName) {
    return firstNonEmpty(plannerName, goal, "Generated Scenario");
}
