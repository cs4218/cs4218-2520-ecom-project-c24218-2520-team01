import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, jest } from "@jest/globals";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import nodeAxios from "axios/dist/node/axios.cjs";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import Header from "../../client/src/components/Header.js";
import SearchInput from "../../client/src/components/Form/SearchInput.js";
import Search from "../../client/src/pages/Search.js";
import { SearchProvider, useSearch } from "../../client/src/context/search.js";
import categoryModel from "../../models/categoryModel.js";
import productModel from "../../models/productModel.js";
import app from "./setup/testServer.js";
import {
    clearTestData,
    connectTestDatabase,
    disconnectTestDatabase,
} from "./setup/testDatabase.js";

// integration test for search functionality 
// Header SearchInput → SearchContext → GET /product/search/:keyword 
// → store results → navigate /search → render results

// Rachel Tai Ke Jia, A0258603A

// mocks to isolate each test level 
jest.mock("../../client/src/context/auth", () => ({
    useAuth: () => [{ user: null, token: "" }, jest.fn()],
}));

jest.mock("../../client/src/context/cart", () => ({
    useCart: () => ({ cart: [] }),
}));

jest.mock("../../client/src/hooks/useCategory", () => jest.fn(() => []));

jest.mock("react-hot-toast", () => ({
    __esModule: true,
    default: { success: jest.fn(), error: jest.fn() },
    Toaster: () => <div data-testid="toaster" />,
}));

const SearchStateProbe = () => {
    const [values] = useSearch();
    return (
        <div>
            <span data-testid="probe-keyword">{values.keyword}</span>
            <span data-testid="probe-results-count">{values.results.length}</span>
        </div>
    );
};

const LocationProbe = () => {
    const location = useLocation();
    return <span data-testid="location-probe">{location.pathname}</span>;
};

const SEARCH_PRODUCTS_FIXTURE = [
    {
        name: "Laptop",
        slug: "laptop",
        description: "MacBook Pro",
        price: 2000,
        quantity: 10,
        shipping: true,
    },
    {
        name: "Wireless Mouse",
        slug: "wireless-mouse",
        description: "Razer mouse",
        price: 25,
        quantity: 50,
        shipping: true,
    },
    {
        name: "USB Cable",
        slug: "usb-cable",
        description: "Apple USB-C cable",
        price: 15,
        quantity: 120,
        shipping: true,
    },
];

const [LAPTOP_PRODUCT, WIRELESS_MOUSE_PRODUCT] = SEARCH_PRODUCTS_FIXTURE;
const LAPTOP_KEYWORD = LAPTOP_PRODUCT.slug;
const WIRELESS_KEYWORD = WIRELESS_MOUSE_PRODUCT.slug.split("-")[0];

const seedSearchData = async () => {
    const testCategory = await categoryModel.create({
        name: "Electronics",
        slug: "electronics",
    });

    await productModel.insertMany(
        SEARCH_PRODUCTS_FIXTURE.map((product) => ({
            ...product,
            category: testCategory._id,
        })),
    );
};


