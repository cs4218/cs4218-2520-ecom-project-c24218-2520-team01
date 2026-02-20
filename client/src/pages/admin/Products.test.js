import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import toast from "react-hot-toast";
import Products from "./Products";

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
jest.mock("./../../components/Layout", () => ({ children }) => (
    <div data-testid="layout">{children}</div>
));

// Mock react-router-dom - This mock was generated with assistance by ChatGPT 5.2
jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    Link: ({ to, children, ...rest }) => (
        <a href={to} data-testid="router-link" {...rest}>
            {children}
        </a>
    ),
}));

describe("Tests for Products page", () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const setupProductsMock = () => {
        axios.get.mockResolvedValue({
            data: {
                products: [
                    {
                        _id: "prod1",
                        name: "iphone",
                        slug: "iphone",
                        description: "iphone 13 pro max",
                    },
                    {
                        _id: "prod2",
                        name: "kindle",
                        slug: "kindle",
                        description: "kindle v2",
                    },
                ],
            },
        });
    };

    test("renders component and fetches products correctly", async () => {

        // Arrange
        setupProductsMock();

        // Act
        render(<Products />);

        // Assert
        expect(screen.getByTestId("layout")).toBeInTheDocument();
        expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
        expect(screen.getByText("All Products List")).toBeInTheDocument();

        // Check api + products rendered
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product");
            expect(screen.getByText("iphone")).toBeInTheDocument();
            expect(screen.getByText("kindle")).toBeInTheDocument();
            expect(screen.getByText("iphone 13 pro max")).toBeInTheDocument();
            expect(screen.getByText("kindle v2")).toBeInTheDocument();
        });
    });

    test("renders product links with correct routes correctly", async () => {

        // Arrange
        setupProductsMock();

        // Act
        render(<Products />);

        // Assert
        await waitFor(() => {
            expect(screen.getByText("iphone")).toBeInTheDocument();
        });

        const links = screen.getAllByTestId("router-link");
        expect(links).toHaveLength(2);

        // Check routes
        expect(links[0]).toHaveAttribute("href", "/dashboard/admin/product/iphone");
        expect(links[1]).toHaveAttribute("href", "/dashboard/admin/product/kindle");
    });

    test("renders product images with src correctly", async () => {

        // Arrange
        setupProductsMock();

        // Act
        render(<Products />);

        // Assert
        await waitFor(() => {
            expect(screen.getByAltText("iphone")).toBeInTheDocument();
            expect(screen.getByAltText("kindle")).toBeInTheDocument();
        });

        const iphoneImage = screen.getByAltText("iphone");
        const kindleImage = screen.getByAltText("kindle");

        // Check src
        expect(iphoneImage).toHaveAttribute(
            "src",
            "/api/v1/product/product-photo/prod1"
        );
        expect(kindleImage).toHaveAttribute(
            "src",
            "/api/v1/product/product-photo/prod2"
        );
    });

    test("shows toast error when fetching products fails", async () => {

        // Arrange
        axios.get.mockRejectedValue(new Error("network fail"));

        // Act
        render(<Products />);

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product");
            expect(toast.error).toHaveBeenCalledWith("Something went wrong");
        });
    });

    test("renders correctly when API returns no products", async () => {

        // Arrange
        axios.get.mockResolvedValueOnce({ data: { products: [] } });

        // Act
        render(<Products />);

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product");
        });

        // Does not crash
        expect(screen.getByText("All Products List")).toBeInTheDocument();
        // No links should render
        expect(screen.queryAllByTestId("router-link")).toHaveLength(0);
    });

    test("does not crash when API returns null", async () => {

        // Arrange
        axios.get.mockResolvedValueOnce({ data: { products: null } });

        // Act
        render(<Products />);

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product");
        });

        // Does not crash
        expect(screen.getByText("All Products List")).toBeInTheDocument();
    });
});
