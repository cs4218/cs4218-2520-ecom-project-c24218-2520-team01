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
 * This file contains the model-facing logic.
 * It builds planner prompts, sends requests to the configured OpenAI-compatible
 * endpoint, parses JSON replies, and surfaces provider failures clearly.
 */

import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import {
    ensureNonEmptyString,
    MAX_PROMPT_CANDIDATES,
    normalizeSemanticScenario,
    normalizeWhitespace,
} from "./ai.scenario.shared.js";

// LLM-facing helpers live here so provider-specific request/response handling
// stays isolated from Stagehand browser logic.
function createProviderOptions(baseURL, apiKey) {
    const options = { apiKey };

    if (baseURL) {
        options.baseURL = baseURL;
    }

    return options;
}

export function createOpenAIClient(runtimeConfig) {
    return new OpenAI(createProviderOptions(runtimeConfig.baseURL, runtimeConfig.apiKey));
}

function extractMessageText(content) {
    if (typeof content === "string") {
        return content;
    }

    if (!Array.isArray(content)) {
        return "";
    }

    return content
        .map((part) => {
            if (typeof part === "string") {
                return part;
            }

            if (part?.type === "text" && typeof part.text === "string") {
                return part.text;
            }

            return "";
        })
        .join("");
}

function isJsonResponseFormatError(error) {
    const message = error?.message?.toLowerCase() ?? "";

    return (
        message.includes("response_format") ||
        message.includes("json_object") ||
        message.includes("json schema")
    );
}

function buildModelJsonRequest({ model, messages, reasoningEffort }) {
    const request = {
        model,
        messages,
        response_format: { type: "json_object" },
        temperature: 0,
    };

    if (!reasoningEffort) {
        return request;
    }

    request.reasoning_effort = reasoningEffort;
    return request;
}

function createLlmApiFailureError(error, model) {
    const status = error?.status ? `status ${error.status}` : "unknown status";
    const requestId = error?.requestID ? ` Request ID: ${error.requestID}.` : "";
    const providerMessage = normalizeWhitespace(
        error?.error?.message ?? error?.message ?? "Unknown provider error.",
    );

    return new Error(
        `LLM API request failed for model "${model}" (${status}).${requestId} ${providerMessage}`,
        { cause: error },
    );
}

async function createChatCompletionRequest(openai, request) {
    try {
        return await openai.chat.completions.create(request);
    } catch (error) {
        if (!isJsonResponseFormatError(error)) {
            throw createLlmApiFailureError(error, request.model);
        }

        try {
            // Some providers reject JSON mode even though they otherwise accept
            // chat-completions requests, so only this compatibility fallback is allowed.
            return await openai.chat.completions.create({
                ...request,
                response_format: undefined,
            });
        } catch (fallbackError) {
            throw createLlmApiFailureError(fallbackError, request.model);
        }
    }
}

function parseJsonObject(content) {
    if (typeof content !== "string" || !content.trim()) {
        throw new Error("The model returned an empty response.");
    }

    const trimmedContent = content.trim();
    const fencedMatch = trimmedContent.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const firstBraceIndex = trimmedContent.indexOf("{");
    const lastBraceIndex = trimmedContent.lastIndexOf("}");
    const candidates = [trimmedContent];

    if (fencedMatch?.[1]) {
        candidates.push(fencedMatch[1].trim());
    }

    if (firstBraceIndex !== -1 && lastBraceIndex > firstBraceIndex) {
        candidates.push(trimmedContent.slice(firstBraceIndex, lastBraceIndex + 1));
    }

    for (const candidate of candidates) {
        try {
            return JSON.parse(candidate);
        } catch {
            // Try the next candidate shape.
        }
    }

    throw new Error(`The model did not return valid JSON. Raw response: ${trimmedContent}`);
}

export async function requestJsonObjectFromModel({ openai, model, messages, reasoningEffort }) {
    const request = buildModelJsonRequest({ model, messages, reasoningEffort });
    const response = await createChatCompletionRequest(openai, request);
    const content = extractMessageText(response.choices?.[0]?.message?.content);

    return parseJsonObject(content);
}

