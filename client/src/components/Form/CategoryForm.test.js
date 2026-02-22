import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import CategoryForm from "./CategoryForm";
import "@testing-library/jest-dom";

// Lim Jia Wei, A0277381W

describe("Tests for Category Form component", () => {

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, "log").mockImplementation(() => { });
    });

    test("renders input field and submit button", () => {

        // Arrange
        const mockHandleSubmit = jest.fn();
        const mockSetValue = jest.fn();

        // Act
        render(
            <CategoryForm
                handleSubmit={mockHandleSubmit}
                value="Test Category"
                setValue={mockSetValue}
            />
        );

        const inputElement = screen.getByPlaceholderText("Enter new category");
        const buttonElement = screen.getByRole("button", { name: /submit/i });

        // Assert
        expect(inputElement).toBeInTheDocument();
        expect(inputElement).toHaveValue("Test Category");
        expect(buttonElement).toBeInTheDocument();
    });

    test("calls setValue when input value changes", () => {

        // Arrange
        const mockHandleSubmit = jest.fn();
        const mockSetValue = jest.fn();

        // Act
        render(
            <CategoryForm
                handleSubmit={mockHandleSubmit}
                value=""
                setValue={mockSetValue}
            />
        );

        const inputElement = screen.getByPlaceholderText("Enter new category");
        fireEvent.change(inputElement, { target: { value: "New Electronics" } });

        // Assert
        expect(mockSetValue).toHaveBeenCalledTimes(1);
        expect(mockSetValue).toHaveBeenCalledWith("New Electronics");
    });

    test("calls handleSubmit when form is submitted", () => {

        // Arrange
        const mockHandleSubmit = jest.fn((e) => e.preventDefault());
        const mockSetValue = jest.fn();

        // Act
        render(
            <CategoryForm
                handleSubmit={mockHandleSubmit}
                value="Book"
                setValue={mockSetValue}
            />
        );

        const buttonElement = screen.getByRole("button", { name: /submit/i });
        fireEvent.click(buttonElement);

        // Assert
        expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
    });

});