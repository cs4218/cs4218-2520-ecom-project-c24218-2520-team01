import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import toast from "react-hot-toast";
import CreateProduct from "./CreateProduct";

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

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useNavigate: () => mockNavigate,
}));

// Mock antd Select - This mock was generated with assistance by ChatGPT 5.2 
jest.mock("antd", () => {
    const React = require("react");
    const Select = ({ placeholder, onChange, children, value }) => (
        <select
            aria-label={placeholder}
            value={value}
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

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn();

describe("Tests for Create Product page", () => {

    beforeEach(() => {
        jest.clearAllMocks();
        global.URL.createObjectURL.mockReturnValue("mock-url");
    });

    // For axios mocking
    const setupCreateProductMocks = () => {
        axios.get.mockResolvedValue({
            data: {
                success: true,
                category: [
                    { _id: "1", name: "Electronics" },
                    { _id: "2", name: "Books" },
                ],
            },
        });
    };

    const renderAndWait = async () => {
        render(<CreateProduct />);
        await waitFor(() => screen.getByText("Electronics"));
    };

    test("fetches and renders categories", async () => {

        // Arrange  
        setupCreateProductMocks();

        // Act
        render(<CreateProduct />);

        // Assert
        expect(screen.getByText("Create Product")).toBeInTheDocument();
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
            expect(screen.getByText("Electronics")).toBeInTheDocument();
            expect(screen.getByText("Books")).toBeInTheDocument();
        });
    });

    test("successfully creates a product with all fields", async () => {

        // Arrange
        setupCreateProductMocks();
        axios.post.mockResolvedValue({ data: { success: true } });

        const file = new File(["dummy content"], "test-photo.png", {
            type: "image/png",
        });

        // Act
        await renderAndWait();

        fireEvent.change(screen.getByLabelText("Select a category"), {
            target: { value: "1" },
        });
        fireEvent.change(screen.getByPlaceholderText("write a name"), {
            target: { value: "Test product" },
        });
        fireEvent.change(screen.getByPlaceholderText("write a description"), {
            target: { value: "Test description" },
        });
        fireEvent.change(screen.getByPlaceholderText("write a price"), {
            target: { value: "200" },
        });
        fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
            target: { value: "2" },
        });
        fireEvent.change(screen.getByLabelText("Select Shipping"), {
            target: { value: "1" },
        });

        const uploadLabel = screen.getByText("Upload Photo");
        const fileInput = uploadLabel.querySelector('input[type="file"]');

        fireEvent.change(fileInput, { target: { files: [file] } });
        fireEvent.click(screen.getByText("CREATE PRODUCT"));

        // Assert
        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledTimes(1);

            const formData = axios.post.mock.calls[0][1];
            expect(formData.get("name")).toBe("Test product");
            expect(formData.get("description")).toBe("Test description");
            expect(formData.get("price")).toBe("200");
            expect(formData.get("quantity")).toBe("2");
            expect(formData.get("category")).toBe("1");
            expect(formData.get("shipping")).toBe("1");
            expect(formData.get("photo")).toEqual(file);

            expect(toast.success).toHaveBeenCalledWith("Product Created Successfully");
            expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
        });
    });

    test("shows error toast when create product API fails", async () => {

        // Arrange
        setupCreateProductMocks();

        axios.post.mockResolvedValue({
            data: { success: false, message: "Something went wrong" },
        });

        // Act
        renderAndWait();

        fireEvent.click(screen.getByText("CREATE PRODUCT"));

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Something went wrong");
            expect(mockNavigate).not.toHaveBeenCalled();
        });
    });

    test("shows error toast when create product API gives no response", async () => {

        // Arrange
        setupCreateProductMocks();
        axios.post.mockRejectedValue(new Error("Unknown error"));

        // Act
        renderAndWait();

        fireEvent.click(screen.getByText("CREATE PRODUCT"));

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Something went wrong");
            expect(mockNavigate).not.toHaveBeenCalled();
        });
    });

    test("shows error toast when get category API fails", async () => {

        // Arrange
        setupCreateProductMocks();

        axios.get.mockResolvedValue({
            data: { success: false, message: "Something went wrong" },
        });

        // Act
        render(<CreateProduct />);

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
            expect(toast.error).toHaveBeenCalledWith("Categories could not be loaded");
        });
    });

    test("shows toast error when get category API gives no response", async () => {

        // Arrange
        axios.get.mockRejectedValue(new Error("some error"));

        // Act
        render(<CreateProduct />);

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(
                "Something went wrong in getting category"
            );
        });
    });

    test("renders correctly when get category API gives null response", async () => {

        // Arrange
        axios.get.mockResolvedValueOnce({
            data: { success: true, category: null }
        });

        // Act
        render(<CreateProduct />);

        // Assert
        await waitFor(() => expect(axios.get).toHaveBeenCalled());
    });

    test("renders correctly when no photo is selected", () => {

        // Arrange
        setupCreateProductMocks();

        // Act
        render(<CreateProduct />);

        // Assert
        expect(screen.getByText("Upload Photo")).toBeInTheDocument();
        expect(screen.queryByAltText("product_photo")).not.toBeInTheDocument();
    });

});
