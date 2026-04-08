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
 * This file turns semantic targets into concrete selectors.
 * It collects DOM candidates from the live page, ranks them locally,
 * and only uses the model as a tie-breaker when heuristics are inconclusive.
 */

import {
    buildMeaningfulTarget,
    createResolvedTargetStep,
    firstNonEmpty,
    MAX_CANDIDATE_TEXT_LENGTH,
    MAX_PROMPT_CANDIDATES,
    normalizeComparisonText,
    SELECTOR_STRATEGY_PRIORITY,
    tokenizeTarget,
} from "./ai.scenario.shared.js";
import { resolveCandidateWithModel } from "./ai.scenario.model.js";
import {
    ensureSelectorIsUnique,
    waitForResolvedSelector,
} from "./ai.scenario.runtime.js";

// DOM resolution turns semantic targets like "Home link" into one concrete
// selector by collecting candidates, ranking them locally, and only then using
// the model as a constrained tie-breaker when necessary.
async function collectResolutionCandidates(page, stepType) {
    return page.evaluate(
        ({ maxTextLength, stepType }) => {
            function normalizeText(value) {
                return `${value ?? ""}`.replace(/\s+/g, " ").trim();
            }

            function escapeAttributeValue(value) {
                return `${value}`.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
            }

            function toXPathLiteral(value) {
                if (!value.includes('"')) {
                    return `"${value}"`;
                }

                if (!value.includes("'")) {
                    return `'${value}'`;
                }

                const parts = value.split('"');
                return `concat(${parts
                    .map((part, index) => {
                        const literals = [];

                        if (part) {
                            literals.push(`"${part}"`);
                        }

                        if (index < parts.length - 1) {
                            literals.push('\'"\'');
                        }

                        return literals.join(", ");
                    })
                    .filter(Boolean)
                    .join(", ")})`;
            }

            function countXPath(expression) {
                const result = document.evaluate(
                    expression,
                    document,
                    null,
                    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                    null,
                );

                return result.snapshotLength;
            }

            function isVisible(element) {
                const style = window.getComputedStyle(element);

                if (
                    style.display === "none" ||
                    style.visibility === "hidden" ||
                    style.visibility === "collapse" ||
                    Number(style.opacity) === 0
                ) {
                    return false;
                }

                const rect = element.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
            }

            function getLabelText(element) {
                const labels = [];

                if (element.id) {
                    const label = document.querySelector(
                        `label[for="${escapeAttributeValue(element.id)}"]`,
                    );
                    if (label) {
                        labels.push(normalizeText(label.textContent));
                    }
                }

                const parentLabel = element.closest("label");
                if (parentLabel) {
                    labels.push(normalizeText(parentLabel.textContent));
                }

                return labels.find(Boolean) ?? "";
            }

            function isClickableCandidate(element) {
                if (!isVisible(element)) {
                    return false;
                }

                return (
                    element.matches(
                        'button, a[href], summary, input[type="button"], input[type="submit"], input[type="checkbox"], input[type="radio"], [role="button"], [role="link"]',
                    ) || typeof element.onclick === "function"
                );
            }

            function isFillCandidate(element) {
                if (!isVisible(element) || element.disabled) {
                    return false;
                }

                if (element.matches("textarea")) {
                    return true;
                }

                if (element instanceof HTMLInputElement) {
                    const disallowedTypes = new Set([
                        "button",
                        "checkbox",
                        "hidden",
                        "image",
                        "radio",
                        "range",
                        "reset",
                        "submit",
                    ]);

                    return !disallowedTypes.has((element.type || "").toLowerCase());
                }

                return (
                    element.getAttribute("contenteditable") === "true" ||
                    element.getAttribute("role") === "textbox"
                );
            }

            function isSelectCandidate(element) {
                return element instanceof HTMLSelectElement && isVisible(element) && !element.disabled;
            }

            function isAssertionCandidate(element) {
                if (!isVisible(element)) {
                    return false;
                }

                const text = normalizeText(element.innerText || element.textContent || "");
                const ariaLabel = normalizeText(element.getAttribute("aria-label"));
                const placeholder = normalizeText(element.getAttribute("placeholder"));
                const href = normalizeText(element.getAttribute("href"));

                return Boolean(text || ariaLabel || placeholder || href);
            }

            function isRelevantForStep(element) {
                switch (stepType) {
                    case "click":
                        return isClickableCandidate(element);
                    case "fill":
                        return isFillCandidate(element);
                    case "select":
                        return isSelectCandidate(element);
                    case "assertText":
                    case "assertVisible":
                        return isAssertionCandidate(element);
                    default:
                        return false;
                }
            }

            function maybeAddSelector(options, selector, strategy) {
                if (!selector) {
                    return;
                }

                const alreadyAdded = options.some((option) => option.selector === selector);
                if (!alreadyAdded) {
                    options.push({ selector, strategy });
                }
            }

            function buildSelectorOptions(element, data) {
                const selectorOptions = [];
                const tagName = data.tagName;
                const dataTestId = normalizeText(element.getAttribute("data-testid"));

                if (dataTestId) {
                    const selector = `[data-testid="${escapeAttributeValue(dataTestId)}"]`;
                    if (document.querySelectorAll(selector).length === 1) {
                        maybeAddSelector(selectorOptions, selector, "data-testid");
                    }
                }

                if (data.idAttr) {
                    const selector = `[id="${escapeAttributeValue(data.idAttr)}"]`;
                    if (document.querySelectorAll(selector).length === 1) {
                        maybeAddSelector(selectorOptions, selector, "id");
                    }
                }

                if (data.nameAttr) {
                    const selector = `${tagName}[name="${escapeAttributeValue(data.nameAttr)}"]`;
                    if (document.querySelectorAll(selector).length === 1) {
                        maybeAddSelector(selectorOptions, selector, "name");
                    }
                }

                if (data.ariaLabel) {
                    const selector = `${tagName}[aria-label="${escapeAttributeValue(data.ariaLabel)}"]`;
                    if (document.querySelectorAll(selector).length === 1) {
                        maybeAddSelector(selectorOptions, selector, "aria-label");
                    }
                }

                if (data.placeholder) {
                    const selector = `${tagName}[placeholder="${escapeAttributeValue(data.placeholder)}"]`;
                    if (document.querySelectorAll(selector).length === 1) {
                        maybeAddSelector(selectorOptions, selector, "placeholder");
                    }
                }

                if (tagName === "a" && data.href) {
                    const selector = `a[href="${escapeAttributeValue(data.href)}"]`;
                    if (document.querySelectorAll(selector).length === 1) {
                        maybeAddSelector(selectorOptions, selector, "href");
                    }
                }

                if (
                    data.typeAttr &&
                    ["email", "password", "search", "submit", "tel", "url"].includes(data.typeAttr)
                ) {
                    const selector = `${tagName}[type="${escapeAttributeValue(data.typeAttr)}"]`;
                    if (document.querySelectorAll(selector).length === 1) {
                        maybeAddSelector(selectorOptions, selector, "type");
                    }
                }

                const selectorText = data.domText || data.text;
                if (selectorText && selectorText.length <= maxTextLength) {
                    const xpathExpression = `//${tagName}[normalize-space(.)=${toXPathLiteral(selectorText)}]`;
                    if (countXPath(xpathExpression) === 1) {
                        maybeAddSelector(selectorOptions, `xpath=${xpathExpression}`, "text");
                    }
                }

                return selectorOptions;
            }

            const elements = Array.from(document.querySelectorAll("body *"));
            const candidates = [];
            let counter = 0;

            for (const element of elements) {
                if (!(element instanceof HTMLElement)) {
                    continue;
                }

                if (!isRelevantForStep(element)) {
                    continue;
                }

                const tagName = element.tagName.toLowerCase();
                const data = {
                    ariaLabel: normalizeText(element.getAttribute("aria-label")),
                    href: normalizeText(element.getAttribute("href")),
                    idAttr: normalizeText(element.getAttribute("id")),
                    labelText: getLabelText(element),
                    nameAttr: normalizeText(element.getAttribute("name")),
                    domText: normalizeText(element.textContent || "").slice(0, maxTextLength),
                    optionTexts:
                        element instanceof HTMLSelectElement
                            ? Array.from(element.options)
                                  .map((option) =>
                                      normalizeText(option.textContent || option.label || option.value),
                                  )
                                  .filter(Boolean)
                                  .slice(0, 30)
                            : [],
                    placeholder: normalizeText(element.getAttribute("placeholder")),
                    role: normalizeText(element.getAttribute("role")),
                    tagName,
                    text: normalizeText(element.innerText || element.textContent || "").slice(
                        0,
                        maxTextLength,
                    ),
                    typeAttr: normalizeText(element.getAttribute("type")).toLowerCase(),
                };

                const selectorOptions = buildSelectorOptions(element, data);
                if (selectorOptions.length === 0) {
                    continue;
                }

                candidates.push({
                    ...data,
                    id: `candidate-${++counter}`,
                    selectorOptions,
                });
            }

            return candidates;
        },
        {
            maxTextLength: MAX_CANDIDATE_TEXT_LENGTH,
            stepType,
        },
    );
}

