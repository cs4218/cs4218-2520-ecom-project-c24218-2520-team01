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
 * This file orchestrates the full generate flow.
 * It loads config, calls the planner, resolves steps against the live DOM,
 * validates each resolved step once, and writes the replay artifact.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Stagehand } from "@browserbasehq/stagehand";
import {
    createGeneratorRuntimeConfig,
    DEFAULT_LOAD_STATE_TIMEOUT_MS,
    inspectGeneratorEnvironment,
    loadGeneratorEnvironment,
} from "./ai.scenario.config.js";
import {
    buildOutputPath,
    renderGeneratedArtifact,
    validateGeneratedArtifactContent,
    validateResolvedScenario,
} from "./ai.scenario.artifact.js";
import {
    createOpenAIClient,
    discoverKnownRoutes,
    generateSemanticScenario,
} from "./ai.scenario.model.js";
import {
    createExecutionLogEntry,
    createStagehandConfig,
    executeResolvedStep,
    resolveScenarioUrl,
    settlePage,
} from "./ai.scenario.runtime.js";
import {
    describeResolvedStep,
    describeSemanticStep,
    firstNonEmpty,
    getDefaultScenarioName,
} from "./ai.scenario.shared.js";
import { resolveSemanticStep } from "./ai.scenario.resolve.js";

const execFileAsync = promisify(execFile);

// The engine coordinates the full flow, but the heavy lifting now lives in
// focused modules so this file only describes the end-to-end sequence.
export { renderGeneratedArtifact, validateGeneratedArtifactContent, validateResolvedScenario };
export { pickPreferredSelector } from "./ai.scenario.resolve.js";
export { normalizeSemanticScenario } from "./ai.scenario.shared.js";

async function isAppReachable(appUrl) {
    try {
        const response = await fetch(appUrl, {
            method: "GET",
            redirect: "follow",
            signal: AbortSignal.timeout(DEFAULT_LOAD_STATE_TIMEOUT_MS),
        });

        return response.ok || response.status === 401 || response.status === 403;
    } catch {
        return false;
    }
}

async function validateGeneratorPrerequisites() {
    const inspection = inspectGeneratorEnvironment();
    const failures = [];

    if (!inspection.hasModelCredentials) {
        failures.push(
            "Missing OpenAI credentials. Set OPENAI_API_KEY, or provide OPENAI_BASE_URL for an OpenAI-compatible endpoint.",
        );
    }

    if (!(await isAppReachable(inspection.appUrl))) {
        failures.push(
            `The application is not reachable at ${inspection.appUrl}. Start the app or set APP_BASE_URL to a running instance.`,
        );
    }

    if (failures.length > 0) {
        throw new Error(`Generator prerequisites failed:\n- ${failures.join("\n- ")}`);
    }
}

async function verifyGeneratedArtifactSyntax(outputPath, runtimeConfig) {
    await execFileAsync(process.execPath, ["--check", outputPath], {
        timeout: runtimeConfig.nodeCheckTimeoutMs,
    });
}

async function loadVariablesFromFile(varsPath) {
    if (!varsPath) {
        return {};
    }

    const absoluteVarsPath = path.resolve(varsPath);
    const rawContent = await fs.readFile(absoluteVarsPath, "utf8");
    const parsed = JSON.parse(rawContent);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error(`Variables file "${absoluteVarsPath}" must contain a top-level JSON object.`);
    }

    return parsed;
}

export async function generateStagehandScenarioArtifact(cliOptions) {
    loadGeneratorEnvironment();
    await validateGeneratorPrerequisites();

    const runtimeConfig = createGeneratorRuntimeConfig();
    const openai = createOpenAIClient(runtimeConfig);
    const variables = await loadVariablesFromFile(cliOptions.varsPath);
    const knownRoutes = await discoverKnownRoutes();
    const semanticScenario = await generateSemanticScenario(
        cliOptions.goal,
        runtimeConfig,
        openai,
        knownRoutes,
        variables,
    );
    const scenarioName = firstNonEmpty(cliOptions.name, semanticScenario.name, cliOptions.goal);
    const outputPath = buildOutputPath(cliOptions.goal, scenarioName, cliOptions.outPath);
    const executionLog = [];
    const resolvedSteps = [];
    let stagehand;
    let page;

    try {
        stagehand = new Stagehand(createStagehandConfig(runtimeConfig));
        await stagehand.init();

        page = stagehand.context.pages()[0];
        if (!page) {
            throw new Error("Stagehand did not expose an active page after initialization.");
        }

        await page.goto(resolveScenarioUrl(runtimeConfig.appUrl, "/"), {
            timeoutMs: runtimeConfig.navigationTimeoutMs,
            waitUntil: "domcontentloaded",
        });
        await settlePage(page);

        console.log("Planned semantic steps:");
        console.table(
            semanticScenario.steps.map((step, index) => ({
                step: index + 1,
                summary: describeSemanticStep(step),
                type: step.type,
            })),
        );

        for (const [index, step] of semanticScenario.steps.entries()) {
            const stepNumber = index + 1;
            console.log(
                `Resolving step ${stepNumber}/${semanticScenario.steps.length}: ${describeSemanticStep(step)}`,
            );

            // Each step is resolved first, then executed once to prove the
            // selector or URL is valid before the replay artifact is written.
            const resolvedStep = await resolveSemanticStep(page, step, runtimeConfig, openai);
            resolvedSteps.push(resolvedStep);
            executionLog.push(
                createExecutionLogEntry(
                    stepNumber,
                    step.type,
                    describeResolvedStep(resolvedStep),
                    "resolved",
                ),
            );

            await executeResolvedStep(page, resolvedStep, runtimeConfig);
            executionLog.push(
                createExecutionLogEntry(
                    stepNumber,
                    resolvedStep.type,
                    describeResolvedStep(resolvedStep),
                    "validated",
                ),
            );
        }

        const scenario = validateResolvedScenario({
            metadata: {
                baseUrl: runtimeConfig.appUrl,
                generatedAt: new Date().toISOString(),
                generatorModel: runtimeConfig.plannerModel,
                goal: cliOptions.goal,
                name: getDefaultScenarioName(cliOptions.goal, scenarioName),
            },
            steps: resolvedSteps,
        });

        const artifactContent = validateGeneratedArtifactContent(renderGeneratedArtifact(scenario));
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, artifactContent, "utf8");

        try {
            await verifyGeneratedArtifactSyntax(outputPath, runtimeConfig);
        } catch (error) {
            await fs.rm(outputPath, { force: true });
            throw error;
        }

        return {
            executionLog,
            outputPath,
            scenario,
        };
    } finally {
        if (executionLog.length > 0) {
            console.table(executionLog);
        }

        if (page && runtimeConfig.finalWaitMs > 0) {
            await page.waitForTimeout(runtimeConfig.finalWaitMs);
        }

        if (stagehand) {
            await stagehand.close().catch(() => {});
        }
    }
}
