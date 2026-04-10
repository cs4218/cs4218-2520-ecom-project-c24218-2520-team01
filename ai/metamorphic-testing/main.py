import argparse
import time
from pathlib import Path
from dotenv import load_dotenv
from models.structured_response import FunctionMetamorphicAnalysis
from agent.relations_agent import generate_metamorphic_relations
from agent.mr_test_generation_agent import generate_test_suite
from tools.relations_agent_tools import fetch_relevant_functions, fetch_source_code

# ANSI color codes for terminal output
BLUE = "\033[94m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
RESET = "\033[0m"

# Written by Nicholas Cheng, A0269648H

def linearize_metamorphic_analysis(analysis: FunctionMetamorphicAnalysis) -> str:
    """
    Flattens a FunctionMetamorphicAnalysis Pydantic object into a clean, 
    linear string suitable for LLM prompts or plain-text logging.
    """
    lines = []
    
    # Append the Function Overview
    lines.append(f"Function Overview: {analysis.function_overview}\n")
    
    # Append the Metamorphic Relations
    lines.append("Metamorphic Relations:\n")
    
    if not analysis.relations:
        lines.append("No relations found.")
    else:
        for idx, mr in enumerate(analysis.relations, start=1):
            lines.append(f"MR-{idx}: {mr.name}")
            lines.append(f"Description: {mr.description}")
            lines.append(f"Transformation: {mr.source_input_transformation}")
            lines.append(f"Expected Relation: {mr.expected_output_relation}")

    # Join everything with newline characters
    return "\n".join(lines).strip()


def validate_pipeline(target_function: str) -> None:
    """
    Validates local, deterministic stages of the metamorphic pipeline without calling any LLM:
    index lookup and source extraction. Fails early if indexing / path setup is broken.
    """
    context = fetch_relevant_functions.invoke({
        "target_function_name": target_function
    })

    if "error" in context:
        raise ValueError(context["error"])

    source = fetch_source_code.invoke({
        "file_path": context["target_file_path"],
        "start_line": context["target_function"]["startLine"],
        "end_line": context["target_function"]["endLine"],
    })

    print("Preflight validation pipeline passed")
    print(f"Target file: {context['target_file_path']}")
    print(f"Function span: {context['target_function']['startLine']} -> {context['target_function']['endLine']}")
    print(f"Extracted source length: {len(source)} chars")

# Written by Nicholas Cheng, A0269648H

def main():
    # Load env here to display the model name in the CLI
    load_dotenv()
    
    parser = argparse.ArgumentParser(description="Metamorphic Relation Generator Agent")
    parser.add_argument(
        "--function", 
        type=str, 
        required=True, 
        help="The name of the function to analyze (e.g., createCategoryController)"
    )
    parser.add_argument(
        "--validate",
        action="store_true",
        help="Validate index lookup and source extraction without calling an LLM"
    )
    
    args = parser.parse_args()
    target_function = args.function
    
    try:
        if args.validate:
            validate_pipeline(target_function)
            return

        start = time.time()
        print(f"\n{BLUE}Stage 1: Generating metamorphic relations for '{target_function}'...{RESET}")
        
        stage1_start = time.time()
        print(f"   {CYAN}Calling LLM to analyze code and derive metamorphic relations...{RESET}")
        relations = generate_metamorphic_relations(target_function)
        stage1_elapsed = time.time() - stage1_start
        
        print(f"\n{GREEN}Generated {len(relations.relations)} metamorphic relations ({stage1_elapsed:.2f}s):{RESET}")
        for idx, mr in enumerate(relations.relations, 1):
            print(f"\n{GREEN}   MR-{idx}{RESET}")
            print(f"   {YELLOW}Description:{RESET} {mr.description}")
            print(f"   {YELLOW}Transformation:{RESET} {mr.source_input_transformation}")
            print(f"   {YELLOW}Relation:{RESET} {mr.expected_output_relation}")
        
        print(f"\n{YELLOW}Function Overview: {relations.function_overview}{RESET}")
        linearized_relations = linearize_metamorphic_analysis(relations)
        
        print(f"\n{BLUE}Stage 2: Synthesizing Jest test suite...{RESET}")
        print(f"   Target: {target_function}.test.js")
        
        stage2_start = time.time()
        print(f"   {CYAN}Calling LLM to generate Jest tests from metamorphic relations...{RESET}")
        generate_test_suite(target_function, linearized_relations)
        stage2_elapsed = time.time() - stage2_start
        
        output_file = Path("output") / f"{target_function}.test.js"
        if output_file.exists():
            print(f"\n{GREEN}Test suite created at: output/{target_function}.test.js ({stage2_elapsed:.2f}s){RESET}")
            print(f"{GREEN}Metamorphic pipeline complete!{RESET}")
        
        elapsed = time.time() - start
        print(f"\n{CYAN}Stage Breakdown:{RESET}")
        print(f"   {CYAN}Stage 1 (Relations): {stage1_elapsed:.2f}s{RESET}")
        print(f"   {CYAN}Stage 2 (Tests):     {stage2_elapsed:.2f}s{RESET}")
        print(f"   {CYAN}Total time:          {elapsed:.2f}s{RESET}")
        
    except Exception as err:
        print(f"An error occurred during analysis:{err}")

if __name__ == "__main__":
    main()