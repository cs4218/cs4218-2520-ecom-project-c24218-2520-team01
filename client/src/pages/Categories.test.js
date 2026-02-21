import { beforeAll, beforeEach, describe, expect, jest } from "@jest/globals";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Categories from "./Categories.js";
import useCategory from "../hooks/useCategory";
import Layout from "../components/Layout";

// For the entire file: Written by Nicholas Cheng, A0269648H

// Mock the layout and useCategory hook
jest.mock("../components/Layout", () => {
    return ({ children }) => (
        <div data-testid="Mock layout">
            {children}
        </div>
    );
});
jest.mock("../hooks/useCategory");

describe("Frontend UI for categories page", () => {
    describe("Unit tests for categories UI page", () => {

        let renderComponent;

        beforeAll(() => {
            // We will use this function variable to render the component
            // MemoryRouter is used to store the links in memory
            renderComponent = () =>
                render(
                    <MemoryRouter>
                        <Categories />
                    </MemoryRouter>
                );
        })

        beforeEach(() => {
            jest.clearAllMocks();
        });

        describe("Successfully renders the correct elements on the page", () => {
            test("Renders categories after being fetched by useCategory hook", () => {
                // Arrange
                const mockCategoriesList = [
                    { _id: 1, name: "Electronics", slug: "electronics" },
                    { _id: 2, name: "Books", slug: "books" },
                ];
                useCategory.mockReturnValueOnce(mockCategoriesList);

                // Act
                renderComponent();

                // Assert
                expect(screen.getByText("Electronics")).toBeInTheDocument();
                expect(screen.getByText("Books")).toBeInTheDocument();
            });

            test("Render successfully with no categories fetched", () => {
                // Arrange
                useCategory.mockReturnValue([]);

                // Act
                renderComponent();

                // Assert
                // Ensures we have rendered the page
                expect(screen.getByTestId("Mock layout")).toBeInTheDocument();
                // Verify no category links are rendered
                const links = screen.queryAllByRole("link");
                expect(links).toHaveLength(0);
            });

            test("Renders correct links on categories page", () => {
                // Arrange
                const mockCategories = [
                    { _id: 1, name: "Electronics", slug: "electronics" },
                    { _id: 2, name: "Books", slug: "books" },
                ];
                useCategory.mockReturnValueOnce(mockCategories);

                // Act
                renderComponent();

                // Assert
                // Just check again that the categories are rendered
                expect(screen.getByText("Electronics")).toBeInTheDocument();
                expect(screen.getByText("Books")).toBeInTheDocument();

                // Check that the links are rendered correctly
                const links = screen.getAllByRole("link");
                expect(links).toHaveLength(mockCategories.length);
                mockCategories.forEach((category, index) => {
                    expect(links[index]).toHaveTextContent(category.name);
                    expect(links[index]).toHaveAttribute("href", `/category/${category.slug}`);
                });
            });
        })
    })
})