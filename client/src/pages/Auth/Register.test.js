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

describe("Register Component", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	// ========== RENDERING TESTS ==========
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
		expect(screen.getByPlaceholderText("Enter Your Name")).toBeInTheDocument();
		expect(screen.getByPlaceholderText("Enter Your Email")).toBeInTheDocument();
		expect(
			screen.getByPlaceholderText("Enter Your Password"),
		).toBeInTheDocument();
		expect(screen.getByPlaceholderText("Enter Your Phone")).toBeInTheDocument();
		expect(
			screen.getByPlaceholderText("Enter Your Address"),
		).toBeInTheDocument();
		expect(screen.getByPlaceholderText("Enter Your DOB")).toBeInTheDocument();
		expect(
			screen.getByPlaceholderText("What is Your Favorite Sport"),
		).toBeInTheDocument();
		expect(screen.getByText("REGISTER")).toBeInTheDocument();
	});

	it("inputs should be initially empty", () => {
		// Arrange & Act
		render(
			<MemoryRouter initialEntries={["/register"]}>
				<Routes>
					<Route path="/register" element={<Register />} />
				</Routes>
			</MemoryRouter>,
		);

		// Assert
		expect(screen.getByPlaceholderText("Enter Your Name").value).toBe("");
		expect(screen.getByPlaceholderText("Enter Your Email").value).toBe("");
		expect(screen.getByPlaceholderText("Enter Your Password").value).toBe("");
		expect(screen.getByPlaceholderText("Enter Your Phone").value).toBe("");
		expect(screen.getByPlaceholderText("Enter Your Address").value).toBe("");
		expect(screen.getByPlaceholderText("Enter Your DOB").value).toBe("");
		expect(
			screen.getByPlaceholderText("What is Your Favorite Sport").value,
		).toBe("");
	});

	// ========== INPUT FIELD TESTS ==========
	it("should allow typing in name field", () => {
		// Arrange
		render(
			<MemoryRouter initialEntries={["/register"]}>
				<Routes>
					<Route path="/register" element={<Register />} />
				</Routes>
			</MemoryRouter>,
		);

		// Act
		fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
			target: { value: "John Doe" },
		});

		// Assert
		expect(screen.getByPlaceholderText("Enter Your Name").value).toBe(
			"John Doe",
		);
	});

	it("should allow typing in email field", () => {
		// Arrange
		render(
			<MemoryRouter initialEntries={["/register"]}>
				<Routes>
					<Route path="/register" element={<Register />} />
				</Routes>
			</MemoryRouter>,
		);

		// Act
		fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
			target: { value: "test@example.com" },
		});

		// Assert
		expect(screen.getByPlaceholderText("Enter Your Email").value).toBe(
			"test@example.com",
		);
	});

	it("should allow typing in password field", () => {
		// Arrange
		render(
			<MemoryRouter initialEntries={["/register"]}>
				<Routes>
					<Route path="/register" element={<Register />} />
				</Routes>
			</MemoryRouter>,
		);

		// Act
		fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
			target: { value: "password123" },
		});

		// Assert
		expect(screen.getByPlaceholderText("Enter Your Password").value).toBe(
			"password123",
		);
	});

	it("should allow typing in phone field", () => {
		// Arrange
		render(
			<MemoryRouter initialEntries={["/register"]}>
				<Routes>
					<Route path="/register" element={<Register />} />
				</Routes>
			</MemoryRouter>,
		);

		// Act
		fireEvent.change(screen.getByPlaceholderText("Enter Your Phone"), {
			target: { value: "1234567890" },
		});

		// Assert
		expect(screen.getByPlaceholderText("Enter Your Phone").value).toBe(
			"1234567890",
		);
	});

	it("should allow typing in address field", () => {
		// Arrange
		render(
			<MemoryRouter initialEntries={["/register"]}>
				<Routes>
					<Route path="/register" element={<Register />} />
				</Routes>
			</MemoryRouter>,
		);

		// Act
		fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
			target: { value: "123 Street, City" },
		});

		// Assert
		expect(screen.getByPlaceholderText("Enter Your Address").value).toBe(
			"123 Street, City",
		);
	});

	it("should allow typing in DOB field", () => {
		// Arrange
		render(
			<MemoryRouter initialEntries={["/register"]}>
				<Routes>
					<Route path="/register" element={<Register />} />
				</Routes>
			</MemoryRouter>,
		);

		// Act
		fireEvent.change(screen.getByPlaceholderText("Enter Your DOB"), {
			target: { value: "2000-01-01" },
		});

		// Assert
		expect(screen.getByPlaceholderText("Enter Your DOB").value).toBe(
			"2000-01-01",
		);
	});

	it("should allow typing in answer field", () => {
		// Arrange
		render(
			<MemoryRouter initialEntries={["/register"]}>
				<Routes>
					<Route path="/register" element={<Register />} />
				</Routes>
			</MemoryRouter>,
		);

		// Act
		fireEvent.change(
			screen.getByPlaceholderText("What is Your Favorite Sport"),
			{
				target: { value: "Football" },
			},
		);

		// Assert
		expect(
			screen.getByPlaceholderText("What is Your Favorite Sport").value,
		).toBe("Football");
	});

	// ========== FORM SUBMISSION TESTS ==========
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
		fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
			target: { value: "John Doe" },
		});
		fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
			target: { value: "test@example.com" },
		});
		fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
			target: { value: "password123" },
		});
		fireEvent.change(screen.getByPlaceholderText("Enter Your Phone"), {
			target: { value: "1234567890" },
		});
		fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
			target: { value: "123 Street" },
		});
		fireEvent.change(screen.getByPlaceholderText("Enter Your DOB"), {
			target: { value: "2000-01-01" },
		});
		fireEvent.change(
			screen.getByPlaceholderText("What is Your Favorite Sport"),
			{
				target: { value: "Football" },
			},
		);

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
		fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
			target: { value: "John Doe" },
		});
		fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
			target: { value: "test@example.com" },
		});
		fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
			target: { value: "password123" },
		});
		fireEvent.change(screen.getByPlaceholderText("Enter Your Phone"), {
			target: { value: "1234567890" },
		});
		fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
			target: { value: "123 Street" },
		});
		fireEvent.change(screen.getByPlaceholderText("Enter Your DOB"), {
			target: { value: "2000-01-01" },
		});
		fireEvent.change(
			screen.getByPlaceholderText("What is Your Favorite Sport"),
			{
				target: { value: "Football" },
			},
		);

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
		fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
			target: { value: "John Doe" },
		});
		fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
			target: { value: "test@example.com" },
		});
		fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
			target: { value: "password123" },
		});
		fireEvent.change(screen.getByPlaceholderText("Enter Your Phone"), {
			target: { value: "1234567890" },
		});
		fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
			target: { value: "123 Street" },
		});
		fireEvent.change(screen.getByPlaceholderText("Enter Your DOB"), {
			target: { value: "2000-01-01" },
		});
		fireEvent.change(
			screen.getByPlaceholderText("What is Your Favorite Sport"),
			{
				target: { value: "Football" },
			},
		);

		fireEvent.click(screen.getByText("REGISTER"));

		// Assert
		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith("Something went wrong"),
		);
		expect(axios.post).toHaveBeenCalled();
		expect(console.log).toHaveBeenCalled();
	});

	// ========== EDGE CASE TESTS ==========
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
		fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
			target: { value: "John Doe" },
		});
		fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
			target: { value: "test@example.com" },
		});
		fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
			target: { value: "password123" },
		});
		fireEvent.change(screen.getByPlaceholderText("Enter Your Phone"), {
			target: { value: "1234567890" },
		});
		fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
			target: { value: "123 Street" },
		});
		fireEvent.change(screen.getByPlaceholderText("Enter Your DOB"), {
			target: { value: "2000-01-01" },
		});
		fireEvent.change(
			screen.getByPlaceholderText("What is Your Favorite Sport"),
			{
				target: { value: "Football" },
			},
		);

		fireEvent.click(screen.getByText("REGISTER"));

		// Assert - Accessing res.data.success when data is undefined throws error,
		// which is caught and calls toast.error("Something went wrong")
		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith("Something went wrong"),
		);
		expect(axios.post).toHaveBeenCalled();
		expect(console.log).toHaveBeenCalled();
	});
});
