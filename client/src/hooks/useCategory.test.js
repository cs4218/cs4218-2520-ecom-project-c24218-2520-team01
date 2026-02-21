import { describe, expect, jest } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";
import axios from "axios";
import toast from "react-hot-toast";
import useCategory from "./useCategory";

// For the entire file: Written by Nicholas Cheng, A0269648H

// Mock axios
jest.mock("axios");

// Mock toast
jest.mock("react-hot-toast");

describe("Hook for fetching categories", () => {
    describe("Unit tests for useCategory hook", () => {
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

                axios.get.mockResolvedValueOnce({
                    data: { category: mockCategories },
                });

                // Act
                const { result } = renderHook(() => useCategory());

                // Assert
                await waitFor(() => {
                    expect(result.current).toEqual(mockCategories);
                });
                // We just ensure that axios gets called by a valid API url
                // We do not care about the actual API url incase the dev wants to change it
                expect(axios.get).toHaveBeenCalledWith(expect.any(String));
            });

            test("Receieve empty categories list from API and set it as a state", async () => {
                /**
                 * Assumption: We should not have any issues even with an empty categories list
                 * from the API call.
                 */
                // Arrange
                const mockCategories = [];

                axios.get.mockResolvedValueOnce({
                    data: { category: mockCategories },
                });

                // Act
                const { result } = renderHook(() => useCategory());

                // Assert
                await waitFor(() => {
                    expect(result.current).toEqual([]);
                });
                expect(axios.get).toHaveBeenCalledWith(expect.any(String));
            });
        });

        describe("Errors regarding axios", () => {
            test("Axios throws an error during the execution of the function", async () => {
                // Arrange
                const mockError = new Error("Axios error");
                axios.get.mockRejectedValueOnce(mockError);
                toast.error = jest.fn();

                // Act
                const { result } = renderHook(() => useCategory());

                // Assert
                // We should inform the user that axios has an issue
                await waitFor(() => {
                    expect(toast.error).toHaveBeenCalledWith("Failed to fetch categories");
                });
                // There should not be any changes in our state
                expect(axios.get).toHaveBeenCalledWith(expect.any(String));
                expect(result.current).toEqual([]);
            });
        });
    });
});
