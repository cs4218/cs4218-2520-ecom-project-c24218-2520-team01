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

// Rachel Tai Ke Jia, A0258603A
describe("Unit Test for ProductDetails Component", () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });


    test("getProduct and getSimilarProduct call APIs when slug is provided", async () => {
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


    test("Display product details correctly", async () => {
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


    test("Adding product to cart updates localStorage and shows toast", async () => {
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
        const localStorageSetItemSpy = jest.spyOn(Storage.prototype, "setItem");
        render(
            <MemoryRouter>
                <ProductDetails />
            </MemoryRouter>
        );
        // Wait for buttons to appear
        const addToCartButtons = await screen.findAllByText("ADD TO CART");

        // Act
        fireEvent.click(addToCartButtons[0]);

        // Assert
        expect(localStorageSetItemSpy).toHaveBeenCalledWith(
            "cart",
            JSON.stringify([product])
        );
        expect(toast.success).toHaveBeenCalledWith("Item Added to cart");

        localStorageSetItemSpy.mockRestore();
    });


    test("Shows related products", async () => {
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


    test("More Details button navigates to product page", async () => {
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


    test("Adding related product to cart button updates localStorage and shows toast", async () => {
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
        const localStorageSetItemSpy = jest.spyOn(Storage.prototype, "setItem");
        render(
            <MemoryRouter>
                <ProductDetails />
            </MemoryRouter>
        );
        await screen.findByText(relatedProduct.name);
        const addToCartButtons = await screen.findAllByText("ADD TO CART");

        // Act
        fireEvent.click(addToCartButtons[1]);

        // Assert
        expect(localStorageSetItemSpy).toHaveBeenCalledWith(
            "cart",
            expect.stringContaining(JSON.stringify(relatedProduct))
        );
        expect(toast.success).toHaveBeenCalledWith("Item Added to cart");

        localStorageSetItemSpy.mockRestore();
    });


    test("Shows No Similar Products found message", async () => {
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


    test("Handles error when getProduct is unsuccessful", async () => {
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


    test("Handles error when getSimilarProduct is unsuccessful", async () => {
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


    test("No API called when there is no slug", async () => {
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
