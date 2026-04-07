from langchain_core.tools import tool
import os

@tool
def write_test_to_file(filename: str, test_code: str) -> str:
    """
    Saves the generated Jest test suite to the local file system inside an 'output' directory.
    Ensure the filename ends with '.test.js'.
    """
    try:
        # Ensure it always has the correct extension
        if not filename.endswith('.test.js'):
            filename += '.test.js'
            
        # Define the target directory
        output_dir = "output"
        
        # Create the 'output' directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Join the directory and filename to create the final path
        filepath = os.path.join(output_dir, filename)
        
        # Write to the newly constructed filepath
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(test_code)
            
        return f"Successfully saved test suite to {filepath}"
    except Exception as e:
        return f"Error writing to file {filename}: {str(e)}"