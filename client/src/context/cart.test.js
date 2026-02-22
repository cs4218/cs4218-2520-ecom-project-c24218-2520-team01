import React from 'react';
import { render, act } from '@testing-library/react';
import { CartProvider, useCart } from "./cart";

// Mock data of products
const MOCK_PRODUCT_A = {
    _id: 21,
    name: 'Mouse',
    price: 40.50
};

const MOCK_PRODUCT_B = {
    _id: 22,
    name: 'Keyboard',
    price: 120.00
};

const MOCK_CART_WITH_TWO_ITEMS = [
    { ...MOCK_PRODUCT_A, quantity: 3 },
    { ...MOCK_PRODUCT_B, quantity: 1 }
];

const MOCK_CART_SINGLE_ITEM = [
    { ...MOCK_PRODUCT_A, quantity: 1 }
];

// Mock consumer for cart context
const CartConsumer = ({ capture }) => {
    const context = useCart();
    capture.current = context;
    return null;
};

// Helper to render cart context
const renderCart = () => {
    const capture = { current: null };
    const utils = render(
        <CartProvider>
            <CartConsumer capture={capture} />
        </CartProvider>
    );
    return { 
        utils, 
        getContext: () => capture.current 
    };
};

// Mock localStorage
const mockLocalStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true
});


// Rachel Tai Ke Jia, A0258603A
describe('unit tests for cart context', () => {
    afterEach(() => {
        jest.clearAllMocks();
        mockLocalStorage.getItem.mockReset();
        mockLocalStorage.setItem.mockReset();
    });


    test('cart state is empty when local storage has nothing', () => {
        // Arrange
        mockLocalStorage.getItem.mockReturnValue(null);

        // Act
        const { getContext } = renderCart();

        // Assert
        expect(getContext().cart).toEqual([]);
        expect(mockLocalStorage.getItem).toHaveBeenCalledWith('cart');
    });


    test('retrieve cart state from local storage', () => {
        // Arrange
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify(MOCK_CART_WITH_TWO_ITEMS));

        // Act
        const { getContext } = renderCart();

        // Assert
        expect(getContext().cart).toEqual(MOCK_CART_WITH_TWO_ITEMS);
    });


    describe('add to cart', () => {
        test('add item to cart with quantity=1', () => {
            // Arrange
            mockLocalStorage.getItem.mockReturnValue(null);
            const { getContext } = renderCart();

            // Act
            act(() => {
                getContext().addToCart(MOCK_PRODUCT_A);
            });

            // Assert
            expect(getContext().cart).toEqual(
                [{ ...MOCK_PRODUCT_A, quantity: 1 }]
            );
        });


        test('increase quantity for existing item in cart', () => {
            // Arrange
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(MOCK_CART_WITH_TWO_ITEMS));
            const { getContext } = renderCart();

            // Act
            act(() => {
                getContext().addToCart(MOCK_PRODUCT_A); 
            });

            // Assert
            expect(getContext().cart).toEqual([
                { ...MOCK_PRODUCT_A, quantity: 4 },
                { ...MOCK_PRODUCT_B, quantity: 1 }
            ]);
        });


        test('increase quantity of item from 0 to 1', () => {
            // Arrange
            const cartWithZeroQuantity = [
                { ...MOCK_PRODUCT_A, quantity: 0 },
                { ...MOCK_PRODUCT_B, quantity: 2 }
            ];
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(cartWithZeroQuantity));
            const { getContext } = renderCart();

            // Act
            act(() => {
                getContext().addToCart(MOCK_PRODUCT_A);
            });

            // Assert
            expect(getContext().cart).toEqual([
                { ...MOCK_PRODUCT_A, quantity: 1 },
                { ...MOCK_PRODUCT_B, quantity: 2 }
            ]);
        });
    });

    describe('remove cart item', () => {
        test('remove existing product from cart by _id', () => {
            // Arrange
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(MOCK_CART_WITH_TWO_ITEMS));
            const { getContext } = renderCart();

            // Act
            act(() => {
                getContext().removeCartItem(MOCK_PRODUCT_A._id);
            });

            // Assert
            expect(getContext().cart).toEqual([
                { ...MOCK_PRODUCT_B, quantity: 1 }
            ]);
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                'cart',
                JSON.stringify([
                    { ...MOCK_PRODUCT_B, quantity: 1 }
                ])
            );
        });


        test('removing the last item from the cart clears the cart', () => {
            // Arrange
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(MOCK_CART_SINGLE_ITEM));
            const { getContext } = renderCart();

            // Act
            act(() => {
                getContext().removeCartItem(MOCK_PRODUCT_A._id);
            });

            // Assert
            expect(getContext().cart).toEqual([]);
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('cart', '[]');
        });


        test('log error when removing cart item', () => {
            // Arrange
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(MOCK_CART_WITH_TWO_ITEMS));
            mockLocalStorage.setItem.mockImplementation(() => {
                throw new Error("Error removing cart item");
            });
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            const { getContext } = renderCart();

            // Act
            act(() => {
                getContext().removeCartItem(MOCK_PRODUCT_A._id);
            });

            // Assert
            expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));

            // Cart still updated (setCart occurs before try-catch)
            expect(getContext().cart).toEqual([
                { ...MOCK_PRODUCT_B, quantity: 1 }
            ]);

            consoleSpy.mockRestore();
        });
    });
});