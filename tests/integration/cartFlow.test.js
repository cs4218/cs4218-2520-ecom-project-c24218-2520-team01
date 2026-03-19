import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import HomePage from "../../client/src/pages/HomePage";
import CartPage from "../../client/src/pages/CartPage";
import Header from "../../client/src/components/Header";
import { CartProvider } from "../../client/src/context/cart";

// Integration test for cart flow:
// Homepage add-to-cart → CartContext → localStorage persistence 
// → CartPage totals → remove → badge updates

jest.mock("axios");

// stub auth to keep tests focused on cart flow integration 
jest.mock("../../client/src/context/auth", () => ({
		useAuth: () => [{ user: null, token: null }, jest.fn()]
}));

// stub unrelated dependencies to keep tests focused on cart flow integration
jest.mock("../../client/src/hooks/useCategory", () => jest.fn(() => []));
jest.mock("../../client/src/components/Form/SearchInput", () => () => (
		<div data-testid="search-input">Search Input</div>
));
jest.mock("../../client/src/components/Footer", () => () => <div data-testid="footer" />);
jest.mock("../../client/src/components/Layout", () => ({ children }) => (
		<div data-testid="layout">{children}</div>
));
jest.mock("react-hot-toast", () => ({
		__esModule: true,
		default: { success: jest.fn(), error: jest.fn() },
		Toaster: () => <div data-testid="toaster" />
}));

// stub payment widget since checkout UI is not in cart flow scope
jest.mock("braintree-web-drop-in-react", () => () => (
		<div data-testid="dropin" />
), { virtual: true });


const MOCK_PRODUCTS = [
		{
        _id: "p1",
        name: "Wireless Bluetooth Headphones",
        slug: "wireless-bluetooth-headphones",
        price: 100.0,
        description: "Noise-cancelling headphones"
		},
		{
        _id: "p2",
        name: "Unisex Cotton Shirt",
        slug: "unisex-cotton-shirt",
        price: 45.0,
        description: "Wwhite shirt"
		}
];

const mockAxiosForHomePage = () => {
    axios.get.mockImplementation((url) => {
        if (url === "/api/v1/category/get-category") {
            return Promise.resolve({ data: { success: true, category: [] } });
        }
        if (url === "/api/v1/product/product-count") {
            return Promise.resolve({ data: { total: MOCK_PRODUCTS.length } });
        }
        if (url.startsWith("/api/v1/product/product-list/")) {
            return Promise.resolve({ data: { products: MOCK_PRODUCTS } });
        }
        if (url === "/api/v1/product/braintree/token") {
            return Promise.resolve({ data: { clientToken: "mock-token" } });
        }
        return Promise.resolve({ data: {} });
    });
    axios.post.mockResolvedValue({ data: { products: [] } });
};

// Rachel Tai Ke Jia, A0258603A