export function pickPreferredSelector(selectorOptions) {
    if (!Array.isArray(selectorOptions) || selectorOptions.length === 0) {
        return undefined;
    }

    return [...selectorOptions].sort((left, right) => {
        const leftPriority = SELECTOR_STRATEGY_PRIORITY[left.strategy] ?? 0;
        const rightPriority = SELECTOR_STRATEGY_PRIORITY[right.strategy] ?? 0;

        return rightPriority - leftPriority || left.selector.length - right.selector.length;
    })[0];
}

function buildCandidateSearchValues(candidate) {
    const hrefPath = candidate.href ? candidate.href.replace(/^https?:\/\/[^/]+/i, "") : "";

    return [
        candidate.text,
        candidate.labelText,
        candidate.ariaLabel,
        candidate.placeholder,
        candidate.idAttr,
        candidate.nameAttr,
        candidate.href,
        hrefPath,
        candidate.typeAttr,
        candidate.role,
        candidate.tagName,
        ...(Array.isArray(candidate.optionTexts) ? candidate.optionTexts : []),
    ]
        .map(normalizeComparisonText)
        .filter(Boolean);
}

function buildCandidateLabel(candidate) {
    return firstNonEmpty(
        candidate.labelText,
        candidate.ariaLabel,
        candidate.text,
        candidate.placeholder,
        candidate.href,
        candidate.idAttr,
        candidate.nameAttr,
        candidate.tagName,
    );
}

