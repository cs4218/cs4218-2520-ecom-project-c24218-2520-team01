// Import mocks before the component
// Mocking axios, react-hot-toast, and Layout component
import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";

jest.mock("axios");
jest.mock("react-hot-toast");
jest.mock("../../components/Layout", () => ({ children }) => (
	<div>{children}</div>
));

import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import toast from "react-hot-toast";
import ForgotPassword from "./ForgotPassword";

//Wong Sheen Kerr (A0269647J)

describe("Authentication Pages", () => {
	describe("ForgotPassword Page", () => {
		beforeEach(() => {
			jest.clearAllMocks();
			jest.spyOn(console, "log").mockImplementation(() => {});
		});

		afterEach(() => {
			jest.restoreAllMocks();
		});

		describe("Success", () => {
			it("renders forgot password form with all fields", () => {
				// Arrange & Act
				render(
					<MemoryRouter initialEntries={["/forgot-password"]}>
						<Routes>
							<Route path="/forgot-password" element={<ForgotPassword />} />
						</Routes>
					</MemoryRouter>,
				);

				// Assert
				expect(screen.getByText("RESET PASSWORD")).toBeInTheDocument();
				const emailInput = screen.getByPlaceholderText("Enter Your Email");
				const answerInput = screen.getByPlaceholderText(
					"Enter Your favorite Sport Name",
				);
				const passwordInput = screen.getByPlaceholderText(
					"Enter Your New Password",
				);

				expect(emailInput).toBeInTheDocument();
				expect(answerInput).toBeInTheDocument();
				expect(passwordInput).toBeInTheDocument();
				expect(screen.getByText("RESET")).toBeInTheDocument();

				// Inputs should be initially empty
				expect(emailInput.value).toBe("");
				expect(answerInput.value).toBe("");
				expect(passwordInput.value).toBe("");
			});

			it("should reset password successfully and navigate to login", async () => {
				// Arrange
				axios.post.mockResolvedValueOnce({
					data: { success: true, message: "Password reset successfully" },
				});

				render(
					<MemoryRouter initialEntries={["/forgot-password"]}>
						<Routes>
							<Route path="/forgot-password" element={<ForgotPassword />} />
							<Route path="/login" element={<div>Login Page</div>} />
						</Routes>
					</MemoryRouter>,
				);

				// Act - Fill all 3 fields
				fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
					target: { value: "sheen@example.com" },
				});
				fireEvent.change(
					screen.getByPlaceholderText("Enter Your favorite Sport Name"),
					{
						target: { value: "Golf" },
					},
				);
				fireEvent.change(
					screen.getByPlaceholderText("Enter Your New Password"),
					{
						target: { value: "newPassword123" },
					},
				);

				fireEvent.click(screen.getByText("RESET"));

				// Assert
				await waitFor(() =>
					expect(toast.success).toHaveBeenCalledWith(
						"Password reset successfully",
					),
				);
				expect(axios.post).toHaveBeenCalledWith(
					"/api/v1/auth/forgot-password",
					{
						email: "sheen@example.com",
						newPassword: "newPassword123",
						answer: "Golf",
					},
				);
				expect(screen.getByText("Login Page")).toBeInTheDocument();
			});

			it("should handle form submission with success but no message", async () => {
				// Arrange
				axios.post.mockResolvedValueOnce({
					data: { success: true },
				});

				render(
					<MemoryRouter initialEntries={["/forgot-password"]}>
						<Routes>
							<Route path="/forgot-password" element={<ForgotPassword />} />
							<Route path="/login" element={<div>Login Page</div>} />
						</Routes>
					</MemoryRouter>,
				);

				// Act - Fill all fields
				fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
					target: { value: "sheen@example.com" },
				});
				fireEvent.change(
					screen.getByPlaceholderText("Enter Your favorite Sport Name"),
					{
						target: { value: "Golf" },
					},
				);
				fireEvent.change(
					screen.getByPlaceholderText("Enter Your New Password"),
					{
						target: { value: "newPassword123" },
					},
				);

				fireEvent.click(screen.getByText("RESET"));

				// Assert
				await waitFor(() => expect(toast.success).toHaveBeenCalled());
				expect(screen.getByText("Login Page")).toBeInTheDocument();
			});
		});

		describe("Error", () => {
			describe("Form Handling Errors", () => {
				it("should handle very long input values", async () => {
					// Arrange
					const longEmail = "a".repeat(6767) + "@example.com";
					const longAnswer = "b".repeat(6767);
					const longPassword = "c".repeat(6767);

					axios.post.mockResolvedValueOnce({
						data: { success: true, message: "Password reset successfully" },
					});

					render(
						<MemoryRouter initialEntries={["/forgot-password"]}>
							<Routes>
								<Route path="/forgot-password" element={<ForgotPassword />} />
								<Route path="/login" element={<div>Login Page</div>} />
							</Routes>
						</MemoryRouter>,
					);

					// Act
					fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
						target: { value: longEmail },
					});
					fireEvent.change(
						screen.getByPlaceholderText("Enter Your favorite Sport Name"),
						{
							target: { value: longAnswer },
						},
					);
					fireEvent.change(
						screen.getByPlaceholderText("Enter Your New Password"),
						{
							target: { value: longPassword },
						},
					);

					fireEvent.click(screen.getByText("RESET"));

					// Assert
					await waitFor(() =>
						expect(axios.post).toHaveBeenCalledWith(
							"/api/v1/auth/forgot-password",
							{
								email: longEmail,
								newPassword: longPassword,
								answer: longAnswer,
							},
						),
					);
				});

				it("should display error message when password reset fails with success = false", async () => {
					// Arrange
					axios.post.mockResolvedValueOnce({
						data: { success: false, message: "Invalid email or answer" },
					});

					render(
						<MemoryRouter initialEntries={["/forgot-password"]}>
							<Routes>
								<Route path="/forgot-password" element={<ForgotPassword />} />
							</Routes>
						</MemoryRouter>,
					);

					// Act - Fill all fields
					fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
						target: { value: "sheen@example.com" },
					});
					fireEvent.change(
						screen.getByPlaceholderText("Enter Your favorite Sport Name"),
						{
							target: { value: "Wrong Answer" },
						},
					);
					fireEvent.change(
						screen.getByPlaceholderText("Enter Your New Password"),
						{
							target: { value: "newPassword123" },
						},
					);

					fireEvent.click(screen.getByText("RESET"));

					// Assert
					await waitFor(() =>
						expect(toast.error).toHaveBeenCalledWith("Invalid email or answer"),
					);
					expect(axios.post).toHaveBeenCalled();
				});

				it("should display error message when password reset throws an error", async () => {
					// Arrange
					axios.post.mockRejectedValueOnce(new Error("Network error"));

					render(
						<MemoryRouter initialEntries={["/forgot-password"]}>
							<Routes>
								<Route path="/forgot-password" element={<ForgotPassword />} />
							</Routes>
						</MemoryRouter>,
					);

					// Act - Fill all fields
					fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
						target: { value: "sheen@example.com" },
					});
					fireEvent.change(
						screen.getByPlaceholderText("Enter Your favorite Sport Name"),
						{
							target: { value: "Golf" },
						},
					);
					fireEvent.change(
						screen.getByPlaceholderText("Enter Your New Password"),
						{
							target: { value: "newPassword123" },
						},
					);

					fireEvent.click(screen.getByText("RESET"));

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
						<MemoryRouter initialEntries={["/forgot-password"]}>
							<Routes>
								<Route path="/forgot-password" element={<ForgotPassword />} />
							</Routes>
						</MemoryRouter>,
					);

					// Act - Fill all fields
					fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
						target: { value: "sheen@example.com" },
					});
					fireEvent.change(
						screen.getByPlaceholderText("Enter Your favorite Sport Name"),
						{
							target: { value: "Golf" },
						},
					);
					fireEvent.change(
						screen.getByPlaceholderText("Enter Your New Password"),
						{
							target: { value: "newPassword123" },
						},
					);

					fireEvent.click(screen.getByText("RESET"));

					// Assert - Accessing res.data.success when data is undefined throws error,
					// which is caught and calls toast.error("Something went wrong")
					await waitFor(() =>
						expect(toast.error).toHaveBeenCalledWith("Something went wrong"),
					);
					expect(axios.post).toHaveBeenCalled();
					expect(console.log).toHaveBeenCalled();
				});

				it("should not navigate to login on failed password reset", async () => {
					// Arrange
					axios.post.mockResolvedValueOnce({
						data: { success: false, message: "Reset failed" },
					});

					render(
						<MemoryRouter initialEntries={["/forgot-password"]}>
							<Routes>
								<Route path="/forgot-password" element={<ForgotPassword />} />
								<Route path="/login" element={<div>Login Page</div>} />
							</Routes>
						</MemoryRouter>,
					);

					// Act - Fill all fields
					fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
						target: { value: "sheen@example.com" },
					});
					fireEvent.change(
						screen.getByPlaceholderText("Enter Your favorite Sport Name"),
						{
							target: { value: "Golf" },
						},
					);
					fireEvent.change(
						screen.getByPlaceholderText("Enter Your New Password"),
						{
							target: { value: "newPassword123" },
						},
					);

					fireEvent.click(screen.getByText("RESET"));

					// Assert
					await waitFor(() =>
						expect(toast.error).toHaveBeenCalledWith("Reset failed"),
					);
					// Should not navigate to login page
					expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
				});
			});
		});
	});
});
