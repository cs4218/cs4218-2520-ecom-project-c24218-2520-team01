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

describe("unit test for search context", () => {
    // Arrange
    let context;
    beforeEach(() => {
        context = createContext();
    });


    test("context has empty state initially", () => {
        // Act
        context.renderContext();

        // Assert
        expect(context.getState()).toEqual(defaultState);
        expect(typeof context.getSetter()).toBe("function");
    });


    test("context renders children", () => {
        // Act
        const { getByText } = context.renderContext(<div>Child in context</div>);

        // Assert
        expect(getByText("Child in context")).toBeInTheDocument();
    });


    test("usesearch hook returns storedstate, setstoredstate]", () => {
        // Act
        context.renderContext();

        // Assert
        expect(context.getState()).toEqual(expect.any(Object));
        expect(typeof context.getSetter()).toBe("function");
    });


    test("usesearch returns undefined when it is rendered without searchprovider", () => {
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

    
    test("search context updates keyword only", () => {
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


    test("search context updates results only", () => {
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
        for (let i = 0; i < newState.results.length; i++) {
            expect(context.getState().results[i].name).toBe(newState.results[i].name);
        }
        expect(context.getState().results).toHaveLength(newState.results.length);
    });


    test("search context updates entire state object", () => {
        // Arrange
        context.renderContext();

        // Act
        act(() => {
            context.getSetter()(newState);
        });

        // Assert
        expect(context.getState()).toEqual(newState);
    });


    test("search context can reset to default state", () => {
        // Arrange
        context.renderContext();

        // Act
        act(() => {
            context.getSetter()(newState);
        });

        // Assert
        expect(context.getState().keyword).toBe(newState.keyword);

        // Act - reset to default
        act(() => {
            context.getSetter()(defaultState);
        });

        // Assert - state should be back to default
        expect(context.getState()).toEqual(defaultState);
    });


    describe("all consumers in the same provider share the same state", () => {
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

        test("consumers should have the same initial state and update together", () => {
            // Assert 
            expect(consumerAState).toEqual(defaultState);
            expect(consumerAState).toEqual(consumerBState);
        });  


        test("updating state from one consumer should show in another consumer", () => {
            // Act
            act(() => {
                setConsumerAState(newState);
            });

            // Assert
            expect(consumerAState.keyword).toBe(newState.keyword);
            expect(consumerBState.keyword).toBe(newState.keyword);
            expect(consumerAState.results).toHaveLength(newState.results.length);
            expect(consumerBState.results).toHaveLength(newState.results.length);
        });
    });
});
