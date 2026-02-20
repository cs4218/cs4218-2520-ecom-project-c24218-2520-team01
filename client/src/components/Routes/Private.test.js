import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import "@testing-library/jest-dom/extend-expect";

// Mock useAuth
jest.mock("../../context/auth", () => ({
	useAuth: jest.fn(),
}));

// Mock axios
jest.mock("axios");

// Mock Spinner component
jest.mock("../Spinner", () => {
	return function MockSpinner({ path = "login" }) {
		return <div data-testid="spinner">Spinner redirecting to {path}</div>;
	};
});

// Mock Outlet component from react-router-dom
jest.mock("react-router-dom", () => ({
	...jest.requireActual("react-router-dom"),
	Outlet: () => <div data-testid="outlet">Protected Content</div>,
}));

// Import Private after mocks are set up (ensure mocks are set up before importing)
import Private from "./Private";
import { useAuth } from "../../context/auth";

describe("Private Route Component", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should render Spinner when auth.token is null", () => {
		// Arrange
		useAuth.mockReturnValue([{ token: null }, jest.fn()]);
		axios.get.mockResolvedValue({ data: { ok: false } });

		// Act
		render(
			<MemoryRouter>
				<Private />
			</MemoryRouter>,
		);

		// Assert
		expect(screen.getByTestId("spinner")).toBeInTheDocument();
		expect(screen.getByTestId("spinner")).toHaveTextContent(
			"Spinner redirecting to",
		);
		expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
		// API should not be called when there's no token
		expect(axios.get).not.toHaveBeenCalled();
	});

	it("should render Spinner when auth.token is undefined", () => {
		// Arrange
		useAuth.mockReturnValue([{ token: undefined }, jest.fn()]);
		axios.get.mockResolvedValue({ data: { ok: false } });

		// Act
		render(
			<MemoryRouter>
				<Private />
			</MemoryRouter>,
		);

		// Assert
		expect(screen.getByTestId("spinner")).toBeInTheDocument();
		expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
		expect(axios.get).not.toHaveBeenCalled();
	});

	it("should render Spinner when auth is null", () => {
		// Arrange
		useAuth.mockReturnValue([null, jest.fn()]);
		axios.get.mockResolvedValue({ data: { ok: false } });

		// Act
		render(
			<MemoryRouter>
				<Private />
			</MemoryRouter>,
		);

		// Assert
		expect(screen.getByTestId("spinner")).toBeInTheDocument();
		expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
		expect(axios.get).not.toHaveBeenCalled();
	});

	it("should render Spinner when auth.token is empty string", () => {
		// Arrange
		useAuth.mockReturnValue([{ token: "" }, jest.fn()]);
		axios.get.mockResolvedValue({ data: { ok: false } });

		// Act
		render(
			<MemoryRouter>
				<Private />
			</MemoryRouter>,
		);

		// Assert
		expect(screen.getByTestId("spinner")).toBeInTheDocument();
		expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
		// Empty string, so API should not be called
		expect(axios.get).not.toHaveBeenCalled();
	});

	it("should render Outlet when API returns ok: true", async () => {
		// Arrange
		useAuth.mockReturnValue([{ token: "valid-token" }, jest.fn()]);
		axios.get.mockResolvedValue({ data: { ok: true } });

		// Act
		render(
			<MemoryRouter>
				<Private />
			</MemoryRouter>,
		);

		// Assert - API should be called and Outlet rendered
		await waitFor(() => {
			expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth");
		});
		await waitFor(() => {
			expect(screen.getByTestId("outlet")).toBeInTheDocument();
		});
		expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
	});

	it("should render Spinner when API returns ok: false", async () => {
		// Arrange
		useAuth.mockReturnValue([{ token: "invalid-token" }, jest.fn()]);
		axios.get.mockResolvedValue({ data: { ok: false } });

		// Act
		render(
			<MemoryRouter>
				<Private />
			</MemoryRouter>,
		);

		// Assert - Spinner should still be displayed
		await waitFor(() => {
			expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth");
		});
		expect(screen.getByTestId("spinner")).toBeInTheDocument();
		expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
	});

	it("should re-run auth check when auth.token changes", async () => {
		// Arrange
		const setAuth = jest.fn();
		useAuth.mockReturnValue([{ token: "token-1" }, setAuth]);
		axios.get.mockResolvedValue({ data: { ok: true } });

		// Act - initial render
		const { rerender } = render(
			<MemoryRouter>
				<Private />
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
				<Private />
			</MemoryRouter>,
		);

		// Assert - API called again with new token
		await waitFor(() => {
			expect(axios.get).toHaveBeenCalledTimes(1);
		});
	});

	it("should render Spinner initially before API responds", () => {
		// Arrange
		useAuth.mockReturnValue([{ token: "valid-token" }, jest.fn()]);
		// Use a promise that doesn't resolve immediately
		axios.get.mockImplementation(() => new Promise(() => {}));

		// Act
		render(
			<MemoryRouter>
				<Private />
			</MemoryRouter>,
		);

		// Assert - Spinner should be shown initially
		expect(screen.getByTestId("spinner")).toBeInTheDocument();
	});

	it("should not call API when auth is undefined", () => {
		// Arrange
		useAuth.mockReturnValue([undefined, jest.fn()]);

		// Act
		render(
			<MemoryRouter>
				<Private />
			</MemoryRouter>,
		);

		// Assert
		expect(screen.getByTestId("spinner")).toBeInTheDocument();
		expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
		expect(axios.get).not.toHaveBeenCalled();
	});

	it("should render Spinner when API call throws an error", async () => {
		// Arrange
		useAuth.mockReturnValue([{ token: "valid-token" }, jest.fn()]);
		axios.get.mockRejectedValue(new Error("Network Error"));

		// Act
		render(
			<MemoryRouter>
				<Private />
			</MemoryRouter>,
		);

		// Assert - render should remain on Spinner since error sets ok to false
		await waitFor(() => {
			expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth");
		});
		expect(screen.getByTestId("spinner")).toBeInTheDocument();
		expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
	});
});
