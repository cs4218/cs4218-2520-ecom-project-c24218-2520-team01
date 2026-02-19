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
    results: [
        { 
            _id: 3, 
            name: "MacBook Pro",
            slug: "macbook-pro",
            description: "Midnight Blue, 14-inch, M3 chip",
            price: 2100,
            category: { 
                _id: "cat1", 
                name: "Electronics" 
            },
            quantity: 5
        },
        {
            _id: 4, 
            name: "Dell XPS 13",
            slug: "dell-xps-13",
            description: "Silver, 13.3-inch, Intel i7",
            price: 1500, 
            category: { 
                _id: "cat1", 
                name: "Electronics" 
            },
            quantity: 3
        }
    ]
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
