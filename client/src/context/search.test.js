/**
 * AI Usage Declaration
 *
 * Tool Used: ChatGPT
 *
 * Prompt: What kind of test cases should be included for a Context Provider in React? 
 *
 * How the AI Output Was Used:
 * - Used the AI output as a reference to create tests for the Search Context Provider
 * - Reviewed and modified the suggested scenarios to fit the specific implementation of the Search Context
*/

import React from "react";
import { render, act } from "@testing-library/react";
import { SearchProvider, useSearch } from "./search";

// Rachel Tai Ke Jia, A0258603A

// Helper to capture values in the context
let storedState;
let setStoredState;

const StoreContext = () => {
    [storedState, setStoredState] = useSearch();
    return null;
};

const renderContext = (child = null) => {
    storedState = null;
    setStoredState = null;

    return render(
        <SearchProvider>
            {child}
            <StoreContext />
        </SearchProvider>
    );
};


// Test data for updating the context
const newState = {
    keyword: "Laptop",
    results: [{ id: 3, name: "MacBook Pro" }]
};

const defaultState = {
    keyword: "",
    results: []
};


describe("Unit test for Search Context", () => {
    // Arrange
    beforeEach(() => {
        storedState = null;
        setStoredState = null;
    });


    test("Context has empty state initially", () => {
        // Act
        renderContext();

        // Assert
        expect(storedState).toEqual(defaultState);
        expect(typeof setStoredState).toBe("function");
    });


    test("Context renders children", () => {
        // Act
        const { getByText } = renderContext(<div>Child in context</div>);

        // Assert
        expect(getByText("Child in context")).toBeInTheDocument();
    });


    test("useSearch hook returns [storedState, setStoredState]", () => {
        // Act
        renderContext();

        // Assert
        expect(storedState).toEqual(expect.any(Object));
        expect(typeof setStoredState).toBe("function");
        expect(Array.isArray([storedState, setStoredState])).toBe(true);
    });


    test("useSearch returns undefined when it is rendered without SearchProvider", () => {
        // Arrange
        const RenderedWithoutProvider = () => {
            const value = useSearch();
            storedState = value;
            return null;
        };

        // Act
        render(<RenderedWithoutProvider />);

        // Assert
        expect(storedState).toBeUndefined();
    });

    
    test("Search Context updates keyword only", () => {
        // Act
        renderContext();
        act(() => { 
            setStoredState((prev) => ({
                ...prev,
                keyword: newState.keyword
            }));
        });

        // Assert
        expect(storedState).toEqual({
            keyword: newState.keyword,
            results: []
        });
    });


    test("Search Context updates results only", () => {
        // Act
        renderContext();
        act(() => {
            setStoredState((prev) => ({
                ...prev,
                results: newState.results
            }));
        });

        // Assert
        expect(storedState.keyword).toBe("");
        expect(storedState.results).toHaveLength(1);
        expect(storedState.results[0].name).toBe(newState.results[0].name);
    });


    test("Search Context updates entire state object", () => {
        // Act
        renderContext();
        act(() => {
            setStoredState(newState);
        });

        // Assert
        expect(storedState).toEqual(newState);
    });


    test("Search Context can reset to default state", () => {
        // Act
        renderContext();
        act(() => {
            setStoredState(newState);
        });

        // Assert
        expect(storedState.keyword).toBe("Laptop");

        // Act - reset to default
        act(() => {
            setStoredState(defaultState);
        });

        // Assert - state should be back to default
        expect(storedState).toEqual(defaultState);
    });


    describe("All consumers in the same provider share the same state", () => {
        // Arrange
        let consumerAState, setConsumerAState;
        let consumerBState, setConsumerBState;
        const CaptureContext = () => {
            [consumerAState, setConsumerAState] = useSearch();
            [consumerBState, setConsumerBState] = useSearch();
            return null;
        };

        // Act
        beforeEach(() => {
            render(
                <SearchProvider>
                    <CaptureContext />
                </SearchProvider>
            );
        });

        test("Consumers A and B should have the same initial state and update together", () => {
            // Assert 
            expect(consumerAState).toEqual(defaultState);
            expect(consumerAState).toEqual(consumerBState);
        });  


        test("Updating state from consumer A should reflect in consumer B", () => {
            // Act
            act(() => {
                setConsumerAState(newState);
            });

            // Assert
            expect(consumerAState.keyword).toBe("Laptop");
            expect(consumerBState.keyword).toBe("Laptop");
            expect(consumerAState.results).toHaveLength(1);
            expect(consumerBState.results).toHaveLength(1);
        });
    });
});
