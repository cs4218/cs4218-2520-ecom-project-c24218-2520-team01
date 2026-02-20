import orderModel from "../models/orderModel.js";
import braintree from "braintree";
import { braintreeTokenController, brainTreePaymentController } from "./productController.js";

// Mock orderModel
jest.mock("../models/orderModel.js")

// Mock braintree
let mockTokenGenerateError, mockTokenGenerateResponse, mockPaymentError, mockPaymentResponse
jest.mock('braintree', () => {

    const generateMock = jest.fn().mockImplementation((params, callback) => {
        callback(mockTokenGenerateError, mockTokenGenerateResponse);
    });
    const paymentMock = jest.fn().mockImplementation((params, callback) => {
        callback(mockPaymentError, mockPaymentResponse);
    });

    return {
        Environment: {
            Sandbox: 'sandbox',
        },
        BraintreeGateway: jest.fn().mockImplementation(() => {
            return {
                clientToken: {
                    generate: generateMock
                },
                transaction: {
                    sale: paymentMock
                }
            };
        }),
        _exposedGenerateMock: generateMock, // Expose the const so we can access it later
        _exposedPaymentMock: paymentMock
    };
});

describe("Unit test for braintreeTokenController", () => {
    let req, res;
    const mockGenerate = braintree._exposedGenerateMock;

    beforeEach(() => {
        req = {
            body: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn()
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
        mockGenerate.mockClear();
    })

    test("Return 200 and the generated token when braintree is successful", async () => {
        // Arrange
        mockTokenGenerateError = null;
        mockTokenGenerateResponse = { clientToken: 'token123' };

        // Act
        await braintreeTokenController(req, res);

        // Assert
        expect(mockGenerate).toHaveBeenCalledWith({}, expect.any(Function));
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            data: mockTokenGenerateResponse
        });
    });

    test("Return 500 when a braintree error occurs", async () => {
        // Arrange
        mockTokenGenerateError = new Error("Some error");
        mockTokenGenerateResponse = null;

        // Act
        await braintreeTokenController(req, res);

        // Assert
        expect(mockGenerate).toHaveBeenCalledWith({}, expect.any(Function));
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            error: new Error("Some error"),
            message: "Error in generating token"
        });
    });
})

