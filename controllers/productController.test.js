import { afterEach, beforeEach, describe, test, expect, jest } from "@jest/globals";
import orderModel from "../models/orderModel.js";
import braintree from "braintree";
import {
    braintreeTokenController,
    brainTreePaymentController
} from "./productController.js";

// For the entire file: Written by Nicholas Cheng, A0269648H

// Mock orderModel
jest.mock("../models/orderModel.js");

// Mock braintree
// This is used to modify the return values of the callback function
let mockTokenGenerateError, mockTokenGenerateResponse, mockPaymentError, mockPaymentResponse;
// We need to mock the implementation here because in productController.js braintree is
// initialised at the start of the file.
jest.mock('braintree', () => {

    const generateFunctionMock = jest.fn().mockImplementation((params, callback) => {
        callback(mockTokenGenerateError, mockTokenGenerateResponse);
    });
    const paymentFunctionMock = jest.fn().mockImplementation((params, callback) => {
        callback(mockPaymentError, mockPaymentResponse);
    });

    return {
        Environment: {
            Sandbox: 'sandbox',
        },
        BraintreeGateway: jest.fn().mockImplementation(() => {
            return {
                clientToken: {
                    generate: generateFunctionMock
                },
                transaction: {
                    sale: paymentFunctionMock
                }
            };
        }),
        // Expose the const so we can access the mock later in our tests
        _exposedGenerateMock: generateFunctionMock,
        _exposedPaymentMock: paymentFunctionMock
    };
});

