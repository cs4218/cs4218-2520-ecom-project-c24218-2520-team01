import React from "react";
import { render, screen } from "@testing-library/react";
import Dashboard from "./Dashboard";
import { useAuth } from "../../context/auth";

// Add a stub for useAuth 
jest.mock("../../context/auth", () => ({
    useAuth: jest.fn(),
}));

// Add a fake for Layout
jest.mock("../../components/Layout", () => ({ children }) => (
    <div data-testid="layout">{children}</div>
));

// Add a fake UserMenu
jest.mock("../../components/UserMenu", () => () => (
    <div data-testid="user-menu">User Menu</div>
));

// Tests for Dashboard 
describe("Unit test for dashboard component", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });


    test("Dashboard shows name, email, address", () => {
        // Arrange
        const mockAuth = [
            {
                user: {
                    name: "John",
                    email: "john@gmail.com",
                    address: "NUS, Singapore",
                },
            },
        ];
        useAuth.mockReturnValue(mockAuth);

        // Act
        render(<Dashboard />);

        // Assert
        expect(screen.getByText("John")).toBeInTheDocument();
        expect(screen.getByText("john@gmail.com")).toBeInTheDocument();
        expect(screen.getByText("NUS, Singapore")).toBeInTheDocument();
    });


    test("Dashboard works when user is undefined", () => {
        // Arrange
        useAuth.mockReturnValue([null]);

        // Act
        render(<Dashboard />);

        // Assert
        expect(screen.queryByText(/@/)).toBeNull();
    });


    test("Dashboard shows Layout", () => {
        // Arrange
        useAuth.mockReturnValue([{ user: {} }]);

        // Act
        render(<Dashboard />);

        // Assert
        expect(screen.getByTestId("layout")).toBeInTheDocument();
    });


    test("Dashboard shows User Menu", () => {
        // Arrange
        useAuth.mockReturnValue([{ user: {} }]);

        // Act
        render(<Dashboard />);

        // Assert
        expect(screen.getByTestId("user-menu")).toBeInTheDocument();
    });
});