describe("shopping cart full flow integration", () => {
    let consoleErrorSpy;

    beforeAll(() => {
        consoleErrorSpy = jest.spyOn(console, "error").mockImplementation((...args) => {
            if (String(args[0]).includes("ReactDOMTestUtils.act")) {
                return;
            }
            console.warn(...args);
        });
    });

    afterAll(() => {
        consoleErrorSpy.mockRestore();
    });

    beforeEach(() => {
        localStorage.clear();
        jest.clearAllMocks();
        mockAxiosForHomePage();
    });

    afterEach(() => {
        cleanup();
    });

    describe("top-down incremental approach", () => {
        test("level 1: HomePage and CartProvider adds item to cart", async () => {
            // start from HomePage (top module) and integrate with CartContext only,
            // while stubbing lower dependencies (API calls, categories, auth).
            // involves: HomePage, CartProvider, localStorage cart, mocked axios

            // Arrange
            render(
                <MemoryRouter>
                    <CartProvider>
                        <HomePage />
                    </CartProvider>
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getByText(MOCK_PRODUCTS[0].name)).toBeInTheDocument();
            });

            // Act
            const addToCartButtons = screen.getAllByText("ADD TO CART");
            fireEvent.click(addToCartButtons[0]);

            // Assert
            await waitFor(() => {
                const storedCart = JSON.parse(localStorage.getItem("cart"));
                expect(storedCart).toHaveLength(1);
                expect(storedCart[0]).toEqual(
                    expect.objectContaining({ _id: MOCK_PRODUCTS[0]._id, quantity: 1 })
                );
            });
        });

        test("level 2: HomePage and Header shows badge count", async () => {
            // add Header integration to validate badge update
            // variety: HomePage is integrated with Header, not only CartProvider
            // involves: HomePage, Header, CartProvider, localStorage cart, mocked axios

            // Arrange
            render(
              <MemoryRouter>
                  <CartProvider>
                    <>
                        <Header />
                        <HomePage />
                    </>
                  </CartProvider>
              </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getByText(MOCK_PRODUCTS[0].name)).toBeInTheDocument();
            });

            // Act
            const addToCartButtons = screen.getAllByText("ADD TO CART");
            fireEvent.click(addToCartButtons[0]);

            // Assert
            await waitFor(() => {
                expect(screen.getByTestId("cart-count")).toHaveTextContent("1");
            });
        });

        test("level 3: cart persists across refresh", async () => {
            // add persistence check after a simulated refresh
            // includes: HomePage, Header, CartProvider, localStorage cart, mocked axios

            // Arrange
            const { unmount } = render(
                <MemoryRouter>
                    <CartProvider>
                        <HomePage />
                    </CartProvider>
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getByText(MOCK_PRODUCTS[0].name)).toBeInTheDocument();
            });

            // Act
            const addToCartButtons = screen.getAllByText("ADD TO CART");
            fireEvent.click(addToCartButtons[0]);
            unmount();
            render(
                <MemoryRouter>
                    <CartProvider>
                        <Header />
                    </CartProvider>
                </MemoryRouter>
            );

            // Assert
            await waitFor(() => {
                const storedCart = JSON.parse(localStorage.getItem("cart"));
                expect(storedCart).toHaveLength(1);
                expect(screen.getByTestId("cart-count")).toHaveTextContent("1");
            });
        });
    });


    describe("bottom-up incremental approach", () => {
        test("level 1: CartPage reads cart and calculates total", async () => {
          // start from CartContext (bottom module) and integrate upward with CartPage
          // real CartContext and localStorage are used; auth is stubbed
          // involves: CartPage, CartProvider, localStorage cart, mocked axios

          // Arrange
          localStorage.setItem(
              "cart",
              JSON.stringify([
                  { _id: MOCK_PRODUCTS[0]._id, name: MOCK_PRODUCTS[0].name, price: MOCK_PRODUCTS[0].price, quantity: 2 },
                  { _id: MOCK_PRODUCTS[1]._id, name: MOCK_PRODUCTS[1].name, price: MOCK_PRODUCTS[1].price, quantity: 1 }
              ])
          );

          render(
              <MemoryRouter>
                  <CartProvider>
                      <CartPage />
                  </CartProvider>
              </MemoryRouter>
          );

          // Act
          await waitFor(() => {
              expect(screen.getByText(/Total : \$245\.00/)).toBeInTheDocument();
          });

          // Assert
          expect(screen.getByText(/Total : \$245\.00/)).toBeInTheDocument();
        });

        test("level 2: remove item updates total and localStorage", async () => {
            // add Header integration to verify badge update after remove
            // variety: CartPage is integrated with another component (Header) to verify cross-component behavior
            // includes: CartPage, Header, CartProvider, localStorage cart, mocked axios

            // Arrange
            localStorage.setItem(
                "cart",
                JSON.stringify([
                    { _id: MOCK_PRODUCTS[0]._id, name: MOCK_PRODUCTS[0].name, price: MOCK_PRODUCTS[0].price, quantity: 2 },
                    { _id: MOCK_PRODUCTS[1]._id, name: MOCK_PRODUCTS[1].name, price: MOCK_PRODUCTS[1].price, quantity: 1 }
                ])
            );

            render(
              <MemoryRouter>
                  <CartProvider>
                      <>
                          <Header />
                          <CartPage />
                      </>
                  </CartProvider>
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getByText(/Total : \$245\.00/)).toBeInTheDocument();
            });

            // Act
            const removeButtons = await screen.findAllByText("Remove");
            fireEvent.click(removeButtons[0]);

            // Assert
            await waitFor(() => {
                const storedCart = JSON.parse(localStorage.getItem("cart"));
                expect(storedCart).toHaveLength(1);
                expect(screen.getByText(/Total : \$45\.00/)).toBeInTheDocument();
                expect(screen.getByTestId("cart-count")).toHaveTextContent("1");
            });
        });

        test("level 3: removing last item shows empty state", async () => {
            // add empty cart handling after removing last item
            // includes: CartPage, CartProvider, localStorage cart, mocked axios

            // Arrange
            localStorage.setItem(
                "cart",
                JSON.stringify([
                    { _id: MOCK_PRODUCTS[0]._id, name: MOCK_PRODUCTS[0].name, price: MOCK_PRODUCTS[0].price, quantity: 1 }
                ])
            );

            render(
                <MemoryRouter>
                    <CartProvider>
                        <CartPage />
                    </CartProvider>
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getByText(/Total : \$100\.00/)).toBeInTheDocument();
            });

            // Act
            const removeButtons = await screen.findAllByText("Remove");
            fireEvent.click(removeButtons[0]);

            // Assert
            await waitFor(() => {
                const storedCart = JSON.parse(localStorage.getItem("cart"));
                expect(storedCart).toHaveLength(0);
                expect(screen.getByText(/Your Cart Is Empty/i)).toBeInTheDocument();
                expect(screen.getByText(/Total : \$0\.00/)).toBeInTheDocument();
            });
        });
    });


    describe("sandwich incremental approach", () => {
        test("top and bottom modules converge at CartProvider state", async () => {
            // top layer: HomePage and Header
            // bottom layer: CartPage with existing localStorage
            // target layer: CartProvider shared state observed by both top and bottom layers
            // variety: Combines HomePage, CartPage, and Header
            // includes: HomePage, CartPage, Header, CartProvider, localStorage cart, mocked axios

            // Arrange
            localStorage.setItem(
                "cart",
                JSON.stringify([{ _id: MOCK_PRODUCTS[1]._id, name: MOCK_PRODUCTS[1].name, price: MOCK_PRODUCTS[1].price, quantity: 1 }])
            );

            render(
                <MemoryRouter>
                    <CartProvider>
                        <>
                            <Header />
                            <HomePage />
                            <CartPage />
                        </>
                    </CartProvider>
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getAllByText("ADD TO CART").length).toBeGreaterThan(0);
                expect(screen.getByText(/Total : \$45\.00/)).toBeInTheDocument();
            });

            // Act
            fireEvent.click(screen.getAllByText("ADD TO CART")[0]);
            fireEvent.click((await screen.findAllByText("Remove"))[0]);

            // Assert
            await waitFor(() => {
                const storedCart = JSON.parse(localStorage.getItem("cart"));
                expect(storedCart).toHaveLength(1);
                expect(storedCart[0]).toEqual(expect.objectContaining({ _id: MOCK_PRODUCTS[0]._id, price: MOCK_PRODUCTS[0].price, quantity: 1 }));
                expect(screen.getByText(/Total : \$100\.00/)).toBeInTheDocument();
                expect(screen.getByTestId("cart-count")).toHaveTextContent("1");
            });
        });
    });

    describe("big bang approach", () => {
        test("full cart feature flow with all cart-related modules integrated together", async () => {
            // integrate HomePage + Header + CartPage + CartProvider in one setup (no incremental layering)
            // all cart feature modules are active together; only external service dependencies are stubbed
            // variety: Validates the same cart behavior across all key cart-facing components simultaneously
            // includes: HomePage, Header, CartPage, CartProvider, localStorage cart, mocked axios

            // Arrange
            render(
                <MemoryRouter>
                    <CartProvider>
                        <>
                            <Header />
                            <HomePage />
                            <CartPage />
                        </>
                    </CartProvider>
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getByText("Wireless Bluetooth Headphones")).toBeInTheDocument();
            });

            // Act
            fireEvent.click(screen.getAllByText("ADD TO CART")[0]);
            fireEvent.click((await screen.findAllByText("Remove"))[0]);

            // Assert
            await waitFor(() => {
                const storedCart = JSON.parse(localStorage.getItem("cart"));
                expect(storedCart).toHaveLength(0);
                expect(screen.getByText(/Your Cart Is Empty/i)).toBeInTheDocument();
                expect(screen.getByText(/Total : \$0\.00/)).toBeInTheDocument();
            });
        });
    });
});