describe("search flow integration test", () => {
    let server;
    let baseURL;
    const TEST_PORT = 3011;

    beforeAll(async () => {
        await connectTestDatabase();

        await new Promise((resolve) => {
            server = app.listen(TEST_PORT, () => {
                baseURL = `http://localhost:${TEST_PORT}`;
                resolve();
            });
        });
    });

    beforeEach(async () => {
        await clearTestData();
        await seedSearchData();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        delete axios.defaults.baseURL;
    });

    afterAll(async () => {
        await new Promise((resolve) => {
            if (!server) {
                resolve();
                return;
            }
            server.close(() => resolve());
        });

        await clearTestData();
        await disconnectTestDatabase();
    });

    describe("top-down incremental approach", () => {
        test("level 1: SearchInput + SearchContext with API stub", async () => {
            // start at the top-most module and verify SearchInput integrates with SearchContext
            // lower modules intentionally stubbed: API + router target page
            // variety: SearchInput is integrated with SearchContext state probe to verify cross-component state updates
            
            // Arrange
            const axiosSpy = jest.spyOn(axios, "get").mockResolvedValue({
                data: [{ _id: "p1", ...LAPTOP_PRODUCT }],
            });

            render(
                <SearchProvider>
                    <MemoryRouter>
                        <SearchInput />
                        <SearchStateProbe />
                    </MemoryRouter>
                </SearchProvider>,
            );

            // Act
            fireEvent.change(screen.getByPlaceholderText("Search"), {
                target: { value: LAPTOP_KEYWORD },
            });
            fireEvent.click(screen.getByRole("button", { name: "Search" }));

            // Assert
            await waitFor(() => {
                expect(axiosSpy).toHaveBeenCalledWith(`/api/v1/product/search/${LAPTOP_KEYWORD}`);
                expect(screen.getByTestId("probe-keyword")).toHaveTextContent(LAPTOP_KEYWORD);
                expect(screen.getByTestId("probe-results-count")).toHaveTextContent("1");
            });
        });


        test("level 2: Header + SearchInput + SearchContext adds navigation", async () => {
            // add one more integrated component, Header, which embeds SearchInput
            // lower modules stubbed: API payload
            // variety: Header integrated with SearchInput and route navigation probe to verify cross-component navigation behavior
        
            // Arrange
            jest.spyOn(axios, "get").mockResolvedValue({
                data: [{ _id: "p2", ...WIRELESS_MOUSE_PRODUCT }],
            });

            render(
                <SearchProvider>
                    <MemoryRouter initialEntries={["/"]}>
                        <Routes>
                            <Route
                                path="/"
                                element={
                                    <>
                                        <Header />
                                        <LocationProbe />
                                    </>
                                }
                            />
                            <Route
                                path="/search"
                                element={
                                    <>
                                        <SearchStateProbe />
                                        <LocationProbe />
                                    </>
                                }
                            />
                        </Routes>
                    </MemoryRouter>
                </SearchProvider>,
            );

            // Act
            fireEvent.change(screen.getByPlaceholderText("Search"), {
                target: { value: WIRELESS_KEYWORD },
            });
            fireEvent.click(screen.getByRole("button", { name: "Search" }));

            // Assert
            await waitFor(() => {
                expect(screen.getByTestId("location-probe")).toHaveTextContent("/search");
                expect(screen.getByTestId("probe-results-count")).toHaveTextContent("1");
            });
        });


        test("level 3: Header + Search page rendering with API stub", async () => {
            // add Search page rendering, with stubbed API to isolate frontend interactions
            // variety: Search page integrated with Header/SearchInput 

            // Arrange
            const level3Results = [
                { _id: "p1", ...LAPTOP_PRODUCT },
                {
                    _id: "p3",
                    name: `${LAPTOP_PRODUCT.name} Stand`,
                    slug: `${LAPTOP_PRODUCT.slug}-stand`,
                    description: "Aluminum stand",
                    price: 30,
                },
            ];
            jest.spyOn(axios, "get").mockResolvedValue({
                data: level3Results,
            });

            render(
                <SearchProvider>
                    <MemoryRouter initialEntries={["/"]}>
                        <Routes>
                            <Route path="/" element={<Header />} />
                            <Route path="/search" element={<Search />} />
                        </Routes>
                    </MemoryRouter>
                </SearchProvider>,
            );

            // Act
            fireEvent.change(screen.getByPlaceholderText("Search"), {
                target: { value: LAPTOP_KEYWORD },
            });
            fireEvent.click(screen.getByRole("button", { name: "Search" }));

            // Assert
            await waitFor(() => {
                expect(screen.getByText("Found 2")).toBeInTheDocument();
                expect(screen.getByText(LAPTOP_PRODUCT.name)).toBeInTheDocument();
                expect(screen.getByText(`${LAPTOP_PRODUCT.name} Stand`)).toBeInTheDocument();
            });
        });

        test("level 4: full search flow with real backend endpoint", async () => {
            // keep the same top-down UI entry point but replace the last stub with a live backend call
            // Header SearchInput -> SearchContext -> GET /product/search/:keyword -> route -> controller -> model -> Search render
            // variety: frontend components are integrated with real backend route/controller/model to verify cross-layer behavior
            
            // Arrange
            const backendClient = nodeAxios.create({ baseURL });
            jest
                .spyOn(axios, "get")
                .mockImplementation((url) => backendClient.get(url));

            render(
                <SearchProvider>
                    <MemoryRouter initialEntries={["/"]}>
                        <Routes>
                            <Route path="/" element={<Header />} />
                            <Route path="/search" element={<Search />} />
                        </Routes>
                    </MemoryRouter>
                </SearchProvider>,
            );

            // Act
            fireEvent.change(screen.getByPlaceholderText("Search"), {
                target: { value: LAPTOP_KEYWORD },
            });
            fireEvent.click(screen.getByRole("button", { name: "Search" }));

            // Assert
            await waitFor(() => {
                expect(screen.getByText("Found 1")).toBeInTheDocument();
                expect(screen.getByText(LAPTOP_PRODUCT.name)).toBeInTheDocument();
            });
            expect(screen.getByRole("img", { name: LAPTOP_PRODUCT.name })).toBeInTheDocument();
        });
    });
});