function inferTargetRole(step) {
    const targetText = normalizeComparisonText(step.target);

    if (step.type === "click" || step.type === "assertVisible" || step.type === "assertText") {
        if (targetText.includes("link")) {
            return "link";
        }

        if (targetText.includes("button")) {
            return "button";
        }

        return step.type === "click" ? "button" : undefined;
    }

    if (step.type === "fill") {
        if (targetText.includes("password")) {
            return "password";
        }

        if (targetText.includes("email")) {
            return "email";
        }

        if (targetText.includes("search")) {
            return "search";
        }

        return "field";
    }

    if (step.type === "select") {
        return "select";
    }

    return undefined;
}

function candidateMatchesRoleHint(candidate, roleHint) {
    switch (roleHint) {
        case "link":
            return candidate.tagName === "a" || candidate.role === "link";
        case "button":
            return (
                candidate.tagName === "button" ||
                candidate.role === "button" ||
                candidate.typeAttr === "submit"
            );
        case "select":
            return candidate.tagName === "select";
        case "email":
            return candidate.typeAttr === "email";
        case "password":
            return candidate.typeAttr === "password";
        case "search":
            return candidate.typeAttr === "search";
        case "field":
            return (
                candidate.tagName === "input" ||
                candidate.tagName === "textarea" ||
                candidate.role === "textbox"
            );
        default:
            return false;
    }
}

