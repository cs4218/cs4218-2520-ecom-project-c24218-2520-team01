import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import "@testing-library/jest-dom/extend-expect";
import toast from "react-hot-toast";

import AdminOrders from "../../pages/admin/AdminOrders";
import AdminRoute from "../../components/Routes/AdminRoute";
import { AuthProvider } from "../../context/auth";
import Login from "../../pages/Auth/Login";

import { setMockAuth, mockAdminAuthAPI, mockLoginAPI } from "./testUtils";

// Lim Jia Wei, A0277381W

jest.mock("axios");
jest.mock("react-hot-toast");

jest.mock("../../components/AdminMenu", () => () => <div data-testid="admin-menu">AdminMenu</div>);
jest.mock("../../components/Spinner", () => () => <div data-testid="spinner">Spinner</div>);

// Mock Layout
jest.mock("../../components/Layout", () => ({ children, title }) => (
    <div data-testid="layout">
        <div data-testid="title">{title}</div>
        {children}
    </div>
));

/**
 * AI Usage Declaration
 *
 * Tool Used: Gemini 3.1 Pro
 *
 * Prompt: How do I mock the antd Modal for this class?
 *
 * How the AI Output Was Used:
 * - Used for the antd Modal mocked as seen below
*/

// Mock Antd Modal
jest.mock("antd", () => {
    const originalAntd = jest.requireActual("antd");
    return {
        ...originalAntd,
        // Using defaultValue is key because AdminOrders populates defaultValue={o?.status}
        Select: Object.assign(({ children, onChange, defaultValue }) => (
            <select data-testid="antd-select" defaultValue={defaultValue} onChange={(e) => onChange(e.target.value)}>
                {Array.isArray(children) ? children : [children]}
            </select>
        ), { Option: ({ children, value }) => <option value={value}>{children}</option> }),
    };
});

/**
 * AI Usage Declaration
 *
 * Tool Used: Gemini 3.1 Pro
 *
 * Prompt: What flows should I test for Admin Orders + Form: AdminOrders → API calls → toast notifications → UI updates using a bottom up approach?
 *
 * How the AI Output Was Used:
 * - Used the AI output as a reference to determine which flows to test (including error flows)
*/

const mockOrders = [
    {
        _id: "order1",
        status: "Not Processed",
        buyer: { name: "John Doe" },
        createdAt: "2023-01-01",
        payment: { success: true },
        products: [
            { _id: "prod1", name: "Camera", description: "Good camera", price: 500 }
        ]
    }
];

