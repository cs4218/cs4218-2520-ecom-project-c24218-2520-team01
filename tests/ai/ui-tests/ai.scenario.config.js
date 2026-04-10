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
 * This file centralizes environment loading and runtime defaults.
 * It is the single place where the AI scenario tool reads model settings,
 * app URLs, browser flags, and timeout values.
 */

import path from "node:path";
import dotenv from "dotenv";

// These defaults are shared by generation time and by emitted replay artifacts.
// The source code now lives under ui-tests, but generated replay files still
// belong in tests/ai/generated so they stay separate from the implementation.
export const DEFAULT_APP_URL = "http://localhost:3000";
export const DEFAULT_MODEL = "gpt-4o";
export const DEFAULT_ASSERT_TIMEOUT_MS = 10000;
export const DEFAULT_FINAL_WAIT_MS = 10000;
export const DEFAULT_LOAD_STATE_TIMEOUT_MS = 5000;
export const DEFAULT_NAVIGATION_TIMEOUT_MS = 30000;
export const DEFAULT_SELECTOR_TIMEOUT_MS = 10000;
export const DEFAULT_NODE_CHECK_TIMEOUT_MS = 15000;
export const DEFAULT_RESOLUTION_CANDIDATE_LIMIT = 12;
export const DEFAULT_GENERATED_DIR = path.resolve("tests/ai/generated");

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

/**
 * @typedef {object} GeneratorRuntimeConfig
 * @property {string} apiKey
 * @property {string} appUrl
 * @property {number} assertTimeoutMs
 * @property {string | undefined} baseURL
 * @property {number} finalWaitMs
 * @property {boolean} headless
 * @property {number} navigationTimeoutMs
 * @property {number} nodeCheckTimeoutMs
 * @property {string} plannerModel
 * @property {string | undefined} reasoningEffort
 * @property {number} resolutionCandidateLimit
 * @property {number} selectorTimeoutMs
 * @property {number} verbose
 */

/**
 * @typedef {object} GeneratorEnvironmentInspection
 * @property {string} appUrl
 * @property {string | undefined} baseURL
 * @property {boolean} hasModelCredentials
 */

/**
 * @param {Record<string, string | undefined>} env
 * @param {...string} names
 * @returns {string | undefined}
 */
function getOptionalEnv(env, ...names) {
	for (const name of names) {
		const value = env[name]?.trim();
		if (value) {
			return value;
		}
	}

	return undefined;
}

/**
 * @param {Record<string, string | undefined>} env
 * @returns {{ apiKey: string, baseURL: string | undefined }}
 */
function resolveModelCredentials(env) {
	const baseURL = getOptionalEnv(env, "OPENAI_BASE_URL");
	const apiKey = getOptionalEnv(env, "OPENAI_API_KEY") ?? (baseURL ? "not-needed" : undefined);

	if (!apiKey) {
		throw new Error(
			"Missing OpenAI credentials. Set OPENAI_API_KEY, or provide OPENAI_BASE_URL.",
		);
	}

	return {
		apiKey,
		baseURL,
	};
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {string} name
 * @param {number} fallback
 * @returns {number}
 */
function readIntegerEnv(env, name, fallback) {
	const rawValue = env[name]?.trim();
	if (!rawValue) {
		return fallback;
	}

	const parsedValue = Number.parseInt(rawValue, 10);
	if (Number.isNaN(parsedValue)) {
		throw new Error(
			`Environment variable ${name} must be an integer. Received "${rawValue}".`,
		);
	}

	return parsedValue;
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {string} name
 * @param {boolean} [fallback=false]
 * @returns {boolean}
 */
function readBooleanEnv(env, name, fallback = false) {
	const rawValue = env[name]?.trim().toLowerCase();
	if (!rawValue) {
		return fallback;
	}

	return TRUE_VALUES.has(rawValue);
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {...string} names
 * @returns {string | undefined}
 */
function readReasoningEffortEnv(env, ...names) {
	const value = getOptionalEnv(env, ...names);
	return value ? value.toLowerCase() : undefined;
}

/**
 * @param {number} value
 * @returns {0 | 1 | 2}
 */
function clampVerboseLevel(value) {
	if (value <= 0) {
		return 0;
	}

	if (value >= 2) {
		return 2;
	}

	return 1;
}

export function loadGeneratorEnvironment() {
	// Load the repo-local env first so AI scenario runs can use a dedicated
	// configuration without changing the wider shell environment.
	dotenv.config({ path: ".env.local" });
	dotenv.config();
}

/**
 * @param {Record<string, string | undefined>} [env=process.env]
 * @returns {GeneratorEnvironmentInspection}
 */
export function inspectGeneratorEnvironment(env = process.env) {
	const baseURL = getOptionalEnv(env, "OPENAI_BASE_URL");
	const apiKey = getOptionalEnv(env, "OPENAI_API_KEY");

	return {
		appUrl: getOptionalEnv(env, "APP_BASE_URL") ?? DEFAULT_APP_URL,
		baseURL,
		hasModelCredentials: Boolean(apiKey || baseURL),
	};
}

/**
 * @param {Record<string, string | undefined>} [env=process.env]
 * @returns {GeneratorRuntimeConfig}
 */
export function createGeneratorRuntimeConfig(env = process.env) {
	const { apiKey, baseURL } = resolveModelCredentials(env);

	// OpenAI credentials are only required while generating the artifact.
	// The emitted replay script runs without planner access.
	return {
		apiKey,
		appUrl: getOptionalEnv(env, "APP_BASE_URL") ?? DEFAULT_APP_URL,
		assertTimeoutMs: readIntegerEnv(
			env,
			"AI_TEST_ASSERT_TIMEOUT_MS",
			DEFAULT_ASSERT_TIMEOUT_MS,
		),
		baseURL,
		finalWaitMs: readIntegerEnv(
			env,
			"AI_TEST_FINAL_WAIT_MS",
			DEFAULT_FINAL_WAIT_MS,
		),
		headless: readBooleanEnv(env, "STAGEHAND_HEADLESS", false),
		navigationTimeoutMs: readIntegerEnv(
			env,
			"AI_TEST_NAVIGATION_TIMEOUT_MS",
			DEFAULT_NAVIGATION_TIMEOUT_MS,
		),
		nodeCheckTimeoutMs: readIntegerEnv(
			env,
			"AI_TEST_NODE_CHECK_TIMEOUT_MS",
			DEFAULT_NODE_CHECK_TIMEOUT_MS,
		),
		plannerModel: getOptionalEnv(env, "OPENAI_MODEL") ?? DEFAULT_MODEL,
		reasoningEffort: readReasoningEffortEnv(env, "OPENAI_REASONING_EFFORT"),
		resolutionCandidateLimit: readIntegerEnv(
			env,
			"AI_TEST_RESOLUTION_CANDIDATES",
			DEFAULT_RESOLUTION_CANDIDATE_LIMIT,
		),
		selectorTimeoutMs: readIntegerEnv(
			env,
			"AI_TEST_SELECTOR_TIMEOUT_MS",
			DEFAULT_SELECTOR_TIMEOUT_MS,
		),
		verbose: clampVerboseLevel(readIntegerEnv(env, "STAGEHAND_VERBOSE", 1)),
	};
}
