/**
* AI Usage Declaration
*
* Tool Used: Github Copilot
*
* Prompt: What are the edge cases to include in order to achieve 100% code coverage for CartPage component?
*
* How the AI Output Was Used:
* - Used the AI output as a reference to create tests for CartPage component
* - Reviewed and modified the suggested scenarios to fit the specific implementation of the CartPage component
*/

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import toast from "react-hot-toast";
import CartPage, { calculateTotalPrice } from "./CartPage";

const MOCK_PRODUCT_1 = {
    _id: "product1",
    name: "Test Product 1",
    description: "This is a test product description for product 1",
    price: 99.99,
    quantity: 2
};

const MOCK_PRODUCT_2 = {
    _id: "product2",
    name: "Test Product 2",
    description: "This is a test product description for product 2",
    price: 49.99,
    quantity: 1
};

const MOCK_PRODUCT_WITHOUT_QUANTITY = {
    _id: "product3",
    name: "Test Product 3",
    description: "This is a test product description for product 3",
    price: 25.00
};

const MOCK_CART_WITH_ITEMS = [MOCK_PRODUCT_1, MOCK_PRODUCT_2];
const MOCK_CART_SINGLE_ITEM = [MOCK_PRODUCT_1];
const MOCK_EMPTY_CART = [];

const MOCK_AUTH_USER = {
    user: {
        name: "Adam",
        address: "Street 51, Singapore"
    },
    token: "mock-auth-token"
};

const MOCK_AUTH_USER_NO_ADDRESS = {
    user: {
        name: "Tom"
    },
    token: "mock-auth-token"
};

const MOCK_AUTH_GUEST = {
    user: null,
    token: null
};

const MOCK_CLIENT_TOKEN = "mock-braintree-client-token";

const MOCK_PAYMENT_NONCE = "mock-payment-nonce";

const MOCK_BRAINTREE_INSTANCE = {
    requestPaymentMethod: jest.fn()
};

// variable controls if Braintree provides an instance
let mockShouldProvideBraintreeInstance = true;

// mock external dependencies and context
jest.mock("axios");

jest.mock("react-hot-toast");

jest.mock("react-router-dom", () => ({
    useNavigate: jest.fn()
}));

jest.mock("../context/cart", () => ({
    useCart: jest.fn()
}));

jest.mock("../context/auth", () => ({
    useAuth: jest.fn()
}));

jest.mock("./../components/Layout", () => ({ children }) => <div data-testid="layout">{children}</div>);

// mock Braintree DropIn component to control instance provision
jest.mock("braintree-web-drop-in-react", () => {
    const React = require("react");
    return ({ onInstance }) => {
        React.useEffect(() => {
            if (onInstance && mockShouldProvideBraintreeInstance) {
                onInstance(MOCK_BRAINTREE_INSTANCE);
            }
        }, [onInstance]);
        return <div data-testid="braintree-dropin" />;
    };
});

const mockedAxios = axios;
const mockedToast = toast;

// Rachel Tai Ke Jia, A0258603A
describe("unit test for calculateTotalPrice function", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });


    test("calculate total price correctly for cart with quantities", () => {
        // Arrange
        const cart = MOCK_CART_WITH_ITEMS;

        // Act
        const result = calculateTotalPrice(cart);

        // Assert
        expect(result).toBe("$249.97"); // 99.99*2 + 49.99
    });

    test("use default quantity of 1 if quantity is missing", () => {
        // Arrange
        const cart = [MOCK_PRODUCT_WITHOUT_QUANTITY];

        // Act
        const result = calculateTotalPrice(cart);

        // Assert
        expect(result).toBe("$25.00");
    });

    test("return $0.00 if cart is empty", () => {
        // Arrange
        const cart = MOCK_EMPTY_CART;

        // Act
        const result = calculateTotalPrice(cart);

        // Assert
        expect(result).toBe("$0.00");
    });

    test("return $0.00 for undefined cart parameter", () => {
        // Act 
        // Call function without parameters
        const result = calculateTotalPrice();

        // Assert
        expect(result).toBe("$0.00");
    });

    test("return $0.00 if price is NaN (invalid)", () => {
        // Arrange
        const invalidCart = [{ price: undefined, quantity: 2 }];

        // Act 
        const result = calculateTotalPrice(invalidCart);

        // Assert
        expect(result).toBe("$0.00");
        expect(console.log).toHaveBeenCalledWith("Invalid total calculated");
    });

    test("$0.00 when calculation fails", () => {
        const invalidCart = "not an array";

        // Act 
        const result = calculateTotalPrice(invalidCart);

        // Assert 
        expect(result).toBe("$0.00");
        expect(console.log).toHaveBeenCalled();
    });
});


