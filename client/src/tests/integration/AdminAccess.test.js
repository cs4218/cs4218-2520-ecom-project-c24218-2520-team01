import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import "@testing-library/jest-dom/extend-expect";
import toast from "react-hot-toast";

import AdminMenu from "../../components/AdminMenu";
import AdminRoute from "../../components/Routes/AdminRoute";
import { AuthProvider } from "../../context/auth";
import Login from "../../pages/Auth/Login";

import { setMockAuth, mockAdminAuthAPI, mockLoginAPI } from "./testUtils";

// Lim Jia Wei, A0277381W

// Mock required dependencies (but not all dependencies)
jest.mock("axios");
jest.mock("react-hot-toast");
jest.mock("../../components/Header", () => () => <div data-testid="header">Header</div>);
jest.mock("../../components/Spinner", () => () => <div data-testid="spinner">Spinner</div>);
jest.mock("../../components/Layout", () => ({ children }) => <div data-testid="layout">{children}</div>);

/**
 * AI Usage Declaration
 *
 * Tool Used: Gemini 3.1 Pro
 *
 * Prompt: What flows should I test for Admin Access + Navigation: Admin login → AuthContext → /dashboard/admin protected route → AdminMenu links using a bottom up approach?
 *
 * How the AI Output Was Used:
 * - Used the AI output as a reference to determine which flows to test (including error flows)
*/

