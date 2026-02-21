import { afterEach, beforeEach, describe, expect, jest } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";
import axios from "axios";
import useCategory from "./useCategory";

// Mock axios
jest.mock("axios");

describe("Hook for fetching categories", () => {
    describe("Unit tests for useCategory hook", () => {
        // Set up variables for our test cases
        let consoleSpy;

        // Before each test case we reset our variables / mocks
        beforeEach(() => {
            // Spy instead of mock because we might want to log in between tests.
            consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
            jest.clearAllMocks();
        });

        afterEach(() => {
            consoleSpy.mockRestore();
        });

        describe("Ensure initial state of the hook is configured correctly", () => {
            test("Check initial state for categories is an empty list", () => {
                // Act
                const { result } = renderHook(() => useCategory());

                // Assert
                expect(result.current).toEqual([]);
            });
        })

        describe("Successfully retrieve categories from API & set it as a state", () => {
            test("Fetch categories from API and set it as a state", async () => {
                // Arrange
                const mockCategories = [
                    { id: 1, name: "Electronics", slug: "electronics" },
                    { id: 2, name: "Books", slug: "books" },
                ];
                const API_URL = "/api/v1/category/get-category";

                axios.get.mockResolvedValueOnce({
                    data: { category: mockCategories },
                });

                // Act
                const { result } = renderHook(() => useCategory());

                // Assert
                await waitFor(() => {
                    expect(result.current).toEqual(mockCategories);
                });
                expect(axios.get).toHaveBeenCalledWith(API_URL);
            });

            test("Receieve empty categories list from API and set it as a state", async () => {
                /**
                 * Assumption: We should not have any issues even with an empty categories list
                 * from the API call.
                 */
                // Arrange
                const mockCategories = [];
                const API_URL = "/api/v1/category/get-category";

                axios.get.mockResolvedValueOnce({
                    data: { category: mockCategories },
                });

                // Act
                const { result } = renderHook(() => useCategory());

                // Assert
                await waitFor(() => {
                    expect(result.current).toEqual([]);
                });
                expect(axios.get).toHaveBeenCalledWith(API_URL);
            });
        });

        describe("Errors reguarding axios", () => {
            test("Axios throws an error during the execution of the function", async () => {
                // Arrange
                const mockError = new Error("Axios error");
                axios.get.mockRejectedValueOnce(mockError);

                // Act
                const { result } = renderHook(() => useCategory());

                // Assert
                await waitFor(() => {
                    expect(consoleSpy).toHaveBeenCalledWith(mockError);
                });
                // There should not be any changes in our state
                expect(result.current).toEqual([]);
            });
        });
    });
});
