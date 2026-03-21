import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import "@testing-library/jest-dom/extend-expect";

import Users from "../../pages/admin/Users";
import AdminRoute from "../../components/Routes/AdminRoute";
import { AuthProvider } from "../../context/auth";
import Login from "../../pages/Auth/Login";

import { setMockAuth, mockAdminAuthAPI, mockLoginAPI } from "./testUtils";

// Lim Jia Wei, A0277381W

jest.mock("axios");
jest.mock("react-hot-toast");

// Mock Layout
jest.mock("../../components/Layout", () => ({ children, title }) => (
    <div data-testid="layout">
        <div data-testid="title">{title}</div>
        {children}
    </div>
));

jest.mock("../../components/AdminMenu", () => () => <div data-testid="admin-menu">AdminMenu</div>);
jest.mock("../../components/Spinner", () => () => <div data-testid="spinner">Spinner</div>);

/**
 * AI Usage Declaration
 *
 * Tool Used: Gemini 3.1 Pro
 *
 * Prompt: What flows should I test for Users → API calls → UI updates using a bottom up approach?
 *
 * How the AI Output Was Used:
 * - Used the AI output as a reference to determine which flows to test (including error flows)
*/

const mockUsers = [
    { _id: "u1", name: "67 Admin", email: "admin@test.com", role: 1, phone: "1111" },
    { _id: "u2", name: "67 User", email: "user@test.com", role: 0 }, // phone number is absent
];

describe("Admin User Management Flow Integration Tests", () => {

    beforeEach(() => {

        jest.clearAllMocks();
        localStorage.clear();
        jest.spyOn(console, "log").mockImplementation(() => { });
        jest.spyOn(console, "error").mockImplementation(() => { });
        axios.defaults.headers.common["Authorization"] = undefined;

        axios.get.mockImplementation((url) => {
            if (url === "/api/v1/auth/admin-auth") return Promise.resolve({ data: { ok: true } });
            if (url === "/api/v1/user/all-users") return Promise.resolve({ data: { users: mockUsers } });
            return Promise.resolve({ data: [] });
        });

    });

    afterEach(() => {

        jest.restoreAllMocks();

    });

    // Level 4
    describe("Users", () => {

        it("should display users with role badges and phone numbers", async () => {

            // Act
            render(
                <MemoryRouter initialEntries={["/dashboard/admin/users"]}>
                    <Routes>
                        <Route path="/dashboard/admin/users" element={<Users />} />
                    </Routes>
                </MemoryRouter>
            );

            // Assert loading...
            expect(screen.getByText("Loading...")).toBeInTheDocument();

            await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/user/all-users"));
            await waitFor(() => expect(screen.queryByText("Loading...")).not.toBeInTheDocument());

            // Assert
            expect(screen.getByText("67 Admin")).toBeInTheDocument();
            expect(screen.getByText("67 User")).toBeInTheDocument();

            expect(screen.getByText("Admin")).toBeInTheDocument();
            expect(screen.getByText("User")).toBeInTheDocument();

            expect(screen.getByText("1111")).toBeInTheDocument();
        });

        it("should show no users and toast error when user fetch fails", async () => {

            // Arrange
            axios.get.mockRejectedValueOnce(new Error("Network Error"));

            // Act
            render(
                <MemoryRouter initialEntries={["/dashboard/admin/users"]}>
                    <Routes>
                        <Route path="/dashboard/admin/users" element={<Users />} />
                    </Routes>
                </MemoryRouter>
            );

            expect(screen.getByText("Loading...")).toBeInTheDocument();

            // Assert
            await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/user/all-users"));

            await waitFor(() => expect(screen.queryByText("Loading...")).not.toBeInTheDocument());
            await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to load users"));

            expect(screen.queryByText("67 Admin")).not.toBeInTheDocument();
        });
    });

    // Level 3
    describe("AdminRoute + Users", () => {

        it("should unlock correctly after Admin API verification", async () => {

            // Arrange
            setMockAuth();
            mockAdminAuthAPI(true);

            // Act
            render(
                <AuthProvider>
                    <MemoryRouter initialEntries={["/dashboard/admin/users"]}>
                        <Routes>
                            <Route path="/dashboard/admin" element={<AdminRoute />}>
                                <Route path="users" element={<Users />} />
                            </Route>
                        </Routes>
                    </MemoryRouter>
                </AuthProvider>
            );

            // Assert
            expect(screen.getByTestId("spinner")).toBeInTheDocument();

            await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth"));
            await waitFor(() => expect(screen.getByText("All Users")).toBeInTheDocument());
        });
    });

    // Level 2
    describe("AuthContext + AdminRoute + Users", () => {

        it("should set axios auth header from context", async () => {

            // Arrange
            setMockAuth(1, "mocked-auth-token-999");
            mockAdminAuthAPI(true);

            // Act
            render(
                <AuthProvider>
                    <MemoryRouter initialEntries={["/dashboard/admin/users"]}>
                        <Routes>
                            <Route path="/dashboard/admin" element={<AdminRoute />}>
                                <Route path="users" element={<Users />} />
                            </Route>
                        </Routes>
                    </MemoryRouter>
                </AuthProvider>
            );

            // Assert
            await waitFor(() => expect(screen.getByText("All Users")).toBeInTheDocument());
            expect(axios.defaults.headers.common["Authorization"]).toBe("mocked-auth-token-999");
        });
    });

    // Level 1
    describe("Login + AuthContext + AdminRoute + Users", () => {

        it("should navigate to users page after successful login", async () => {

            // Arrange
            mockLoginAPI(true, "67-login-token", 1);
            mockAdminAuthAPI(true);

            // Act
            render(
                <AuthProvider>
                    <MemoryRouter initialEntries={[{ pathname: "/login", state: "/dashboard/admin/users" }]}>
                        <Routes>
                            <Route path="/login" element={<Login />} />
                            <Route path="/dashboard/admin" element={<AdminRoute />}>
                                <Route path="users" element={<Users />} />
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
            await waitFor(() => expect(screen.getByText("All Users")).toBeInTheDocument());
        });
    });

});
