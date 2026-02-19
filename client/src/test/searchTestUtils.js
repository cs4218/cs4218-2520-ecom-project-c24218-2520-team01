import React from "react";
import { render } from "@testing-library/react";
import { SearchProvider, useSearch } from "../context/search";

// Rachel Tai Ke Jia, A0258603A

// Test data for updating the search context
export const defaultState = {
    keyword: "",
    results: []
};

export const newState = {
    keyword: "Laptop",
    results: [{ id: 3, name: "MacBook Pro" }]
};


// Helper to capture values in the context
export const createContext = () => {
    let storedState;
    let setStoredState;

    const Context = () => {
        [storedState, setStoredState] = useSearch();
        return null;
    };

    const renderContext= (child = null) =>
        render(
            <SearchProvider>
                {child}
                <Context />
            </SearchProvider>
        );

    return {
        renderContext,
        getState: () => storedState,
        getSetter: () => setStoredState
    };
};