describe("Unit test for brainTreePaymentController", () => {
    let req, res;
    const mockPayment = braintree._exposedPaymentMock;

    beforeEach(() => {
        req = {
            user: {},
            body: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn()
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
        mockPayment.mockClear();
    })

    test("Return 200 when an transaction & order is created successfully", async () => {
        // Arrange
        req.user._id = "user1"
        req.body = {
            nonce: "valid nonce",
            cart: [
                { _id: 1, name: "Mouse", price: 10 },
                { _id: 2, name: "Laptop", price: 950 },
                { _id: 3, name: "Charger", price: 45 },
            ]
        }

        mockPaymentError = null;
        // This is a sample response from braintree documentation
        mockPaymentResponse = {
            result: {
                success: true,
                transaction: {
                    type: "credit",
                    status: "submitted_for_settlement"
                }
            }
        };

        // Mock a response for orderModel.save()
        const orderModelResponse = {
            products: req.body.cart,
            buyer: req.user._id,
            payment: mockPaymentResponse
        }

        orderModel.mockImplementationOnce(() => {
            return {
                save: jest.fn().mockResolvedValue(orderModelResponse)
            }
        })

        // Act
        await brainTreePaymentController(req, res);

        // Assert
        expect(mockPayment).toHaveBeenCalledWith({
            amount: 1005,
            paymentMethodNonce: "valid nonce",
            options: {
                submitForSettlement: true
            }
        }, expect.any(Function));
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ ok: true });
    });

    test("Return 500 when a braintree error occurs when making a transaction", async () => {
        // Arrange
        req.user._id = "user1"
        req.body = {
            nonce: "valid nonce",
            cart: [
                { _id: 1, name: "Mouse", price: 10 },
                { _id: 2, name: "Laptop", price: 950 },
                { _id: 3, name: "Charger", price: 45 },
            ]
        }

        mockPaymentError = new Error("Some error");
        mockPaymentResponse = null;

        orderModel.mockImplementationOnce(() => {
            return {
                save: jest.fn()
            }
        })

        // Act
        await brainTreePaymentController(req, res);

        // Assert
        expect(mockPayment).toHaveBeenCalledWith({
            amount: 1005,
            paymentMethodNonce: "valid nonce",
            options: {
                submitForSettlement: true
            }
        }, expect.any(Function));
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            error: mockPaymentError,
            message: "Error in making transaction"
        });
        expect(orderModel).toHaveBeenCalledTimes(0)
    });

    test("Return 400 when the cart is empty", async () => {
        /**
         * Assumption: If the cart is empty then there is nothing to place an order/payment for.
         * It is different from a cart with a sum of total as we assume it is possible for items
         * to have 0 cost which we can still place an order for.
         */

        // Arrange
        req.user._id = "user1"
        req.body = {
            nonce: "valid nonce",
            cart: []
        }

        // Act
        await brainTreePaymentController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Cart is empty"
        });
        expect(mockPayment).toHaveBeenCalledTimes(0)
        expect(orderModel).toHaveBeenCalledTimes(0)
    });

    test("Return 200 even when cart total is 0", async () => {
        /**
         * Assumption: Similarly if we have some items but the cost is 0, we should still process this
         * as any regular order / payment.
         */
        // Arrange
        req.user._id = "user1"
        req.body = {
            nonce: "valid nonce",
            cart: [
                { _id: 1, name: "Mouse", price: 0 },
                { _id: 2, name: "Laptop", price: 0 },
                { _id: 3, name: "Charger", price: 0 },
            ]
        }

        mockPaymentError = null;
        // This is a sample response from braintree documentation
        mockPaymentResponse = {
            result: {
                success: true,
                transaction: {
                    type: "credit",
                    status: "submitted_for_settlement"
                }
            }
        };

        // Mock a response for orderModel.save()
        const orderModelResponse = {
            products: req.body.cart,
            buyer: req.user._id,
            payment: mockPaymentResponse
        }

        orderModel.mockImplementationOnce(() => {
            return {
                save: jest.fn().mockResolvedValue(orderModelResponse)
            }
        })

        // Act
        await brainTreePaymentController(req, res);

        // Assert
        expect(mockPayment).toHaveBeenCalledWith({
            amount: 0,
            paymentMethodNonce: "valid nonce",
            options: {
                submitForSettlement: true
            }
        }, expect.any(Function));
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ ok: true });
    });

    test("Return 400 when user id is not provided", async () => {
        /**
         * Assumption: We cannot map this order to the user so we should return a status 400.
         */

        // Arrange
        req.user._id = undefined
        req.body = {
            nonce: "valid nonce",
            cart: [{ _id: 1, name: "Mouse", price: 30 }]
        }

        // Act
        await brainTreePaymentController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "User id is not provided"
        });
        expect(mockPayment).toHaveBeenCalledTimes(0)
        expect(orderModel).toHaveBeenCalledTimes(0)
    });

    test("Return 400 when payment method nonce is not provided", async () => {
        /**
         * Assumption: We cannot make a transaction without a payment method nonce.
         */

        // Arrange
        req.user._id = "user1"
        req.body = {
            nonce: undefined,
            cart: [{ _id: 1, name: "Mouse", price: 30 }]
        }

        // Act
        await brainTreePaymentController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Payment method nonce is not provided"
        });
        expect(mockPayment).toHaveBeenCalledTimes(0)
        expect(orderModel).toHaveBeenCalledTimes(0)
    });

    test("Return 400 when cart is undefined", async () => {
        /**
         * Assumption: Is the cart object is never passed in then we should not even process thiss request.
         */

        // Arrange
        req.user._id = "user1"
        req.body = {
            nonce: "valid nonce",
            cart: undefined
        }

        // Act
        await brainTreePaymentController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Cart is not provided"
        });
        expect(mockPayment).toHaveBeenCalledTimes(0)
        expect(orderModel).toHaveBeenCalledTimes(0)
    });
})