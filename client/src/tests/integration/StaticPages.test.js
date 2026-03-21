import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import "@testing-library/jest-dom/extend-expect";

import About from "../../pages/About";
import Contact from "../../pages/Contact";
import Policy from "../../pages/Policy";
import Pagenotfound from "../../pages/Pagenotfound";

import { AuthProvider } from "../../context/auth";
import { SearchProvider } from "../../context/search";
import { CartProvider } from "../../context/cart";

// Lim Jia Wei, A0277381W

jest.mock("axios");
jest.mock("react-hot-toast");

/**
 * AI Usage Declaration
 *
 * Tool Used: Gemini 3.1 Pro
 *
 * Prompt: How do I mock the react icons for this class?
 *
 * How the AI Output Was Used:
 * - Used for the react icons mocked as seen below
*/

jest.mock("react-icons/bi", () => ({
    BiMailSend: () => <span data-testid="icon-mail">MailIcon</span>,
    BiPhoneCall: () => <span data-testid="icon-phone">PhoneIcon</span>,
    BiSupport: () => <span data-testid="icon-support">SupportIcon</span>
}));

beforeEach(() => {

    jest.clearAllMocks();
    localStorage.clear();
    jest.spyOn(console, "error").mockImplementation(() => { });

    axios.get.mockImplementation((url) => {
        if (url === "/api/v1/category/get-category") {
            return Promise.resolve({
                data: {
                    success: true,
                    category: [
                        { _id: "c1", name: "Electronics", slug: "electronics" },
                        { _id: "c2", name: "Books", slug: "books" }
                    ]
                }
            });
        }
        return Promise.resolve({ data: {} });
    });
});

afterEach(() => {

    jest.restoreAllMocks();

});

describe("Static Pages and Layout Integration Tests", () => {

    // Global wrapper
    const renderWithContexts = (ui, route = "/") => {
        return render(
            <AuthProvider>
                <SearchProvider>
                    <CartProvider>
                        <MemoryRouter initialEntries={[route]}>
                            <Routes>
                                <Route path={route} element={ui} />
                            </Routes>
                        </MemoryRouter>
                    </CartProvider>
                </SearchProvider>
            </AuthProvider>
        );
    };

    describe("About Page Context Integration", () => {

        it("should render About page with Header and Footer", async () => {

            // Arrange
            renderWithContexts(<About />, "/about");

            // Assert
            await waitFor(() => expect(screen.getByText("🛒 Virtual Vault")).toBeInTheDocument());
            await waitFor(() => expect(screen.getByText("Categories")).toBeInTheDocument());


            await waitFor(() => expect(screen.getByText("Electronics")).toBeInTheDocument());

            // page specific
            expect(screen.getByText("Add text")).toBeInTheDocument();
            const image = screen.getByAltText("aboutus");
            expect(image).toBeInTheDocument();
            expect(image.src).toContain("/images/about.jpeg");

            // footer
            expect(screen.getByText(/All Rights Reserved/i)).toBeInTheDocument();
            expect(screen.getByText("About")).toBeInTheDocument();
            expect(screen.getByText("Contact")).toBeInTheDocument();
            expect(screen.getByText("Privacy Policy")).toBeInTheDocument();

            // title
            await waitFor(() => expect(document.title).toBe("About us - Ecommerce app"));
        });

        it("should still render About page when category fetch fails", async () => {

            // Arrange
            axios.get.mockRejectedValueOnce(new Error("Network Error"));

            // Act
            renderWithContexts(<About />, "/about");

            // Assert
            await waitFor(() => expect(screen.getByText("🛒 Virtual Vault")).toBeInTheDocument());
            expect(screen.getByText("Add text")).toBeInTheDocument();
            expect(screen.getByText(/All Rights Reserved/i)).toBeInTheDocument();

            // category dropdown should be empty
            expect(screen.queryByText("Electronics")).not.toBeInTheDocument();
        });
    });

    describe("Contact Page Context Integration", () => {

        it("should render Contact page with icons and correct details", async () => {

            // Act
            renderWithContexts(<Contact />, "/contact");

            // Assert
            await waitFor(() => expect(screen.getByText("🛒 Virtual Vault")).toBeInTheDocument());
            expect(screen.getByText(/All Rights Reserved/i)).toBeInTheDocument();

            // page specific
            expect(screen.getByText("CONTACT US")).toBeInTheDocument();
            expect(screen.getByText(/For any query or info/i)).toBeInTheDocument();

            // icons
            expect(screen.getByTestId("icon-mail")).toBeInTheDocument();
            expect(screen.getByText(/: www.help@ecommerceapp.com/i)).toBeInTheDocument();
            expect(screen.getByTestId("icon-support")).toBeInTheDocument();

            // title
            await waitFor(() => expect(document.title).toBe("Contact us"));
        });
    });

    describe("Privacy Policy Page Context Integration", () => {

        it("should render Privacy Policy page content correctly", async () => {

            // Act
            renderWithContexts(<Policy />, "/policy");

            // Assert
            await waitFor(() => expect(screen.getByText("🛒 Virtual Vault")).toBeInTheDocument());
            expect(screen.getByText(/All Rights Reserved/i)).toBeInTheDocument();

            // page specific
            const policyTextElements = screen.getAllByText("add privacy policy");
            expect(policyTextElements.length).toBe(7);

            // title
            await waitFor(() => expect(document.title).toBe("Privacy Policy"));
        });
    });

    describe("404 Error Page Context Integration", () => {

        it("should render 404 page with a Go Back link", async () => {

            // Act
            renderWithContexts(<Pagenotfound />, "/random-broken-url-999");

            // Assert
            await waitFor(() => expect(screen.getByText("🛒 Virtual Vault")).toBeInTheDocument());
            expect(screen.getByText(/All Rights Reserved/i)).toBeInTheDocument();

            // page specific
            expect(screen.getByText("404")).toBeInTheDocument();
            expect(screen.getByText("Oops ! Page Not Found")).toBeInTheDocument();

            // link
            const goBackButton = screen.getByText("Go Back");
            expect(goBackButton).toBeInTheDocument();
            expect(goBackButton.getAttribute("href")).toBe("/");

            // title
            await waitFor(() => expect(document.title).toBe("go back- page not found"));
        });
    });
});
