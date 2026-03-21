import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import "@testing-library/jest-dom/extend-expect";

import Products from "../../pages/admin/Products";
import CreateProduct from "../../pages/admin/CreateProduct";
import UpdateProduct from "../../pages/admin/UpdateProduct";
import AdminRoute from "../../components/Routes/AdminRoute";
import { AuthProvider } from "../../context/auth";
import Login from "../../pages/Auth/Login";

import { setMockAuth, mockAdminAuthAPI, mockLoginAPI } from "./testUtils";

// Lim Jia Wei, A0277381W

jest.mock("axios");
jest.mock("react-hot-toast");

// Mock Layout
jest.mock("../../components/Layout", () => ({ children, title }) => (
    <div data-testid="layout">
        <div data-testid="title">{title}</div>
        {children}
    </div>
));

jest.mock("../../components/AdminMenu", () => () => <div data-testid="admin-menu">AdminMenu</div>);
jest.mock("../../components/Spinner", () => () => <div data-testid="spinner">Spinner</div>);


beforeAll(() => {

    Object.defineProperty(window, 'URL', {
        value: { createObjectURL: jest.fn(() => "blob:mock-url") }
    });

});

/**
 * AI Usage Declaration
 *
 * Tool Used: Gemini 3.1 Pro
 *
 * Prompt: How do I mock the antd Modal for this class?
 *
 * How the AI Output Was Used:
 * - Used for the antd Modal mocked as seen below
*/

// Mock antd Modal
jest.mock("antd", () => {
    const originalAntd = jest.requireActual("antd");
    return {
        ...originalAntd,
        Select: Object.assign(({ children, onChange, placeholder, value }) => (
            <select placeholder={placeholder} data-testid="antd-select" value={value || ""} onChange={(e) => onChange(e.target.value)}>
                <option value="">{placeholder}</option>
                {Array.isArray(children) ? children : [children]}
            </select>
        ), { Option: ({ children, value }) => <option value={value}>{children}</option> }),
    };

    /**
     * AI Usage Declaration
     *
     * Tool Used: Gemini 3.1 Pro
     *
     * Prompt: What flows should I test for Products list → CreateProduct → UpdateProduct → Delete → list refresh; photo + category dropdown using a bottom up approach?
     *
     * How the AI Output Was Used:
     * - Used the AI output as a reference to determine which flows to test (including error flows)
    */

});

const mockCategories = [
    { _id: "c1", name: "Electronics" },
    { _id: "c2", name: "Books" }
];

const mockProduct = {
    _id: "p1",
    name: "Camera",
    slug: "camera",
    description: "Good camera",
    price: 500,
    quantity: 10,
    shipping: "1",
    category: mockCategories[0]
};

