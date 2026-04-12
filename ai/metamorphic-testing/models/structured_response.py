from pydantic import BaseModel, Field
from typing import List, Optional

# Written by Nicholas Cheng, A0269648H
# And written by Rachel Tai, A0258603A

class ArgumentInfo(BaseModel):
    name: Optional[str] = Field(description="Name of the argument or request body field")
    type: Optional[str] = Field(description="Data type of the argument (e.g., string, dict, Request)")
    description: Optional[str] = Field(description="Short description of what the argument represents")

class MetamorphicRelation(BaseModel):
    name: str = Field(description="A short, descriptive name for the relation")
    source_input_transformation: str = Field(description="How to modify the original inputs to create the follow-up inputs")
    expected_output_relation: str = Field(description="How the follow-up output should logically compare to the original output")
    description: str = Field(description="Detailed explanation of why this relation holds true")

class FunctionMetamorphicAnalysis(BaseModel):
    function_overview: str = Field(description="A clear summary of what the function does do not include any other information or anything about the metamorphic relationss")
    relations: List[MetamorphicRelation] = Field(description="List of metamorphic relations for the function")

class TestGenerationResult(BaseModel):
    explanation: str = Field(description="A brief explanation of the test setup and mocks used.")
    test_code: str = Field(description="The complete, runnable Jest test suite code in JavaScript.")