function filterCandidatesByRoleHint(candidates, step) {
    const roleHint = inferTargetRole(step);
    if (!roleHint) {
        return candidates;
    }

    const matchingCandidates = candidates.filter((candidate) => candidateMatchesRoleHint(candidate, roleHint));
    return matchingCandidates.length > 0 ? matchingCandidates : candidates;
}

function scoreCandidateForStep(candidate, step) {
    const preferredSelector = pickPreferredSelector(candidate.selectorOptions);
    const searchValues = buildCandidateSearchValues(candidate);
    const haystack = searchValues.join(" ");
    const meaningfulTarget = buildMeaningfulTarget(step.target);
    const targetTokens = tokenizeTarget(step.target);
    const containsTokens = step.type === "assertText" ? tokenizeTarget(step.contains) : [];
    const exactMatch =
        Boolean(meaningfulTarget) && searchValues.some((value) => value === meaningfulTarget);
    const roleHint = inferTargetRole(step);
    let score = Math.round((SELECTOR_STRATEGY_PRIORITY[preferredSelector?.strategy] ?? 0) / 20);

    if (exactMatch) {
        score += 20;
    }

    for (const token of targetTokens) {
        if (haystack.includes(token)) {
            score += 3;
        }
    }

    if (targetTokens.length > 0 && targetTokens.every((token) => haystack.includes(token))) {
        score += 8;
    }

    if (step.type === "assertText" && containsTokens.length > 0) {
        const textHaystack = normalizeComparisonText(candidate.text);

        if (containsTokens.every((token) => textHaystack.includes(token))) {
            score += 8;
        }
    }

    if (step.type === "select" && Array.isArray(candidate.optionTexts)) {
        const normalizedValue = normalizeComparisonText(step.value);
        if (candidate.optionTexts.some((option) => normalizeComparisonText(option) === normalizedValue)) {
            score += 10;
        }
    }

    if (roleHint === "button") {
        if (candidate.tagName === "button" || candidate.role === "button" || candidate.typeAttr === "submit") {
            score += 4;
        }
    }

    if (roleHint === "link" && (candidate.tagName === "a" || candidate.role === "link")) {
        score += 4;
    }

    if (roleHint === "email" && candidate.typeAttr === "email") {
        score += 6;
    }

    if (roleHint === "password" && candidate.typeAttr === "password") {
        score += 6;
    }

    if (roleHint === "search" && (candidate.typeAttr === "search" || haystack.includes("search"))) {
        score += 5;
    }

    if (roleHint === "select" && candidate.tagName === "select") {
        score += 6;
    }

    return {
        candidate,
        exactMatch,
        preferredSelector,
        score,
    };
}

function rankCandidatesForStep(candidates, step) {
    return candidates
        .map((candidate) => scoreCandidateForStep(candidate, step))
        .filter((item) => item.preferredSelector)
        .sort((left, right) => right.score - left.score);
}

function chooseHeuristicCandidate(rankedCandidates) {
    if (rankedCandidates.length === 0) {
        return undefined;
    }

    const exactMatches = rankedCandidates.filter((item) => item.exactMatch);
    if (exactMatches.length === 1) {
        return exactMatches[0];
    }

    const [first, second] = rankedCandidates;
    if (!first || first.score < 12) {
        return undefined;
    }

    if (second && first.score - second.score < 4) {
        return undefined;
    }

    return first;
}

function createSelectorResolutionResult(rankedCandidate, resolutionSource) {
    return {
        resolutionSource,
        selector: rankedCandidate.preferredSelector.selector,
        selectorStrategy: rankedCandidate.preferredSelector.strategy,
    };
}

