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
 * This file is the CLI entrypoint for the AI scenario flow.
 * It parses the user's command-line input, validates the supported flags,
 * and hands the request to the scenario engine.
 */

import { pathToFileURL } from "node:url";
import { generateStagehandScenarioArtifact } from "./ai.scenario.engine.js";

// Thin CLI wrapper for the AI scenario flow. The generated replay artifacts
// still live in ../generated even though the source modules now live here.
const ALLOWED_COMMANDS = new Set(["generate"]);

/**
 * @typedef {object} GeneratorCliOptions
 * @property {string} command
 * @property {string} goal
 * @property {string} name
 * @property {string | undefined} outPath
 * @property {string | undefined} varsPath
 */

function normalizeWhitespace(value) {
    return `${value ?? ""}`.replace(/\s+/g, " ").trim();
}

function readCliOptionValue(tokens, index, optionName) {
    const value = tokens[index + 1];

    if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${optionName}.`);
    }

    return value;
}

export function getUsageText() {
    return [
        "Usage:",
        '  node tests/ai/unit-tests/ai.scenario.js generate "<goal>" [--out tests/ai/generated/<slug>.stagehand.js] [--vars path/to/vars.json] [--name "Scenario Name"]',
        '  npm run test:ai-unit -- generate "<goal>" [--out tests/ai/generated/<slug>.stagehand.js] [--vars path/to/vars.json] [--name "Scenario Name"]',
        "",
        "Examples:",
        '  node tests/ai/unit-tests/ai.scenario.js generate "Describe the user flow you want to test"',
        '  npm run test:ai-unit -- generate "Open a page, complete a form, and verify the result" --out tests/ai/generated/example-flow.stagehand.js',
    ].join("\n");
}

/**
 * @param {string[]} argv
 * @returns {{ help: true } | GeneratorCliOptions}
 */
export function parseCliArguments(argv) {
    const [command, ...rest] = argv;

    if (!command || command === "--help" || command === "-h") {
        return { help: true };
    }

    if (!ALLOWED_COMMANDS.has(command)) {
        throw new Error(`Unsupported command "${command}". Only "generate" is supported.`);
    }

    const goalParts = [];
    let outPath;
    let varsPath;
    let name;

    for (let index = 0; index < rest.length; index += 1) {
        const token = rest[index];

        if (token === "--out") {
            outPath = readCliOptionValue(rest, index, "--out");
            index += 1;
            continue;
        }

        if (token === "--vars") {
            varsPath = readCliOptionValue(rest, index, "--vars");
            index += 1;
            continue;
        }

        if (token === "--name") {
            name = readCliOptionValue(rest, index, "--name");
            index += 1;
            continue;
        }

        if (token.startsWith("--")) {
            throw new Error(`Unknown option "${token}".`);
        }

        goalParts.push(token);
    }

    const goal = goalParts.join(" ").trim();
    if (!goal) {
        throw new Error('Missing goal. Usage: node tests/ai/unit-tests/ai.scenario.js generate "<goal>"');
    }

    return {
        command,
        goal,
        name: normalizeWhitespace(name),
        outPath,
        varsPath,
    };
}

export async function main(argv = process.argv.slice(2)) {
    const cliOptions = parseCliArguments(argv);
    if (cliOptions.help) {
        console.log(getUsageText());
        return;
    }

    const result = await generateStagehandScenarioArtifact(cliOptions);
    console.log(`Generated stagehand artifact: ${result.outputPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