describe("Admin Orders Management Flow Integration Tests", () => {

    beforeEach(() => {

        jest.clearAllMocks();
        localStorage.clear();

        jest.spyOn(console, "log").mockImplementation(() => { });
        jest.spyOn(console, "error").mockImplementation(() => { });
        axios.defaults.headers.common["Authorization"] = undefined;

        axios.get.mockImplementation((url) => {
            if (url === "/api/v1/auth/admin-auth") return Promise.resolve({ data: { ok: true } });
            if (url === "/api/v1/auth/all-orders") return Promise.resolve({ data: mockOrders });
            return Promise.resolve({ data: [] });
        });

        axios.put.mockResolvedValue({ data: { success: true } });

    });

    afterEach(() => {

        jest.restoreAllMocks();

    });

    // Level 4
    describe("AdminOrders", () => {

        it("should load orders, change status, and refresh", async () => {

            // Arrange
            setMockAuth(1, "mock-admin-token");

            // Act
            render(
                <AuthProvider>
                    <MemoryRouter initialEntries={["/dashboard/admin/orders"]}>
                        <Routes>
                            <Route path="/dashboard/admin/orders" element={<AdminOrders />} />
                        </Routes>
                    </MemoryRouter>
                </AuthProvider>
            );

            await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/all-orders"));

            // Assert
            await waitFor(() => expect(screen.getByText("All Orders")).toBeInTheDocument());
            await waitFor(() => expect(screen.getByText("John Doe")).toBeInTheDocument());
            await waitFor(() => expect(screen.getByText("Camera")).toBeInTheDocument());

            // interact with the Antd dropdown
            const selectOptions = screen.getByTestId("antd-select");
            expect(selectOptions.value).toBe("Not Processed"); // asserts defaultValue

            // change status
            fireEvent.change(selectOptions, { target: { value: "Shipped" } });

            // Assert
            await waitFor(() => expect(axios.put).toHaveBeenCalledWith("/api/v1/auth/order-status/order1", { status: "Shipped" }));
            await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2)); // initial and refresh so 2 times
        });

        // TO BE FIXED LATER
        it("should log error when order status update fails", async () => {

            // Arrange
            setMockAuth(1, "mock-admin-token");

            // Mock API rejection on the PUT update
            axios.put.mockRejectedValueOnce({ response: { data: { message: "Update failed" } } });

            // Act
            render(
                <AuthProvider>
                    <MemoryRouter initialEntries={["/dashboard/admin/orders"]}>
                        <Routes>
                            <Route path="/dashboard/admin/orders" element={<AdminOrders />} />
                        </Routes>
                    </MemoryRouter>
                </AuthProvider>
            );

            await waitFor(() => expect(screen.getByText("John Doe")).toBeInTheDocument());
            const selectOptions = screen.getByTestId("antd-select");

            fireEvent.change(selectOptions, { target: { value: "Shipped" } });

            // Assert
            await waitFor(() => expect(axios.put).toHaveBeenCalledWith("/api/v1/auth/order-status/order1", { status: "Shipped" }));
            await waitFor(() => expect(console.log).toHaveBeenCalled());
        });

        it("should show error toast and no orders when the fetch API rejects", async () => {

            // Arrange
            setMockAuth(1, "mock-admin-token");

            axios.get.mockImplementation((url) => {
                if (url === "/api/v1/auth/admin-auth") return Promise.resolve({ data: { ok: true } });
                if (url === "/api/v1/auth/all-orders") return Promise.reject(new Error("Server Error"));
                return Promise.resolve({ data: [] });
            });

            // Act
            render(
                <AuthProvider>
                    <MemoryRouter initialEntries={["/dashboard/admin/orders"]}>
                        <Routes>
                            <Route path="/dashboard/admin/orders" element={<AdminOrders />} />
                        </Routes>
                    </MemoryRouter>
                </AuthProvider>
            );

            await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/all-orders"));

            // Assert
            await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to load orders"));

            expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
        });
    });

    // Level 3
    describe("AdminRoute + AdminOrders", () => {

        it("should unlock correctly after Admin API verification", async () => {

            // Arrange
            setMockAuth();
            mockAdminAuthAPI(true);

            // Act
            render(
                <AuthProvider>
                    <MemoryRouter initialEntries={["/dashboard/admin/orders"]}>
                        <Routes>
                            <Route path="/dashboard/admin" element={<AdminRoute />}>
                                <Route path="orders" element={<AdminOrders />} />
                            </Route>
                        </Routes>
                    </MemoryRouter>
                </AuthProvider>
            );

            expect(screen.getByTestId("spinner")).toBeInTheDocument();

            // Assert
            await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth"));
            await waitFor(() => expect(screen.getByText("All Orders")).toBeInTheDocument());
        });
    });

    // Level 2
    describe("AuthContext + AdminRoute + AdminOrders", () => {
        it("should set axios auth header from context", async () => {

            // Arrange
            setMockAuth(1, "mocked-auth-token-999");
            mockAdminAuthAPI(true);

            // Act
            render(
                <AuthProvider>
                    <MemoryRouter initialEntries={["/dashboard/admin/orders"]}>
                        <Routes>
                            <Route path="/dashboard/admin" element={<AdminRoute />}>
                                <Route path="orders" element={<AdminOrders />} />
                            </Route>
                        </Routes>
                    </MemoryRouter>
                </AuthProvider>
            );

            // Assert
            await waitFor(() => expect(screen.getByText("All Orders")).toBeInTheDocument());
            expect(axios.defaults.headers.common["Authorization"]).toBe("mocked-auth-token-999");
        });
    });

    // Level 1
    describe("Login + AuthContext + AdminRoute + AdminOrders", () => {

        it("should log in and navigate to orders page", async () => {

            // Arrange
            mockLoginAPI(true, "ultimate-login-token", 1);
            mockAdminAuthAPI(true);

            // Act
            render(
                <AuthProvider>
                    <MemoryRouter initialEntries={[{ pathname: "/login", state: "/dashboard/admin/orders" }]}>
                        <Routes>
                            <Route path="/login" element={<Login />} />
                            <Route path="/dashboard/admin" element={<AdminRoute />}>
                                <Route path="orders" element={<AdminOrders />} />
                            </Route>
                        </Routes>
                    </MemoryRouter>
                </AuthProvider>
            );

            // login
            fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), { target: { value: "admin@admin.com" } });
            fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), { target: { value: "password123" } });
            fireEvent.click(screen.getByText("LOGIN"));

            // Assert
            await waitFor(() => expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/login", expect.any(Object)));
            await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth"));
            await waitFor(() => expect(screen.getByText("All Orders")).toBeInTheDocument());
        });
    });

});
