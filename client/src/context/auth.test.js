import React from "react";
import {
	render,
	screen,
	waitFor,
	renderHook,
	act,
} from "@testing-library/react";
import { AuthProvider, useAuth } from "./auth";
import axios from "axios";
import "@testing-library/jest-dom/extend-expect";

//Wong Sheen Kerr (A0269647J)

// Mock axios
jest.mock("axios");

// Mock localStorage - auth.js only uses getItem
let localStorageMock = {};
beforeEach(() => {
	localStorageMock = {
		getItem: jest.fn((key) => {
			return localStorageMock[key] || null;
		}),
	};
	Object.defineProperty(global, "localStorage", {
		value: localStorageMock,
		writable: true,
	});
});

// Lambda Function for wrapping AuthProvider for testing
const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

describe("Auth Context", () => {
	describe("AuthProvider", () => {
		beforeEach(() => {
			jest.clearAllMocks();
			localStorageMock.getItem.mockReturnValue(null);
			// Reset axios headers
			axios.defaults.headers.common = {};
		});

		describe("Success", () => {
			it("should render children when AuthProvider wraps them", () => {
				// Arrange
				const childText = "Test Child Content";

				// Act
				render(<div>{childText}</div>, { wrapper });

				// Assert
				expect(screen.getByText(childText)).toBeInTheDocument();
			});

			it("should provide initial auth state with null user and empty token when localStorage returns null", () => {
				// Arrange
				localStorageMock.getItem.mockReturnValue(null);

				// Act
				const { result } = renderHook(() => useAuth(), { wrapper });

				// Assert
				expect(result.current[0].user).toBeNull();
				expect(result.current[0].token).toBe("");
			});

			it("should load auth from localStorage when data exists", async () => {
				// Arrange - mock localStorage to return valid auth data
				const mockAuthData = JSON.stringify({
					user: { name: "Sheen" },
					token: "tooken123",
				});
				localStorageMock.getItem = jest.fn(() => mockAuthData);

				// Act
				const { result } = renderHook(() => useAuth(), { wrapper });

				// Verify localStorage was called
				expect(localStorageMock.getItem).toHaveBeenCalledWith("auth");

				// Verify auth state is loaded correctly
				await waitFor(() => {
					expect(result.current[0].user).toEqual({ name: "Sheen" });
				});
				expect(result.current[0].token).toBe("tooken123");
			});

			it("should update auth state when setAuth is called with new user data", async () => {
				// Arrange
				localStorageMock.getItem.mockReturnValue(null);

				// Act - current[0] = auth, current[1] = setAuth() hook
				const { result } = renderHook(() => useAuth(), { wrapper });

				// Initial state - auth is null
				expect(result.current[0].user).toBeNull();

				// Act - call setAuth() hook
				act(() => {
					result.current[1]({ user: { name: "Sheen" }, token: "tooken123" });
				});

				// Assert - wait for state update
				await waitFor(() => {
					expect(result.current[0].user).toEqual({ name: "Sheen" });
				});
				expect(result.current[0].token).toBe("tooken123");
			});

			it("should update axios authorization header when setAuth is called", async () => {
				// Arrange
				localStorageMock.getItem.mockReturnValue(null);

				// Act - current[0] = auth, current[1] = setAuth() hook
				const { result } = renderHook(() => useAuth(), { wrapper });

				// Act - call setAuth() hook
				act(() => {
					result.current[1]({ user: { name: "Sheen" }, token: "tooken123" });
				});

				// Assert
				await waitFor(() => {
					expect(axios.defaults.headers.common["Authorization"]).toBe(
						"tooken123",
					);
				});
			});

			it("should handle clear auth (logout) scenario - setAuth with null user and empty token", async () => {
				// Arrange - start with authenticated user
				const mockAuthData = JSON.stringify({
					user: { name: "Sheen", email: "sheen@example.com" },
					token: "validToken123",
				});
				localStorageMock.getItem = jest.fn(() => mockAuthData);
				const { result } = renderHook(() => useAuth(), { wrapper });

				// Verify initial authenticated state
				await waitFor(() => {
					expect(result.current[0].user).toEqual({
						name: "Sheen",
						email: "sheen@example.com",
					});
				});
				expect(result.current[0].token).toBe("validToken123");
				expect(axios.defaults.headers.common["Authorization"]).toBe(
					"validToken123",
				);

				// Act - logout by clearing auth
				act(() => {
					result.current[1]({ user: null, token: "" });
				});

				// Assert - auth should be cleared
				await waitFor(() => {
					expect(result.current[0].user).toBeNull();
				});
				expect(result.current[0].token).toBe("");
				expect(axios.defaults.headers.common["Authorization"]).toBe("");
			});
		});

		describe("Error", () => {
			describe("localStorage Errors", () => {
				it("should provide initial auth state with null user and empty token when localStorage throws error", () => {
					// Arrange
					localStorageMock.getItem.mockImplementation(() => {
						throw new Error("localStorage error");
					});
					const consoleErrorSpy = jest
						.spyOn(console, "error")
						.mockImplementation(() => {});

					// Act
					const { result } = renderHook(() => useAuth(), { wrapper });

					// Assert
					expect(result.current[0].user).toBeNull();
					expect(result.current[0].token).toBe("");
					expect(consoleErrorSpy).toHaveBeenCalledWith(
						"Error loading auth from localStorage:",
						expect.any(Error),
					);

					// Cleanup
					consoleErrorSpy.mockRestore();
				});

				it("should handle localStorage with invalid JSON data gracefully", () => {
					// Arrange - mock localStorage to return invalid JSON
					localStorageMock.getItem = jest.fn(() => "invalid json {{{");
					const consoleErrorSpy = jest
						.spyOn(console, "error")
						.mockImplementation(() => {});

					// Act
					const { result } = renderHook(() => useAuth(), { wrapper });

					// Assert - should fall back to default state
					expect(result.current[0].user).toBeNull();
					expect(result.current[0].token).toBe("");
					expect(consoleErrorSpy).toHaveBeenCalledWith(
						"Error loading auth from localStorage:",
						expect.any(Error),
					);

					// Cleanup
					consoleErrorSpy.mockRestore();
				});

				it("should handle localStorage with corrupted data structure (missing user field)", async () => {
					// Arrange - mock localStorage to return data without user field
					const mockAuthData = JSON.stringify({
						token: "tooken123",
					});
					localStorageMock.getItem = jest.fn(() => mockAuthData);

					// Act
					const { result } = renderHook(() => useAuth(), { wrapper });

					// Assert - should load the data as-is (undefined user becomes undefined)
					await waitFor(() => {
						expect(result.current[0].token).toBe("tooken123");
					});
					expect(result.current[0].user).toBeUndefined();
				});

				it("should handle localStorage with corrupted data structure (missing token field)", async () => {
					// Arrange - mock localStorage to return data without token field
					const mockAuthData = JSON.stringify({
						user: { name: "Sheen" },
					});
					localStorageMock.getItem = jest.fn(() => mockAuthData);

					// Act
					const { result } = renderHook(() => useAuth(), { wrapper });

					// Assert - should load the data as-is (undefined token becomes undefined)
					await waitFor(() => {
						expect(result.current[0].user).toEqual({ name: "Sheen" });
					});
					expect(result.current[0].token).toBeUndefined();
				});

				it("should handle localStorage with empty object data", async () => {
					// Arrange - mock localStorage to return empty object
					const mockAuthData = JSON.stringify({});
					localStorageMock.getItem = jest.fn(() => mockAuthData);

					// Act
					const { result } = renderHook(() => useAuth(), { wrapper });

					// Assert - should load empty object values
					await waitFor(() => {
						expect(result.current[0].user).toBeUndefined();
					});
					expect(result.current[0].token).toBeUndefined();
				});

				it("should handle localStorage quota exceeded error during initial load", () => {
					// Arrange - simulate quota exceeded error
					const quotaError = new Error("Quota Exceeded Error");
					quotaError.name = "Quota Exceeded Error";
					localStorageMock.getItem = jest.fn(() => {
						throw quotaError;
					});
					const consoleErrorSpy = jest
						.spyOn(console, "error")
						.mockImplementation(() => {});

					// Act
					const { result } = renderHook(() => useAuth(), { wrapper });

					// Assert - should fall back to default state
					expect(result.current[0].user).toBeNull();
					expect(result.current[0].token).toBe("");
					expect(consoleErrorSpy).toHaveBeenCalledWith(
						"Error loading auth from localStorage:",
						expect.any(Error),
					);

					// Cleanup
					consoleErrorSpy.mockRestore();
				});
			});

			describe("setAuth Errors", () => {
				it.each([
					["token with special characters", "tok@n!#$%&'*+/=?^_`{|}~.-"],
					["token with spaces", "token with spaces"],
					[
						"JWT-like token",
						"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
					],
				])("should handle %s", async (description, token) => {
					// Arrange
					localStorageMock.getItem.mockReturnValue(null);
					const { result } = renderHook(() => useAuth(), { wrapper });

					// Act
					act(() => {
						result.current[1]({ user: { name: "TestUser" }, token });
					});

					// Assert
					await waitFor(() => {
						expect(result.current[0].token).toBe(token);
					});
					expect(axios.defaults.headers.common["Authorization"]).toBe(token);
				});
			});
		});
	});
});
