import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import toast from "react-hot-toast";
import Login from "./Login";
import { useAuth } from "../../context/auth";

//Wong Sheen Kerr (A0269647J)

// Mocking axios, react-hot-toast, auth context, and header component
jest.mock("axios");
jest.mock("react-hot-toast");

jest.mock("../../context/auth", () => ({
	useAuth: jest.fn(() => [null, jest.fn()]), // Mock useAuth hook to return null state and a mock function for setAuth
}));

jest.mock("../../components/Header", () => () => null);

Object.defineProperty(window, "localStorage", {
	value: {
		setItem: jest.fn(),
	},
	writable: true,
});

window.matchMedia =
	window.matchMedia ||
	function () {
		return {
			matches: false,
			addListener: function () {},
			removeListener: function () {},
		};
	};
describe("Authentication Pages", () => {
	describe("Login Page", () => {
		const mockSetAuth = jest.fn();

		beforeEach(() => {
			jest.clearAllMocks();
			useAuth.mockReturnValue([null, mockSetAuth]);
			jest.spyOn(console, "log").mockImplementation(() => {});
		});

		afterEach(() => {
			jest.restoreAllMocks();
		});

		describe("Success", () => {
			it("renders login form", () => {
				// Arrange & Act
				render(
					<MemoryRouter initialEntries={["/login"]}>
						<Routes>
							<Route path="/login" element={<Login />} />
						</Routes>
					</MemoryRouter>,
				);

				// Assert
				expect(screen.getByText("LOGIN FORM")).toBeInTheDocument();
				expect(
					screen.getByPlaceholderText("Enter Your Email"),
				).toBeInTheDocument();
				expect(
					screen.getByPlaceholderText("Enter Your Password"),
				).toBeInTheDocument();
				// Inputs should be initially empty
				expect(screen.getByPlaceholderText("Enter Your Email").value).toBe("");
				expect(screen.getByPlaceholderText("Enter Your Password").value).toBe(
					"",
				);
			});

			it("should login the user successfully", async () => {
				// Arrange
				axios.post.mockResolvedValueOnce({
					data: {
						success: true,
						user: { id: 1, name: "John Doe", email: "test@example.com" },
						token: "mockToken",
					},
				});

				render(
					<MemoryRouter initialEntries={["/login"]}>
						<Routes>
							<Route path="/login" element={<Login />} />
							<Route path="/" element={<div>Home Page</div>} />
						</Routes>
					</MemoryRouter>,
				);

				// Act
				fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
					target: { value: "test@example.com" },
				});
				fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
					target: { value: "password123" },
				});
				fireEvent.click(screen.getByText("LOGIN"));

				// Assert
				await waitFor(() => expect(axios.post).toHaveBeenCalled());
				await waitFor(() =>
					expect(toast.success).toHaveBeenCalledWith(undefined, {
						duration: 5000,
						icon: "🙏",
						style: {
							background: "green",
							color: "white",
						},
					}),
				);
			});

			it("should navigate to home page after successful login when location.state is not set", async () => {
				// Arrange
				axios.post.mockResolvedValueOnce({
					data: {
						success: true,
						user: { id: 1, name: "John Doe", email: "test@example.com" },
						token: "mockToken",
					},
				});

				render(
					<MemoryRouter initialEntries={["/login"]}>
						<Routes>
							<Route path="/login" element={<Login />} />
							<Route path="/" element={<div>Home Page</div>} />
						</Routes>
					</MemoryRouter>,
				);

				// Act
				fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
					target: { value: "test@example.com" },
				});
				fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
					target: { value: "password123" },
				});
				fireEvent.click(screen.getByText("LOGIN"));

				// Assert
				await waitFor(() => expect(axios.post).toHaveBeenCalled());
				expect(await screen.findByText("Home Page")).toBeInTheDocument();
			});
			it("should navigate to forgot password page when Forgot Password button is clicked", () => {
				// Arrange
				render(
					<MemoryRouter initialEntries={["/login"]}>
						<Routes>
							<Route path="/login" element={<Login />} />
							<Route
								path="/forgot-password"
								element={<div>Forgot Password Page</div>}
							/>
						</Routes>
					</MemoryRouter>,
				);

				// Act
				fireEvent.click(screen.getByText("Forgot Password"));

				// Assert
				expect(screen.getByText("Forgot Password Page")).toBeInTheDocument();
			});
		});

		describe("Error", () => {
			describe("Network Errors", () => {
				it("should display error message on failed login", async () => {
					// Arrange
					axios.post.mockRejectedValueOnce({ message: "Invalid credentials" });

					render(
						<MemoryRouter initialEntries={["/login"]}>
							<Routes>
								<Route path="/login" element={<Login />} />
							</Routes>
						</MemoryRouter>,
					);

					// Act
					fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
						target: { value: "test@example.com" },
					});
					fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
						target: { value: "password123" },
					});
					fireEvent.click(screen.getByText("LOGIN"));

					// Assert
					await waitFor(() => expect(axios.post).toHaveBeenCalled());
					await waitFor(() =>
						expect(toast.error).toHaveBeenCalledWith("Something went wrong"),
					);
					expect(console.log).toHaveBeenCalled();
				});

				it("should display error message when login returns success: false", async () => {
					// Arrange
					axios.post.mockResolvedValueOnce({
						data: {
							success: false,
							message: "Invalid email or password",
						},
					});

					render(
						<MemoryRouter initialEntries={["/login"]}>
							<Routes>
								<Route path="/login" element={<Login />} />
							</Routes>
						</MemoryRouter>,
					);

					// Act
					fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
						target: { value: "test@example.com" },
					});
					fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
						target: { value: "password123" },
					});
					fireEvent.click(screen.getByText("LOGIN"));

					// Assert
					await waitFor(() => expect(axios.post).toHaveBeenCalled());
					await waitFor(() =>
						expect(toast.error).toHaveBeenCalledWith(
							"Invalid email or password",
						),
					);
				});

				it("should handle localStorage.setItem failure gracefully", async () => {
					// Arrange
					const localStorageError = new Error("localStorage has an error");
					window.localStorage.setItem.mockImplementationOnce(() => {
						throw localStorageError;
					});

					axios.post.mockResolvedValueOnce({
						data: {
							success: true,
							user: { id: 1, name: "John Doe", email: "test@example.com" },
							token: "mockToken",
						},
					});

					render(
						<MemoryRouter initialEntries={["/login"]}>
							<Routes>
								<Route path="/login" element={<Login />} />
								<Route path="/" element={<div>Home Page</div>} />
							</Routes>
						</MemoryRouter>,
					);

					// Act
					fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
						target: { value: "test@example.com" },
					});
					fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
						target: { value: "password123" },
					});
					fireEvent.click(screen.getByText("LOGIN"));

					// Assert
					await waitFor(() => expect(axios.post).toHaveBeenCalled());
					// The component should call localStorage.setItem
					await waitFor(() =>
						expect(window.localStorage.setItem).toHaveBeenCalled(),
					);
				});
			});
		});
	});
});
