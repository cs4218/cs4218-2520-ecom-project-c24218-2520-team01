import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import UserMenu from "./UserMenu";

const renderUserMenu = () =>
    render(
        // Use MemoryRouter as a fake for NavLink
        <MemoryRouter>
          <UserMenu />
        </MemoryRouter>
    );

describe("Unit test for UserMenu component", () => {
    test("UserMenu shows shows h4 text", () => {
        // Arrange
        const { container } = renderUserMenu();

        // Act 
        const text = container.textContent;

        // Assert
        expect(text).toContain("Dashboard");
    });


    test("Routing for Profile and Orders pages", () => {
        // Arrange
        const { container } = renderUserMenu();

        // Act
        const links = container.querySelectorAll("a");
        const hrefs = Array.from(links).map(link => link.getAttribute("href"));

        // Assert
        expect(hrefs).toContain("/dashboard/user/profile");
        expect(hrefs).toContain("/dashboard/user/orders");
    });


    test("UserMenu has Profile navigation link", () => {
        // Arrange
        const { container } = renderUserMenu();

        // Act
        const text = container.textContent;

        // Assert
        expect(text).toContain("Profile");
    });


    test("UserMenu has Orders navigation link", () => {
        // Arrange
        const { container } = renderUserMenu();

        // Act
        const text = container.textContent;

        // Assert
        expect(text).toContain("Orders");
    });

});
