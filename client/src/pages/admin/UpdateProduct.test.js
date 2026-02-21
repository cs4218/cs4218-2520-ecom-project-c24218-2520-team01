import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import toast from "react-hot-toast";
import UpdateProduct from "./UpdateProduct";

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
jest.mock("./../../components/AdminMenu", () => () => (
    <div data-testid="admin-menu">AdminMenu</div>
));

// Mock Layout component
jest.mock("./../../components/Layout", () => ({ children, title }) => (
    <div data-testid="layout" title={title}>{children}</div>
));

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useNavigate: () => mockNavigate,
    useParams: () => ({ slug: "test-product" }),
}));

// Mock antd Select - This mock was generated with assistance by ChatGPT 5.2
jest.mock("antd", () => {
    const React = require("react");
    const Select = ({ placeholder, onChange, children, value }) => (
        <select
            aria-label={placeholder || "select"}
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

describe("Tests for Update Product page", () => {

    beforeEach(() => {
        jest.resetAllMocks();
        global.URL.createObjectURL.mockReturnValue("mock-url");
    });

    const sampleProduct = {
        _id: "testID",
        name: "test laptop",
        slug: "test-laptop",
        description: "a test laptop description",
        price: 999,
        quantity: 10,
        shipping: true,
        category: { _id: "cat1", name: "electronics" },
    };

    const sampleCategories = [
        { _id: "cat1", name: "electronics" },
        { _id: "cat2", name: "books" },
    ];

    const setupUpdateProductMocks = () => {

        axios.get.mockResolvedValueOnce({
            data: { product: sampleProduct },
        })
            .mockResolvedValueOnce({
                data: { success: true, category: sampleCategories },
            });

    };

    const renderAndWait = async () => {
        render(<UpdateProduct />);
        await waitFor(() =>
            expect(screen.getByPlaceholderText("write a name")).toHaveValue("test laptop")
        );
    };

    test("fetches and renders product details and categories", async () => {

        // Arrange
        setupUpdateProductMocks();

        // Act
        await renderAndWait();

        const nameInput = await screen.findByPlaceholderText("write a name");
        const descInput = await screen.findByPlaceholderText("write a description");
        const priceInput = await screen.findByPlaceholderText("write a price");
        const qtyInput = await screen.findByPlaceholderText("write a quantity");

        // Assert

        expect(screen.getByText("electronics")).toBeInTheDocument();
        expect(screen.getByText("books")).toBeInTheDocument();

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product/test-product");
            expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");

            expect(nameInput).toHaveValue("test laptop");
            expect(descInput).toHaveValue("a test laptop description");
            expect(priceInput).toHaveValue(999);
            expect(qtyInput).toHaveValue(10);

        });
    });

    test("shows error toast when get category API fails", async () => {

        // Arrange
        axios.get.mockResolvedValue({
            data: { success: false, message: "Something went wrong" },
        });

        // Act
        render(<UpdateProduct />);

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
            expect(toast.error).toHaveBeenCalledWith("Categories could not be loaded");
        });

    });

    test("submits updated product data (shipping) and shows success toast on success", async () => {

        // Arrange
        setupUpdateProductMocks();
        axios.put.mockResolvedValue({ data: { success: true } });

        // Act
        await renderAndWait();

        fireEvent.change(screen.getByPlaceholderText("write a name"), {
            target: { value: "Updated Laptop" },
        });

        const shippingSelect = screen.getByLabelText(/select shipping/i);
        fireEvent.change(shippingSelect, { target: { value: "0" } });

        fireEvent.click(screen.getByText("UPDATE PRODUCT"));

        // Assert
        await waitFor(() => {
            expect(axios.put).toHaveBeenCalledTimes(1);

            const [url, formData] = axios.put.mock.calls[0];
            expect(url).toBe("/api/v1/product/update-product/testID");

            expect(formData.get("name")).toBe("Updated Laptop");
            expect(formData.get("description")).toBe("a test laptop description");
            expect(formData.get("price")).toBe("999");
            expect(formData.get("quantity")).toBe("10");
            expect(formData.get("category")).toBe("cat1");
            expect(formData.get("shipping")).toBe("0");

            expect(toast.success).toHaveBeenCalledWith(
                expect.stringContaining("Product")
            );
            expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
        });
    });

    test("submits updated product data (desc, price, quantity, category, photo) and shows success toast on success", async () => {

        // Arrange
        setupUpdateProductMocks();
        axios.put.mockResolvedValue({ data: { success: true } });

        const file = new File(["test content"], "updated-photo.png", { type: "image/png" });

        // Act
        await renderAndWait();

        fireEvent.change(screen.getByPlaceholderText("write a description"), {
            target: { value: "new description" },
        });

        fireEvent.change(screen.getByPlaceholderText("write a price"), {
            target: { value: "5.00" },
        });

        fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
            target: { value: "2" },
        });

        const categorySelect = screen.getByLabelText(/select a category/i);
        fireEvent.change(categorySelect, { target: { value: "cat2" } });

        const uploadLabel = screen.getByText("Upload Photo");
        const fileInput = uploadLabel.querySelector('input[type="file"]');
        fireEvent.change(fileInput, { target: { files: [file] } });

        fireEvent.click(screen.getByText("UPDATE PRODUCT"));

        // Assert
        await waitFor(() => {
            expect(axios.put).toHaveBeenCalledTimes(1);

            const [url, formData] = axios.put.mock.calls[0];
            expect(url).toBe("/api/v1/product/update-product/testID");

            expect(formData.get("description")).toBe("new description");
            expect(formData.get("price")).toBe("5.00");
            expect(formData.get("quantity")).toBe("2");
            expect(formData.get("category")).toBe("cat2");
            expect(formData.get("photo")).toBe(file);

            expect(toast.success).toHaveBeenCalledWith("Product Updated Successfully");
            expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
        });
    });

    test("shows error toast when update API returns failure", async () => {

        // Arrange
        setupUpdateProductMocks();
        axios.put.mockResolvedValue({
            data: { success: false, message: "some error" },
        });

        // Act
        await renderAndWait();

        fireEvent.click(screen.getByText("UPDATE PRODUCT"));

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("some error");
            expect(mockNavigate).not.toHaveBeenCalled();
        });
    });

    test("shows error toast when update product API gives no response", async () => {

        // Arrange
        axios.get.mockResolvedValueOnce({
            data: { product: sampleProduct },
        });
        axios.get.mockRejectedValueOnce(new Error("Network Error"));

        // Act
        render(<UpdateProduct />);

        fireEvent.click(screen.getByText("UPDATE PRODUCT"));

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Something went wrong");
            expect(mockNavigate).not.toHaveBeenCalled();
        });
    });

    test("deletes product when user confirms prompt", async () => {

        // Arrange
        setupUpdateProductMocks();
        axios.delete.mockResolvedValue({ data: { success: true } });
        window.prompt = jest.fn().mockReturnValue("yes");

        // Act
        await renderAndWait();

        fireEvent.click(screen.getByText("DELETE PRODUCT"));

        // Assert
        await waitFor(() => {
            expect(window.prompt).toHaveBeenCalledWith("Are you sure you want to delete this product?");
            expect(axios.delete).toHaveBeenCalledWith("/api/v1/product/delete-product/testID");
            expect(toast.success).toHaveBeenCalledWith("Product Deleted Successfully");
            expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
        });
    });

    test("does not delete product when prompt is cancelled", async () => {

        // Arrange
        setupUpdateProductMocks();
        window.prompt = jest.fn().mockReturnValue(null);

        // Act
        await renderAndWait();

        fireEvent.click(screen.getByText("DELETE PRODUCT"));

        // Assert
        expect(window.prompt).toHaveBeenCalled();
        expect(axios.delete).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    test("shows error toast when delete product API throws", async () => {

        // Arrange
        setupUpdateProductMocks();
        axios.delete.mockRejectedValue(new Error("delete failed"));
        window.prompt = jest.fn().mockReturnValue("yes");

        // Act
        await renderAndWait();

        fireEvent.click(screen.getByText("DELETE PRODUCT"));

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Something went wrong");
        });
    });
});
