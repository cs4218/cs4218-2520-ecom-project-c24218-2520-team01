import { beforeEach, describe, test, expect, jest } from "@jest/globals";
import {
    getOrdersController,
    getAllOrdersController,
    orderStatusController
} from "../controllers/authController.js";
import orderModel from "../models/orderModel.js";

// Written by Nicholas Cheng, A0269648H

// Mock orderModel
jest.mock("../models/orderModel.js");

// Mock console.log to prevent it from printing to the terminal
jest.spyOn(console, "log").mockImplementation(() => { });

describe("Orders CRUD operations", () => {
    describe("Unit tests for getOrdersController", () => {
        // Set up variables for our test cases
        let req, res;

        // Before each test case we reset our variables / mocks
        beforeEach(() => {
            req = {
                user: {}
            };
            res = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn(),
                json: jest.fn()
            };
            jest.clearAllMocks();
        });

        describe("Successfully retrieved user orders", () => {
            test("Return 200 after fetching orders successfully", async () => {
                /** 
                 * Assumption:
                 * - getOrdersController should return a 200 once the orders has been retrieved successfully.
                 * - MongoDB will return an emmpty buyer even if the object id for buyer does not exist.
                 */
                // Arrange
                req.user._id = "1";

                const mockOrdersList = [
                    { _id: "1", buyer: "1", products: [], payment: {}, status: "Not Process" },
                    { _id: "2", buyer: "1", products: [], payment: {}, status: "Shipped" },
                ];

                // Handle the chaining of the populate function
                const mockChainFunction = {
                    populate: jest.fn().mockReturnThis(),
                    then: function (resolve) {
                        resolve(mockOrdersList);
                    }
                };
                orderModel.find.mockReturnValue(mockChainFunction);

                // Act
                await getOrdersController(req, res);

                // Assert
                expect(orderModel.find).toHaveBeenCalledWith({ buyer: "1" });
                expect(mockChainFunction.populate).toHaveBeenCalledWith("products", "-photo");
                expect(mockChainFunction.populate).toHaveBeenCalledWith("buyer", "name");
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledWith(mockOrdersList);
            });

            test("Return 200 when there is no orders for this user", async () => {
                /**
                 * Assumption: If there is no orders for this user we should still return 200 and the empty order list.
                 */
                // Arrange
                req.user._id = "1";

                const mockOrdersList = [];

                const mockChainFunction = {
                    populate: jest.fn().mockReturnThis(),
                    then: function (resolve) {
                        resolve(mockOrdersList);
                    }
                };
                orderModel.find.mockReturnValue(mockChainFunction);

                // Act
                await getOrdersController(req, res);

                // Assert
                expect(orderModel.find).toHaveBeenCalledWith({ buyer: "1" });
                expect(mockChainFunction.populate).toHaveBeenCalledWith("products", "-photo");
                expect(mockChainFunction.populate).toHaveBeenCalledWith("buyer", "name");
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledWith(mockOrdersList);
            });
        });

        describe("Validation errors when fetching user orders", () => {
            // There is no need to test for invalid user id because it will just return a empty list
            test("Return 422 when user id is null", async () => {
                // Arrange
                req.user._id = null

                // Act
                await getOrdersController(req, res);

                // Assert
                expect(orderModel.find).toHaveBeenCalledTimes(0);
                expect(res.status).toHaveBeenCalledWith(422);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "User id cannot be empty",
                });
            });
        });

        describe("Errors regarding the database", () => {
            test("Return 500 when a database error occurs", async () => {
                // Arrange
                req.user._id = "1"
                const mockError = new Error("Database error");

                orderModel.find.mockImplementation(() => {
                    throw mockError;
                });

                // Act
                await getOrdersController(req, res);

                // Assert
                expect(orderModel.find).toHaveBeenCalledWith({ buyer: "1" });
                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    error: mockError,
                    message: "Error while getting orders",
                });
            });
        });
    });

    describe("Unit tests for getAllOrdersController", () => {
        // Set up variables for our test cases
        let req, res;

        // Before each test case we reset our variables / mocks
        beforeEach(() => {
            req = {};
            res = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn(),
                json: jest.fn(),
            };
            jest.clearAllMocks();
        });

        describe("Successfully fetch all orders from the database", () => {
            test("Return 200 and fetch all the orders", async () => {
                // Arrange
                const mockOrdersList = [
                    { _id: "1", buyer: "1", products: [], payment: {}, status: "Not Process" },
                    { _id: "2", buyer: "1", products: [], payment: {}, status: "Shipped" },
                    { _id: "3", buyer: "2", products: [], payment: {}, status: "Processing" },
                    { _id: "4", buyer: "3", products: [], payment: {}, status: "Shipped" },
                ];

                const mockChainFunction = {
                    populate: jest.fn().mockReturnThis(),
                    sort: jest.fn().mockReturnValue(mockOrdersList)
                };

                orderModel.find.mockReturnValue(mockChainFunction);

                // Act
                await getAllOrdersController(req, res);

                // Assert
                expect(orderModel.find).toHaveBeenCalledWith({});
                expect(mockChainFunction.populate).toHaveBeenCalledWith("products", "-photo");
                expect(mockChainFunction.populate).toHaveBeenCalledWith("buyer", "name");
                // According to documentation this should be a integer
                // Assumption: The function intends to return orders in descending order of createdAt
                expect(mockChainFunction.sort).toHaveBeenCalledWith({ createdAt: -1 });
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledWith(mockOrdersList);
            });

            test("Return 200 even when there are no orders in the database", async () => {
                /**
                 * Assumption: Even if the database is empty,
                 * we can still return an empty list of orders which still makes the
                 * system be in a valid state.
                 */
                // Arrange
                const mockOrdersList = [];

                const mockChainFunction = {
                    populate: jest.fn().mockReturnThis(),
                    sort: jest.fn().mockReturnValue(mockOrdersList)
                };

                orderModel.find.mockReturnValue(mockChainFunction);

                // Act
                await getAllOrdersController(req, res);

                // Assert
                expect(orderModel.find).toHaveBeenCalledWith({});
                expect(mockChainFunction.populate).toHaveBeenCalledWith("products", "-photo");
                expect(mockChainFunction.populate).toHaveBeenCalledWith("buyer", "name");
                expect(mockChainFunction.sort).toHaveBeenCalledWith({ createdAt: -1 });
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledWith(mockOrdersList);
            });
        });

        describe("Errors regarding the database", () => {
            test("Return 500 when a database error occurs", async () => {
                // Arrange
                const mockError = new Error("Database error");
                orderModel.find.mockImplementation(() => {
                    throw mockError;
                });

                // Act
                await getAllOrdersController(req, res);

                // Assert
                expect(orderModel.find).toHaveBeenCalledWith({});
                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    error: mockError,
                    message: "Error while getting orders",
                });
            });
        });
    });

    describe("Unit tests for orderStatusController", () => {
        // Set up variables for our test cases
        let req, res;

        // Before each test case we reset our variables / mocks
        beforeEach(() => {
            req = {
                params: {},
                body: {},
            };
            res = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn(),
                json: jest.fn(),
            };
            jest.clearAllMocks();
        });

        describe("Successfully update the order status", () => {
            test("Return 200 and update order status", async () => {
                // Arrange
                req.params.orderId = "1";
                req.body.status = "cancel";
                const mockOrder = { _id: "1", buyer: "1", products: [], payment: {}, status: "cancel" }

                orderModel.findByIdAndUpdate.mockResolvedValue(mockOrder);

                // Act
                await orderStatusController(req, res);

                // Assert
                expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
                    "1",
                    { status: "cancel" },
                    { new: true, runValidators: true }
                );
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledWith(mockOrder);
            });
        });

        describe("Validation errors when updating order status", () => {
            test("Return 422 when status is null", async () => {
                // Arrange
                req.body.status = null;
                req.params.orderId = "1";

                // Act
                await orderStatusController(req, res);

                // Assert
                expect(orderModel.findByIdAndUpdate).toHaveBeenCalledTimes(0);
                expect(res.status).toHaveBeenCalledWith(422);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "New order status cannot be empty",
                });
            });

            test("Return 422 when order id is null", async () => {
                /**
                 * Assumption: We do not need to worry about blank ids and what not
                 * because the findByIdAndUpdate function will handle those for us since
                 * they cannot find that id.
                 */
                // Arrange
                req.body.status = "cancel";
                req.params.orderId = null;

                // Act
                await orderStatusController(req, res);

                // Assert
                expect(orderModel.findByIdAndUpdate).toHaveBeenCalledTimes(0);
                expect(res.status).toHaveBeenCalledWith(422);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Order id is not provided",
                });
            });

            test("Return 404 when order id cannot be found", async () => {
                // Arrange
                req.body.status = "cancel";
                req.params.orderId = "1000000000";

                // As per documentation if the object cannot be found it will return null
                orderModel.findByIdAndUpdate.mockResolvedValue(null);

                // Act
                await orderStatusController(req, res);

                // Assert
                expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
                    "1000000000",
                    {
                        status: "cancel",
                    },
                    { new: true, runValidators: true }
                );
                expect(res.status).toHaveBeenCalledWith(404);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Order id does not exist",
                });
            });
        });

        describe("Errors regarding the database", () => {
            test("Return 500 when a database error occurs", async () => {
                // Arrange
                req.body.status = "cancel";
                req.params.orderId = "1";
                const mockError = new Error("Database error");

                orderModel.findByIdAndUpdate.mockImplementation(() => {
                    throw mockError;
                });

                // Act
                await orderStatusController(req, res);

                // Assert
                expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
                    "1",
                    {
                        status: "cancel",
                    },
                    { new: true, runValidators: true }
                );
                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    error: mockError,
                    message: "Error while updating order status",
                });
            });

            test("Return 422 when the validators fail", async () => {
                /**
                 * Assuption: According to mongoose documentation, when the vallidators fail
                 * Mongoose will throw an error. So empty status, invalid status, etc. will be caught here.
                 */
                // Arrange
                req.body.status = "Random Status";
                req.params.orderId = "1";
                const mockError = new Error("Validation error");
                // Mongoose validation error name which can be used to identify the type of error
                mockError.name = "ValidationError";

                orderModel.findByIdAndUpdate.mockImplementation(() => {
                    throw mockError;
                });

                // Act
                await orderStatusController(req, res);

                // Assert
                expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
                    "1",
                    {
                        status: "Random Status",
                    },
                    { new: true, runValidators: true }
                );
                expect(res.status).toHaveBeenCalledWith(422);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    error: mockError,
                    message: "Invalid status value",
                });
            });
        });
    });
});
