import os
from dotenv import load_dotenv

# Modern LangChain imports
from langchain.chat_models import init_chat_model
from langchain.agents import create_agent

# Import your custom modules
from models.structured_resposne import FunctionMetamorphicAnalysis
from tools.relations_agent_tools import fetch_relevant_functions, fetch_source_code

# Load environment variables
load_dotenv()

# Initialize the LLM dynamically
llm = init_chat_model(
    model = os.getenv("MR_GENERATION_MDOEL"),
    model_provider = os.getenv("MR_GENERATION_PROVIDER"),
    temperature = 0,
    api_key = os.getenv("OPENROUTER_API_KEY"),
    base_url = os.getenv("OPENROUTER_BASE_URL")
)

# Setup the Agent natively with tools and structured output
agent = create_agent(
    model=llm,
    tools=[fetch_relevant_functions, fetch_source_code],
    response_format=FunctionMetamorphicAnalysis, 
    system_prompt=(
        """
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
    ),
    debug = False
)

def generate_metamorphic_relations(target_function: str):
    """
    Executes the agent to gather context and directly returns the structured Pydantic model.
    """
    # The human message is now beautifully simple, as the logic lives in the system prompt.
    result = agent.invoke({
        "messages": [
            {
                "role": "user",
                "content": f"Analyze the function: '{target_function}'"
            }
        ]
    })
    return result["structured_response"]