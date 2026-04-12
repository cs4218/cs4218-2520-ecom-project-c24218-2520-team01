# Metamorphic Testing Agent

An LLM-powered pipeline that automatically derives **Metamorphic Relations (MRs)** from source code and synthesises runnable **Jest test suites** — no hand-written oracles required.

---

## Table of Contents

- [Overview](#overview)
- [What is Metamorphic Testing?](#what-is-metamorphic-testing)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Usage](#usage)
  - [1. Index the Codebase](#1-index-the-codebase)
  - [2. Run the Pipeline](#2-run-the-pipeline)
  - [3. Execute the Generated Tests](#3-execute-the-generated-tests)
  - [Validate Without LLM](#validate-without-llm)
- [How It Works](#how-it-works)

---

## Overview

Traditional unit tests require a known expected output for each input (a *test oracle*). For complex functions — especially those interacting with databases, APIs, or external services — defining correct oracles is expensive and error-prone. **Metamorphic Testing** sidesteps this by reasoning about *relationships between outputs* rather than exact values.

This tool automates the entire metamorphic testing workflow:

1. **Indexes** the target codebase to build a searchable function registry.
2. **Analyses** a target function with an LLM agent that traces code, follows dependencies, and formulates mathematically rigorous Metamorphic Relations.
3. **Generates** a complete Jest test suite that exercises those relations.

---

## What is Metamorphic Testing?

| Concept | Definition |
|---|---|
| **Source Input (X)** | The original input parameters |
| **Transformed Input (X′)** | The input after applying a specific, intentional change |
| **Source Output (O)** | The result of `f(X)` |
| **Transformed Output (O′)** | The result of `f(X′)` |
| **Metamorphic Relation** | A logical/mathematical invariant that *must* hold between O and O′ |

**Example — Good MR:**
> *Transformation:* Multiply all numeric inputs in a shopping cart by 2.
> *Relation:* `O′ == O × 2` — the final calculated price must perfectly double.

**Example — Bad MR (a standard test in disguise):**
> *Transformation:* Remove the ID from the request.
> *Relation:* Output is a 422 Validation Error.


## Prerequisites

- **Python 3.10+**
- **Node.js 18+** (for the codebase indexer and running Jest)
- An **OpenRouter API key** (or any OpenAI-compatible provider)

---

## Setup

### 1. Create a Python virtual environment

```bash
cd ai/metamorphic-testing
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate
```

### 2. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 3. Install Node dependencies (for the indexer & Jest)

From the **project root**:

```bash
npm install
```

### 4. Configure environment variables

Copy the example and fill in your API key:

```bash
cp .env.example .env
```

Edit `.env`:

```dotenv
OPENROUTER_API_KEY=sk-or-v1-...
MODEL=openai/gpt-oss-120b:free
MODEL_PROVIDER=openai
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

---

## Usage

### 1. Index the Codebase

Before running the pipeline, you need to build the codebase index used by the LLM agents to locate functions and read source code:

```bash
cd ai/metamorphic-testing/scripts
node indexer.js
```

This generates `scripts/codebase-index.json`, a JSON registry of all functions, classes, imports, and exports across the project.

> **Note:** Re-run the indexer whenever the codebase changes significantly.

### 2. Run the Pipeline

```bash
cd ai/metamorphic-testing
python main.py --function <functionName>
```

**Example:**

```bash
python main.py --function deleteCategoryController
```

The pipeline will:

1. **Stage 1** — Call the Relations Agent to analyze the function and produce a set of Metamorphic Relations.
2. **Stage 2** — Pass the relations to the Test Generation Agent, which writes a Jest test suite to `output/<functionName>.test.js`.

Timing breakdowns are printed after completion.

### 3. Execute the Generated Tests

```bash
# From the project root
npx jest --config ai/metamorphic-testing/jest.generated.config.cjs
```

This runs all `*.test.js` files inside `ai/metamorphic-testing/output/` using the provided Jest configuration.

### Validate Without LLM

To verify that the codebase index and file reading pipeline work **without making any LLM calls**:

```bash
python main.py --function deleteCategoryController --validate
```

This performs a preflight check — looking up the function in the index, resolving its file path, and extracting its source code.

---

## How It Works

### Stage 1 — Metamorphic Relation Discovery

The **Relations Agent** (`agent/relations_agent.py`) is a LangChain agent equipped with two tools:

- **`fetch_relevant_functions`** — Searches `codebase-index.json` for a target function and returns its file path, line range, imports, and sibling functions.
- **`fetch_source_code`** — Reads the actual source file from disk given a path and line range.

The agent is instructed via a detailed system prompt to:
1. Locate the target function.
2. Recursively trace its dependencies (helpers, models, utilities) by calling tools again.
3. Formulate strict Metamorphic Relations — not standard unit test assertions.

The output is a structured Pydantic model (`FunctionMetamorphicAnalysis`) containing a function overview and a list of `MetamorphicRelation` objects. If native structured output fails, a fallback agent re-runs with stricter JSON instructions and manual parsing.

### Stage 2 — Jest Test Suite Generation

The **Test Generation Agent** (`agent/mr_test_generation_agent.py`) receives the linearised metamorphic relations and:

1. Re-fetches the target function source for context.
2. Generates a complete Jest test suite with proper mocking (`jest.mock()`), helper functions for Express `req`/`res`, and nested `describe`/`test` blocks structured around each MR.
3. Writes the file to `output/<functionName>.test.js` via the `write_test_to_file` tool.
