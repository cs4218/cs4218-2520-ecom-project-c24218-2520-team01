import os
import json
import re
from pathlib import Path
from dotenv import load_dotenv

# Modern LangChain imports
from langchain.chat_models import init_chat_model
from langchain.agents import create_agent

# Import your custom modules
from models.structured_response import FunctionMetamorphicAnalysis
from tools.relations_agent_tools import fetch_relevant_functions, fetch_source_code

# Written by Nicholas Cheng, A0269648H

# Load environment variables
project_root = Path(__file__).resolve().parents[1]
load_dotenv(project_root / ".env")

SYSTEM_PROMPT = """
        You are an expert QA researcher and engineer specializing in Metamorphic Testing. 
        Your objective is to analyze a target function, trace its logic, and formulate strict, mathematically sound Metamorphic Relations (MRs).

        ### Rules of Metamorphic Testing (CRITICAL)
        You MUST NOT generate standard unit tests or integration tests. 
        - Standard tests assert a known, hardcoded expected output (e.g., 'If input is empty, status is 422' or 'If ID is 5, return User A').
        - Metamorphic tests solve the Oracle Problem. You assume the exact output is UNKNOWN. Instead, you define how a Transformation of the input (X -> X') guarantees a specific Relationship between the original output (O) and the new output (O').

        ### Definitions
        - Source Input (X): The original input parameters.
        - Transformed Input (X'): The input after applying a specific, intentional change.
        - Source Output (O): The result of f(X).
        - Transformed Output (O'): The result of f(X').
        - Metamorphic Relation: The logical, mathematical, or state-based invariant that MUST hold true between O and O' (e.g., O == O', or O' is a subset of O).

        ### Your Workflow
        1. Search: Use your tools to locate the target function and fetch its source code.
        2. Trace Dependencies: Analyze the source code. If the function relies on internal helpers, database models, or utilities critical to its logic, use your tools AGAIN to fetch their code. Do not guess implementation details. Call tools recursively until you fully understand the execution flow.
        3. Formulate: Derive robust MRs based on the business logic and constraints discovered.

        ### Examples of Good vs Bad MRs
        BAD (Standard Test): Transformation: Remove ID from request. Relation: Output is 422 Validation Error. (Do NOT do this).
        GOOD (True MR): Transformation: Append a valid but ignored filter parameter to the query string. Relation: O == O' (The API's response payload must be identical regardless of extraneous ignored parameters).
        GOOD (True MR): Transformation: Multiply all numeric inputs in a shopping cart by 2. Relation: O' == O * 2 (The final calculated price must perfectly double).
"""

FALLBACK_JSON_INSTRUCTION = """
Return ONLY valid JSON with this exact shape and no markdown:
{
    "function_overview": "string",
    "relations": [
        {
            "name": "string",
            "source_input_transformation": "string",
            "expected_output_relation": "string",
            "description": "string"
        }
    ]
}
"""


def _build_agent():
    model_name = os.getenv("MODEL")
    model_provider = os.getenv("MODEL_PROVIDER")
    api_key = os.getenv("OPENROUTER_API_KEY")
    base_url = os.getenv("OPENROUTER_BASE_URL")

    if not model_name or not model_provider:
        raise RuntimeError(
            "Missing model configuration. Set MR_GENERATION_MODEL/MR_GENERATION_PROVIDER or MODEL/MODEL_PROVIDER in ai/metamorphic-testing/.env"
        )

    llm = init_chat_model(
        model=model_name,
        model_provider=model_provider,
        temperature=0,
        api_key=api_key,
        base_url=base_url,
    )

    return create_agent(
        model=llm,
        tools=[fetch_relevant_functions, fetch_source_code],
        response_format=FunctionMetamorphicAnalysis,
        system_prompt=SYSTEM_PROMPT,
        debug=False,
    )


def _build_fallback_agent():
    model_name = os.getenv("MODEL")
    model_provider = os.getenv("MODEL_PROVIDER")
    api_key = os.getenv("OPENROUTER_API_KEY")
    base_url = os.getenv("OPENROUTER_BASE_URL")

    llm = init_chat_model(
        model=model_name,
        model_provider=model_provider,
        temperature=0,
        api_key=api_key,
        base_url=base_url,
    )

    return create_agent(
        model=llm,
        tools=[fetch_relevant_functions, fetch_source_code],
        system_prompt=f"{SYSTEM_PROMPT}\n\n{FALLBACK_JSON_INSTRUCTION}",
        debug=False,
    )


def _extract_text(result: dict) -> str:
    messages = result.get("messages", [])
    if not messages:
        return ""

    last = messages[-1]
    content = getattr(last, "content", None)
    if content is None and isinstance(last, dict):
        content = last.get("content")

    if isinstance(content, str):
        return content

    if isinstance(content, list):
        text_chunks = []
        for item in content:
            if isinstance(item, dict) and "text" in item:
                text_chunks.append(str(item["text"]))
            else:
                text_chunks.append(str(item))
        return "\n".join(text_chunks)

    return str(content or "")


def _extract_json_block(text: str) -> str:
    # Accept either fenced JSON or a raw object literal so providers with looser formatting still work.
    fenced = re.search(r"```(?:json)?\s*(\{[\s\S]*\})\s*```", text)
    if fenced:
        return fenced.group(1)

    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return text[start : end + 1]

    return text.strip()

def generate_metamorphic_relations(target_function: str):
    """
    Executes the agent to gather context and directly returns the structured Pydantic model.
    """
    agent = _build_agent()

    # The human message is now beautifully simple, as the logic lives in the system prompt.
    user_message = {
        "messages": [
            {
                "role": "user",
                "content": f"Analyze the function: '{target_function}'"
            }
        ]
    }

    try:
        result = agent.invoke(user_message)
        return result["structured_response"]
    except Exception:
        # If native structured output fails, re-run with a stricter prompt and parse the JSON manually.
        fallback_agent = _build_fallback_agent()
        fallback_result = fallback_agent.invoke(user_message)
        text = _extract_text(fallback_result)
        payload = _extract_json_block(text)
        parsed = json.loads(payload)
        return FunctionMetamorphicAnalysis.model_validate(parsed)