import React from "react";
import { useNavigate } from "react-router-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import SearchInput from "./SearchInput";
import { defaultState, newState } from "../../test/searchTestUtils";

// Rachel Tai Ke Jia, A0258603A

// Mock dependencies
jest.mock("axios");
jest.mock("react-router-dom", () => (
    { useNavigate: jest.fn() }
));

describe("Unit test for SearchInput component", () => {
    // Arrange
    let setValuesMock;
    let navigateMock;

    beforeEach(() => {
        setValuesMock = jest.fn();

        // Mock useSearch to return default state and mock setter
        jest.spyOn(require("../../context/search"), "useSearch")
            .mockReturnValue([defaultState, setValuesMock]);

        // Mock useNavigate to return a mock navigate function
        navigateMock = jest.fn();
        useNavigate.mockReturnValue(navigateMock);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });


    test("SearchInput renders input field and button", () => {
        // Act
        render(<SearchInput />);

        // Assert
        expect(screen.getByPlaceholderText("Search")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
    });


    test("SearchInput updates search keyword when input field changes", () => {
        // Arrange
        render(<SearchInput />);
        const input = screen.getByPlaceholderText("Search");

        // Act
        fireEvent.change(input, { target: { value: "Laptop" } });

        // Assert
        expect(setValuesMock).toHaveBeenCalledWith({
            keyword: "Laptop",
            results: []
        });
    });


    test("handleSubmit sets value and navigates", async () => {
        // Arrange
        axios.get.mockResolvedValue({
            data: newState.results
        });
        render(<SearchInput />);
        const form = screen.getByRole("search");

        // Act
        fireEvent.submit(form);

        // Assert
        await waitFor(() => {
                expect(axios.get).toHaveBeenCalledWith(
                    "/api/v1/product/search/"
                );
                expect(setValuesMock).toHaveBeenCalledWith({
                    keyword: "",
                    results: newState.results
                });
                expect(navigateMock).toHaveBeenCalledWith("/search");
        });
    });


    test("handleSubmit catches error", async () => {
        // Arrange
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
        axios.get.mockRejectedValue(new Error("API error"));
        render(<SearchInput />);
        const form = screen.getByRole("search");

        // Act
        fireEvent.submit(form);

        // Assert
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalled();
        });

        consoleSpy.mockRestore();
    });
});
