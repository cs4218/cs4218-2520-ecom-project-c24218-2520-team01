import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import moment from "moment";
import AdminOrders from "./AdminOrders";
import toast from "react-hot-toast";

// Lim Jia Wei, A0277381W

// Mock Axios
jest.mock("axios");

// Mock Toast
jest.mock("react-hot-toast", () => ({
    __esModule: true,
    default: {
        success: jest.fn(),
        error: jest.fn(),
    },
}));

// Mock AdminMenu component
jest.mock("../../components/AdminMenu", () => () => (
    <div data-testid="admin-menu">AdminMenu</div>
));

// Mock Layout component
jest.mock("../../components/Layout", () => ({ children, title }) => (
    <div data-testid="layout" title={title}>{children}</div>
));

// Mock useAuth
const mockAuth = { token: "test-token" };
const mockSetAuth = jest.fn();
jest.mock("../../context/auth", () => ({
    useAuth: () => [mockAuth, mockSetAuth],
}));

// Mock moment
jest.mock("moment", () =>
    jest.fn((date) => ({
        fromNow: () => `from ${date}`,
    }))
);

// Mock antd Select - This mock was generated with assistance by ChatGPT 5.2
jest.mock("antd", () => {
    const React = require("react");
    const Select = ({ placeholder, onChange, children, defaultValue }) => (
        <select
            aria-label={placeholder || "status-select"}
            defaultValue={defaultValue}
            onChange={(e) => onChange(e.target.value)}
        >
            {children}
        </select>
    );
    const Option = ({ value, children }) => (
        <option value={value}>{children}</option>
    );
    Select.Option = Option;
    return { Select };
});

describe("Tests for Admin Orders page", () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const setupAdminOrdersMock = () => {

        const sampleOrders = [
            {
                _id: "order1",
                status: "Not Processed",
                buyer: { name: "Amos" },
                createdAt: "2026-02-19",
                payment: { success: true },
                products: [
                    {
                        _id: "prod1",
                        name: "Laptop",
                        description: "A powerful laptop for professionals",
                        price: 1499.99,
                    },
                ],
            },
            {
                _id: "order2",
                status: "Shipped",
                buyer: { name: "Donald" },
                createdAt: "2026-02-18",
                payment: { success: false },
                products: [
                    {
                        _id: "prod3",
                        name: "Keyboard",
                        description: "Mechanical keyboard with RGB",
                        price: 129.99,
                    },
                ],
            },
        ];

        axios.get.mockResolvedValue({ data: sampleOrders });
    };

    test("renders component and fetches orders", async () => {

        // Arrange
        setupAdminOrdersMock();

        // Act
        render(<AdminOrders />);

        // Assert
        expect(screen.getByTestId("layout")).toBeInTheDocument();
        expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
        expect(screen.getByText("All Orders")).toBeInTheDocument();

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/all-orders");
            expect(screen.getByText("Amos")).toBeInTheDocument();
            expect(screen.getByText("Donald")).toBeInTheDocument();

            expect(screen.getByText("Success")).toBeInTheDocument();
            expect(screen.getByText("Failed")).toBeInTheDocument();
            expect(screen.getAllByText("Shipped").length).toBeGreaterThan(0);

            expect(moment).toHaveBeenCalledWith("2026-02-19");
            expect(moment).toHaveBeenCalledWith("2026-02-18");

        });
    });

    test("updates status and refetches orders", async () => {

        // Arrange
        setupAdminOrdersMock();
        axios.put.mockResolvedValue({ data: { success: true } });

        // Act
        render(<AdminOrders />);

        await waitFor(() => {
            expect(screen.getByText("Amos")).toBeInTheDocument();
        });

        // combobox is input that allows selection from a list of options - Generated with assistance from ChatGPT 5.2
        const selects = screen.getAllByRole("combobox");
        fireEvent.change(selects[0], { target: { value: "Shipped" } });

        // Assert
        await waitFor(() => {
            expect(axios.put).toHaveBeenCalledWith(
                "/api/v1/auth/order-status/order1",
                { status: "Shipped" }
            );

            // Check twice for refetching orders
            expect(axios.get).toHaveBeenCalledTimes(2);
        });
    });

    test("handles error when update API fails", async () => {

        // Arrange
        const consoleSpy = jest.spyOn(console, "log").mockImplementation();
        setupAdminOrdersMock();
        axios.put.mockRejectedValue(new Error("update failed"));

        // Act
        render(<AdminOrders />);

        await waitFor(() => {
            expect(screen.getByText("Amos")).toBeInTheDocument();
        });

        // combobox is input that allows selection from a list of options - Generated with assistance from ChatGPT 5.2
        const selects = screen.getAllByRole("combobox");
        fireEvent.change(selects[0], { target: { value: "Delivered" } });

        // Assert
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
        });

        consoleSpy.mockRestore();
    });

    test("renders with empty orders array", async () => {

        // Arrange
        axios.get.mockResolvedValue({ data: [] });

        // Act
        render(<AdminOrders />);

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/all-orders");
        });

        expect(screen.getByText("All Orders")).toBeInTheDocument();
        expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });

    test("shows error toast when getting order API fails", async () => {

        // Arrange
        axios.get.mockRejectedValue(new Error("fetch failed"));

        // Act
        render(<AdminOrders />);

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/all-orders");
            expect(toast.error).toHaveBeenCalledWith("Failed to load orders");
        });
    });

    test("does not fetch orders when auth token is missing", async () => {

        // Arrange
        mockAuth.token = null;

        // Act
        render(<AdminOrders />);

        // Assert
        await waitFor(() => {
            expect(axios.get).not.toHaveBeenCalled();
        })
    });
});
