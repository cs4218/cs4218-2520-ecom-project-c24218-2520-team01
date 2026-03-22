import { Stagehand } from "@browserbasehq/stagehand";
import { expect } from "@playwright/test";
import dotenv from "dotenv";
import OpenAI from "openai";
dotenv.config({ path: ".env.local" });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateSteps(goal) {
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                role: "system",
                content: `
You are a browser automation assistant. Given a goal, return a JSON object with a "steps" key.

Each step must be one of:
- "act": interact with a single, unambiguous element (e.g. a unique button or input)
- "observe": use for ambiguous or dynamic elements (dropdowns, list items, dynamically loaded content). Include an "instruction" describing what to find. The result will be used to resolve the element before acting.
- "assert": verify a concrete, deterministic outcome after a meaningful action

Rules:
- Each step must be atomic (one action per step)
- Use "observe" before "act" when the target element may not be uniquely identifiable by label alone (e.g. items in a list, dropdown options, dynamic content)
- Always include navigation steps if needed
- After meaningful actions (login, submit, navigation), include an "assert"

OBSERVE FORMAT:
{
  "type": "observe",
  "instruction": "Find the dropdown item labelled X"
}

ASSERT FORMAT:
Each assert step must include an "assertion" object:
{
  "type": "assert",
  "assertion": {
    "kind": "url" | "text",
    "value": "string"
  }
}

Assertion guidelines (in priority order):
1. Prefer "url" → for page transitions (e.g. "/dashboard")
2. Use "text" for content verification — use partial, lowercase text that is likely to appear on the page

Example:
{
  "steps": [
    { "type": "act", "instruction": "Click the Login link in the navbar" },
    { "type": "act", "instruction": "Fill the email input with foo@bar.com" },
    { "type": "act", "instruction": "Fill the password input with secret" },
    { "type": "act", "instruction": "Click the Login button" },
    { "type": "assert", "assertion": { "kind": "url", "value": "/dashboard" } },
    { "type": "observe", "instruction": "Find the admin dropdown button in the navbar" },
    { "type": "assert", "assertion": { "kind": "text", "value": "admin" } }
  ]
}

Output strictly valid JSON. No explanations.`,
            },
            {
                role: "user",
                content: goal,
            },
        ],
        response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    return parsed.steps;
}

async function main() {
    const stagehand = new Stagehand({
        env: "LOCAL",
        modelApiKey: process.env.OPENAI_API_KEY,
        modelName: "gpt-4o",
        headless: false,
    });

    await stagehand.init();
    const page = await stagehand.ctx.awaitActivePage();
    await page.goto("http://localhost:3000");

    const goal = process.argv[2];
    if (!goal) {
        console.error('Usage: node tests/ai/ai.test.js "<goal>"');
        process.exit(1);
    }
    const steps = await generateSteps(goal);
    console.log("Generated steps:", steps);

    const results = [];

    let lastObserved = null;

    try {
        for (const step of steps) {
            if (step.type === "assert") {
                const a = step.assertion;
                try {
                    await page.waitForLoadState("networkidle");
                    if (a.kind === "url") {
                        await expect(page).toHaveURL(new RegExp(a.value), { timeout: 10000 });
                    } else if (a.kind === "text") {
                        await expect(page.getByText(a.value, { exact: false })).toBeVisible({ timeout: 10000 });
                    }
                    results.push({ passed: true, kind: a.kind, value: a.value });
                } catch {
                    results.push({ passed: false, kind: a.kind, value: a.value });
                }
            } else if (step.type === "observe") {
                const candidates = await stagehand.observe(step.instruction);
                console.log(`Observed [${step.instruction}]:`, candidates);
                lastObserved = candidates?.[0] ?? null;
            } else {
                if (lastObserved) {
                    await stagehand.act(lastObserved);
                    lastObserved = null;
                } else {
                    await stagehand.act(step.instruction);
                }
            }
        }

        console.table(results);
    } catch (err) {
        console.error(err);
    }

    await page.waitForTimeout(10000);
}

main();
