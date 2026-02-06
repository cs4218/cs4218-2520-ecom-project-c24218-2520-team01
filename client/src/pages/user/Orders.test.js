import React from "react";
import { render, waitFor } from "@testing-library/react";
import axios from "axios";
import Orders from "./Orders";
import { useAuth } from "../../context/auth";

// Add a mock for axios 
jest.mock("axios");

// Use a Stub for moment dependency
jest.mock("moment", () => () => ({
    fromNow: () => "2 days ago",
}));

// Add a stub for useAuth
jest.mock("../../context/auth", () => ({
    useAuth: jest.fn(),
}));

// Use a Fake for Layout
jest.mock("../../components/Layout", () => ({ children }) => (
    <div>{children}</div>
));

// Use a Fake for UserMenu
jest.mock("../../components/UserMenu", () => () => (
    <div>User Menu</div>
));

const ordersData = [
    {
        _id: "3411",
        status: "Processing",
        buyer: { name: "Adam" },
        createAt: "2025-05-07",
        payment: { success: true },
        products: [
            { 
                _id: "1", 
                name: "Watch", 
                description: "Casio", 
                price: "100" }, 
            { 
                _id: "2", 
                name: "Shirt", 
                description: "Uniqlo", 
                price: "30" }
        ],
    },
];

describe("Unit test for Orders component", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test("Orders component calls orders API", async () => {
        // Arrange
        useAuth.mockReturnValue([{ token: "valid-token" }, jest.fn()]);
        axios.get.mockResolvedValue({ data: ordersData });

        // Act
        render(<Orders />);

        // Assert
        await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders");
        });
    });


    test("Orders component shows order data fetched", async () => {
        // Arrange
        useAuth.mockReturnValue([{ token: "token" }, jest.fn()]);
        axios.get.mockResolvedValue({ data: ordersData });

        // Act
        const { container } = render(<Orders />);

        // Assert
        await waitFor(() => {
            const text = container.textContent;
            expect(text).toContain("Processing"); // status
            expect(text).toContain("Adam"); // buyer name 
            expect(text).toContain("Success"); // payment success
            expect(text).toContain("2"); // products length
        });
    });


    test("Orders component shows info for each order", async () => {
        // Arrange
        useAuth.mockReturnValue([{ token: "token" }, jest.fn()]);
        axios.get.mockResolvedValue({ data: ordersData });

        // Act
        const { container } = render(<Orders />);

        // Assert
        await waitFor(() => {
            const text = container.textContent;
            expect(text).toContain("Watch");  // name
            expect(text).toContain("Casio");  // description 
            expect(text).toContain("Price : 100");  // price
        });
    });

    test("Orders component receives no order data", async () => {
        // Arrange
        useAuth.mockReturnValue([{ token: "token" }, jest.fn()]);
        axios.get.mockResolvedValue({ data: [] });

        // Act
        const { container } = render(<Orders />);

        // Assert
        await waitFor(() => {
            expect(container.textContent).toContain("All Orders");
        });
    });

    test("Orders component does not call backend without user token", async () => {
        // Arrange
        useAuth.mockReturnValue([null, jest.fn()]);

        // Act
        render(<Orders />);

        // Assert
        expect(axios.get).not.toHaveBeenCalled();
    });
});
