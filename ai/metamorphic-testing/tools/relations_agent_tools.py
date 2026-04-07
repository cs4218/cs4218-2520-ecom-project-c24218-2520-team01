import json
from langchain_core.tools import tool
from pathlib import Path

# Get the directory where this current Python file is located
script_dir = Path(__file__).parent

# Build the path to the JSON file relative to the script's location
file_path = (script_dir / ".." / "scripts" / "codebase-index.json").resolve()

# Open the file using the guaranteed absolute path
with open(file_path, "r") as f:
    code_index = json.load(f)

@tool
def fetch_relevant_functions(target_function_name: str) -> dict:
    """
    Searches the codebase index for a target function.
    Returns the file path, start/end lines, and other functions in the same file for context.
    """
    for file_data in code_index:
        for func in file_data.get("functions", []):
            if func["name"] == target_function_name:
                return {
                    "target_file_path": file_data["path"],
                    "target_function": func,
                    "file_imports": file_data.get("imports", []),
                    "other_functions_in_file": [f["name"] for f in file_data.get("functions", []) if f["name"] != target_function_name]
                }
    return {"error": f"Function {target_function_name} not found in index."}

@tool
def fetch_source_code(file_path: str, start_line: int, end_line: int) -> str:
    """
    Reads the actual source code from the local file system given a file path and line numbers.
    """
    try:
        with open(file_path, "r") as f:
            lines = f.readlines()
            # 0-indexed slicing, adding a little buffer around the function
            start = max(0, start_line - 2) 
            end = min(len(lines), end_line + 1)
            return "".join(lines[start:end])
    except Exception as e:
        return f"Error reading file {file_path}: {str(e)}"


# For testing of the tools
# if __name__ == "__main__":

#     # Test fetching the function context
#     # Using the exact function name from your sample JSON
#     test_function = "deleteCategoryController" 
    
#     print(f"fetch_relevant_functions ('{test_function}')")
    
#     # LangChain tools expect arguments passed as a dictionary via .invoke()
#     context_result = fetch_relevant_functions.invoke({
#         "target_function_name": test_function
#     })
    
#     print(json.dumps(context_result, indent=2))
    
#     # Test fetching the source code (Dynamic based on Test 1)
#     print("\n--- fetch_source_code ---")
    
#     if "error" not in context_result:
#         # Extract the metadata found in Test 1
#         file_path = context_result["target_file_path"]
#         start = context_result["target_function"]["startLine"]
#         end = context_result["target_function"]["endLine"]
        
#         print(f"Attempting to read: {file_path} (Lines {start} to {end})")
        
#         # Invoke the second tool
#         source_result = fetch_source_code.invoke({
#             "file_path": file_path,
#             "start_line": start,
#             "end_line": end
#         })
        
#         print("\n--- Source Code Extracted ---")
#         print(source_result)
#         print("-----------------------------")
#     else:
#         print("Function does not exist in the code base")