export async function discoverKnownRoutes(rootDir = process.cwd()) {
    const appPath = path.join(rootDir, "client", "src", "App.js");

    try {
        // Route discovery is only a planning hint. Final resolution still comes
        // from the live DOM gathered via Stagehand.
        const content = await fs.readFile(appPath, "utf8");
        return [...new Set([...content.matchAll(/<Route\s+path="([^"]+)"/g)].map((match) => match[1]))].sort();
    } catch {
        return [];
    }
}

function buildPlanningMessages(goal, runtimeConfig, knownRoutes, variables) {
    const routeSummary = knownRoutes.length > 0 ? knownRoutes.join(", ") : "(none discovered)";
    const variableSummary = JSON.stringify(variables, null, 2);

    return [
        {
            role: "system",
            content: `
You are generating a browser scenario plan.

The browser always starts at ${runtimeConfig.appUrl}.
Known client routes: ${routeSummary}
Available literal variables for fill/select values: ${variableSummary}

Return a JSON object with:
{
  "name": "short scenario name",
  "steps": []
}

Allowed steps only:
{"type":"goto","url":"/login"}
{"type":"click","target":"Login button"}
{"type":"fill","target":"Email input","value":"{{email}}"}
{"type":"select","target":"Category dropdown","value":"Electronics"}
{"type":"assertUrl","includes":"/dashboard"}
{"type":"assertText","target":"Search Results heading","contains":"Search Results"}
{"type":"assertVisible","target":"Cart link"}

Rules:
- Use only the allowed step types.
- Describe targets as specific visible elements.
- For assertVisible steps, prefer the element's exact visible label text when possible.
- Do not emit selectors or natural-language instructions.
- Use same-origin relative URLs starting with / for goto whenever possible.
- Use provided variables when a literal value is needed and available.
- Do not invent credentials, seeded data, or identifiers that are not in the goal or variables.
- Prefer assertions anchored to a specific element or stable URL fragment.
- Do not use page-wide text assertions.
- Keep steps minimal and executable.

Output JSON only. No markdown. No explanations.
            `.trim(),
        },
        {
            role: "user",
            content: goal,
        },
    ];
}

export async function generateSemanticScenario(goal, runtimeConfig, openai, knownRoutes, variables) {
    // Planning is the only stage where the model can invent structure. After
    // this returns, the rest of the pipeline narrows the flow to concrete data.
    const rawScenario = await requestJsonObjectFromModel({
        openai,
        model: runtimeConfig.plannerModel,
        messages: buildPlanningMessages(goal, runtimeConfig, knownRoutes, variables),
        reasoningEffort: runtimeConfig.reasoningEffort,
    });

    return normalizeSemanticScenario(rawScenario, variables, runtimeConfig.appUrl);
}

function buildResolutionMessages(step, pageUrl, candidates) {
    return [
        {
            role: "system",
            content: `
You are resolving a browser automation target to one concrete selector.

Return one JSON object only:
{"status":"resolved","candidateId":"candidate-1"}
or
{"status":"ambiguous","reason":"short reason"}

Rules:
- Choose "resolved" only if one candidate is clearly the intended target.
- Prefer selector strategies in this order: data-testid, id, name, href, aria-label, placeholder, type, text.
- If the target is vague, refers to multiple candidates, or would rely on broad page text, return "ambiguous".
- Never invent a candidate id.
            `.trim(),
        },
        {
            role: "user",
            content: JSON.stringify(
                {
                    candidates: candidates.slice(0, MAX_PROMPT_CANDIDATES),
                    currentUrl: pageUrl,
                    step,
                },
                null,
                2,
            ),
        },
    ];
}

export async function resolveCandidateWithModel(step, page, candidates, runtimeConfig, openai) {
    // The model is only used as a constrained tie-breaker over concrete DOM
    // candidates that we already collected and ranked locally.
    const rawChoice = await requestJsonObjectFromModel({
        messages: buildResolutionMessages(step, page.url(), candidates),
        model: runtimeConfig.plannerModel,
        openai,
        reasoningEffort: runtimeConfig.reasoningEffort,
    });

    const status = ensureNonEmptyString(rawChoice.status, "Resolver status").toLowerCase();
    if (status === "ambiguous") {
        return {
            reason: normalizeWhitespace(rawChoice.reason) || "The resolver reported ambiguity.",
            status,
        };
    }

    if (status !== "resolved") {
        throw new Error(`Resolver returned unsupported status "${rawChoice.status}".`);
    }

    const candidateId = ensureNonEmptyString(rawChoice.candidateId, "Resolver candidateId");
    return {
        candidateId,
        status,
    };
}
