import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import Orders from "./Orders";
import { useAuth } from "../../context/auth";

// Rachel Tai Ke Jia, A0258603A

// Add a mock for axios 
jest.mock("axios");

// Use a Stub for moment dependency
jest.mock("moment", () => () => ({
    fromNow: () => "2 days ago"
}));

// Add a stub for useAuth
jest.mock("../../context/auth", () => ({
    useAuth: jest.fn()
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
        status: "Shipped",
        buyer: { name: "Adam" },
        createAt: "2025-05-07",
        payment: { success: true },
        products: [
            { 
                _id: "1", 
                name: "Watch", 
                description: "Casio", 
                price: "100" 
            }, 
            { 
                _id: "2", 
                name: "Shirt", 
                description: "Uniqlo", 
                price: "30" 
            }
        ],
    },
    {
        _id: "3412",
        status: "Processing",
        buyer: { name: "Joe" },
        createAt: "2025-05-09",
        payment: { success: false },
        products: [
            { 
                _id: "1", 
                name: "Table", 
                description: "Wooden Table", 
                price: "80" 
            }
        ]
    }
];

describe("Unit test for Orders component", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });


    test("getOrders calls orders API", async () => {
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


    test("getOrders catches error", async () => {
        // Arrange

        // spy on console.log to verify error is logged
        // use mock implementation to prevent actual logging while testing
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

        useAuth.mockReturnValue([{ token: "token" }, jest.fn()]);
        axios.get.mockRejectedValue(new Error("API Error"));

        // Act
        render(<Orders />);

        // Assert
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalled();
        });

        consoleSpy.mockRestore();
    });

    test("Orders component shows order data fetched", async () => {
        // Arrange
        useAuth.mockReturnValue([{ token: "token" }, jest.fn()]);
        axios.get.mockResolvedValue({ data: ordersData });

        // Act
        render(<Orders />);

        // Assert
        await waitFor(() => {
            expect(screen.getByText("All Orders")).toBeInTheDocument();

            ordersData.forEach((order) => {
                // Order info
                // Get the row for each order
                const orderRow = screen.getByText(order.status).closest("tr");
                expect(orderRow).toHaveTextContent(order.buyer.name);
                expect(orderRow).toHaveTextContent(order.payment.success ? "Success" : "Failed");
                expect(orderRow).toHaveTextContent(order.products.length.toString());

                // Product details
                order.products.forEach((product) => {
                    expect(screen.getByText(product.name)).toBeInTheDocument();
                    expect(screen.getByText(product.description.substring(0, 30))).toBeInTheDocument();
                    expect(screen.getByText(`Price : ${product.price}`)).toBeInTheDocument();
                });
            });
        });
    });

    test("Orders component receives no order data", async () => {
        // Arrange
        useAuth.mockReturnValue([{ token: "token" }, jest.fn()]);
        axios.get.mockResolvedValue({ data: [] });

        // Act
        render(<Orders />);

        // Assert
        await waitFor(() => {
            expect(screen.getByText("All Orders")).toBeInTheDocument();
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
