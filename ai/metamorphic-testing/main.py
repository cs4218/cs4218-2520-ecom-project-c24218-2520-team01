import argparse
from dotenv import load_dotenv

# Import the core execution function from your agent module
from agent.relations_agent import generate_metamorphic_relations

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
    
    args = parser.parse_args()
    target_function = args.function
    
    try:
        # Call the agent
        analysis = generate_metamorphic_relations(target_function)
        
        # Print results
        print(f"METAMORPHIC ANALYSIS: {target_function}")
        print("="*50)
        
        print(f"\nOVERVIEW:")
        print(f"{analysis.function_overview}")
        
        print(f"\nMETAMORPHIC RELATIONS:")
        for i, rel in enumerate(analysis.relations, 1):
            print(f"\n{i}. {rel.name}")
            print(f"   Description: {rel.description}")
            print(f"   Transformation: {rel.source_input_transformation}")
            print(f"   Relation: {rel.expected_output_relation}")
            
        
    except Exception as err:
        print(f"An error occurred during analysis:{err}")

if __name__ == "__main__":
    main()