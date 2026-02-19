import { renderHook, waitFor } from "@testing-library/react";
import axios from "axios";
import useCategory from "./useCategory";

// Mock axios
jest.mock("axios");

describe("Unit test for useCategory hook", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("Return an initially empty array", async () => {
        // Arrange
        axios.get.mockResolvedValueOnce({ data: { category: [] } });

        // Act
        const { result } = renderHook(() => useCategory());

        // Assert
        // We need to await for the state to finish updaating before finishing the test
        await waitFor(() => {
            expect(result.current).toEqual([]);
        });
    });

    test("Fetch and return categories successfully", async () => {
        // Arrange
        const mockCategories = [
            { id: 1, name: "Electronics" },
            { id: 2, name: "Books" },
        ];

        axios.get.mockResolvedValueOnce({
            data: { category: mockCategories },
        });

        // Act
        const { result } = renderHook(() => useCategory());

        // Assert
        await waitFor(() => {
            expect(result.current).toEqual(mockCategories);
        });
        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    });

    test("Handle errors that occue during the function call", async () => {
        // Arrange
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
        const mockError = new Error("Some error");
        axios.get.mockRejectedValueOnce(mockError);

        // Act
        const { result } = renderHook(() => useCategory());

        // Assert
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(mockError);
        });
        expect(result.current).toEqual([]); // There should not be any change to our state

        // Clean up the spy
        consoleSpy.mockRestore();
    });
})