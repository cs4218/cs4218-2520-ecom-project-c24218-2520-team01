import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import CategoryProduct from './CategoryProduct';

// Rachel Tai Ke Jia, A0258603A

// Mock dependencies
jest.mock('axios');

// Mock toast
jest.mock("react-toastify", () => ({
    toast: {
        success: jest.fn()
    }
}));

// Mock useCart hook to return empty cart and a mock setCart function
jest.mock('../context/cart', () => ({
    useCart: jest.fn(() => [[], jest.fn()])
}));

// Mock react router dom hooks
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useParams: () => ({ slug: "test-product" }),
    useNavigate: () => mockNavigate
}));

// Mock layout
jest.mock('../components/Layout', () => ({ children }) => (
    <div data-testid="layout">{children}</div>
));

// Mock local storage
const mockLocalStorage = {
    getItem: jest.fn(() => null),
    setItem: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true
});

// Stub data for API responses
const mockApiResponse = {
    success: true,
    category: { name: 'Clothing', slug: 'clothing' },
    products: [
        {
            _id: 's1',
            name: 'Unisex Cotton Shirt',
            slug: 'unisex-cotton-shirt',
            price: 50,
            description: 'Comfortable, breathable white shirt'
        },
        {
            _id: 's2',
            name: 'Collared Denim Shirt',
            slug: 'collared-denim-shirt',
            price: 80,
            description: 'Stylish blue shirt'
        }
    ],
};

const mockEmptyResponse = {
    success: true,
    category: { name: '' },
    products: []
};

// helper to render CategoryProduct component with router context
const renderCategoryProduct = (slug = 'clothing') => {
  return render(
    <MemoryRouter initialEntries={[`/categories/${slug}`]}>
        <Routes>
            <Route path="/categories/:slug" element={<CategoryProduct />} />
        </Routes>
    </MemoryRouter>
  );
};


describe('unit test for categoryproduct', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        axios.get.mockReset();
        mockLocalStorage.getItem.mockReturnValue(null);
        mockLocalStorage.setItem.mockClear();
    });


    test('displays category name, count, and product details', async () => {
        // Arrange
        axios.get.mockResolvedValueOnce({ data: mockApiResponse });

        // Act
        renderCategoryProduct();

        // Assert
        await waitFor(() => {
            expect(screen.getByText(`Category - ${mockApiResponse.category.name}`)).toBeInTheDocument();
            expect(screen.getByText(`${mockApiResponse.products.length} result found`)).toBeInTheDocument();
            expect(screen.getByText(mockApiResponse.products[0].name)).toBeInTheDocument();
            expect(screen.getByText(mockApiResponse.products[1].name)).toBeInTheDocument();
        });
    });


    test('shows no product when there is 0 product', async () => {
        // Arrange
        axios.get.mockResolvedValueOnce({ data: mockEmptyResponse });

        // Act
        renderCategoryProduct();

        // Assert
        await waitFor(() => {
            expect(screen.getByText(/Category -/)).toBeInTheDocument();
            expect(screen.getByText(/0 result found/)).toBeInTheDocument();
        });
    });


    test('formats product price in USD currency', async () => {
        // Arrange
        axios.get.mockResolvedValueOnce({ data: mockApiResponse });

        // Act
        renderCategoryProduct();

        // Assert
        await waitFor(() => {
            for (const product of mockApiResponse.products) {
                const formattedPrice = product.price.toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD"
                });
                expect(screen.getByText(formattedPrice)).toBeInTheDocument();
            }
        });
    });


    test('truncates product description to 60 characters', async () => {
        // Arrange
        const response = {
            ...mockApiResponse,
            products: [
                {
                    ...mockApiResponse.products[0],
                    description: 'y'.repeat(100)
                },
            ],
        };
        axios.get.mockResolvedValueOnce({ data: response });

        // Act
        renderCategoryProduct();

        // Assert
        await waitFor(() => {
            const text = screen.getByText('y'.repeat(60) + '...');
            expect(text).toBeInTheDocument();
        });
    });


    test('more details button navigates to product detail page', async () => {
        // Arrange
        axios.get.mockResolvedValueOnce({ data: mockApiResponse });

        // Act
        renderCategoryProduct();
        await waitFor(() => {
            fireEvent.click(screen.getAllByText('More Details')[0]);
        });

        // Assert
        expect(mockNavigate).toHaveBeenCalledWith(`/product/${mockApiResponse.products[0].slug}`);
    });


    describe("add to cart updates cart context and shows toast", () => {
        let mockSetCart;
        beforeEach(() => {
            // Mock useCart to return empty cart and a mock setCart function
            mockSetCart = jest.fn();
            require("../context/cart").useCart.mockReturnValue([[], mockSetCart]);
        });

        test("add product to cart", async () => {
            // Arrange
            const product = mockApiResponse.products[0];
            axios.get.mockResolvedValueOnce({ data: mockApiResponse });
            const localStorageSetItemSpy = jest.spyOn(mockLocalStorage, "setItem");
            renderCategoryProduct();
            const addToCartButtons = await screen.findAllByText("ADD TO CART");
            expect(addToCartButtons).toHaveLength(2);
            expect(addToCartButtons[0]).toBeVisible();

            // Act
            fireEvent.click(addToCartButtons[0]);

            // Assert
            await waitFor(() => {
                expect(mockSetCart).toHaveBeenCalledWith([product]);
                expect(toast.success).toHaveBeenCalledWith("Item Added to cart");
            });
            expect(localStorageSetItemSpy).toHaveBeenCalledWith(
                "cart",
                JSON.stringify([product])
            );
            localStorageSetItemSpy.mockRestore();
        });

        test("add another product to cart", async () => {
            // Arrange
            const product = mockApiResponse.products[0];
            const secondProduct = mockApiResponse.products[1];
            axios.get.mockResolvedValueOnce({ data: mockApiResponse });

            const localStorageSetItemSpy = jest.spyOn(mockLocalStorage, "setItem");
            renderCategoryProduct();
            await screen.findByText(secondProduct.name);
            const addToCartButtons = await screen.findAllByText("ADD TO CART");
            expect(addToCartButtons).toHaveLength(2);

            // Act
            fireEvent.click(addToCartButtons[1]);

            // Assert
            await waitFor(() => {
                expect(mockSetCart).toHaveBeenCalledTimes(1);
                expect(mockSetCart).toHaveBeenCalledWith([secondProduct]);
                expect(toast.success).toHaveBeenCalledWith("Item Added to cart");
            });
            expect(localStorageSetItemSpy).toHaveBeenCalledWith(
                "cart",
                JSON.stringify([secondProduct])
            );
            localStorageSetItemSpy.mockRestore();
        });
    });


    test('catches axios errors', async () => {
        // Arrange
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
        axios.get.mockRejectedValueOnce(new Error('Network error'));

        // Act
        renderCategoryProduct();

        // Assert
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledTimes(1);
            expect(consoleSpy).toHaveBeenCalledWith(new Error('Network error'));
            expect(screen.getByText(/Category -/)).toBeInTheDocument();
            expect(screen.getByText(/result found/)).toBeInTheDocument();
        });
        consoleSpy.mockRestore();
    });


    test("api not called when there is no slug", async () => {
        // Arrange
        jest.spyOn(require("react-router-dom"), "useParams")
            .mockReturnValue({ slug: undefined });

        // Act
        renderCategoryProduct()

        // Assert
        await waitFor(() => {
            expect(axios.get).not.toHaveBeenCalled();
        });
    });

});