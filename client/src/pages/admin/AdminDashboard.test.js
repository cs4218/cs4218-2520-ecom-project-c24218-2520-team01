import React from "react";
import { render, screen } from "@testing-library/react";
import AdminDashboard from "./AdminDashboard";
import { useAuth } from "../../context/auth";
import "@testing-library/jest-dom";

// Lim Jia Wei, A0277381W

// Mock useAuth hook
jest.mock("../../context/auth", () => ({
    useAuth: jest.fn(),
}));

// Mock AdminMenu component
jest.mock("../../components/AdminMenu", () => () => (
    <div data-testid="admin-menu">AdminMenu</div>
));

// Mock Layout component
jest.mock("./../../components/Layout", () => ({ children }) => (
    <div data-testid="layout">{children}</div>
));

describe("Tests for AdminDashboard Component", () => {

    const mockAuth = {
        user: {
            name: "Admin",
            email: "admin@test.com",
            phone: "123456789",
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("Render admin details correctly", () => {

        // Arrange
        useAuth.mockReturnValue([mockAuth, jest.fn()]);

        // Act
        render(<AdminDashboard />);

        // Assert
        expect(screen.getByText(/Admin Name : Admin/i)).toBeInTheDocument();
        expect(screen.getByText(/Admin Email : admin@test.com/i)).toBeInTheDocument();
        expect(screen.getByText(/Admin Contact : 123456789/i)).toBeInTheDocument();

    });

    test("Does not crash when auth is null", () => {

        // Arrange
        useAuth.mockReturnValue([null, jest.fn()]);

        // Act
        render(<AdminDashboard />);

        // Assert
        expect(screen.getByText(/Admin Name :/i)).toBeInTheDocument();
        expect(screen.getByText(/Admin Email :/i)).toBeInTheDocument();
        expect(screen.getByText(/Admin Contact :/i)).toBeInTheDocument();

    });

    test("Renders when admin email and phone number are missing", () => {

        // Arrange
        const partialAuth = { user: { name: "Admin" } }; // Only name, no email or phone number
        useAuth.mockReturnValue([partialAuth, jest.fn()]);

        // Act
        render(<AdminDashboard />);

        // Assert
        expect(screen.getByText(/Admin Name : Admin/i)).toBeInTheDocument();
        expect(screen.getByText(/Admin Email :/i)).toBeInTheDocument();
        expect(screen.getByText(/Admin Contact :/i)).toBeInTheDocument();
    });

});
