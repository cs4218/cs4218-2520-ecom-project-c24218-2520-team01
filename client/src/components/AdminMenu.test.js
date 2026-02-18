import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminMenu from "./AdminMenu";
import "@testing-library/jest-dom";

// Lim Jia Wei, A0277381W

// Arrange
const renderMenu = (initialPath = "/") =>
    render(
        <MemoryRouter initialEntries={[initialPath]}>
            <AdminMenu />
        </MemoryRouter>
    );

describe("Tests for AdminMenu", () => {

    test("renders Admin Panel title", () => {

        // Act
        renderMenu();

        // Assert
        expect(screen.getByRole("heading", { name: /admin panel/i })).toBeInTheDocument();
    });

    test("renders Create Category link with correct route", () => {

        // Act
        renderMenu();
        const link = screen.getByRole("link", { name: "Create Category" });

        // Assert
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute("href", "/dashboard/admin/create-category");
    });

    test("renders Create Product link with correct route", () => {

        // Act
        renderMenu();
        const link = screen.getByRole("link", { name: "Create Product" });

        // Assert
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute("href", "/dashboard/admin/create-product");
    });

    test("renders Products link with correct route", () => {

        // Act
        renderMenu();
        const link = screen.getByRole("link", { name: "Products" });

        // Assert
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute("href", "/dashboard/admin/products");
    });

    test("renders Orders link with correct route", () => {

        // Act
        renderMenu();
        const link = screen.getByRole("link", { name: "Orders" });

        // Assert
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute("href", "/dashboard/admin/orders");
    });

    test("renders Users link with correct route", () => {

        // Act
        renderMenu();
        const link = screen.getByRole("link", { name: "Users" });

        // Assert
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute("href", "/dashboard/admin/users");
    });

});
