import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";

import HomePage from "../../client/src/pages/HomePage";
import { CartProvider } from "../../client/src/context/cart";

// Integration test for product browsing and filtering 
// Browsing + Filtering: Homepage loads categories/products → category/price filters 
// → POST /product/product-filters → combined filters + pagination + reset

// Rachel Tai Ke Jia, A0258603A

// mock axios to keep test deterministic and focused on HomePage integration logic
jest.mock("axios");

// mock toast as the side effects are not part of browsing/filtering assertions
jest.mock("react-hot-toast", () => ({
    __esModule: true,
    default: {
        success: jest.fn(),
    },
}));

// mock layout wrapper to avoid unrelated rendering noise 
jest.mock("../../client/src/components/Layout", () => ({ children, title }) => (
    <div data-testid="layout" data-title={title}>
        {children}
    </div>
));

// mock reload icon to avoid unrelated rendering noise
jest.mock("react-icons/ai", () => ({
    AiOutlineReload: () => <span data-testid="reload-icon">reload</span>,
}));

// top-down stubs for lower-level UI controls to keep integration focused on HomePage flow
// mock antd controls with native inputs to reliably assert filter events and payloads
jest.mock("antd", () => {
    const ReactMock = require("react");
    const Checkbox = ({ children, onChange }) => (
        <label>
            <input
                type="checkbox"
                aria-label={children}
                onChange={(event) => onChange?.({ target: { checked: event.target.checked } })}
            />
            {children}
        </label>
    );

    const RadioItem = ({ children, value, __onChange }) => (
        <label>
            <input
                type="radio"
                name="price-range"
                aria-label={children}
                onChange={() => __onChange?.({ target: { value } })}
            />
            {children}
        </label>
    );

    const RadioGroup = ({ children, onChange }) => (
        <div>
            {ReactMock.Children.map(children, (child) => {
                if (!ReactMock.isValidElement(child)) {
                    return child;
                }
                return ReactMock.cloneElement(
                    child,
                    {},
                    ReactMock.Children.map(child.props.children, (nested) => {
                        if (!ReactMock.isValidElement(nested)) {
                            return nested;
                        }
                        return ReactMock.cloneElement(nested, { __onChange: onChange });
                    }),
                  );
              })}
        </div>
    );

    return {
        Checkbox,
        Radio: Object.assign(RadioItem, { Group: RadioGroup }),
    };
});

// mock Prices to stabilise price boundaries, so radio payload checks are predictable
jest.mock("../../client/src/components/Prices", () => ({
    Prices: [
        { _id: 0, name: "$0 to 19", array: [0, 19] },
        { _id: 1, name: "$20 to 39", array: [20, 39] },
    ]
}));

const MOCK_CATEGORIES = [
    { _id: "cat-electronics", name: "Electronics" },
    { _id: "cat-books", name: "Books" }
];

const PAGE_1_PRODUCTS = [
    {
        _id: "p1",
        name: "Laptop Sleeve",
        slug: "laptop-sleeve",
        price: 39,
        description: "Protective laptop sleeve"
    },
    {
        _id: "p2",
        name: "Paper Notebook",
        slug: "paper-notebook",
        price: 12,
        description: "A ruled notebook for daily notes"
    }
];

const PAGE_2_PRODUCTS = [
    {
        _id: "p3",
        name: "USB Hub",
        slug: "usb-hub",
        price: 29,
        description: "USB hub with multiple ports"
    }
];

const CATEGORY_FILTER_PRODUCTS = [
    {
        _id: "p4",
        name: "Wireless Keyboard",
        slug: "wireless-keyboard",
        price: 69,
        description: "Compact wireless keyboard"
    }
];

const PRICE_FILTER_PRODUCTS = [
    {
        _id: "p5",
        name: "Pocket Planner",
        slug: "pocket-planner",
        price: 15,
        description: "Pocket planner for schedule tracking"
    }
];

const COMBINED_FILTER_PRODUCTS = [
    {
        _id: "p6",
        name: "Mini Cable",
        slug: "mini-cable",
        price: 10,
        description: "Mini charging cable"
    }
];

const renderHomePage = () =>
    render(
        <MemoryRouter>
            <CartProvider>
                <HomePage />
            </CartProvider>
        </MemoryRouter>,
    );

