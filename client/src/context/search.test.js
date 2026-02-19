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
import { defaultState, newState, createContext } from "../test/searchTestUtils";

// Rachel Tai Ke Jia, A0258603A

describe("Unit test for Search Context", () => {
    // Arrange
    let context;
    beforeEach(() => {
        context = createContext();
    });


    test("Context has empty state initially", () => {
        // Act
        context.renderContext();

        // Assert
        expect(context.getState()).toEqual(defaultState);
        expect(typeof context.getSetter()).toBe("function");
    });


    test("Context renders children", () => {
        // Act
        const { getByText } = context.renderContext(<div>Child in context</div>);

        // Assert
        expect(getByText("Child in context")).toBeInTheDocument();
    });


    test("useSearch hook returns [storedState, setStoredState]", () => {
        // Act
        context.renderContext();

        // Assert
        expect(context.getState()).toEqual(expect.any(Object));
        expect(typeof context.getSetter()).toBe("function");
    });


    test("useSearch returns undefined when it is rendered without SearchProvider", () => {
        // Arrange
        let capturedValue;
        const RenderedWithoutProvider = () => {
            capturedValue = useSearch();        
            return null;
        };

        // Act
        render(<RenderedWithoutProvider />);

        // Assert
        expect(capturedValue).toBeUndefined();
    });

    
    test("Search Context updates keyword only", () => {
        // Arrange
        context.renderContext();

        // Act
        act(() => { 
            context.getSetter()((prev) => ({
                ...prev,
                keyword: newState.keyword
            }));
        });

        // Assert
        expect(context.getState()).toEqual({
            keyword: newState.keyword,
            results: []
        });
    });


    test("Search Context updates results only", () => {
        // Arrange
        context.renderContext();

        // Act
        act(() => {
            context.getSetter()((prev) => ({
                ...prev,
                results: newState.results
            }));
        });

        // Assert
        expect(context.getState().keyword).toBe("");
        expect(context.getState().results).toHaveLength(1);
        expect(context.getState().results[0].name).toBe(newState.results[0].name);
    });


    test("Search Context updates entire state object", () => {
        // Arrange
        context.renderContext();

        // Act
        act(() => {
            context.getSetter()(newState);
        });

        // Assert
        expect(context.getState()).toEqual(newState);
    });


    test("Search Context can reset to default state", () => {
        // Arrange
        context.renderContext();

        // Act
        act(() => {
            context.getSetter()(newState);
        });

        // Assert
        expect(context.getState().keyword).toBe("Laptop");

        // Act - reset to default
        act(() => {
            context.getSetter()(defaultState);
        });

        // Assert - state should be back to default
        expect(context.getState()).toEqual(defaultState);
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