function buildResolverCandidates(rankedCandidates) {
    return rankedCandidates.slice(0, MAX_PROMPT_CANDIDATES).map((item) => {
        const candidate = item.candidate;

        return {
            ariaLabel: candidate.ariaLabel,
            href: candidate.href,
            id: candidate.id,
            label: buildCandidateLabel(candidate),
            labelText: candidate.labelText,
            optionTexts: candidate.optionTexts,
            placeholder: candidate.placeholder,
            selector: item.preferredSelector.selector,
            selectorStrategy: item.preferredSelector.strategy,
            tag: candidate.tagName,
            text: candidate.text,
        };
    });
}

async function validateChosenCandidate(page, rankedCandidate, step, runtimeConfig) {
    await ensureSelectorIsUnique(
        page,
        rankedCandidate.preferredSelector.selector,
        `Target "${step.target}"`,
    );
    await waitForResolvedSelector(
        page,
        rankedCandidate.preferredSelector.selector,
        runtimeConfig.selectorTimeoutMs,
    );
}

async function resolveTargetToSelector(page, step, runtimeConfig, openai) {
    // Heuristics are preferred so simple, obvious matches never depend on an
    // extra LLM round-trip. Model involvement only happens when candidates stay close.
    const candidates = await collectResolutionCandidates(page, step.type);
    if (!Array.isArray(candidates) || candidates.length === 0) {
        throw new Error(`No visible candidates were found while resolving "${step.target}" on ${page.url()}.`);
    }

    const rankedCandidates = rankCandidatesForStep(filterCandidatesByRoleHint(candidates, step), step);
    if (rankedCandidates.length === 0) {
        throw new Error(
            `No stable selector candidates were available for "${step.target}" on ${page.url()}.`,
        );
    }

    const heuristicChoice = chooseHeuristicCandidate(rankedCandidates);
    if (heuristicChoice) {
        await validateChosenCandidate(page, heuristicChoice, step, runtimeConfig);
        return createSelectorResolutionResult(heuristicChoice, "heuristic");
    }

    const narrowedCandidates = rankedCandidates
        .filter((item) => item.score > 0)
        .slice(0, Math.min(runtimeConfig.resolutionCandidateLimit, MAX_PROMPT_CANDIDATES));

    if (narrowedCandidates.length === 0) {
        throw new Error(
            `The target "${step.target}" did not match any concrete DOM candidate strongly enough to resolve clearly.`,
        );
    }

    if (narrowedCandidates.length === 1) {
        await validateChosenCandidate(page, narrowedCandidates[0], step, runtimeConfig);
        return createSelectorResolutionResult(narrowedCandidates[0], "single-candidate");
    }

    const modelChoice = await resolveCandidateWithModel(
        step,
        page,
        buildResolverCandidates(narrowedCandidates),
        runtimeConfig,
        openai,
    );

    if (modelChoice.status !== "resolved") {
        throw new Error(
            `The target "${step.target}" could not be resolved clearly: ${modelChoice.reason}`,
        );
    }

    const chosenCandidate = narrowedCandidates.find((item) => item.candidate.id === modelChoice.candidateId);
    if (!chosenCandidate) {
        throw new Error(`Resolver returned unknown candidate "${modelChoice.candidateId}".`);
    }

    await validateChosenCandidate(page, chosenCandidate, step, runtimeConfig);
    return createSelectorResolutionResult(chosenCandidate, "model");
}

export async function resolveSemanticStep(page, step, runtimeConfig, openai) {
    // URL-based steps are already concrete. Only target-based steps need DOM resolution.
    if (step.type === "goto") {
        return { type: "goto", url: step.url };
    }

    if (step.type === "assertUrl") {
        return { includes: step.includes, type: "assertUrl" };
    }

    const resolvedTarget = await resolveTargetToSelector(page, step, runtimeConfig, openai);
    return createResolvedTargetStep(step, resolvedTarget.selector);
}
