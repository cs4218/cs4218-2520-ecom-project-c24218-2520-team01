import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import "@testing-library/jest-dom/extend-expect";

// Mock before import
// Mock useAuth, axios, Spinner, and Outlet
jest.mock("../../context/auth", () => ({
	useAuth: jest.fn(),
}));
jest.mock("axios");
jest.mock("../Spinner", () => {
	return function MockSpinner({ path = "login" }) {
		return <div data-testid="spinner">Spinner redirecting to {path}</div>;
	};
});
jest.mock("react-router-dom", () => ({
	...jest.requireActual("react-router-dom"),
	Outlet: () => <div data-testid="outlet">Protected Admin Content</div>,
}));

// Import AdminRoute after mocks are set up
import AdminRoute from "./AdminRoute";
import { useAuth } from "../../context/auth";

//Wong Sheen Kerr (A0269647J)

describe("Route Protection", () => {
	describe("Admin Route", () => {
		beforeEach(() => {
			jest.clearAllMocks();
			jest.useRealTimers(); // For time waiting simulation
		});

		afterEach(() => {
			jest.useRealTimers();
		});

		describe("Success", () => {
			it("should render Outlet when API returns ok: true", async () => {
				// Arrange
				useAuth.mockReturnValue([{ token: "valid-token" }, jest.fn()]);
				axios.get.mockResolvedValue({ data: { ok: true } });

				// Act
				render(
					<MemoryRouter>
						<AdminRoute />
					</MemoryRouter>,
				);

				// Assert - API should be called and Outlet rendered
				await waitFor(() => {
					expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth");
				});
				await waitFor(() => {
					expect(screen.getByTestId("outlet")).toBeInTheDocument();
				});
				expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
			});

			it("should render Spinner initially before API responds", () => {
				// Arrange
				useAuth.mockReturnValue([{ token: "valid-token" }, jest.fn()]);
				// Use a promise that doesn't resolve immediately
				axios.get.mockImplementation(() => new Promise(() => {}));

				// Act
				render(
					<MemoryRouter>
						<AdminRoute />
					</MemoryRouter>,
				);

				// Assert - Spinner should be shown initially
				expect(screen.getByTestId("spinner")).toBeInTheDocument();
			});

			it("should re-run auth check when auth.token changes", async () => {
				// Arrange
				const setAuth = jest.fn();
				useAuth.mockReturnValue([{ token: "token-1" }, setAuth]);
				axios.get.mockResolvedValue({ data: { ok: true } });

				// Act - initial render
				const { rerender } = render(
					<MemoryRouter>
						<AdminRoute />
					</MemoryRouter>,
				);

				// Assert - API called once
				await waitFor(() => {
					expect(axios.get).toHaveBeenCalledTimes(1);
				});

				// Arrange - change token
				useAuth.mockReturnValue([{ token: "token-2" }, setAuth]);
				axios.get.mockClear();

				// Act - re-render with new token
				rerender(
					<MemoryRouter>
						<AdminRoute />
					</MemoryRouter>,
				);

				// Assert - API called again with new token
				await waitFor(() => {
					expect(axios.get).toHaveBeenCalledTimes(1);
				});
			});

			it("should handle token with special characters correctly", async () => {
				// Arrange
				const specialToken =
					"token-with-special-chars!@#$%^&*()_+-=[]{}|;':\",./<>?";
				useAuth.mockReturnValue([{ token: specialToken }, jest.fn()]);
				axios.get.mockResolvedValue({ data: { ok: true } });

				// Act
				render(
					<MemoryRouter>
						<AdminRoute />
					</MemoryRouter>,
				);

				// Assert - API should be called and Outlet rendered
				await waitFor(() => {
					expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth");
				});
				await waitFor(() => {
					expect(screen.getByTestId("outlet")).toBeInTheDocument();
				});
				expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
			});

			it("should handle very long token correctly", async () => {
				// Arrange
				const longToken = "a".repeat(999999);
				useAuth.mockReturnValue([{ token: longToken }, jest.fn()]);
				axios.get.mockResolvedValue({ data: { ok: true } });

				// Act
				render(
					<MemoryRouter>
						<AdminRoute />
					</MemoryRouter>,
				);

				// Assert - API should be called and Outlet rendered
				await waitFor(() => {
					expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth");
				});
				await waitFor(() => {
					expect(screen.getByTestId("outlet")).toBeInTheDocument();
				});
				expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
			});
		});

		describe("Error", () => {
			describe("Authorization Errors", () => {
				it("should render Spinner and not call API when null token", () => {
					// Arrange
					useAuth.mockReturnValue([{ token: null }, jest.fn()]);
					axios.get.mockResolvedValue({ data: { ok: false } });

					// Act
					render(
						<MemoryRouter>
							<AdminRoute />
						</MemoryRouter>,
					);

					// Assert
					expect(screen.getByTestId("spinner")).toBeInTheDocument();
					expect(screen.getByTestId("spinner")).toHaveTextContent(
						"Spinner redirecting to",
					);
					expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
					expect(axios.get).not.toHaveBeenCalled();
				});

				it("should render Spinner and not call API when undefined token", () => {
					// Arrange
					useAuth.mockReturnValue([{ token: undefined }, jest.fn()]);
					axios.get.mockResolvedValue({ data: { ok: false } });

					// Act
					render(
						<MemoryRouter>
							<AdminRoute />
						</MemoryRouter>,
					);

					// Assert
					expect(screen.getByTestId("spinner")).toBeInTheDocument();
					expect(screen.getByTestId("spinner")).toHaveTextContent(
						"Spinner redirecting to",
					);
					expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
					expect(axios.get).not.toHaveBeenCalled();
				});

				it("should render Spinner and not call API when empty string token", () => {
					// Arrange
					useAuth.mockReturnValue([{ token: "" }, jest.fn()]);
					axios.get.mockResolvedValue({ data: { ok: false } });

					// Act
					render(
						<MemoryRouter>
							<AdminRoute />
						</MemoryRouter>,
					);

					// Assert
					expect(screen.getByTestId("spinner")).toBeInTheDocument();
					expect(screen.getByTestId("spinner")).toHaveTextContent(
						"Spinner redirecting to",
					);
					expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
					expect(axios.get).not.toHaveBeenCalled();
				});

				it("should render Spinner and not call API when null auth object", () => {
					// Arrange
					useAuth.mockReturnValue([null, jest.fn()]);
					axios.get.mockResolvedValue({ data: { ok: false } });

					// Act
					render(
						<MemoryRouter>
							<AdminRoute />
						</MemoryRouter>,
					);

					// Assert
					expect(screen.getByTestId("spinner")).toBeInTheDocument();
					expect(screen.getByTestId("spinner")).toHaveTextContent(
						"Spinner redirecting to",
					);
					expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
					expect(axios.get).not.toHaveBeenCalled();
				});

				it("should render Spinner and not call API when undefined auth object", () => {
					// Arrange
					useAuth.mockReturnValue([undefined, jest.fn()]);
					axios.get.mockResolvedValue({ data: { ok: false } });

					// Act
					render(
						<MemoryRouter>
							<AdminRoute />
						</MemoryRouter>,
					);

					// Assert
					expect(screen.getByTestId("spinner")).toBeInTheDocument();
					expect(screen.getByTestId("spinner")).toHaveTextContent(
						"Spinner redirecting to",
					);
					expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
					expect(axios.get).not.toHaveBeenCalled();
				});

				it("should render Spinner when non-admin user has valid token but admin-auth fails", async () => {
					// Arrange - user has valid token but is not an admin
					useAuth.mockReturnValue([{ token: "valid-user-token" }, jest.fn()]);
					// Admin auth endpoint returns ok: false for non-admin users
					axios.get.mockResolvedValue({ data: { ok: false } });

					// Act
					render(
						<MemoryRouter>
							<AdminRoute />
						</MemoryRouter>,
					);

					// Assert - Spinner should be shown since user is not admin
					await waitFor(() => {
						expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth");
					});
					expect(screen.getByTestId("spinner")).toBeInTheDocument();
					expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
				});

				it("should render Spinner when API returns ok: false", async () => {
					// Arrange
					useAuth.mockReturnValue([{ token: "invalid-token" }, jest.fn()]);
					axios.get.mockResolvedValue({ data: { ok: false } });

					// Act
					render(
						<MemoryRouter>
							<AdminRoute />
						</MemoryRouter>,
					);

					// Assert - Spinner should still be displayed
					await waitFor(() => {
						expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth");
					});
					expect(screen.getByTestId("spinner")).toBeInTheDocument();
					expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
				});

				it("should render Spinner when API call throws an error", async () => {
					// Arrange
					useAuth.mockReturnValue([{ token: "valid-token" }, jest.fn()]);
					axios.get.mockRejectedValue(new Error("Network Error"));

					// Act
					render(
						<MemoryRouter>
							<AdminRoute />
						</MemoryRouter>,
					);

					// Assert - render should remain on Spinner since error sets ok to false
					await waitFor(() => {
						expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth");
					});
					expect(screen.getByTestId("spinner")).toBeInTheDocument();
					expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
				});

				it("should render Spinner when API returns 401 unauthorized", async () => {
					// Arrange
					useAuth.mockReturnValue([{ token: "expired-token" }, jest.fn()]);

					const unauthorizedError = new Error(
						"Request failed with status code 401",
					);
					unauthorizedError.response = {
						status: 401,
						data: { message: "Unauthorized" },
					};
					axios.get.mockRejectedValue(unauthorizedError);

					// Act
					render(
						<MemoryRouter>
							<AdminRoute />
						</MemoryRouter>,
					);

					// Assert - Spinner should be shown due to 401 error
					await waitFor(() => {
						expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth");
					});
					expect(screen.getByTestId("spinner")).toBeInTheDocument();
					expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
				});
			});

			describe("Network Errors", () => {
				it("should render Spinner when API call times out", async () => {
					// Arrange
					jest.useFakeTimers();
					useAuth.mockReturnValue([{ token: "valid-token" }, jest.fn()]);

					// Create a promise that never resolves (simulating timeout)
					axios.get.mockImplementation(() => new Promise(() => {}));

					// Act
					render(
						<MemoryRouter>
							<AdminRoute />
						</MemoryRouter>,
					);

					// Assert - Spinner should be shown while waiting
					expect(screen.getByTestId("spinner")).toBeInTheDocument();

					// Fast-forward time to simulate a long wait
					await act(async () => {
						jest.advanceTimersByTime(9999999);
					});

					// Assert - Spinner should still be shown (no outlet)
					expect(screen.getByTestId("spinner")).toBeInTheDocument();
					expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
				});

				it("should render Spinner when network is offline", async () => {
					// Arrange
					useAuth.mockReturnValue([{ token: "valid-token" }, jest.fn()]);

					// Simulate network error
					const networkError = new Error("Network Error");
					networkError.code = "ERR_NETWORK";
					axios.get.mockRejectedValue(networkError);

					// Act
					render(
						<MemoryRouter>
							<AdminRoute />
						</MemoryRouter>,
					);

					// Assert - Spinner should be shown due to network error
					await waitFor(() => {
						expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth");
					});
					expect(screen.getByTestId("spinner")).toBeInTheDocument();
					expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
				});

				it("should render Spinner when API returns 403 forbidden for non-admin user", async () => {
					// Arrange
					useAuth.mockReturnValue([{ token: "valid-user-token" }, jest.fn()]);

					const forbiddenError = new Error(
						"Request failed with status code 403",
					);
					forbiddenError.response = {
						status: 403,
						data: { message: "Forbidden - Admin access required" },
					};
					axios.get.mockRejectedValue(forbiddenError);

					// Act
					render(
						<MemoryRouter>
							<AdminRoute />
						</MemoryRouter>,
					);

					// Assert - Spinner should be shown due to 403 error
					await waitFor(() => {
						expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth");
					});
					expect(screen.getByTestId("spinner")).toBeInTheDocument();
					expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
				});

				it("should render Spinner when API returns malformed response without data property", async () => {
					// Arrange
					useAuth.mockReturnValue([{ token: "valid-token" }, jest.fn()]);
					// Return a response without data property
					axios.get.mockResolvedValue({});

					// Act
					render(
						<MemoryRouter>
							<AdminRoute />
						</MemoryRouter>,
					);

					// Assert - Spinner should be shown since res.data.ok is undefined (falsy)
					await waitFor(() => {
						expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth");
					});
					expect(screen.getByTestId("spinner")).toBeInTheDocument();
					expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
				});

				it("should render Spinner when API returns null data", async () => {
					// Arrange
					useAuth.mockReturnValue([{ token: "valid-token" }, jest.fn()]);
					axios.get.mockResolvedValue({ data: null });

					// Act
					render(
						<MemoryRouter>
							<AdminRoute />
						</MemoryRouter>,
					);

					// Assert - Spinner should be shown since data is null
					await waitFor(() => {
						expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth");
					});
					expect(screen.getByTestId("spinner")).toBeInTheDocument();
					expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
				});

				it("should render Spinner when API returns unexpected data type", async () => {
					// Arrange
					useAuth.mockReturnValue([{ token: "valid-token" }, jest.fn()]);
					// Return data as a string instead of object
					axios.get.mockResolvedValue({ data: "unexpected string response" });

					// Act
					render(
						<MemoryRouter>
							<AdminRoute />
						</MemoryRouter>,
					);

					// Assert - Spinner should be shown since data.ok is undefined
					await waitFor(() => {
						expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth");
					});
					expect(screen.getByTestId("spinner")).toBeInTheDocument();
					expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
				});

				it("should render Spinner when API returns 500 server error", async () => {
					// Arrange
					useAuth.mockReturnValue([{ token: "valid-token" }, jest.fn()]);

					const serverError = new Error("Request failed with status code 500");
					serverError.response = {
						status: 500,
						data: { message: "Internal Server Error" },
					};
					axios.get.mockRejectedValue(serverError);

					// Act
					render(
						<MemoryRouter>
							<AdminRoute />
						</MemoryRouter>,
					);

					// Assert - Spinner should be shown due to server error
					await waitFor(() => {
						expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth");
					});
					expect(screen.getByTestId("spinner")).toBeInTheDocument();
					expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
				});
			});
		});
	});
});
