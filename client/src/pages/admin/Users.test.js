import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import Users from "./Users";

// Lim Jia Wei, A0277381W

// Mock Axios
jest.mock("axios");

// Mock Layout component
jest.mock("./../../components/Layout", () => ({ children }) => (
    <div data-testid="layout">{children}</div>
));

// Mock AdminMenu component
jest.mock("../../components/AdminMenu", () => {
    return function AdminMenuMock() {
        return <div data-testid="admin-menu">AdminMenu</div>;
    };
});

describe("Tests for Users page", () => {

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, "log").mockImplementation(() => { });
    });

    test("renders page and shows loading initially", async () => {

        // Arrange
        let resolvePromise;

        axios.get.mockReturnValue(
            new Promise((resolve) => {
                resolvePromise = resolve;
            })
        );

        // Act
        render(<Users />);

        // Assert
        expect(screen.getByTestId("layout")).toBeInTheDocument();
        expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: /all users/i })).toBeInTheDocument();
        expect(screen.getByText(/loading\.\.\./i)).toBeInTheDocument();

        // resolve the pending promise 
        resolvePromise({ data: { users: [] } });

        // Assert loading is gone
        await waitFor(() => {
            expect(screen.queryByText(/loading\.\.\./i)).not.toBeInTheDocument();
        });
    });

    test("get all users API returns users", async () => {

        // Arrange
        axios.get.mockResolvedValueOnce({ data: { users: [] } });

        // Act
        render(<Users />);

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledTimes(1);
            expect(axios.get).toHaveBeenCalledWith("/api/v1/user/all-users");
        });
    });

    test("handles get all users API fails", async () => {

        // Arrange
        axios.get.mockRejectedValueOnce(new Error("network Error"));

        // Act
        render(<Users />);

        // Assert
        await waitFor(() => {
            expect(screen.queryByText(/loading\.\.\./i)).not.toBeInTheDocument();
        });

        expect(axios.get).toHaveBeenCalledTimes(1);
        expect(axios.get).toHaveBeenCalledWith("/api/v1/user/all-users");

        // still renders but no user cards (h5 heading)
        expect(screen.queryAllByRole("heading", { level: 5 })).toHaveLength(0);
        expect(screen.getByRole("heading", { name: /all users/i })).toBeInTheDocument();
    });

    test("renders user details returned from API", async () => {

        // Arrange
        const mockUsers = [
            {
                _id: "user1",
                name: "Admin Person",
                email: "admin@test.com",
                role: 1,
                phone: "123456789",
            },
            {
                _id: "user2",
                name: "Normal Person",
                email: "user@test.com",
                role: 0 // No Phone
            },
        ];

        axios.get.mockResolvedValueOnce({ data: { users: mockUsers } });

        // Act
        render(<Users />);

        // loading disappears
        await waitFor(() => {
            expect(screen.queryByText(/loading\.\.\./i)).not.toBeInTheDocument();
        });

        // Assert
        expect(screen.getByText("Admin Person")).toBeInTheDocument();
        expect(screen.getByText("admin@test.com")).toBeInTheDocument();
        expect(screen.getByText("Normal Person")).toBeInTheDocument();
        expect(screen.getByText("user@test.com")).toBeInTheDocument();

        // role
        expect(screen.getByText("Admin")).toBeInTheDocument();
        expect(screen.getByText("User")).toBeInTheDocument();

        // phone number
        expect(screen.getByText("123456789")).toBeInTheDocument();
    });

    test("does not render role if undefined", async () => {

        // Arrange
        const mockUsers = [
            {
                _id: "user1",
                name: "name1",
                email: "name1@test.com" // No Role
            },
        ];

        axios.get.mockResolvedValueOnce({ data: { users: mockUsers } });

        // Act
        render(<Users />);

        // loading disappears
        await waitFor(() => {
            expect(screen.queryByText(/loading\.\.\./i)).not.toBeInTheDocument();
        });

        // Assert
        expect(screen.getByText("name1")).toBeInTheDocument();
        expect(screen.getByText("name1@test.com")).toBeInTheDocument();

        // role should not exist
        expect(screen.queryByText("Admin")).not.toBeInTheDocument();
        expect(screen.queryByText("User")).not.toBeInTheDocument();
    });

});