describe("browsing and filtering integration (using top-down incremental approach)", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();

        axios.get.mockImplementation((url) => {
            if (url === "/api/v1/category/get-category") {
                return Promise.resolve({ data: { success: true, category: MOCK_CATEGORIES } });
            }
            if (url === "/api/v1/product/product-count") {
                return Promise.resolve({ data: { success: true, total: 3 } });
            }
            if (url === "/api/v1/product/product-list/1") {
                return Promise.resolve({ data: { success: true, products: PAGE_1_PRODUCTS } });
            }
            if (url === "/api/v1/product/product-list/2") {
                return Promise.resolve({ data: { success: true, products: PAGE_2_PRODUCTS } });
            }
            return Promise.reject(new Error(`Unhandled GET URL: ${url}`));
        });

        axios.post.mockImplementation((url, payload) => {
            if (url !== "/api/v1/product/product-filters") {
                return Promise.reject(new Error(`Unhandled POST URL: ${url}`));
            }

            const hasCategory = payload.checked?.length > 0;
            const hasPrice = payload.radio?.length > 0;

            if (hasCategory && hasPrice) {
                return Promise.resolve({ data: { success: true, products: COMBINED_FILTER_PRODUCTS } });
            }
            if (hasCategory) {
                return Promise.resolve({ data: { success: true, products: CATEGORY_FILTER_PRODUCTS } });
            }
            if (hasPrice) {
                return Promise.resolve({ data: { success: true, products: PRICE_FILTER_PRODUCTS } });
            }

            return Promise.resolve({ data: { success: true, products: PAGE_1_PRODUCTS } });
        });
    });


    test("level 1: homepage loads categories/products/count", async () => {
        // variety: Component A(HomePage) with Component B(API boundary via axios)
        // and Component C(CartProvider wrapper) in the initial load path

        // Arrange: HomePage with API boundary stubbed

        // Act
        renderHomePage();

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
            expect(axios.get).toHaveBeenCalledWith("/api/v1/product/product-list/1");
            expect(axios.get).toHaveBeenCalledWith("/api/v1/product/product-count");
        });
        expect(await screen.findByText(MOCK_CATEGORIES[0].name)).toBeInTheDocument();
        expect(await screen.findByText(PAGE_1_PRODUCTS[0].name)).toBeInTheDocument();
    });


    test("level 2: category filter posts checked category ids", async () => {
        // variety: Component A(HomePage) with Component D(Checkbox/Category controls)

        // Arrange: integrate HomePage with category checkbox interaction
        renderHomePage();
        await screen.findByText(MOCK_CATEGORIES[0].name);

        // Act
        fireEvent.click(screen.getByRole("checkbox", { name: MOCK_CATEGORIES[0].name }));

        // Assert
        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith("/api/v1/product/product-filters", {
                checked: ["cat-electronics"],
                radio: []
            });
        });
        expect(await screen.findByText(PAGE_1_PRODUCTS[0].name)).toBeInTheDocument();
    });


    test("level 3: price filter posts selected range from Prices", async () => {
        // variety: Component B(Filter payload integration) with Component C(Prices/Radio)

        // Arrange: integrate HomePage with price options from Prices component contract
        renderHomePage();
        await screen.findByText(PAGE_1_PRODUCTS[0].name);

        // Act
        fireEvent.click(screen.getByRole("radio", { name: "$0 to 19" }));

        // Assert
        await waitFor(() => {
            const hasExpectedPricePayload = axios.post.mock.calls.some(
                ([url, payload]) =>
                    url === "/api/v1/product/product-filters" &&
                    JSON.stringify(payload) === JSON.stringify({ checked: [], radio: [0, 19] }),
            );
            expect(hasExpectedPricePayload).toBe(true);
        });
        expect(await screen.findByText(PAGE_1_PRODUCTS[0].name)).toBeInTheDocument();
    });


    test("level 4: combined filters + pagination + reset", async () => {
        // variety: Component A(HomePage) with Component B(API payload integration)
        // and Component E(Pagination/Reset controls) 

        // Arrange: integrate filtering flow plus pagination state transitions
        renderHomePage();
        await screen.findByText(PAGE_1_PRODUCTS[0].name);

        // Act
        fireEvent.click(screen.getByRole("checkbox", { name: "Electronics" }));
        fireEvent.click(screen.getByRole("radio", { name: "$0 to 19" }));

        // Assert combined payload was used at least once
        await waitFor(() => {
            const hasCombinedPayload = axios.post.mock.calls.some(
                ([url, payload]) =>
                    url === "/api/v1/product/product-filters" &&
                    JSON.stringify(payload) ===
                        JSON.stringify({ checked: ["cat-electronics"], radio: [0, 19] }),
            );
            expect(hasCombinedPayload).toBe(true);
        });
        expect(await screen.findByText(PAGE_1_PRODUCTS[0].name)).toBeInTheDocument();

        // Act 
        fireEvent.click(screen.getByRole("button", { name: /loadmore/i }));

        // Assert pagination list endpoint called
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/product/product-list/2");
        });

        // Act reset
        fireEvent.click(screen.getByRole("button", { name: /reset filters/i }));

        // Assert reset returns to page-1 list
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/product/product-list/1");
        });
    });
});
