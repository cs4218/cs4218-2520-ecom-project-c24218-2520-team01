# AI-Assisted UI Testing

This folder contains an AI-assisted UI testing flow. A user provides a UI testing goal in plain English, the generator turns it into a small scenario, resolves each step to concrete selectors against the live app, validates the steps once, and writes a replay script to `ai/generated`. The generated `.stagehand.js` script replays with Stagehand only.

## Quick Run

1. Start the app with `npm run dev`.
2. Set `.env.local` with `OPENAI_API_KEY` or `OPENAI_BASE_URL`, plus `OPENAI_MODEL` and optional `OPENAI_REASONING_EFFORT`.
3. Generate a scenario:

```bash
npm run test:ai-ui -- generate "Open the homepage, search for iPhone, and verify the results page" --name "Browse iPhone"
```

4. Replay the generated file:

```bash
node ai/generated/browse-iphone.stagehand.js
```

## How It Works

- `ai/ui-tests/ai.scenario.js` parses the goal and CLI flags.
- `ai/ui-tests/ai.scenario.model.js` asks the model for a strict scenario using allowed step types only.
- `ai/ui-tests/ai.scenario.resolve.js` grounds each step in the live DOM and chooses concrete selectors.
- `ai/ui-tests/ai.scenario.runtime.js` validates the resolved steps once with Stagehand.
- `ai/ui-tests/ai.scenario.artifact.js` writes the final standalone replay script.
