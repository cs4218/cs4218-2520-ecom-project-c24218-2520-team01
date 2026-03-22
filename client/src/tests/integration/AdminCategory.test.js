import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import "@testing-library/jest-dom/extend-expect";

import CreateCategory from "../../pages/admin/CreateCategory";
import AdminRoute from "../../components/Routes/AdminRoute";
import { AuthProvider } from "../../context/auth";
import Login from "../../pages/Auth/Login";

import { setMockAuth, mockAdminAuthAPI, mockLoginAPI } from "./testUtils";

// Lim Jia Wei, A0277381W

// Mock required dependencies (but not tested dependencies)
jest.mock("axios");
jest.mock("react-hot-toast");

jest.mock("../../components/AdminMenu", () => () => <div data-testid="admin-menu">AdminMenu</div>);
jest.mock("../../components/Spinner", () => () => <div data-testid="spinner">Spinner</div>);

// Mock Layout
jest.mock("../../components/Layout", () => ({ children, title }) => (
    <div data-testid="layout">
        <div data-testid="title">{title}</div>
        {children}
    </div>
));

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
        Modal: ({ visible, children, onCancel }) => (
            visible ? (
                <div data-testid="mock-modal">
                    <button onClick={onCancel} data-testid="close-modal">Cancel</button>
                    {children}
                </div>
            ) : null
        ),
    };
});

/**
 * AI Usage Declaration
 *
 * Tool Used: Gemini 3.1 Pro
 *
 * Prompt: What flows should I test for Admin Category + Form: CreateCategory → CategoryForm → API calls → toast notifications → UI updates using a bottom up approach?
 *
 * How the AI Output Was Used:
 * - Used the AI output as a reference to determine which flows to test (including error flows)
*/

const mockCategories = [
    { _id: "1", name: "Electronics" },
    { _id: "2", name: "Fashion" }
];