describe("Admin Access Flow Integration Tests", () => {

    const renderAdminFlow = (initialEntries = ["/dashboard/admin"], additionalRoutes = null) => {
        return render(
            <AuthProvider>
                <MemoryRouter initialEntries={initialEntries}>
                    <Routes>
                        {additionalRoutes}
                        <Route path="/dashboard/admin" element={<AdminRoute />}>
                            <Route index element={<AdminMenu />} />
                        </Route>
                    </Routes>
                </MemoryRouter>
            </AuthProvider>
        );
    };

    beforeEach(() => {

        localStorage.clear();

        jest.clearAllMocks();
        jest.spyOn(console, "log").mockImplementation(() => { });
        jest.spyOn(console, "error").mockImplementation(() => { });
    });

    afterEach(() => {

        jest.restoreAllMocks();

    });

    // Level 3
    describe("AdminRoute + AdminMenu", () => {

        it("should render AdminMenu when AdminRoute API call succeeds", async () => {

            // Arrange
            setMockAuth(1, "admin-token", "admin");
            mockAdminAuthAPI(true);

            // Act
            renderAdminFlow();

            // Assert
            expect(screen.getByTestId("spinner")).toBeInTheDocument();

            await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth"));

            await waitFor(() => {
                expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
                expect(screen.getByText("Admin Panel")).toBeInTheDocument();
                expect(screen.getByText("Create Category")).toBeInTheDocument();
            });
        });

        it("should not render AdminMenu if AdminRoute API call fails", async () => {

            // Arrange
            setMockAuth(0, "fake token", "fake admin");
            mockAdminAuthAPI(false);

            // Act
            renderAdminFlow();

            // Assert
            await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth"));

            // Assert spinner is shown and admin panel is not
            expect(screen.queryByText("Admin Panel")).not.toBeInTheDocument();
        });

        it("should not call API and show spinner if no token is present", async () => {

            // Arrange
            localStorage.removeItem("auth");

            // Act
            renderAdminFlow();

            // Assert
            expect(screen.getByTestId("spinner")).toBeInTheDocument();
            // Since there's no token, AdminRoute does not call /api/v1/auth/admin-auth
            expect(axios.get).not.toHaveBeenCalledWith("/api/v1/auth/admin-auth");
            expect(screen.queryByText("Admin Panel")).not.toBeInTheDocument();
        });
    });

    // Level 2
    describe("AuthContext + AdminRoute + AdminMenu", () => {

        it("should set axios auth header and grant admin access", async () => {

            // Arrange
            // Does not mock AuthContext itself, but uses setMockAuth to set the auth state
            setMockAuth(1, "admin-token-2", "admin");
            mockAdminAuthAPI(true);

            // Act
            renderAdminFlow();

            await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth"));

            // Assert
            expect(axios.defaults.headers.common["Authorization"]).toBe("admin-token-2");

            await waitFor(() => {
                expect(screen.getByText("Admin Panel")).toBeInTheDocument();
            });
        });

        it("should deny access when auth state is missing", async () => {

            // Arrange
            localStorage.removeItem("auth");

            // Act
            renderAdminFlow();

            // Assert context did not set the axios header
            expect(axios.defaults.headers.common["Authorization"]).toBeFalsy();

            // Assert spinner is shown and admin panel is not
            expect(screen.getByTestId("spinner")).toBeInTheDocument();
            expect(screen.queryByText("Admin Panel")).not.toBeInTheDocument();
        });
    });

    // Level 1
    describe("Login + AuthContext + AdminRoute + AdminMenu", () => {

        it("should log in and reach admin dashboard", async () => {

            // Arrange
            mockLoginAPI(true, "mock-admin-token", 1);

            mockAdminAuthAPI(true);

            const initialEntry = {
                pathname: "/login",
                state: "/dashboard/admin"
            };

            // Act
            renderAdminFlow([initialEntry], <Route path="/login" element={<Login />} />);

            // fil out login form
            fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
                target: { value: "admin@admin.com" },
            });
            fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
                target: { value: "password123" },
            });

            // login
            fireEvent.click(screen.getByText("LOGIN"));

            // Assert login
            await waitFor(() => expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/login", {
                email: "admin@admin.com",
                password: "password123",
            }));

            await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth"));

            // Assert that after login, auth header is set back to original token
            expect(axios.defaults.headers.common["Authorization"]).toBe("mock-admin-token");

            // Assert admin menu is rendered
            await waitFor(() => {
                expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
                expect(screen.getByText("Admin Panel")).toBeInTheDocument();
                expect(screen.getByText("Create Category")).toBeInTheDocument();
            });
        });

        it("should show error toast and stay on login page when credentials are invalid", async () => {

            // Arrange
            axios.post.mockRejectedValueOnce({ message: "Invalid credentials" });

            const initialEntry = {
                pathname: "/login",
                state: "/dashboard/admin"
            };

            // Act
            renderAdminFlow([initialEntry], <Route path="/login" element={<Login />} />);

            // Fill out login form
            fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
                target: { value: "wrong@example.com" },
            });
            fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
                target: { value: "wrongpassword" },
            });

            fireEvent.click(screen.getByText("LOGIN"));

            // Assert login post
            await waitFor(() => expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/login", {
                email: "wrong@example.com",
                password: "wrongpassword",
            }));

            // Assert toast.error was called
            await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Something went wrong"));

            // Assert AdminRoute API should not be called
            expect(axios.get).not.toHaveBeenCalledWith("/api/v1/auth/admin-auth");

            // Assert still on login page
            expect(screen.getByText("LOGIN FORM")).toBeInTheDocument();
        });

        it("should deny admin access when a non-admin user logs in", async () => {

            // Arrange
            axios.post.mockResolvedValueOnce({
                data: {
                    success: true,
                    message: "Login successful",
                    user: { name: "Regular User", role: 0, email: "user@user.com" },
                    token: "mock-user-token"
                }
            });

            mockAdminAuthAPI(false);

            const initialEntry = {
                pathname: "/login",
                state: "/dashboard/admin"
            };

            // Act
            renderAdminFlow([initialEntry], <Route path="/login" element={<Login />} />);

            // Fill out login form
            fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
                target: { value: "user@user.com" },
            });
            fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
                target: { value: "password123" },
            });

            fireEvent.click(screen.getByText("LOGIN"));

            // Assert login
            await waitFor(() => expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/login", {
                email: "user@user.com",
                password: "password123",
            }));

            await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth"));

            // Assert that after login, auth header was set to the regular user token
            expect(axios.defaults.headers.common["Authorization"]).toBe("mock-user-token");

            // Assert the AdminMenu is not rendered
            expect(screen.queryByText("Admin Panel")).not.toBeInTheDocument();
            //expect(screen.getByTestId("spinner")).toBeInTheDocument();
        });

        it("should not call the login API when required fields are left empty", async () => {

            // Arrange
            const initialEntry = {
                pathname: "/login",
                state: "/dashboard/admin"
            };

            // Act
            renderAdminFlow([initialEntry], <Route path="/login" element={<Login />} />);

            // Wait for the login form to be rendered
            await waitFor(() => expect(screen.getByText("LOGIN FORM")).toBeInTheDocument());

            fireEvent.click(screen.getByText("LOGIN"));

            expect(axios.post).not.toHaveBeenCalled();
            expect(axios.get).not.toHaveBeenCalledWith("/api/v1/auth/admin-auth");

            // User stays on login page
            expect(screen.getByText("LOGIN FORM")).toBeInTheDocument();
        });
    });
});