describe("Payment functions", () => {
    describe("Unit tests for braintreeTokenController", () => {
        let req, res;
        const generateFunctionMock = braintree._exposedGenerateMock;

        beforeEach(() => {
            req = {
                body: {},
            };
            res = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn(),
            };
            jest.clearAllMocks();
        });

        afterEach(() => {
            generateFunctionMock.mockClear();
        });

        describe("Successfully generates token", () => {
            test("Return 200 & the generated token by braintree is returned", async () => {
                // Arrange
                mockTokenGenerateError = null;
                mockTokenGenerateResponse = { clientToken: 'token123' };

                // Act
                await braintreeTokenController(req, res);

                // Assert
                // We use expect.any(Object) because we don't care about the specific parameters
                // passed into braintree to make the test case less britle.
                expect(generateFunctionMock).toHaveBeenCalledWith(expect.any(Object), expect.any(Function));
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith({
                    success: true,
                    data: mockTokenGenerateResponse
                });
            });
        });

        describe("Braintree fails to generate a token", () => {
            test("Return 500 when braintree cannot generate & inputs an error into the callback", async () => {
                // Arrange
                // Braintree will call the callback with an error as an input
                mockTokenGenerateError = new Error("Some error");
                mockTokenGenerateResponse = null;

                // Act
                await braintreeTokenController(req, res);

                // Assert
                expect(generateFunctionMock).toHaveBeenCalledWith(expect.any(Object), expect.any(Function));
                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    error: new Error("Some error"),
                    message: "Error while generating token"
                });
            });
        });

        describe("Error with braintree", () => {
            test("Return 500 when there is an issue with accessing braintree", async () => {
                // Arrange
                const mockError = new Error("Braintree error");
                // Override the original mockimplementation once
                generateFunctionMock.mockImplementationOnce(() => {
                    throw mockError;
                });

                // Act
                await braintreeTokenController(req, res);

                // Assert
                expect(generateFunctionMock).toHaveBeenCalledWith(expect.any(Object), expect.any(Function));
                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    error: mockError,
                    message: "Error with braintree"
                });
            });
        });
    });

    describe("Unit tests for brainTreePaymentController", () => {
        let req, res;
        const paymentFunctionMock = braintree._exposedPaymentMock;

        beforeEach(() => {
            req = {
                user: {},
                body: {},
            };
            res = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn(),
                json: jest.fn()
            };
            jest.clearAllMocks();
        });

        afterEach(() => {
            paymentFunctionMock.mockClear();
        });

        describe("Successfully made a transaction", () => {
            test("Return 200 when an transaction & order is created successfully", async () => {
                // Arrange
                req.user._id = "1"
                req.body = {
                    nonce: "Valid nonce",
                    cart: [
                        { _id: 1, name: "Mouse", price: 10 },
                        { _id: 2, name: "Laptop", price: 950 },
                        { _id: 3, name: "Charger", price: 45 },
                    ]
                };
                mockPaymentError = null;

                // This is a simple response from braintree documentation
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
                const mockOrderObject = {
                    _id: "1",
                    products: req.body.cart,
                    buyer: req.user._id,
                    payment: mockPaymentResponse
                };

                orderModel.mockImplementationOnce(() => {
                    return {
                        save: jest.fn().mockResolvedValue(mockOrderObject)
                    }
                });

                // Act
                await brainTreePaymentController(req, res);

                // Assert
                /**
                 * Assumption: We assume that we at minmum needs amount, nounce & the submitforsettlement
                 * to be passed into the function. Anything else can be added as extra
                 */
                expect(paymentFunctionMock).toHaveBeenCalledWith(expect.objectContaining({
                    amount: 1005,
                    paymentMethodNonce: "Valid nonce",
                    options: expect.objectContaining({
                        submitForSettlement: true
                    })
                }), expect.any(Function));
                /**
                 * Assumption: We assume the devs only need these arguments and the rest to be
                 * auto filled by MongoDB
                 */
                expect(orderModel).toHaveBeenCalledWith(expect.objectContaining({
                    products: req.body.cart,
                    buyer: req.user._id,
                    payment: mockPaymentResponse
                }));
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledWith({ ok: true });
            });

            test("Return 200 even when cart total is 0", async () => {
                /**
                 * Assumption: If we have some items but the cost is 0, we should still process this
                 * as any regular order / payment.
                 */
                // Arrange
                req.user._id = "1"
                req.body = {
                    nonce: "Valid nonce",
                    cart: [
                        { _id: 1, name: "Mouse", price: 0 },
                        { _id: 2, name: "Laptop", price: 0 },
                        { _id: 3, name: "Charger", price: 0 },
                    ]
                };

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
                const mockOrderObject = {
                    products: req.body.cart,
                    buyer: req.user._id,
                    payment: mockPaymentResponse
                };

                orderModel.mockImplementationOnce(() => {
                    return {
                        save: jest.fn().mockResolvedValue(mockOrderObject)
                    }
                });

                // Act
                await brainTreePaymentController(req, res);

                // Assert
                expect(paymentFunctionMock).toHaveBeenCalledWith(expect.objectContaining({
                    amount: 0,
                    paymentMethodNonce: "Valid nonce",
                    options: expect.objectContaining({
                        submitForSettlement: true
                    })
                }), expect.any(Function));
                expect(orderModel).toHaveBeenCalledWith(expect.objectContaining({
                    products: req.body.cart,
                    buyer: req.user._id,
                    payment: mockPaymentResponse
                }));
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledWith({ ok: true });
            });
        });

        describe("Validation errors when processing transaction request", () => {
            test("Return 400 when the cart is empty", async () => {
                /**
                 * Assumption: If the cart is empty then there is nothing to place an order/payment for.
                 * It is different from a cart with a sum of total as we assume it is possible for items
                 * to have 0 cost which we can still place an order for.
                 */

                // Arrange
                req.user._id = "1"
                req.body = {
                    nonce: "Valid nonce",
                    cart: []
                };

                // Act
                await brainTreePaymentController(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "No transaction is made because cart is empty"
                });
                expect(paymentFunctionMock).toHaveBeenCalledTimes(0);
                expect(orderModel).toHaveBeenCalledTimes(0);
            });

            test("Return 400 when user id is not provided", async () => {
                /**
                 * Assumption: We cannot map this order to the user so we should return a status 400.
                 */

                // Arrange
                req.user._id = undefined
                req.body = {
                    nonce: "Valid nonce",
                    cart: [{ _id: 1, name: "Mouse", price: 30 }]
                };

                // Act
                await brainTreePaymentController(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "User id is not provided"
                });
                expect(paymentFunctionMock).toHaveBeenCalledTimes(0)
                expect(orderModel).toHaveBeenCalledTimes(0)
            });

            test("Return 400 when payment method nonce is not provided", async () => {
                /**
                 * Assumption: We cannot make a transaction without a payment method nonce.
                 */

                // Arrange
                req.user._id = "1";
                req.body = {
                    nonce: undefined,
                    cart: [{ _id: 1, name: "Mouse", price: 30 }]
                };

                // Act
                await brainTreePaymentController(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Payment method nonce is not provided"
                });
                expect(paymentFunctionMock).toHaveBeenCalledTimes(0);
                expect(orderModel).toHaveBeenCalledTimes(0);
            });

            test("Return 400 when cart is undefined", async () => {
                /**
                 * Assumption: Is the cart object is never passed in then we should not even process thiss request.
                 */

                // Arrange
                req.user._id = "1";
                req.body = {
                    nonce: "Valid nonce",
                    cart: undefined
                };

                // Act
                await brainTreePaymentController(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "No transaction is made because cart is empty"
                });
                expect(paymentFunctionMock).toHaveBeenCalledTimes(0);
                expect(orderModel).toHaveBeenCalledTimes(0);
            });
        });

        describe("Braintree fails to make a transaction", () => {
            test("Return 500 when braintree cannot make a transaction & inputs an error into the callback", async () => {
                // Arrange
                req.user._id = "1"
                req.body = {
                    nonce: "Valid nonce",
                    cart: [
                        { _id: 1, name: "Mouse", price: 10 },
                        { _id: 2, name: "Laptop", price: 950 },
                        { _id: 3, name: "Charger", price: 45 },
                    ]
                };
                // Braintree will call the callback with an error as an input
                mockPaymentError = new Error("Some error");
                mockPaymentResponse = null;

                // Act
                await brainTreePaymentController(req, res);

                // Assert
                expect(paymentFunctionMock).toHaveBeenCalledWith(expect.objectContaining({
                    amount: 1005,
                    paymentMethodNonce: "Valid nonce",
                    options: expect.objectContaining({
                        submitForSettlement: true
                    })
                }), expect.any(Function));
                expect(orderModel).toHaveBeenCalledTimes(0);
                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    error: new Error("Some error"),
                    message: "Error while making transaction"
                });
            });
        });

        describe("Error with braintree", () => {
            test("Return 500 when there is an issue with accessing braintree", async () => {
                // Arrange
                req.user._id = "1"
                req.body = {
                    nonce: "Valid nonce",
                    cart: [
                        { _id: 1, name: "Mouse", price: 10 },
                        { _id: 2, name: "Laptop", price: 950 },
                        { _id: 3, name: "Charger", price: 45 },
                    ]
                };
                const mockError = new Error("Braintree error");
                // Override the original mockimplementation once
                paymentFunctionMock.mockImplementationOnce(() => {
                    throw mockError;
                });

                // Act
                await brainTreePaymentController(req, res);

                // Assert
                expect(paymentFunctionMock).toHaveBeenCalledWith(expect.objectContaining({
                    amount: 1005,
                    paymentMethodNonce: "Valid nonce",
                    options: expect.objectContaining({
                        submitForSettlement: true
                    })
                }), expect.any(Function));
                expect(orderModel).toHaveBeenCalledTimes(0);
                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    error: mockError,
                    message: "Error with braintree"
                });
            });
        });
    });
});