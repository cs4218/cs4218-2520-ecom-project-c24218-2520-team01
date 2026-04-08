from openai import max_retries
import os
from dotenv import load_dotenv

# Modern LangChain imports
from langchain.chat_models import init_chat_model
from langchain.agents import create_agent

# Import your custom modules
from models.structured_resposne import TestGenerationResult
from tools.relations_agent_tools import fetch_relevant_functions, fetch_source_code
from tools.mr_test_generation_tools import write_test_to_file

# Load environment variables
load_dotenv()

# Initialize the LLM dynamically
llm = init_chat_model(
    model = os.getenv("MODEL"),
    model_provider = os.getenv("MODEL_PROVIDER"),
    temperature = 0,
    max_retries = 3,
    api_key = os.getenv("OPENROUTER_API_KEY"),
    base_url = os.getenv("OPENROUTER_BASE_URL")
)

# Setup the Agent natively with tools and structured output
agent = create_agent(
    model=llm,
    tools=[write_test_to_file, fetch_relevant_functions, fetch_source_code],
    system_prompt=(
        """
        You are an expert Software Development Engineer in Test. 
        Your task is to write automated tests in JavaScript using Jest based on provided Metamorphic Relations (MRs).
        Guidelines:
        1. Use standard Jest syntax.
        2. Create helper functions to mock Express `req` and `res` objects.
        3. Mock external database calls using `jest.mock()`.
        4. STRICT STRUCTURE: You must organize the tests using nested describe blocks exactly like this:
        describe('TargetFunctionName', () => {
            describe('MR: Name or Description of the Metamorphic Relation', () => {
                test('should ...', async () => {
                    // Test implementation here
                });
            });
        });
        STRICT WORKFLOW:
        Step 1: Use `fetch_relevant_functions` and `fetch_source_code` to retrieve the source code of the target function.
        Step 2: Generate the complete Jest test suite code internally following the structure above and testing the provided MRs.
        Step 3: Use the `write_test_to_file` tool to save your generated code to a `.test.js` file. Name the file after the target function.
        Step 4: Once the tool confirms the file is saved, return your final structured summary.
        """
    ),
    debug = False
)

def generate_test_suite(target_function: str, relations: str):
    """
    Passes the context to the test agent, which writes the file and returns a summary.
    """
    
    agent.invoke({
        "messages": [
            {
                "role": "user",
                "content": (
                    "Generate test cases for the following function based on the provided metamorphic relations.\n\n"
                    f"Target Function: {target_function}\n\n"
                    f"Metamorphic Relations:\n```json\n{relations}\n```"
                )
            }
        ]
    })