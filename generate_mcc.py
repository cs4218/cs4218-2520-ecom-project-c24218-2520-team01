import argparse
import os
import sys
import time

from google import genai
from google.genai import types

from dotenv import load_dotenv

#
# AI Usage Declaration
#
# Tool Used: Gemini 3.1 Pro
#
# Prompt: Generate some logging statements for the following python code
#
# How the AI Output Was Used:
# - Used the AI output as a reference as to how to log certain parts of the generate_mcc flow
#

def generate_mcc_report(filename, model="gemini-2.5-flash"):
    """
    Reads the given file and uses a Gemini LLM to generate a Multiple Condition Coverage (MCC) report.
    """
    print(f"\n[INFO] Starting Multiple Condition Coverage (MCC) Generation Script")
    print(f"[INFO] Target File: {filename}")
    print(f"[INFO] Selected Model: {model}")

    if not os.path.exists(filename):
        print(f"[ERROR] File '{filename}' not found.")
        sys.exit(1)

    file_size = os.path.getsize(filename)
    with open(filename, 'r', encoding='utf-8') as f:
        code_content = f.read()
    
    lines_count = len(code_content.splitlines())
    print(f"[INFO] Successfully read {filename} ({lines_count} lines, {file_size} bytes)")

    print(f"[INFO] Loading environment variables from .env.local...")

    load_dotenv('.env.local')

    api_key = os.environ.get("GEMINI_API_KEY")

    # AI API KEY not found
    if not api_key:
        print("[ERROR] GEMINI_API_KEY not found in .env.local or environment variables.")
        print("Please add 'GEMINI_API_KEY=your_api_key' to your .env.local file.")
        sys.exit(1)

    # API KEY found    
    print("[INFO] API Key found. Initializing Gemini Client...")
    client = genai.Client(api_key=api_key)

    #
    # AI Usage Declaration
    #
    # Tool Used: Gemini 3.1 Pro
    #
    # Prompt: How should i prompt Gemini to generate a Multiple Condition Coverage (MCC) report for a given source code file?
    #
    # How the AI Output Was Used:
    # - Used the AI output as a reference as to how to prompt Gemini to generate a Multiple Condition Coverage (MCC) report for a given source code file
    #
    # Prompt for the AI
    prompt = f"""
    You are an expert QA and Software Testing engineer. 
    Analyze the following source code and identify all decisions (e.g., `if`, `while`, `for`, `switch` statements) that contain multiple conditions.
    
    For each decision, calculate and provide the Multiple Condition Coverage (MCC). 
    Multiple Condition Coverage requires that **all combinations of truth values in each decision must occur at least once**.
    For example, if a decision is (A and B), the multiple conditions coverage combinations should be:
    1. A=True, B=True
    2. A=True, B=False
    3. A=False, B=True
    4. A=False, B=False

    Please output a structured report detailing:
    1. The File Name.
    2. A list of all identified decisions with multiple conditions.
    3. The exact line of code or snippet for the decision.
    4. A list of the boolean conditions involved (e.g. A = `x > 5`, B = `y < 10`).
    5. The exhaustive list of truth value combinations needed to satisfy Multiple Condition Coverage for that decision.

    Source Code ({filename}):
    ```
    {code_content}
    ```
    """

    # logs
    print(f"[INFO] Prompt constructed successfully. (Total length: {len(prompt)} characters)")
    print(f"[INFO] Sending request to Gemini API... This may take a few seconds.")
    
    start_time = time.time()

    try:

        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.2,
            )
        )

        end_time = time.time()
        elapsed = end_time - start_time
        
        report = response.text
        report_lines = len(report.splitlines())
        
        # logs
        print(f"[INFO] Successfully received response from Gemini API! (Request took {elapsed:.2f} seconds)")
        print(f"[INFO] Generated Report Size: {report_lines} lines, {len(report)} characters")
        
        output_dir = "mcc_reports"
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
            
        output_filename = os.path.join(output_dir, f"{os.path.basename(filename)}_mcc_report.md")
        with open(output_filename, "w", encoding="utf-8") as out:
            out.write(report)
            
        # logs
        print(f"\n[SUCCESS] Multiple Condition Coverage report saved to: {output_filename}")
        print("\n--- Report Preview (First 15 lines) ---")
        print('\n'.join(report.split('\n')[:15]) + "\n...")

    except Exception as e:

        # logs
        print(f"\n[ERROR] An error occurred during LLM processing: {e}")
        sys.exit(1)

if __name__ == "__main__":

    # parse arguments
    # python generate_mcc.py (filename)
    # example: python generate_mcc.py authController.js
    parser = argparse.ArgumentParser(description="Generate Multiple Condition Coverage (MCC) test requirements using Google Gemini.")
    parser.add_argument("filename", help="Path to the source code file to analyze.")
    parser.add_argument("--model", default="gemini-2.5-flash", help="Gemini model to use (default: gemini-2.5-flash).")
    
    # 1. parse
    args = parser.parse_args()

    # 2. run model on file
    generate_mcc_report(args.filename, args.model)
