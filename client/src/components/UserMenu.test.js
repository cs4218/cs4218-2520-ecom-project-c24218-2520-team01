import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import UserMenu from "./UserMenu";

// Rachel Tai Ke Jia, A0258603A

const renderUserMenu = () =>
    render(
        // Use MemoryRouter as a fake for NavLink
        <MemoryRouter>
          <UserMenu />
        </MemoryRouter>
    );

describe("Unit test for UserMenu component", () => {
    test("UserMenu shows shows h4 text", () => {
        // Act
        renderUserMenu();

        // Assert
        expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });


    test("UserMenu has Profile navigation link", () => {
        // Act
        renderUserMenu();
        const link = screen.getByRole(
            "link", 
            { name: "Profile" }
        );

        // Assert
        expect(link).toHaveAttribute("href", "/dashboard/user/profile");
    });


    test("UserMenu has Orders navigation link", () => {
        // Act
        renderUserMenu();
        const link = screen.getByRole(
            "link", 
            { name: "Orders" }
        );

        // Assert
        expect(link).toHaveAttribute("href", "/dashboard/user/orders");
    });
});