describe("Category Management Flow Integration Tests", () => {

    beforeEach(() => {

        jest.clearAllMocks();
        localStorage.clear();
        jest.spyOn(console, "log").mockImplementation(() => { });
        jest.spyOn(console, "error").mockImplementation(() => { });

        // Set to default 
        axios.defaults.headers.common["Authorization"] = undefined;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // Level 4
    describe("CreateCategory + CategoryForm", () => {

        it("should fetch and display categories", async () => {

            // Arrange
            axios.get.mockResolvedValueOnce({ data: { success: true, category: mockCategories } });

            // Act
            render(
                <MemoryRouter>
                    <CreateCategory />
                </MemoryRouter>
            );

            // Assert
            await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category"));
            await waitFor(() => expect(screen.getByText("Electronics")).toBeInTheDocument());
            expect(screen.getByText("Fashion")).toBeInTheDocument();
        });

        it("should create a category, show toast, and refresh the list", async () => {

            // Arrange
            axios.get
                .mockResolvedValueOnce({ data: { success: true, category: mockCategories } })
                .mockResolvedValueOnce({ data: { success: true, category: [...mockCategories, { _id: "3", name: "Books" }] } });

            axios.post.mockResolvedValueOnce({ data: { success: true } });

            // Act
            render(
                <MemoryRouter>
                    <CreateCategory />
                </MemoryRouter>
            );

            await waitFor(() => expect(screen.getByText("Electronics")).toBeInTheDocument());

            // enters a new book category
            const input = screen.getByPlaceholderText("Enter new category");
            fireEvent.change(input, { target: { value: "Books" } });

            // clicks submit 
            const submitButton = screen.getByText("Submit");
            fireEvent.click(submitButton);

            // Assert
            await waitFor(() => expect(axios.post).toHaveBeenCalledWith("/api/v1/category/create-category", { name: "Books" }));
            await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Books is created"));

            await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2)); // refresh so 2 times
            await waitFor(() => expect(screen.getByText("Books")).toBeInTheDocument());
        });

        it("should handle existing category creation API failure", async () => {

            // Arrange
            axios.get.mockResolvedValueOnce({ data: { success: true, category: mockCategories } });
            axios.post.mockResolvedValueOnce({ data: { success: false, message: "Category exists" } });

            // Act
            render(
                <MemoryRouter>
                    <CreateCategory />
                </MemoryRouter>
            );

            await waitFor(() => expect(screen.getByText("Fashion")).toBeInTheDocument());

            // enters an existing category
            const input = screen.getByPlaceholderText("Enter new category");
            fireEvent.change(input, { target: { value: "Electronics" } });
            fireEvent.click(screen.getByText("Submit"));

            // Assert
            await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Category exists"));
            expect(axios.get).toHaveBeenCalledTimes(1); // no refresh
        });

        it("should handle empty category name gracefully", async () => {

            // Arrange
            axios.get.mockResolvedValueOnce({ data: { success: true, category: mockCategories } });
            axios.post.mockRejectedValueOnce({ response: { data: { message: "Name is required" } } });

            // Act
            render(
                <MemoryRouter>
                    <CreateCategory />
                </MemoryRouter>
            );

            await waitFor(() => expect(screen.getByText("Fashion")).toBeInTheDocument());

            // enters an empty category
            const input = screen.getByPlaceholderText("Enter new category");
            fireEvent.change(input, { target: { value: "" } });
            fireEvent.click(screen.getByText("Submit"));

            // Assert
            await waitFor(() => expect(axios.post).toHaveBeenCalledWith("/api/v1/category/create-category", { name: "" }));
            await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Something went wrong in input form"));
        });

        it("should edit a category via modal and refresh the list", async () => {

            // Arrange
            axios.get
                .mockResolvedValueOnce({ data: { success: true, category: mockCategories } })
                .mockResolvedValueOnce({ data: { success: true, category: [{ _id: "1", name: "Smartphones" }, { _id: "2", name: "Fashion" }] } });
            axios.put.mockResolvedValueOnce({ data: { success: true } });

            // Act
            render(
                <MemoryRouter>
                    <CreateCategory />
                </MemoryRouter>
            );

            await waitFor(() => expect(screen.getByText("Electronics")).toBeInTheDocument());

            // click edit on electronics
            const editButtons = screen.getAllByText("Edit");
            fireEvent.click(editButtons[0]);

            const inputs = screen.getAllByPlaceholderText("Enter new category");
            expect(inputs.length).toBe(2);
            const modalInput = inputs[1];

            fireEvent.change(modalInput, { target: { value: "Smartphones" } });

            const submitButtons = screen.getAllByText("Submit");
            fireEvent.click(submitButtons[1]);

            // Assert
            await waitFor(() => expect(axios.put).toHaveBeenCalledWith("/api/v1/category/update-category/1", { name: "Smartphones" }));
            await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Smartphones is updated"));

            // modal closes and UI refreshes
            await waitFor(() => expect(screen.queryByTestId("mock-modal")).not.toBeInTheDocument());
            expect(screen.getByText("Smartphones")).toBeInTheDocument();
        });

        it("should delete a category and refresh the list", async () => {

            // Arrange
            axios.get
                .mockResolvedValueOnce({ data: { success: true, category: mockCategories } })
                .mockResolvedValueOnce({ data: { success: true, category: [{ _id: "2", name: "Fashion" }] } });

            axios.delete.mockResolvedValueOnce({ data: { success: true } });

            // Act
            render(
                <MemoryRouter>
                    <CreateCategory />
                </MemoryRouter>
            );

            await waitFor(() => expect(screen.getByText("Electronics")).toBeInTheDocument());

            // click delete on electronics
            const deleteButtons = screen.getAllByText("Delete");
            fireEvent.click(deleteButtons[0]);

            // Assert
            await waitFor(() => expect(axios.delete).toHaveBeenCalledWith("/api/v1/category/delete-category/1"));
            await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Category is deleted"));

            await waitFor(() => expect(screen.queryByText("Electronics")).not.toBeInTheDocument());
            expect(screen.getByText("Fashion")).toBeInTheDocument();
        });

        it("should show error toast when category edit API call fails", async () => {

            // Arrange
            axios.get.mockResolvedValueOnce({ data: { success: true, category: mockCategories } });
            axios.put.mockRejectedValueOnce({ response: { data: { message: "Update failed" } } });

            // Act
            render(
                <MemoryRouter>
                    <CreateCategory />
                </MemoryRouter>
            );

            await waitFor(() => expect(screen.getByText("Electronics")).toBeInTheDocument());

            // open edit modal
            const editButtons = screen.getAllByText("Edit");
            fireEvent.click(editButtons[0]);

            const inputs = screen.getAllByPlaceholderText("Enter new category");
            fireEvent.change(inputs[1], { target: { value: "Updated Electronics" } });

            const submitButtons = screen.getAllByText("Submit");
            fireEvent.click(submitButtons[1]);

            await waitFor(() => expect(axios.put).toHaveBeenCalledWith("/api/v1/category/update-category/1", { name: "Updated Electronics" }));

            // Assert
            await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Something went wrong in updating category"));
            expect(axios.get).toHaveBeenCalledTimes(1); // no refresh
        });

        it("should show error toast when category delete API call fails", async () => {

            // Arrange
            axios.get.mockResolvedValueOnce({ data: { success: true, category: mockCategories } });
            axios.delete.mockRejectedValueOnce({ response: { data: { message: "Delete failed" } } });

            // Act
            render(
                <MemoryRouter>
                    <CreateCategory />
                </MemoryRouter>
            );

            await waitFor(() => expect(screen.getByText("Electronics")).toBeInTheDocument());

            const deleteButtons = screen.getAllByText("Delete");
            fireEvent.click(deleteButtons[0]);

            await waitFor(() => expect(axios.delete).toHaveBeenCalledWith("/api/v1/category/delete-category/1"));

            // Assert
            await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Something went wrong in deleting category"));
            expect(screen.getByText("Electronics")).toBeInTheDocument();
        });
    });

    // Level 3
    describe("AdminRoute + CreateCategory + CategoryForm", () => {

        it("should render CreateCategory after admin auth passes", async () => {

            // Arrange
            setMockAuth();
            mockAdminAuthAPI(true);
            axios.get.mockResolvedValueOnce({ data: { success: true, category: mockCategories } }); // Category fetch

            // Act
            render(
                <AuthProvider>
                    <MemoryRouter initialEntries={["/dashboard/admin/create-category"]}>
                        <Routes>
                            <Route path="/dashboard/admin" element={<AdminRoute />}>
                                <Route path="create-category" element={<CreateCategory />} />
                            </Route>
                        </Routes>
                    </MemoryRouter>
                </AuthProvider>
            );

            // initially show spinner
            expect(screen.getByTestId("spinner")).toBeInTheDocument();

            // Assert
            await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth"));

            await waitFor(() => {
                expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
                expect(screen.getByText("Manage Category")).toBeInTheDocument();
                expect(screen.getByText("Electronics")).toBeInTheDocument();
            });
        });
    });


    // Level 2
    describe("AuthContext + AdminRoute + CreateCategory + CategoryForm", () => {

        it("should set auth header and allow category creation", async () => {

            // Arrange
            setMockAuth(1, "mock-admin-token-123");

            mockAdminAuthAPI(true);
            axios.get
                .mockResolvedValueOnce({ data: { success: true, category: mockCategories } }) // Initial Mount
                .mockResolvedValueOnce({ data: { success: true, category: [...mockCategories, { _id: "9", name: "New Auth Cat" }] } }); // Refresh

            axios.post.mockResolvedValueOnce({ data: { success: true } });

            // Act
            render(
                <AuthProvider>
                    <MemoryRouter initialEntries={["/dashboard/admin/create-category"]}>
                        <Routes>
                            <Route path="/dashboard/admin" element={<AdminRoute />}>
                                <Route path="create-category" element={<CreateCategory />} />
                            </Route>
                        </Routes>
                    </MemoryRouter>
                </AuthProvider>
            );

            await waitFor(() => expect(screen.getByText("Manage Category")).toBeInTheDocument());

            fireEvent.change(screen.getByPlaceholderText("Enter new category"), { target: { value: "New Auth Cat" } });
            fireEvent.click(screen.getByText("Submit"));

            // Assert
            await waitFor(() => expect(axios.post).toHaveBeenCalledWith("/api/v1/category/create-category", { name: "New Auth Cat" }));

            expect(axios.defaults.headers.common["Authorization"]).toBe("mock-admin-token-123");
        });
    });

    // Level 1
    describe("Login + AuthContext + AdminRoute + CreateCategory + CategoryForm", () => {

        it("should complete login to category creation flow", async () => {

            // Arrange
            mockLoginAPI(true, "ultimate-admin-token", 1);
            axios.post.mockResolvedValueOnce({ data: { success: true } });

            mockAdminAuthAPI(true);
            axios.get.mockResolvedValueOnce({ data: { success: true, category: [] } });

            const initialEntry = {
                pathname: "/login",
                state: "/dashboard/admin/create-category"
            };

            // Act
            render(
                <AuthProvider>
                    <MemoryRouter initialEntries={[initialEntry]}>
                        <Routes>
                            <Route path="/login" element={<Login />} />
                            <Route path="/dashboard/admin" element={<AdminRoute />}>
                                <Route path="create-category" element={<CreateCategory />} />
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
            await waitFor(() => expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/login", {
                email: "admin@admin.com",
                password: "password123",
            }));
            await waitFor(() => expect(axios.defaults.headers.common["Authorization"]).toBe("ultimate-admin-token"));

            await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth"));
            await waitFor(() => expect(screen.getByText("Manage Category")).toBeInTheDocument());

            // create category
            fireEvent.change(screen.getByPlaceholderText("Enter new category"), { target: { value: "E2E Category" } });
            fireEvent.click(screen.getByText("Submit"));

            // Assert
            await waitFor(() => expect(axios.post).toHaveBeenCalledWith("/api/v1/category/create-category", { name: "E2E Category" }));
            await waitFor(() => expect(toast.success).toHaveBeenCalledWith("E2E Category is created"));
        });
    });

});
