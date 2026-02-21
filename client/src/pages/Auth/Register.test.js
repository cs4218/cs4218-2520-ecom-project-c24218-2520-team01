import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import toast from "react-hot-toast";
import Register from "./Register";

//Wong Sheen Kerr (A0269647J)

// Mocking axios, react-hot-toast, auth context, and header component
jest.mock("axios");
jest.mock("react-hot-toast");

jest.mock("../../components/Header", () => () => null);

describe("Authentication Pages", () => {
	describe("Register Page", () => {
		beforeEach(() => {
			jest.clearAllMocks();
			jest.spyOn(console, "log").mockImplementation(() => {});
		});

		afterEach(() => {
			jest.restoreAllMocks();
		});

		// ========== HELPER FUNCTION ==========
		const fillAllFields = (overrides = {}) => {
			const defaultValues = {
				name: "John Doe",
				email: "test@example.com",
				password: "password123",
				phone: "1234567890",
				address: "123 Street",
				dob: "2000-01-01",
				answer: "Football",
			};
			const values = { ...defaultValues, ...overrides };

			fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
				target: { value: values.name },
			});
			fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
				target: { value: values.email },
			});
			fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
				target: { value: values.password },
			});
			fireEvent.change(screen.getByPlaceholderText("Enter Your Phone"), {
				target: { value: values.phone },
			});
			fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
				target: { value: values.address },
			});
			fireEvent.change(screen.getByPlaceholderText("Enter Your DOB"), {
				target: { value: values.dob },
			});
			fireEvent.change(
				screen.getByPlaceholderText("What is Your Favorite Sport"),
				{
					target: { value: values.answer },
				},
			);
		};

		describe("Success", () => {
			it("renders register form with all fields", () => {
				// Arrange & Act
				render(
					<MemoryRouter initialEntries={["/register"]}>
						<Routes>
							<Route path="/register" element={<Register />} />
						</Routes>
					</MemoryRouter>,
				);

				// Assert
				expect(screen.getByText("REGISTER FORM")).toBeInTheDocument();
				expect(
					screen.getByPlaceholderText("Enter Your Name"),
				).toBeInTheDocument();
				expect(
					screen.getByPlaceholderText("Enter Your Email"),
				).toBeInTheDocument();
				expect(
					screen.getByPlaceholderText("Enter Your Password"),
				).toBeInTheDocument();
				expect(
					screen.getByPlaceholderText("Enter Your Phone"),
				).toBeInTheDocument();
				expect(
					screen.getByPlaceholderText("Enter Your Address"),
				).toBeInTheDocument();
				expect(
					screen.getByPlaceholderText("Enter Your DOB"),
				).toBeInTheDocument();
				expect(
					screen.getByPlaceholderText("What is Your Favorite Sport"),
				).toBeInTheDocument();
				expect(screen.getByText("REGISTER")).toBeInTheDocument();
			});

			it("should register the user successfully and navigate to login", async () => {
				// Arrange
				axios.post.mockResolvedValueOnce({
					data: { success: true },
				});

				render(
					<MemoryRouter initialEntries={["/register"]}>
						<Routes>
							<Route path="/register" element={<Register />} />
							<Route path="/login" element={<div>Login Page</div>} />
						</Routes>
					</MemoryRouter>,
				);

				// Act - Fill all 7 fields
				fillAllFields();
				fireEvent.click(screen.getByText("REGISTER"));

				// Assert
				await waitFor(() =>
					expect(toast.success).toHaveBeenCalledWith(
						"Registered successfully, please login",
					),
				);
				expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/register", {
					name: "John Doe",
					email: "test@example.com",
					password: "password123",
					phone: "1234567890",
					address: "123 Street",
					DOB: "2000-01-01",
					answer: "Football",
				});
			});

			it("should handle form submission with success but no message", async () => {
				// Arrange
				axios.post.mockResolvedValueOnce({
					data: { success: true },
				});

				render(
					<MemoryRouter initialEntries={["/register"]}>
						<Routes>
							<Route path="/register" element={<Register />} />
							<Route path="/login" element={<div>Login Page</div>} />
						</Routes>
					</MemoryRouter>,
				);

				// Act - Fill all fields
				fillAllFields();
				fireEvent.click(screen.getByText("REGISTER"));

				// Assert
				await waitFor(() => expect(toast.success).toHaveBeenCalled());
				expect(screen.getByText("Login Page")).toBeInTheDocument();
			});

			it("should handle loading state during submission", async () => {
				// Arrange - Create a promise that we can resolve manually
				let resolvePromise;
				const pendingPromise = new Promise((resolve) => {
					resolvePromise = resolve;
				});
				axios.post.mockReturnValueOnce(pendingPromise);

				render(
					<MemoryRouter initialEntries={["/register"]}>
						<Routes>
							<Route path="/register" element={<Register />} />
							<Route path="/login" element={<div>Login Page</div>} />
						</Routes>
					</MemoryRouter>,
				);

				// Act - Fill all fields and submit
				fillAllFields();
				fireEvent.click(screen.getByText("REGISTER"));

				// Assert - Button should still be visible and clickable during pending state
				expect(screen.getByText("REGISTER")).toBeInTheDocument();
				expect(axios.post).toHaveBeenCalled();

				// Resolve the promise
				resolvePromise({ data: { success: true } });

				await waitFor(() => {
					expect(toast.success).toHaveBeenCalledWith(
						"Registered successfully, please login",
					);
				});
			});

			it("should send correct data format to API", async () => {
				// Arrange
				axios.post.mockResolvedValueOnce({
					data: { success: true },
				});

				render(
					<MemoryRouter initialEntries={["/register"]}>
						<Routes>
							<Route path="/register" element={<Register />} />
							<Route path="/login" element={<div>Login Page</div>} />
						</Routes>
					</MemoryRouter>,
				);

				// Act - Fill all fields with specific values
				fillAllFields({
					name: "Test User",
					email: "testuser@example.org",
					password: "securePass123!",
					phone: "+65-9123-4567",
					address: "456 Test Avenue, Singapore 123456",
					dob: "1995-12-25",
					answer: "Basketball",
				});
				fireEvent.click(screen.getByText("REGISTER"));

				// Assert
				await waitFor(() => {
					expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/register", {
						name: "Test User",
						email: "testuser@example.org",
						password: "securePass123!",
						phone: "+65-9123-4567",
						address: "456 Test Avenue, Singapore 123456",
						DOB: "1995-12-25",
						answer: "Basketball",
					});
				});
			});
			describe("Network Errors", () => {
				it("should display error message when registration fails with success = false", async () => {
					// Arrange
					axios.post.mockResolvedValueOnce({
						data: { success: false, message: "User already exists" },
					});

					render(
						<MemoryRouter initialEntries={["/register"]}>
							<Routes>
								<Route path="/register" element={<Register />} />
							</Routes>
						</MemoryRouter>,
					);

					// Act - Fill all fields
					fillAllFields();
					fireEvent.click(screen.getByText("REGISTER"));

					// Assert
					await waitFor(() =>
						expect(toast.error).toHaveBeenCalledWith("User already exists"),
					);
					expect(axios.post).toHaveBeenCalled();
				});

				it("should display error message when registration throws an error", async () => {
					// Arrange
					axios.post.mockRejectedValueOnce(new Error("Network error"));

					render(
						<MemoryRouter initialEntries={["/register"]}>
							<Routes>
								<Route path="/register" element={<Register />} />
							</Routes>
						</MemoryRouter>,
					);

					// Act - Fill all fields
					fillAllFields();
					fireEvent.click(screen.getByText("REGISTER"));

					// Assert
					await waitFor(() =>
						expect(toast.error).toHaveBeenCalledWith("Something went wrong"),
					);
					expect(axios.post).toHaveBeenCalled();
					expect(console.log).toHaveBeenCalled();
				});

				it("should handle form submission with empty response data", async () => {
					// Arrange - Response with no data property causes error when accessing res.data.success
					axios.post.mockResolvedValueOnce({});

					render(
						<MemoryRouter initialEntries={["/register"]}>
							<Routes>
								<Route path="/register" element={<Register />} />
							</Routes>
						</MemoryRouter>,
					);

					// Act - Fill all fields
					fillAllFields();
					fireEvent.click(screen.getByText("REGISTER"));

					// Assert - Accessing res.data.success when data is undefined throws error,
					// which is caught and calls toast.error("Something went wrong")
					await waitFor(() =>
						expect(toast.error).toHaveBeenCalledWith("Something went wrong"),
					);
					expect(axios.post).toHaveBeenCalled();
					expect(console.log).toHaveBeenCalled();
				});

				it("should not navigate to login on failed registration", async () => {
					// Arrange
					axios.post.mockResolvedValueOnce({
						data: { success: false, message: "Registration failed" },
					});

					render(
						<MemoryRouter initialEntries={["/register"]}>
							<Routes>
								<Route path="/register" element={<Register />} />
								<Route path="/login" element={<div>Login Page</div>} />
							</Routes>
						</MemoryRouter>,
					);

					// Act - Fill all fields
					fillAllFields();
					fireEvent.click(screen.getByText("REGISTER"));

					// Assert
					await waitFor(() =>
						expect(toast.error).toHaveBeenCalledWith("Registration failed"),
					);
					// Should not navigate to login page
					expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
				});

				it("should handle network timeout gracefully", async () => {
					// Arrange
					const timeoutError = new Error("timeout of 5000ms exceeded");
					timeoutError.code = "ECONNABORTED";
					axios.post.mockRejectedValueOnce(timeoutError);

					render(
						<MemoryRouter initialEntries={["/register"]}>
							<Routes>
								<Route path="/register" element={<Register />} />
							</Routes>
						</MemoryRouter>,
					);

					// Act
					fillAllFields();
					fireEvent.click(screen.getByText("REGISTER"));

					// Assert
					await waitFor(() => {
						expect(toast.error).toHaveBeenCalledWith("Something went wrong");
					});
					expect(console.log).toHaveBeenCalled();
				});
			});
		});
	});
});
