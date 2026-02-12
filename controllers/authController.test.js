import orderModel from "../models/orderModel.js";
import { getOrdersController, getAllOrdersController, orderStatusController } from "../controllers/authController.js";

jest.mock("../models/orderModel.js");

describe("Tests for getOrdersController", () => {

    // Set up variables for our test cases
    let req, res;

    beforeEach(() => {
        req = {};
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        jest.clearAllMocks();
    });

    test("Return 200 after fetching orders successfully", async () => {
        /* 
        Assumption: 
        - getOrdersController should return a 200 once the orders has been retrieved successfully.
        - MongoDB will return an emmpty buyer even if the object id for buyer does not exist.
        */
        // Arrange
        req.user = { _id: "123" };

        const mockOrders = [
            { _id: "1", buyer: "user123", products: [], payment: {}, status: "Not Process" },
            { _id: "2", buyer: "user123", products: [], payment: {}, status: "Shipped" },
        ];

        const mockQuery = {
            populate: jest.fn().mockReturnThis(),
            then: function (resolve) {
                resolve(mockOrders);
            }
        };

        orderModel.find.mockReturnValue(mockQuery);

        // Act
        await getOrdersController(req, res);

        // Assert
        expect(orderModel.find).toHaveBeenCalledWith({ buyer: "123" });
        expect(mockQuery.populate).toHaveBeenCalledWith("products", "-photo");
        expect(mockQuery.populate).toHaveBeenCalledWith("buyer", "name");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockOrders);
    });

    test("Return 500 when an error occurs while fetching orders", async () => {
        /* 
        Assumption: MongoDB will throw an error when the buyer id is invalid.
        */
        // Arrange
        req.user = { _id: "123" };

        const error = new Error("Database error");
        orderModel.find.mockImplementation(() => {
            throw error;
        });

        // Console is a dependency so just mock it
        console.log = jest.fn();

        // Act
        await getOrdersController(req, res);

        // Assert
        expect(orderModel.find).toHaveBeenCalledWith({ buyer: "123" });
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error while getting orders",
            error,
        });
    });
});

describe("Tests for getAllOrdersController", () => {

    // Set up variables for our test cases
    let req, res;

    beforeEach(() => {
        req = {};
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        jest.clearAllMocks();
    });

    test("Return 200 after fetching all orders successfully", async () => {
        /* 
        Assumption: 
        - getAllOrdersController should return a 200 once the orders has been retrieved successfully.
        */
        // Arrange
        // Assume all this is in sorted order of creation time
        const mockOrders = [
            { _id: "1", buyer: "user123", products: [], payment: {}, status: "Not Process" },
            { _id: "2", buyer: "user123", products: [], payment: {}, status: "Shipped" },
            { _id: "3", buyer: "user321", products: [], payment: {}, status: "Processing" },
            { _id: "4", buyer: "user4", products: [], payment: {}, status: "Shipped" },
        ];

        const mockQuery = {
            populate: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnValue(mockOrders)
        };

        orderModel.find.mockReturnValue(mockQuery);

        // Act
        await getAllOrdersController(req, res);

        // Assert
        expect(orderModel.find).toHaveBeenCalledWith({});
        expect(mockQuery.populate).toHaveBeenCalledWith("products", "-photo");
        expect(mockQuery.populate).toHaveBeenCalledWith("buyer", "name");
        expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: "-1" });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockOrders);
    });

    test("Return 500 when an error occurs while fetching orders", async () => {
        /* 
        Assumption: MongoDB will throw an error when the buyer id is invalid.
        */
        // Arrange
        const error = new Error("Database error");
        orderModel.find.mockImplementation(() => {
            throw error;
        });

        // Console is a dependency so just mock it
        console.log = jest.fn();

        // Act
        await getAllOrdersController(req, res);

        // Assert
        expect(orderModel.find).toHaveBeenCalledWith({});
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error while getting orders",
            error,
        });
    });
});

describe("Tests for orderStatusController", () => {

    // Set up variables for our test cases
    let req, res;

    beforeEach(() => {
        req = {
            params: {},
            body: {}
        };
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        jest.clearAllMocks();
    });

    test("Update order status successfully and return 200", async () => {
        /* 
        Assumption: 
        - orderStatusController should return a 200 once the order status has been updated successfully.
        */

        // Arrange
        req.params.orderId = "1";
        req.body.status = "deliverd";
        const updatedOrder = { _id: "1", buyer: "user123", products: [], payment: {}, status: "deliverd" }

        // Mock orderModel.findByIdAndUpdate to return the updated category
        orderModel.findByIdAndUpdate.mockResolvedValue(updatedOrder);

        // Act
        await orderStatusController(req, res);

        // Assert
        expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith("1", { status: "deliverd" }, { new: true });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(updatedOrder);
    });

    test("Return 404 when id cannot be found", async () => {
        /*
        Assumption: The app should inform the user that the order id does not exist
        and no update was made. So return status code 404 is not found usually used when the request
        resource cannot be found.
        */

        // Arrange
        req.params.orderId = "1000";
        req.body.status = "deliverd";
        const updatedOrder = null;

        orderModel.findByIdAndUpdate.mockResolvedValue(updatedOrder);

        // Act
        await orderStatusController(req, res);

        // Assert
        expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith("1000", { status: "deliverd" }, { new: true });
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith({
            message: "Order id does not exist",
        });
    });

    test("Return 400 when order id is not provided", async () => {
        // Arrange
        req.body.status = "deliverd";

        // Act
        await orderStatusController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            message: "Order id is not provided",
        });
    });

    test("Return 400 when order status is not provided", async () => {
        // Arrange
        req.params.orderId = "1";

        // Act
        await orderStatusController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            message: "Order status is not provided",
        });
    });

    test("Return 500 when order status is invalid", async () => {
        /*
        Assumption: MongoDB will throw an error when the order status is invalid. 
        */

        // Arrange
        req.params.orderId = "1";
        req.body.status = "Invalid status";
        const mockError = new Error("Database error");

        orderModel.findByIdAndUpdate.mockRejectedValue(mockError);
        console.log = jest.fn();

        // Act
        await orderStatusController(req, res);

        // Assert
        expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith("1", { status: "Invalid status" }, { new: true, runValidators: true });
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error while updating order status",
            error: mockError
        });
    });

    test("Return 500 when an error occurs", async () => {
        // Arrange
        req.params.orderId = "1";
        req.body.status = "deliverd";
        const mockError = new Error("Some error");

        orderModel.findByIdAndUpdate.mockRejectedValue(mockError);
        // Console is a dependency so just mock it
        console.log = jest.fn();

        // Act
        await orderStatusController(req, res);

        // Assert
        expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith("1", { status: "deliverd" }, { new: true });
        expect(console.log).toHaveBeenCalledWith(mockError);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            error: mockError,
            message: "Error while updating order status",
        });
    });
});