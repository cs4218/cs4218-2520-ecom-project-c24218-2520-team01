import React from "react";
import { render, screen } from "@testing-library/react";
import Search from "./Search";
import { defaultState, newState } from "../test/searchTestUtils";

// Rachel Tai Ke Jia, A0258603A

// Mock Layout
jest.mock("./../components/Layout", () => ({ children }) => (
    <div data-testid="layout">{children}</div>
));

// Mock useSearch
jest.mock("../context/search", () => ({
    useSearch: jest.fn()
}));


describe("Unit Test for Search Page", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test("Search page shows layout and title", () => {
        // Arrange
        require("../context/search").useSearch.mockReturnValue([
            defaultState,
            jest.fn()
        ]);

        // Act
        render(<Search />);

        // Assert
        expect(screen.getByTestId("layout")).toBeInTheDocument();
        expect(screen.getByText("Search Resuts")).toBeInTheDocument();
    });


    test("Search page shows correct number of results", () => {
        // Arrange
        require("../context/search").useSearch.mockReturnValue([
            { results: newState.results },
            jest.fn()
        ]);

        // Act
        render(<Search />);

        // Assert
        expect(screen.getByText(`Found ${newState.results.length}`)).toBeInTheDocument();
    });


    test("Search page shows 'No Products Found' when there are no results", () => {
        // Arrange
        require("../context/search").useSearch.mockReturnValue([
            { results: [] },
            jest.fn()
        ]);

        // Act
        render(<Search />);

        // Assert
        expect(screen.getByText("No Products Found")).toBeInTheDocument();
    });


    test("Search page displays card for each product in results", () => {
        // Arrange
        require("../context/search").useSearch.mockReturnValue([
            { results: newState.results },
            jest.fn()
        ]);

        // Act
        render(<Search />);

        // Assert
        for (const product of newState.results) {
            const img = screen.getByAltText(product.name);
            expect(img).toHaveAttribute(
                "src",
                `/api/v1/product/product-photo/${product._id}`
            );
            expect(screen.getByText(product.name)).toBeInTheDocument();
            expect(screen.getByText(`$ ${product.price}`)).toBeInTheDocument();
            expect(screen.getByText(`${product.description.substring(0, 30)}...`)).toBeInTheDocument();
        }
        expect(screen.getAllByText("More Details")).toHaveLength(newState.results.length);
        expect(screen.getAllByText("ADD TO CART")).toHaveLength(newState.results.length);
    });
});
