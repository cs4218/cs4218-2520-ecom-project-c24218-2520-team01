import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import toast from "react-hot-toast";
import CreateCategory from "./CreateCategory";

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

// Mock CategoryForm
jest.mock("../../components/Form/CategoryForm", () => {
    return function CategoryFormMock({ handleSubmit, value, setValue }) {
        return (
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Enter new category"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                />
                <button type="submit">Submit</button>
            </form>
        );
    };
});

// Mock antd Select - This mock was generated with assistance by ChatGPT 5.2
jest.mock("antd", () => {
    const React = require("react");
    const Modal = ({ visible, onCancel, children }) => {
        if (!visible) return null;
        return (
            <div data-testid="modal">
                <button onClick={onCancel}>Close</button>
                {children}
            </div>
        );
    };
    return { Modal };
});

describe("Tests for Create Category page", () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const setupCategoryMocks = () => {
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

    test("renders component and fetches categories", async () => {

        // Arrange
        setupCategoryMocks();

        // Act
        render(<CreateCategory />);

        // Assert
        expect(screen.getByText("Manage Category")).toBeInTheDocument();

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
            expect(screen.getByText("Electronics")).toBeInTheDocument();
            expect(screen.getByText("Books")).toBeInTheDocument();

            expect(screen.getAllByRole("button", { name: "Edit" }).length).toBeGreaterThan(0);
            expect(screen.getAllByRole("button", { name: "Delete" }).length).toBeGreaterThan(0);
        });
    });

    test("successfully creates a category and refetches list", async () => {

        // Arrange
        setupCategoryMocks();
        axios.post.mockResolvedValue({ data: { success: true } });

        // Act
        render(<CreateCategory />);

        await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));

        const [createInput] = screen.getAllByPlaceholderText("Enter new category");
        fireEvent.change(createInput, { target: { value: "NewCat" } });

        const [createSubmitBtn] = screen.getAllByRole("button", { name: "Submit" });
        fireEvent.click(createSubmitBtn);

        // Assert
        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith("/api/v1/category/create-category", {
                name: "NewCat",
            });
            expect(toast.success).toHaveBeenCalledWith("NewCat is created");
            // should refetch categories after successful create
            expect(axios.get).toHaveBeenCalledTimes(2);
        });
    });

    test("shows error toast when create category API returns failure", async () => {

        // Arrange
        setupCategoryMocks();
        axios.post.mockResolvedValue({
            data: { success: false, message: "Create failed" },
        });

        // Act
        render(<CreateCategory />);
        await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));

        const [createInput] = screen.getAllByPlaceholderText("Enter new category");
        fireEvent.change(createInput, { target: { value: "new category" } });

        const [createSubmitBtn] = screen.getAllByRole("button", { name: "Submit" });
        fireEvent.click(createSubmitBtn);

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Create failed");
            // should not refetch categories upon failure
            expect(axios.get).toHaveBeenCalledTimes(1);
        });
    });

    test("shows error toast when create category API request fails", async () => {

        // Arrange
        setupCategoryMocks();
        axios.post.mockRejectedValue(new Error("network fail"));

        // Act
        render(<CreateCategory />);
        await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));

        const [createInput] = screen.getAllByPlaceholderText("Enter new category");
        fireEvent.change(createInput, { target: { value: "new category" } });

        const [createSubmitBtn] = screen.getAllByRole("button", { name: "Submit" });
        fireEvent.click(createSubmitBtn);

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Something went wrong in input form");
        });
    });

    test("shows error toast when get category API returns failure", async () => {

        // Arrange
        setupCategoryMocks();
        axios.get.mockResolvedValue({
            data: { success: false, message: "Getting categories failed" },
        });

        // Act
        render(<CreateCategory />);

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
            expect(toast.error).toHaveBeenCalledWith("Categories could not be loaded");
        });

        expect(screen.queryByText("Electronics")).not.toBeInTheDocument();
    });

    test("shows toast error when get category API returns no response", async () => {

        // Arrange
        axios.get.mockRejectedValue(new Error("some error"));

        // Act
        render(<CreateCategory />);

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Something went wrong in getting category");
        });
    });

    test("updates category and refetches list", async () => {

        // Arrange
        setupCategoryMocks();
        axios.put.mockResolvedValueOnce({ data: { success: true } });

        // Act
        render(<CreateCategory />);

        await waitFor(() =>
            expect(screen.getByText("Electronics")).toBeInTheDocument()
        );

        const [firstEditBtn] = screen.getAllByRole("button", { name: "Edit" });
        fireEvent.click(firstEditBtn);

        const updateInput = screen.getAllByPlaceholderText("Enter new category")[1];
        fireEvent.change(updateInput, { target: { value: "new electronics" } });

        const updateSubmitBtn = screen.getAllByRole("button", { name: "Submit" })[1];
        fireEvent.click(updateSubmitBtn);

        // Assert
        await waitFor(() => {
            expect(axios.put).toHaveBeenCalledWith(
                "/api/v1/category/update-category/1",
                { name: "new electronics" }
            );
            // Should refetch after successful update
            expect(axios.get).toHaveBeenCalledTimes(2);

        });
    });

    test("shows error toast when update category API returns failure", async () => {

        // Arrange
        setupCategoryMocks();
        axios.put.mockResolvedValue({
            data: { success: false, message: "Update failed" },
        });

        // Act
        render(<CreateCategory />);
        await waitFor(() => expect(screen.getByText("Electronics")).toBeInTheDocument());

        fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
        expect(screen.getByTestId("modal")).toBeInTheDocument();

        const updateInput = screen.getAllByPlaceholderText("Enter new category")[1];
        fireEvent.change(updateInput, { target: { value: "new category" } });

        screen.getAllByRole("button", { name: "Submit" })[1].click();

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Update failed");
            // no refetch on failure
            expect(axios.get).toHaveBeenCalledTimes(1);
        });

    });

    test("shows error toast when update category API request fails", async () => {

        // Arrange
        setupCategoryMocks();
        axios.put.mockRejectedValue(new Error("network fail"));

        // Act
        render(<CreateCategory />);
        await waitFor(() => expect(screen.getByText("Electronics")).toBeInTheDocument());

        fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
        expect(screen.getByTestId("modal")).toBeInTheDocument();

        screen.getAllByRole("button", { name: "Submit" })[1].click();

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Something went wrong in updating category");
        });
    });

    test("deletes a category and refetches list", async () => {

        // Arrange
        setupCategoryMocks();
        axios.delete.mockResolvedValue({ data: { success: true } });

        // Act
        render(<CreateCategory />);
        await waitFor(() => expect(screen.getByText("Electronics")).toBeInTheDocument());

        const [firstDeleteBtn] = screen.getAllByRole("button", { name: "Delete" });
        fireEvent.click(firstDeleteBtn);

        // Assert
        await waitFor(() => {
            expect(axios.delete).toHaveBeenCalledWith("/api/v1/category/delete-category/1");
            expect(toast.success).toHaveBeenCalledWith("Category is deleted");
            // should refetch after delete
            expect(axios.get).toHaveBeenCalledTimes(2);
        });
    });

    test("shows error toast when delete API returns failure", async () => {

        // Arrange
        setupCategoryMocks();
        axios.delete.mockResolvedValue({
            data: { success: false, message: "Delete failed" },
        });

        // Act
        render(<CreateCategory />);
        await waitFor(() => expect(screen.getByText("Electronics")).toBeInTheDocument());

        screen.getAllByRole("button", { name: "Delete" })[0].click();

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Delete failed");
            // no refetch on failure
            expect(axios.get).toHaveBeenCalledTimes(1);
        });
    });

    test("shows error toast when delete API request fails", async () => {

        // Arrange
        setupCategoryMocks();
        axios.delete.mockRejectedValue(new Error("delete failed"));

        // Act
        render(<CreateCategory />);
        await waitFor(() => expect(screen.getByText("Electronics")).toBeInTheDocument());

        screen.getAllByRole("button", { name: "Delete" })[0].click();

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Something went wrong in deleting category");
        });
    });

    test("renders correctly when categories is null", async () => {

        // Arrange
        axios.get.mockResolvedValueOnce({
            data: { success: true, category: null },
        });

        // Act
        render(<CreateCategory />);

        // Assert
        expect(screen.getByText("Manage Category")).toBeInTheDocument();
        await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category"));

        // Table rows should not render
        expect(screen.queryByText("Electronics")).not.toBeInTheDocument();
    });

    test("closes edit modal when cancel is triggered", async () => {

        // Arrange
        setupCategoryMocks();

        // Act
        render(<CreateCategory />);

        await waitFor(() => expect(screen.getByText("Electronics")).toBeInTheDocument());

        fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
        expect(screen.getByTestId("modal")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Close" }));

        // Assert
        await waitFor(() => {
            expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
        });

    });
});