describe("unit tests for cartpage component", () => {
    // stubs to mock return values for consistent testing
    let mockNavigate;
    let mockUseCart;
    let mockUseAuth;
    let mockSetAuth;
    let mockSetCart;
    let mockRemoveCartItem;

    beforeEach(() => {
        // Arrange 
        mockNavigate = jest.fn();
        mockSetAuth = jest.fn();
        mockSetCart = jest.fn();
        mockRemoveCartItem = jest.fn();

        // reset Braintree instance provision
        mockShouldProvideBraintreeInstance = true;

        mockUseCart = {
            cart: MOCK_CART_WITH_ITEMS,
            setCart: mockSetCart,
            removeCartItem: mockRemoveCartItem
        };

        mockUseAuth = [MOCK_AUTH_USER, mockSetAuth];

        require("react-router-dom").useNavigate.mockReturnValue(mockNavigate);
        require("../context/cart").useCart.mockReturnValue(mockUseCart);
        require("../context/auth").useAuth.mockReturnValue(mockUseAuth);

        // mock axios responses
        mockedAxios.get.mockResolvedValue({
            data: { clientToken: MOCK_CLIENT_TOKEN }
        });
        mockedAxios.post.mockResolvedValue({
            data: { success: true }
        });

        // mock toast notifications
        mockedToast.success = jest.fn();
        mockedToast.error = jest.fn();

        // mock localStorage
        Object.defineProperty(window, 'localStorage', {
            value: {
                removeItem: jest.fn(),
            },
            writable: true
        });

        // mock Braintree instance
        MOCK_BRAINTREE_INSTANCE.requestPaymentMethod.mockResolvedValue({
            nonce: MOCK_PAYMENT_NONCE
        });

        jest.clearAllMocks();
    });


    describe("state-based testing of component rendering and state", () => {
        test("display cart page with authenticated user and items", async () => {
            // Arrange (in beforeEach)

            // Act 
            render(<CartPage />);
            await waitFor(() => {
                expect(mockedAxios.get).toHaveBeenCalled();
            });

            // Assert
            expect(screen.getByTestId("layout")).toBeInTheDocument();
            expect(screen.getByText(`Hello ${MOCK_AUTH_USER.user.name}`)).toBeInTheDocument();
            expect(screen.getByText("You Have 2 items in your cart")).toBeInTheDocument();
            expect(screen.getByText("Cart Summary")).toBeInTheDocument();
            expect(screen.getByText("Current Address")).toBeInTheDocument();
            expect(screen.getByText(MOCK_AUTH_USER.user.address)).toBeInTheDocument();
        });


        test("display guest details when not authenticated", async () => {
            // Arrange 
            require("../context/auth").useAuth.mockReturnValue([MOCK_AUTH_GUEST, mockSetAuth]);

            // Act 
            render(<CartPage />);
            await waitFor(() => {
                expect(mockedAxios.get).toHaveBeenCalled();
            });

            // Assert
            expect(screen.getByText("Hello Guest")).toBeInTheDocument();
            expect(screen.getByText(/You Have 2 items in your cart please login to checkout/i)).toBeInTheDocument();
            expect(screen.getByText("Please Login to checkout")).toBeInTheDocument();
        });


        test("show empty cart message when cart is empty", async () => {
            // Arrange 
            require("../context/cart").useCart.mockReturnValue({
                ...mockUseCart,
                cart: MOCK_EMPTY_CART
            });

            // Act 
            render(<CartPage />);
            await waitFor(() => {
                expect(mockedAxios.get).toHaveBeenCalled();
            });

            // Assert 
            expect(screen.getByText("Your Cart Is Empty")).toBeInTheDocument();
        });


        test("show update address button if no address defined", async () => {
            // Arrange 
            require("../context/auth").useAuth.mockReturnValue(
              [MOCK_AUTH_USER_NO_ADDRESS, mockSetAuth]
            );

            // Act 
            render(<CartPage />);
            await waitFor(() => {
                expect(mockedAxios.get).toHaveBeenCalled();
            });

            // Assert
            expect(screen.getAllByText("Update Address")).toHaveLength(1);
        });


        test("navigate to profile when update address button is clicked by user without address", async () => {
            // Arrange
            require("../context/auth").useAuth.mockReturnValue(
              [MOCK_AUTH_USER_NO_ADDRESS, mockSetAuth]
            );

            // Act
            render(<CartPage />);
            await waitFor(() => {
                expect(mockedAxios.get).toHaveBeenCalled();
            });
            const updateAddressButton = screen.getByText("Update Address");
            fireEvent.click(updateAddressButton);

            // Assert 
            expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/profile");
        });


        test("show product info for cart items", async () => {
            // Arrange (in beforeEach)

            // Act 
            render(<CartPage />);
            await waitFor(() => {
                expect(mockedAxios.get).toHaveBeenCalled();
            });

            // Assert
            expect(screen.getByText(MOCK_PRODUCT_1.name)).toBeInTheDocument();
            const descriptions = screen.getAllByText(MOCK_PRODUCT_1.description.substring(0, 30));
            expect(descriptions.length).toBeGreaterThan(0);
            expect(screen.getByText(`Price : ${MOCK_PRODUCT_1.price}`)).toBeInTheDocument();
            expect(screen.getByText(MOCK_PRODUCT_2.name)).toBeInTheDocument();
            expect(screen.getAllByText("Remove")).toHaveLength(2);
        });

        test("show correct total price", async () => {
            // Arrange (in beforeEach)

            // Act
            render(<CartPage />);
            await waitFor(() => {
                expect(mockedAxios.get).toHaveBeenCalled();
            });

            // Assert 
            expect(screen.getByText("Total : $249.97")).toBeInTheDocument();
        });
    });


    describe("communication-based testing to verify user interactions", () => {
        test("clicking remove button calls removeCartItem", async () => {
            // Arrange (in beforeEach)

            // Act 
            render(<CartPage />);
            await waitFor(() => {
                expect(mockedAxios.get).toHaveBeenCalled();
            });
            const removeButtons = screen.getAllByText("Remove");
            fireEvent.click(removeButtons[0]);

            // Assert
            expect(mockRemoveCartItem).toHaveBeenCalledWith(MOCK_PRODUCT_1._id);
            expect(mockRemoveCartItem).toHaveBeenCalledTimes(1);
        });


        test("navigate to profile when update address clicked", async () => {
            // Arrange (in beforeEach)

            // Act
            render(<CartPage />);
            await waitFor(() => {
                expect(mockedAxios.get).toHaveBeenCalled();
            });
            const updateAddressButton = screen.getByText("Update Address");
            fireEvent.click(updateAddressButton);

            // Assert
            expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/profile");
        });


        test("navigate to login when login button clicked", async () => {
            // Arrange 
            require("../context/auth").useAuth.mockReturnValue([MOCK_AUTH_GUEST, mockSetAuth]);

            // Act
            render(<CartPage />);
            await waitFor(() => {
                expect(mockedAxios.get).toHaveBeenCalled();
            });
            const loginButton = screen.getByText("Please Login to checkout");
            fireEvent.click(loginButton);

            // Assert
            expect(mockNavigate).toHaveBeenCalledWith("/login", { state: "/cart" });
        });
    });


    describe("communication-based testing to verify api interactions", () => {
        test("fetch payment token when component renders", async () => {
            // Arrange (in beforeEach)

            // Act
            render(<CartPage />);

            // Assert
            await waitFor(() => {
                expect(mockedAxios.get).toHaveBeenCalledWith("/api/v1/product/braintree/token");
            });
        });


        test("catch error in handle payment token", async () => {
            // Arrange 
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            const mockError = new Error("Token fetch failed");
            mockedAxios.get.mockRejectedValue(mockError);

            // Act 
            render(<CartPage />);

            // Assert 
            await waitFor(() => {
                expect(consoleLogSpy).toHaveBeenCalledWith(mockError);
            });

            consoleLogSpy.mockRestore();
        });


        test("process payment successfully", async () => {
            // Arrange (in beforeEach)

            // Act 
            render(<CartPage />);
            await waitFor(() => {
                expect(screen.getByTestId("braintree-dropin")).toBeInTheDocument();
            });

            // wait for button to be enabled (instance set via onInstance callback)
            const paymentButton = await waitFor(() => {
                const button = screen.getByText("Make Payment");
                expect(button).not.toBeDisabled();
                return button;
            });
            fireEvent.click(paymentButton);

            // Assert
            await waitFor(() => {
                expect(MOCK_BRAINTREE_INSTANCE.requestPaymentMethod).toHaveBeenCalled();
                expect(mockedAxios.post).toHaveBeenCalledWith("/api/v1/product/braintree/payment", {
                    nonce: MOCK_PAYMENT_NONCE,
                    cart: MOCK_CART_WITH_ITEMS
                });
            });
            await waitFor(() => {
                expect(window.localStorage.removeItem).toHaveBeenCalledWith("cart");
                expect(mockSetCart).toHaveBeenCalledWith([]);
                expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/orders");
                expect(mockedToast.success).toHaveBeenCalledWith("Payment Completed Successfully");
            });
        });


        test("handle payment failure", async () => {
            // Arrange 
            const mockError = new Error("Payment failed");
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            MOCK_BRAINTREE_INSTANCE.requestPaymentMethod.mockRejectedValue(mockError);

            // Act
            render(<CartPage />);
            await waitFor(() => {
                expect(screen.getByTestId("braintree-dropin")).toBeInTheDocument();
            });
            const paymentButton = screen.getByText("Make Payment");
            fireEvent.click(paymentButton);

            // Assert
            await waitFor(() => {
                expect(consoleLogSpy).toHaveBeenCalledWith(mockError);
                expect(mockedToast.error).toHaveBeenCalledWith("Payment failed. Please try again.");
            });

            consoleLogSpy.mockRestore();
        });

        test("display processing state during payment", async () => {
            // Arrange 
            MOCK_BRAINTREE_INSTANCE.requestPaymentMethod.mockImplementation(
                () => new Promise(resolve => setTimeout(
                  () => resolve({ nonce: MOCK_PAYMENT_NONCE }), 100))
            );

            // Act 
            render(<CartPage />);
            await waitFor(() => {
                expect(screen.getByTestId("braintree-dropin")).toBeInTheDocument();
            });
            const paymentButton = screen.getByText("Make Payment");
            fireEvent.click(paymentButton);

            // Assert 
            await waitFor(() => {
                expect(screen.getByText("Processing ....")).toBeInTheDocument();
            });
            expect(screen.getByText("Processing ....")).toBeDisabled();
            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/orders");
            }, { timeout: 3000 });
        });
    });


    describe("state-based testing of payment button states", () => {
        test("disable payment button when loading", async () => {
            // Arrange
            MOCK_BRAINTREE_INSTANCE.requestPaymentMethod.mockImplementation(
                () => new Promise(resolve => setTimeout(
                  () => resolve({ nonce: MOCK_PAYMENT_NONCE }), 50))
            );

            // Act 
            render(<CartPage />);
            await waitFor(() => {
                expect(screen.getByTestId("braintree-dropin")).toBeInTheDocument();
            });
            const paymentButton = screen.getByText("Make Payment");
            fireEvent.click(paymentButton);

            // Assert
            await waitFor(() => {
                expect(screen.getByText("Processing ....")).toBeInTheDocument();
            });
            expect(screen.getByText("Processing ....")).toBeDisabled();
            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalled();
            }, { timeout: 3000 });
        });


        test("disable payment button when no braintree instance", async () => {
            // Arrange 
            mockShouldProvideBraintreeInstance = false;

            // Act 
            render(<CartPage />);
            await waitFor(() => {
                expect(screen.getByTestId("braintree-dropin")).toBeInTheDocument();
            });

            // Assert 
            const paymentButton = screen.getByText("Make Payment");
            expect(paymentButton).toBeDisabled();
        });


        test("disable payment button for user without address", async () => {
            // Arrange
            require("../context/auth").useAuth.mockReturnValue(
              [MOCK_AUTH_USER_NO_ADDRESS, mockSetAuth]
            );

            // Act
            render(<CartPage />);
            await waitFor(() => {
                expect(screen.getByTestId("braintree-dropin")).toBeInTheDocument();
            });

            // Assert 
            const paymentButton = screen.getByText("Make Payment");
            expect(paymentButton).toBeDisabled();
        });


        test("does not show payment section for guest users", async () => {
            // Arrange 
            require("../context/auth").useAuth.mockReturnValue(
              [MOCK_AUTH_GUEST, mockSetAuth]
            );

            // Act
            render(<CartPage />);
            await waitFor(() => {
                expect(mockedAxios.get).toHaveBeenCalled();
            });

            // Assert
            expect(screen.queryByTestId("braintree-dropin")).not.toBeInTheDocument();
            expect(screen.queryByText("Make Payment")).not.toBeInTheDocument();
        });


        test("does not show payment section when cart is empty", async () => {
            // Arrange 
            require("../context/cart").useCart.mockReturnValue({
                ...mockUseCart,
                cart: MOCK_EMPTY_CART
            });

            // Act 
            render(<CartPage />);
            await waitFor(() => {
                expect(mockedAxios.get).toHaveBeenCalled();
            });

            // Assert
            expect(screen.queryByTestId("braintree-dropin")).not.toBeInTheDocument();
            expect(screen.queryByText("Make Payment")).not.toBeInTheDocument();
        });


        test("does not show payment section when there is no client token", async () => {
            // Arrange
            mockedAxios.get.mockResolvedValue({ data: {} });

            // Act
            render(<CartPage />);
            await waitFor(() => {
                expect(mockedAxios.get).toHaveBeenCalled();
            });

            // Assert
            expect(screen.queryByTestId("braintree-dropin")).not.toBeInTheDocument();
            expect(screen.queryByText("Make Payment")).not.toBeInTheDocument();
        });
    });


    describe("state-based testing of edge cases and error scenarios", () => {
        test("handle cart with single item", async () => {
            // Arrange
            require("../context/cart").useCart.mockReturnValue({
                ...mockUseCart,
                cart: MOCK_CART_SINGLE_ITEM
            });

            // Act
            render(<CartPage />);
            await waitFor(() => {
                expect(mockedAxios.get).toHaveBeenCalled();
            });

            // Assert
            expect(screen.getByText("You Have 1 items in your cart")).toBeInTheDocument();
            expect(screen.getByText(MOCK_PRODUCT_1.name)).toBeInTheDocument();
            expect(screen.getAllByText("Remove")).toHaveLength(1);
        });


        test("handle undefined cart", async () => {
            // Arrange
            require("../context/cart").useCart.mockReturnValue({
                ...mockUseCart,
                cart: undefined
            });

            // Act
            render(<CartPage />);
            await waitFor(() => {
                expect(mockedAxios.get).toHaveBeenCalled();
            });

            // Assert
            expect(screen.getByText("Your Cart Is Empty")).toBeInTheDocument();
        });

        
        test("handle null user", async () => {
            // Arrange 
            require("../context/auth").useAuth.mockReturnValue([{ user: null, token: null }, mockSetAuth]);

            // Act
            render(<CartPage />);
            await waitFor(() => {
                expect(mockedAxios.get).toHaveBeenCalled();
            });

            // Assert
            expect(screen.getByText("Hello Guest")).toBeInTheDocument();
        });

        test("handle product with no description", async () => {
            // Arrange 
            const productWithoutDesc = { ...MOCK_PRODUCT_1, description: undefined };
            require("../context/cart").useCart.mockReturnValue({
                ...mockUseCart,
                cart: [productWithoutDesc]
            });

            // Act 
            render(<CartPage />);
            await waitFor(() => {
                expect(mockedAxios.get).toHaveBeenCalled();
            });
            
            // Assert
            expect(screen.getByTestId("layout")).toBeInTheDocument();
        });
    });


    describe("communication-based testing for useEffect dependencies", () => {
        test("refetch token if auth token changes", async () => {
            // Arrange 
            const { rerender } = render(<CartPage />);           
            mockedAxios.get.mockClear();

            // Act
            const newAuth = { ...MOCK_AUTH_USER, token: "new-token" };
            require("../context/auth").useAuth.mockReturnValue([newAuth, mockSetAuth]);
            rerender(<CartPage />);

            // Assert
            await waitFor(() => {
                expect(mockedAxios.get).toHaveBeenCalledTimes(1);
            });
        });


        test("does not refetch token when other auth properties change", async () => {
            // Arrange 
            const { rerender } = render(<CartPage />);
            mockedAxios.get.mockClear();

            // Act
            const newAuth = { 
                ...MOCK_AUTH_USER, 
                user: { ...MOCK_AUTH_USER.user, name: "Different Name" }
            };
            require("../context/auth").useAuth.mockReturnValue([newAuth, mockSetAuth]);
            rerender(<CartPage />);

            // Assert 
            await waitFor(() => {
                expect(mockedAxios.get).toHaveBeenCalledTimes(0);
            });
        });
    });
});