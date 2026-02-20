import orderModel from "../models/orderModel.js";
import braintree from "braintree";
import { braintreeTokenController } from "./productController.js";

// Mock orderModel
jest.mock("../models/orderModel.js")

// Mock braintree
let mockCallbackError, mockCallbackResponse
jest.mock('braintree', () => {
    const generateMock = jest.fn().mockImplementation((params, callback) => {
        callback(mockCallbackError, mockCallbackResponse);
    });
    return {
        Environment: {
            Sandbox: 'sandbox',
        },
        BraintreeGateway: jest.fn().mockImplementation(() => {
            return {
                clientToken: {
                    generate: generateMock
                }
            };
        }),
        _exposedGenerateMock: generateMock // Expose the const so we can access it later
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
        mockCallbackError = null;
        mockCallbackResponse = { clientToken: 'token123' };

        // Act
        await braintreeTokenController(req, res);

        // Assert
        expect(mockGenerate).toHaveBeenCalledWith({}, expect.any(Function));
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            clientToken: 'token123'
        });
    });

    test("Return 500 when a braintree error occurs", async () => {
        // Arrange
        mockCallbackError = new Error("Some error");
        mockCallbackResponse = null;

        // Act
        await braintreeTokenController(req, res);

        // Assert
        expect(mockGenerate).toHaveBeenCalledWith({}, expect.any(Function));
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            mockCallbackError,
            message: "Error in generating token"
        });
    });
})