describe("Admin Product Management Flow Integration Tests", () => {

    beforeEach(() => {

        jest.clearAllMocks();
        localStorage.clear();
        jest.spyOn(console, "log").mockImplementation(() => { });
        jest.spyOn(console, "error").mockImplementation(() => { });

        // reset to default
        axios.defaults.headers.common["Authorization"] = undefined;

        window.prompt = jest.fn().mockReturnValue(true);

        axios.get.mockImplementation((url) => {
            if (url === "/api/v1/auth/admin-auth") return Promise.resolve({ data: { ok: true } });
            if (url === "/api/v1/category/get-category") return Promise.resolve({ data: { success: true, category: mockCategories } });
            if (url === "/api/v1/product/get-product") return Promise.resolve({ data: { success: true, products: [mockProduct] } });
            if (url.startsWith("/api/v1/product/get-product/")) return Promise.resolve({ data: { success: true, product: mockProduct } });
            return Promise.resolve({ data: { success: false } });
        });

        axios.post.mockResolvedValue({ data: { success: true } });
        axios.put.mockResolvedValue({ data: { success: true } });
        axios.delete.mockResolvedValue({ data: { success: true } });

    });

    afterEach(() => {

        jest.restoreAllMocks();

    });

    // Level 4
    describe("Products + CreateProduct + UpdateProduct", () => {

        const renderProductFlow = (initialRoute = "/dashboard/admin/create-product") => {
            return render(
                <MemoryRouter initialEntries={[initialRoute]}>
                    <Routes>
                        <Route path="/dashboard/admin/products" element={<Products />} />
                        <Route path="/dashboard/admin/create-product" element={<CreateProduct />} />
                        <Route path="/dashboard/admin/product/:slug" element={<UpdateProduct />} />
                    </Routes>
                </MemoryRouter>
            );
        };

        it("should complete a CRUD flow passing between routes", async () => {

            // Act
            renderProductFlow();

            await waitFor(() => expect(screen.getByText("Create Product")).toBeInTheDocument());

            // Assert
            fireEvent.change(screen.getByPlaceholderText("write a name"), { target: { value: "New Product" } });
            fireEvent.change(screen.getByPlaceholderText("write a description"), { target: { value: "A very nice product" } });
            fireEvent.change(screen.getByPlaceholderText("write a price"), { target: { value: "99" } });
            fireEvent.change(screen.getByPlaceholderText("write a quantity"), { target: { value: "50" } });

            fireEvent.change(screen.getByPlaceholderText("Select a category"), { target: { value: "c1" } });
            fireEvent.change(screen.getByPlaceholderText("Select Shipping"), { target: { value: "1" } });

            const photoInput = document.querySelector('input[type="file"]');
            const file = new File(['mock data'], 'photo.png', { type: 'image/png' });
            fireEvent.change(photoInput, { target: { files: [file] } });

            fireEvent.click(screen.getByText("CREATE PRODUCT"));

            // Assert
            await waitFor(() => expect(axios.post).toHaveBeenCalledWith("/api/v1/product/create-product", expect.any(FormData)));
            await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Product Created Successfully"));

            // read product
            await waitFor(() => expect(screen.getByText("All Products List")).toBeInTheDocument());
            await waitFor(() => expect(screen.getByText("Camera")).toBeInTheDocument());

            // update product
            const productCardLink = screen.getByText("Camera").closest("a");
            fireEvent.click(productCardLink);

            await waitFor(() => expect(screen.getByText("Update Product")).toBeInTheDocument());

            // assert for product details
            await waitFor(() => {
                expect(screen.getByPlaceholderText("write a name").value).toBe("Camera");
            });

            // change name
            fireEvent.change(screen.getByPlaceholderText("write a name"), { target: { value: "Updated Camera" } });

            // delete photo (by just submitting)
            fireEvent.click(screen.getByText("UPDATE PRODUCT"));

            await waitFor(() => expect(axios.put).toHaveBeenCalledWith("/api/v1/product/update-product/p1", expect.any(FormData)));
            await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Product Updated Successfully"));

            await waitFor(() => expect(screen.getByText("All Products List")).toBeInTheDocument(), { timeout: 2000 });
            await waitFor(() => expect(screen.getByText("Camera")).toBeInTheDocument());

            // navigate back and delete product
            const productCardLink2 = screen.getByText("Camera").closest("a");
            fireEvent.click(productCardLink2);

            await waitFor(() => expect(screen.getByText("Update Product")).toBeInTheDocument());

            await waitFor(() => {
                expect(screen.getByPlaceholderText("write a name").value).toBe("Camera");
            });

            // delete product
            fireEvent.click(screen.getByText("DELETE PRODUCT"));

            // Assert
            await waitFor(() => expect(window.prompt).toHaveBeenCalled());
            await waitFor(() => expect(axios.delete).toHaveBeenCalledWith("/api/v1/product/delete-product/p1"));
            await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Product Deleted Successfully"));


            await waitFor(() => expect(screen.getByText("All Products List")).toBeInTheDocument());
        });

        it("should handle product creation failure gracefully", async () => {

            // Arrange
            axios.post.mockResolvedValueOnce({ data: { success: false, message: "Error Creating" } });

            // Act
            renderProductFlow();

            await waitFor(() => expect(screen.getByText("Create Product")).toBeInTheDocument());
            fireEvent.change(screen.getByPlaceholderText("write a name"), { target: { value: "Fail Product" } });
            fireEvent.click(screen.getByText("CREATE PRODUCT"));

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Error Creating"));

            // Assert did not navigate
            expect(screen.queryByText("All Products List")).not.toBeInTheDocument();
            expect(screen.getByText("Create Product")).toBeInTheDocument();
        });

        it("should show error toast when product list fails to load", async () => {

            // Arrange
            axios.get.mockImplementation((url) => {
                if (url === "/api/v1/auth/admin-auth") return Promise.resolve({ data: { ok: true } });
                if (url === "/api/v1/product/get-product") return Promise.reject(new Error("Network Error"));
                return Promise.resolve({ data: { success: false } });
            });

            // Act
            renderProductFlow("/dashboard/admin/products");

            await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product"));

            // Assert
            await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Something went wrong"));

            // No product cards should be rendered
            expect(screen.queryByText("Camera")).not.toBeInTheDocument();
        });

        it("should show error toast when update API throws a network error", async () => {

            // Arrange
            axios.get
                .mockResolvedValueOnce({ data: { success: true, product: mockProduct } })
                .mockResolvedValueOnce({ data: { success: true, category: mockCategories } });


            axios.put.mockRejectedValueOnce(new Error("Network timeout"));

            // Act
            renderProductFlow("/dashboard/admin/product/camera");

            await waitFor(() => expect(screen.getByPlaceholderText("write a name").value).toBe("Camera"));

            fireEvent.click(screen.getByText("UPDATE PRODUCT"));

            // Assert
            await waitFor(() => expect(axios.put).toHaveBeenCalledWith("/api/v1/product/update-product/p1", expect.any(FormData)));
            await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Something went wrong"));

            expect(screen.getByText("Update Product")).toBeInTheDocument();
        });

        it("should reject zero price with error toast", async () => {

            // Act
            renderProductFlow();

            await waitFor(() => expect(screen.getByText("Create Product")).toBeInTheDocument());

            fireEvent.change(screen.getByPlaceholderText("write a price"), { target: { value: "0" } });
            fireEvent.change(screen.getByPlaceholderText("write a quantity"), { target: { value: "5" } });
            fireEvent.click(screen.getByText("CREATE PRODUCT"));

            // Assert
            await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Price must be greater than 0"));
            expect(axios.post).not.toHaveBeenCalled();
        });

        it("should reject negative quantity with error toast", async () => {

            // Act
            renderProductFlow();

            await waitFor(() => expect(screen.getByText("Create Product")).toBeInTheDocument());

            fireEvent.change(screen.getByPlaceholderText("write a price"), { target: { value: "10" } });
            fireEvent.change(screen.getByPlaceholderText("write a quantity"), { target: { value: "-1" } });
            fireEvent.click(screen.getByText("CREATE PRODUCT"));

            // Assert
            await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Quantity must be greater than 0"));
            expect(axios.post).not.toHaveBeenCalled();
        });

        it("should handle empty product name and description input", async () => {

            // Arrange
            axios.post.mockRejectedValueOnce({ response: { data: { message: "Fail mock" } } });

            // Act
            renderProductFlow();

            await waitFor(() => expect(screen.getByText("Create Product")).toBeInTheDocument());

            fireEvent.change(screen.getByPlaceholderText("write a name"), { target: { value: "" } });
            fireEvent.change(screen.getByPlaceholderText("write a description"), { target: { value: "" } });
            fireEvent.click(screen.getByText("CREATE PRODUCT"));

            // Assert
            await waitFor(() => {
                expect(axios.post).toHaveBeenCalledWith("/api/v1/product/create-product", expect.any(FormData));
            });
            const submittedFormData = axios.post.mock.calls[0][1];
            expect(submittedFormData.get("name")).toBe("");
            expect(submittedFormData.get("description")).toBe("");
        });

        it("should handle empty photo file upload", async () => {

            // Arrange
            axios.post.mockResolvedValueOnce({ data: { success: true } });

            // Act
            renderProductFlow();
            await waitFor(() => expect(screen.getByText("Create Product")).toBeInTheDocument());

            const zeroByteFile = new File([], "empty.png", { type: "image/png" });
            const fileInput = document.querySelector('input[type="file"]');
            fireEvent.change(fileInput, { target: { files: [zeroByteFile] } });

            fireEvent.click(screen.getByText("CREATE PRODUCT"));

            // Assert
            await waitFor(() => {
                expect(axios.post).toHaveBeenCalledWith("/api/v1/product/create-product", expect.any(FormData));
            });
            const submittedFormData = axios.post.mock.calls[0][1];
            expect(submittedFormData.get("photo").size).toBe(0);
        });

        it("should show error toast when creation is rejected by server", async () => {

            // Arrange
            axios.post.mockResolvedValueOnce({ data: { success: false, message: "Category is required" } });

            // Act
            renderProductFlow();

            await waitFor(() => expect(screen.getByText("Create Product")).toBeInTheDocument());
            fireEvent.click(screen.getByText("CREATE PRODUCT"));

            // Assert
            await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Category is required"));

            expect(screen.queryByText("All Products List")).not.toBeInTheDocument();
            expect(screen.getByText("Create Product")).toBeInTheDocument();
        });

    });

    // Level 3
    describe("AdminRoute + Products + CreateProduct + UpdateProduct", () => {

        it("should block access until admin auth passes", async () => {

            // Arrange
            setMockAuth();
            mockAdminAuthAPI(true);

            // Act
            render(
                <AuthProvider>
                    <MemoryRouter initialEntries={["/dashboard/admin/products"]}>
                        <Routes>
                            <Route path="/dashboard/admin" element={<AdminRoute />}>
                                <Route path="products" element={<Products />} />
                                <Route path="create-product" element={<CreateProduct />} />
                                <Route path="product/:slug" element={<UpdateProduct />} />
                            </Route>
                        </Routes>
                    </MemoryRouter>
                </AuthProvider>
            );

            // initially spinners (not yet auth)
            expect(screen.getByTestId("spinner")).toBeInTheDocument();

            // Assert
            await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth"));
            await waitFor(() => expect(screen.getByText("All Products List")).toBeInTheDocument());
        });
    });

    // Level 2
    describe("AuthContext + AdminRoute + Products + CreateProduct + UpdateProduct", () => {

        it("should set axios auth header from context", async () => {

            // Arrange
            setMockAuth(1, "mocked-auth-token-999");
            mockAdminAuthAPI(true);

            // Act
            render(
                <AuthProvider>
                    <MemoryRouter initialEntries={["/dashboard/admin/create-product"]}>
                        <Routes>
                            <Route path="/dashboard/admin" element={<AdminRoute />}>
                                <Route path="products" element={<Products />} />
                                <Route path="create-product" element={<CreateProduct />} />
                                <Route path="product/:slug" element={<UpdateProduct />} />
                            </Route>
                        </Routes>
                    </MemoryRouter>
                </AuthProvider>
            );

            await waitFor(() => expect(screen.getByText("Create Product")).toBeInTheDocument());
            fireEvent.click(screen.getByText("CREATE PRODUCT"));

            // Assert
            await waitFor(() => expect(axios.post).toHaveBeenCalled());
            expect(axios.defaults.headers.common["Authorization"]).toBe("mocked-auth-token-999");
        });
    });

    // Level 1
    describe("Login + AuthContext + AdminRoute + Products + CreateProduct + UpdateProduct", () => {

        it("should log in and navigate to product creation", async () => {

            // Arrange
            mockLoginAPI(true, "ultimate-login-token", 1);
            mockAdminAuthAPI(true);

            // Act
            render(
                <AuthProvider>
                    <MemoryRouter initialEntries={[{ pathname: "/login", state: "/dashboard/admin/products" }]}>
                        <Routes>
                            <Route path="/login" element={<Login />} />
                            <Route path="/dashboard/admin" element={<AdminRoute />}>
                                <Route path="products" element={<Products />} />
                                <Route path="create-product" element={<CreateProduct />} />
                                <Route path="product/:slug" element={<UpdateProduct />} />
                            </Route>
                        </Routes>
                    </MemoryRouter>
                </AuthProvider>
            );

            // login
            fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), { target: { value: "admin@admin.com" } });
            fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), { target: { value: "password123" } });
            fireEvent.click(screen.getByText("LOGIN"));

            // Assert
            await waitFor(() => expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/login", expect.any(Object)));
            await waitFor(() => expect(axios.defaults.headers.common["Authorization"]).toBe("ultimate-login-token"));

            await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth"));

            await waitFor(() => expect(screen.getByText("All Products List")).toBeInTheDocument());
        });
    });

});
