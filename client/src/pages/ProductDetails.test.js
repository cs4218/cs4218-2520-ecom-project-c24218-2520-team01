import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { newState } from "../test/searchTestUtils";
import ProductDetails from "./ProductDetails";

// Mock axios
jest.mock("axios");

// Mock layout
jest.mock("./../components/Layout", () => ({ children }) => (
    <div data-testid="layout">{children}</div>
));

// Mock react router dom hooks
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useParams: () => ({ slug: "test-product" }),
    useNavigate: () => mockNavigate
}));

// Mock toast
jest.mock("react-toastify", () => ({
    toast: {
        success: jest.fn()
    }
}));

// Mock useCart hook
jest.mock('../context/cart', () => {
  const originalModule = jest.requireActual('../context/cart');

  return {
    ...originalModule, 
    useCart: jest.fn()
  };
});

// Mock addToCart
const mockAddToCart = jest.fn()


// Rachel Tai Ke Jia, A0258603A
describe("unit test for product details component", () => {

    beforeEach(() => {
        jest.clearAllMocks();
        require('../context/cart').useCart.mockReturnValue({
            cart: [],
            addToCart: mockAddToCart
        });
    });


    test("getproduct and getsimilarproduct call api when slug is provided", async () => {
        // Arrange
        const product = newState.results[0];
        const relatedProduct = newState.results[1];

        axios.get
            .mockResolvedValueOnce({
                data: {
                    success: true,
                    message: "Single Product Fetched",
                    product: product
                }
            })
            .mockResolvedValueOnce({
                data: {
                    success: true,
                    products: [relatedProduct]
                }
            });

        // Act
        render(
            <MemoryRouter>
                <ProductDetails />
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledTimes(2);
        });
        expect(axios.get).toHaveBeenCalledWith(
            `/api/v1/product/get-product/test-product`
        );
        expect(axios.get).toHaveBeenCalledWith(
            `/api/v1/product/related-product/${product._id}/${product.category._id}`        
        );
    });


    test("display product details correctly", async () => {
        // Arrange
        const product = newState.results[0];

        axios.get
            .mockResolvedValueOnce({
                data: {
                    success: true,
                    message: "Single Product Fetched",
                    product: product
                }
            })
            .mockResolvedValueOnce({
                data: {
                    success: true,
                    products: []
                }
            });

        // Act
        render(
            <MemoryRouter>
                <ProductDetails />
            </MemoryRouter>
        );

        // Assert
        await screen.findByText("Product Details");
        expect(screen.getByText(`Name: ${product.name}`)).toBeInTheDocument();
        expect(screen.getByText(`Description: ${product.description}`)).toBeInTheDocument();
        const formattedPrice = product.price.toLocaleString("en-US", {
            style: "currency",
            currency: "USD"
        });
        const price = screen.getByText(/Price:/);
        expect(price).toHaveTextContent(formattedPrice);        
        expect(screen.getByText(`Category: ${product.category.name}`)).toBeInTheDocument();
    });


    test("shows related products", async () => {
        // Arrange
        const product = newState.results[0];
        const relatedProduct = newState.results[1];
        axios.get
            .mockResolvedValueOnce({
                data: {
                    success: true,
                    message: "Single Product Fetched",
                    product: product
                },
            })
            .mockResolvedValueOnce({
                data: {
                    success: true,
                    products: [relatedProduct]
                }
            });

        // Act
        render(
            <MemoryRouter>
                <ProductDetails />
            </MemoryRouter>
        );

        // Assert
        await screen.findByText("Similar Products");
        await screen.findByText(relatedProduct.name);
        expect(screen.getByText(relatedProduct.name)).toBeInTheDocument();
        const formattedPrice = relatedProduct.price.toLocaleString("en-US", {
            style: "currency",
            currency: "USD"
        });
        expect(screen.getByText(formattedPrice)).toBeInTheDocument();
    });


    test("more details button navigates to product page", async () => {
        // Arrange
        const product = newState.results[0];
        const relatedProduct = newState.results[1];
        axios.get
            .mockResolvedValueOnce({
                data: {
                    success: true,
                    message: "Single Product Fetched",
                    product: product
                },
            })
            .mockResolvedValueOnce({
                data: {
                    success: true,
                    products: [relatedProduct]
                }
            });
        render(
            <MemoryRouter>
                <ProductDetails />
            </MemoryRouter>
        );
        const button = await screen.findByText("More Details");

        // Act
        fireEvent.click(button);

        // Assert
        expect(mockNavigate).toHaveBeenCalledWith(`/product/${relatedProduct.slug}`);    
    });


    test("add product to cart button updates cart context and shows toast", async () => {
        // Arrange
        const product = newState.results[0];
        axios.get
            .mockResolvedValueOnce({
                data: {
                    success: true,
                    message: "Single Product Fetched",
                    product: product
                },
            })
            .mockResolvedValueOnce({
                data: {
                    success: true,
                    products: []
                }
            });
        render(
            <MemoryRouter>
                <ProductDetails />
            </MemoryRouter>
        );
        const addToCartButtons = await screen.findAllByText("ADD TO CART");
        expect(addToCartButtons).toHaveLength(1);
        expect(addToCartButtons[0]).toBeVisible();

        // Act
        fireEvent.click(addToCartButtons[0]);

        // Assert
        await waitFor(() => {
            expect(mockAddToCart).toHaveBeenCalledTimes(1);
            expect(mockAddToCart).toHaveBeenCalledWith(product);
            expect(toast.success).toHaveBeenCalledWith("Item Added to cart");
        });
    });

    test("add related product to cart button update cart context and shows toast", async () => {
        // Arrange
        const product = newState.results[0];
        const relatedProduct = newState.results[1];
        axios.get
            .mockResolvedValueOnce({
                data: {
                    success: true,
                    message: "Single Product Fetched",
                    product: product
                },
            })
            .mockResolvedValueOnce({
                data: {
                    success: true,
                    products: [relatedProduct]
                }
            });
        render(
            <MemoryRouter>
                <ProductDetails />
            </MemoryRouter>
        );
        await screen.findByText(relatedProduct.name); // wait for related card
        const addToCartButtons = await screen.findAllByText("ADD TO CART");
        expect(addToCartButtons).toHaveLength(2);

        // Act
        fireEvent.click(addToCartButtons[1]);

        // Assert
        await waitFor(() => {
            expect(mockAddToCart).toHaveBeenCalledTimes(1);
            expect(mockAddToCart).toHaveBeenCalledWith(relatedProduct);
            expect(toast.success).toHaveBeenCalledWith("Item Added to cart");
        });
    });


    test("shows no similar products found message", async () => {
        // Arrange
        const product = newState.results[0];
        axios.get
            .mockResolvedValueOnce({
                data: {
                    success: true,
                    message: "Single Product Fetched",
                    product: product
                },
            })
            .mockResolvedValueOnce({
                data: {
                    success: true,
                    products: []
                }
            });

        // Act
        render(
            <MemoryRouter>
                <ProductDetails />
            </MemoryRouter>
        );

        // Assert
        expect(
            await screen.findByText("No Similar Products found")
        ).toBeInTheDocument();
    });


    test("handles error when getproduct is unsuccessful", async () => {
        // Arrange
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
        axios.get
            .mockRejectedValueOnce(new Error("Failed to fetch product"))

        // Act
        render(
            <MemoryRouter>
                <ProductDetails />
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledTimes(1);
            expect(consoleSpy).toHaveBeenCalledWith(
                "Failed to fetch product", new Error("Failed to fetch product")
            );
        });
        
        consoleSpy.mockRestore();
    });


    test("handles error when getsimilarproduct is unsuccessful", async () => {
        // Arrange
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
        const product = newState.results[0];
        axios.get
            .mockResolvedValueOnce({
                data: { 
                    success: true, 
                    product: product
                }
            })
            .mockRejectedValueOnce(new Error("Network error"));
        
        // Act
        render(
            <MemoryRouter>
                <ProductDetails />
            </MemoryRouter>
        );
        await screen.findByText("Product Details");

        // Assert
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledTimes(1);
            expect(consoleSpy).toHaveBeenCalledWith(
                "Failed to fetch related products",new Error("Network error")
            );
        });

        consoleSpy.mockRestore();
    });


    test("api not called when there is no slug", async () => {
        // Arrange
        jest.spyOn(require("react-router-dom"), "useParams")
            .mockReturnValue({ slug: undefined });

        // Act
        render(
            <MemoryRouter>
                <ProductDetails />
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => {
            expect(axios.get).not.toHaveBeenCalled();
        });
    });

});
