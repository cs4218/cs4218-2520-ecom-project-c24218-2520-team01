// Mock dependencies before imports
jest.mock("../models/userModel.js");
jest.mock("jsonwebtoken");
jest.mock("../helpers/authHelper.js");

// Spy on console.log to suppress noise and enable assertions
beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => { });
});
afterEach(() => {
    jest.restoreAllMocks();
});

import { beforeEach, describe, test, expect, jest } from "@jest/globals";

// Import the controller functions
import {
    registerController,
    loginController,
    forgotPasswordController,
    testController,
} from "./authController.js";

import {
    getOrdersController,
    getAllOrdersController,
    orderStatusController
} from "../controllers/authController.js";

// Import dependencies
import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";
import JWT from "jsonwebtoken";
import { hashPassword, comparePassword } from "../helpers/authHelper.js";


//Wong Sheen Kerr (A0269647J)
describe("Authentication", () => {
    describe("registerController", () => {
        let res;

        beforeEach(() => {
            res = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn(),
                json: jest.fn(),
            };
            jest.clearAllMocks();
        });

        describe("Success", () => {
            it("should register a new user successfully", async () => {
                // Arrange
                const req = {
                    body: {
                        name: "Sheen",
                        email: "sheen@example.com",
                        password: "P@ssword123",
                        phone: "912345678",
                        address: "Test Address",
                        answer: "Bowling",
                    },
                };

                userModel.findOne.mockResolvedValue(null);
                const mockSave = jest.fn().mockResolvedValue({
                    _id: "123",
                    name: req.body.name,
                    email: req.body.email,
                });
                userModel.mockImplementation(() => ({
                    save: mockSave,
                }));
                hashPassword.mockResolvedValue("hashedPassword");

                // Act
                await registerController(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(201);
                expect(res.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: true,
                        message: "User registered successfully",
                    }),
                );
            });
        });

        describe("Error", () => {
            describe("Validation Errors", () => {
                describe("missing field validation", () => {
                    it.each([
                        {
                            field: "name",
                            missingBody: {
                                email: "sheen@example.com",
                                password: "P@ssword123",
                                phone: "912345678",
                                address: "Test Address",
                                answer: "Bowling",
                            },
                            expectedMessage: "Name is required",
                        },
                        {
                            field: "email",
                            missingBody: {
                                name: "Sheen",
                                password: "P@ssword123",
                                phone: "912345678",
                                address: "Test Address",
                                answer: "Bowling",
                            },
                            expectedMessage: "Email is required",
                        },
                        {
                            field: "password",
                            missingBody: {
                                name: "Sheen",
                                email: "sheen@example.com",
                                phone: "912345678",
                                address: "Test Address",
                                answer: "Bowling",
                            },
                            expectedMessage: "Password is required",
                        },
                        {
                            field: "phone",
                            missingBody: {
                                name: "Sheen",
                                email: "sheen@example.com",
                                password: "P@ssword123",
                                address: "Test Address",
                                answer: "Bowling",
                            },
                            expectedMessage: "Phone number is required",
                        },
                        {
                            field: "address",
                            missingBody: {
                                name: "Sheen",
                                email: "sheen@example.com",
                                password: "P@ssword123",
                                phone: "912345678",
                                answer: "Bowling",
                            },
                            expectedMessage: "Address is required",
                        },
                        {
                            field: "answer",
                            missingBody: {
                                name: "Sheen",
                                email: "sheen@example.com",
                                password: "P@ssword123",
                                phone: "912345678",
                                address: "Test Address",
                            },
                            expectedMessage: "Answer is required",
                        },
                    ])(
                        "should return error if $field is missing",
                        async ({ missingBody, expectedMessage }) => {
                            // Arrange
                            const req = { body: missingBody };

                            // Act
                            await registerController(req, res);

                            // Assert
                            expect(res.send).toHaveBeenCalledWith({
                                success: false,
                                message: expectedMessage,
                            });
                        },
                    );
                });

                describe("empty string validation", () => {
                    it.each([
                        {
                            field: "name",
                            emptyBody: {
                                name: "",
                                email: "sheen@example.com",
                                password: "P@ssword123",
                                phone: "912345678",
                                address: "Test Address",
                                answer: "Bowling",
                            },
                            expectedMessage: "Name is required",
                        },
                        {
                            field: "email",
                            emptyBody: {
                                name: "Sheen",
                                email: "",
                                password: "P@ssword123",
                                phone: "912345678",
                                address: "Test Address",
                                answer: "Bowling",
                            },
                            expectedMessage: "Email is required",
                        },
                        {
                            field: "password",
                            emptyBody: {
                                name: "Sheen",
                                email: "sheen@example.com",
                                password: "",
                                phone: "912345678",
                                address: "Test Address",
                                answer: "Bowling",
                            },
                            expectedMessage: "Password is required",
                        },
                        {
                            field: "phone",
                            emptyBody: {
                                name: "Sheen",
                                email: "sheen@example.com",
                                password: "P@ssword123",
                                phone: "",
                                address: "Test Address",
                                answer: "Bowling",
                            },
                            expectedMessage: "Phone number is required",
                        },
                        {
                            field: "address",
                            emptyBody: {
                                name: "Sheen",
                                email: "sheen@example.com",
                                password: "P@ssword123",
                                phone: "912345678",
                                address: "",
                                answer: "Bowling",
                            },
                            expectedMessage: "Address is required",
                        },
                        {
                            field: "answer",
                            emptyBody: {
                                name: "Sheen",
                                email: "sheen@example.com",
                                password: "P@ssword123",
                                phone: "912345678",
                                address: "Test Address",
                                answer: "",
                            },
                            expectedMessage: "Answer is required",
                        },
                    ])(
                        "should return error if $field is empty string",
                        async ({ emptyBody, expectedMessage }) => {
                            // Arrange
                            const req = { body: emptyBody };

                            // Act
                            await registerController(req, res);

                            // Assert
                            expect(res.send).toHaveBeenCalledWith({
                                success: false,
                                message: expectedMessage,
                            });
                        },
                    );
                });

            });

            describe("Database Errors", () => {
                it("should return error if user already exists", async () => {
                    // Arrange
                    const req = {
                        body: {
                            name: "Sheen",
                            email: "sheen@example.com",
                            password: "P@ssword123",
                            phone: "912345678",
                            address: "Test Address",
                            answer: "Bowling",
                        },
                    };

                    userModel.findOne.mockResolvedValue({
                        _id: "existingUser",
                        email: "sheen@example.com",
                    });

                    // Act
                    await registerController(req, res);

                    // Assert
                    expect(res.status).toHaveBeenCalledWith(200);
                    expect(res.send).toHaveBeenCalledWith({
                        success: false,
                        message: "Already registered, please login",
                    });
                });

                it("should handle database errors", async () => {
                    // Arrange
                    const req = {
                        body: {
                            name: "Sheen",
                            email: "sheen@example.com",
                            password: "P@ssword123",
                            phone: "912345678",
                            address: "Test Address",
                            answer: "Bowling",
                        },
                    };

                    userModel.findOne.mockRejectedValue(new Error("Database error"));

                    // Act
                    await registerController(req, res);

                    // Assert
                    expect(res.status).toHaveBeenCalledWith(500);
                    expect(res.send).toHaveBeenCalledWith({
                        success: false,
                        message: "Error in registration",
                        error: expect.any(Error),
                    });
                });
            });

            describe("Input Boundary Errors", () => {
                describe("special characters in name", () => {
                    test.each([
                        { description: "name with hyphen", name: "Mary-Jane" },
                        { description: "name with apostrophe", name: "O'Connor" },
                        { description: "name with unicode", name: "José García" },
                        { description: "name with numbers", name: "X123" },
                    ])("should accept $description", async ({ name }) => {
                        // Arrange
                        const req = {
                            body: {
                                name: name,
                                email: "test@example.com",
                                password: "P@ssword123",
                                phone: "912345678",
                                address: "Test Address",
                                answer: "Bowling",
                            },
                        };

                        userModel.findOne.mockResolvedValue(null);
                        const mockSave = jest.fn().mockResolvedValue({
                            _id: "123",
                            name: name,
                            email: "test@example.com",
                        });
                        userModel.mockImplementation(() => ({
                            save: mockSave,
                        }));
                        hashPassword.mockResolvedValue("hashedPassword");

                        // Act
                        await registerController(req, res);

                        // Assert
                        expect(res.status).toHaveBeenCalledWith(201);
                        expect(res.send).toHaveBeenCalledWith(
                            expect.objectContaining({
                                success: true,
                                message: "User registered successfully",
                            }),
                        );
                    });
                });
            });
        });
    });

    //Wong Sheen Kerr (A0269647J)
    describe("loginController", () => {
        let res;

        beforeEach(() => {
            res = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn(),
                json: jest.fn(),
            };
            jest.clearAllMocks();
        });

        describe("Success", () => {
            it("should login user successfully with valid credentials", async () => {
                // Arrange
                const req = {
                    body: {
                        email: "sheen@example.com",
                        password: "P@ssword123",
                    },
                };

                const mockUser = {
                    _id: "123",
                    name: "Sheen",
                    email: "sheen@example.com",
                    phone: "912345678",
                    address: "Test Address",
                    role: 0,
                    password: "hashedPassword",
                };

                userModel.findOne.mockResolvedValue(mockUser);
                comparePassword.mockResolvedValue(true);
                JWT.sign.mockReturnValue("testToken");

                // Act
                await loginController(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: true,
                        message: "Login successfully",
                        token: "testToken",
                    }),
                );
            });

            describe("email case sensitivity", () => {
                it("should find user regardless of email case", async () => {
                    // Arrange
                    const req = {
                        body: {
                            email: "SHEEN@EXAMPLE.COM",
                            password: "P@ssword123",
                        },
                    };

                    const mockUser = {
                        _id: "123",
                        name: "Sheen",
                        email: "sheen@example.com",
                        password: "hashedPassword",
                    };

                    userModel.findOne.mockResolvedValue(mockUser);
                    comparePassword.mockResolvedValue(true);
                    JWT.sign.mockReturnValue("testToken");

                    // Act
                    await loginController(req, res);

                    // Assert
                    // The controller passes email as-is to findOne
                    expect(userModel.findOne).toHaveBeenCalledWith({
                        email: "SHEEN@EXAMPLE.COM",
                    });
                });
            });
        });

        describe("Error", () => {
            describe("Validation Errors", () => {
                describe("missing field validation", () => {
                    it.each([
                        {
                            description: "email is missing",
                            body: { password: "P@ssword123" },
                        },
                        {
                            description: "password is missing",
                            body: { email: "sheen@example.com" },
                        },
                        {
                            description: "both email and password are missing",
                            body: {},
                        },
                    ])(
                        "should return error if $description",
                        async ({ body, description }) => {
                            // Arrange
                            const req = { body };

                            // Act
                            await loginController(req, res);

                            // Assert
                            expect(res.status).toHaveBeenCalledWith(404);
                            expect(res.send).toHaveBeenCalledWith({
                                success: false,
                                message: "Invalid email or password",
                            });
                        },
                    );
                });

                describe("empty string validation", () => {
                    it.each([
                        {
                            description: "email is empty string",
                            body: { email: "", password: "P@ssword123" },
                        },
                        {
                            description: "password is empty string",
                            body: { email: "sheen@example.com", password: "" },
                        },
                        {
                            description: "both email and password are empty strings",
                            body: { email: "", password: "" },
                        },
                    ])(
                        "should return error if $description",
                        async ({ body, description }) => {
                            // Arrange
                            const req = { body };

                            // Act
                            await loginController(req, res);

                            // Assert
                            expect(res.status).toHaveBeenCalledWith(404);
                            expect(res.send).toHaveBeenCalledWith({
                                success: false,
                                message: "Invalid email or password",
                            });
                        },
                    );
                });

                it("should return 'Invalid password' for whitespace-only password with valid user", async () => {
                    // Arrange
                    const req = {
                        body: { email: "sheen@example.com", password: "   " },
                    };

                    const mockUser = {
                        _id: "123",
                        name: "Sheen",
                        email: "sheen@example.com",
                        password: "hashedPassword",
                    };

                    userModel.findOne.mockResolvedValue(mockUser);
                    comparePassword.mockResolvedValue(false);

                    // Act
                    await loginController(req, res);

                    // Assert
                    expect(res.status).toHaveBeenCalledWith(401);
                    expect(res.send).toHaveBeenCalledWith({
                        success: false,
                        message: "Invalid password",
                    });
                });
            });
        });

        describe("Authentication Errors", () => {
            it("should return error if email is not found", async () => {
                // Arrange
                const req = {
                    body: {
                        email: "FAKER@example.com",
                        password: "P@ssword123",
                    },
                };

                userModel.findOne.mockResolvedValue(null);

                // Act
                await loginController(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(404);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Email is not registered",
                });
            });

            it("should return error if password is incorrect", async () => {
                // Arrange
                const req = {
                    body: {
                        email: "sheen@example.com",
                        password: "noPassword",
                    },
                };

                const mockUser = {
                    _id: "123",
                    name: "Sheen",
                    email: "sheen@example.com",
                    password: "correctPassword",
                };

                userModel.findOne.mockResolvedValue(mockUser);
                comparePassword.mockResolvedValue(false);

                // Act
                await loginController(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(401);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Invalid password",
                });
            });
        });

        describe("Database Errors", () => {
            it("should handle database errors", async () => {
                // Arrange
                const req = {
                    body: {
                        email: "sheen@example.com",
                        password: "P@ssword123",
                    },
                };

                userModel.findOne.mockRejectedValue(new Error("Database error"));

                // Act
                await loginController(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Error in login",
                    error: expect.any(Error),
                });
            });
        });
    });
});

describe("forgotPasswordController", () => {
    let res;

    beforeEach(() => {
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn(),
        };
        jest.clearAllMocks();
    });

    describe("Success", () => {
        it("should send reset info successfully", async () => {
            // Arrange
            const req = {
                body: {
                    email: "sheen@example.com",
                    answer: "Bowling",
                    newPassword: "newP@ssword123",
                },
            };

            const mockUser = {
                _id: "123",
                email: "sheen@example.com",
                answer: "Bowling",
            };

            userModel.findOne.mockResolvedValue(mockUser);
            hashPassword.mockResolvedValue("hashedNewPassword");
            userModel.findByIdAndUpdate.mockResolvedValue(true);

            // Act
            await forgotPasswordController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "Password reset successfully",
            });
        });
    });

    describe("Error", () => {
        describe("Validation Errors", () => {
            describe("missing field validation", () => {
                it.each([
                    {
                        field: "email",
                        body: { answer: "Bowling", newPassword: "newP@ssword123" },
                        expectedMessage: "Email is required",
                    },
                    {
                        field: "answer",
                        body: {
                            email: "sheen@example.com",
                            newPassword: "newP@ssword123",
                        },
                        expectedMessage: "Answer is required",
                    },
                    {
                        field: "newPassword",
                        body: { email: "sheen@example.com", answer: "Bowling" },
                        expectedMessage: "New password is required",
                    },
                ])(
                    "should return error if $field is missing",
                    async ({ body, expectedMessage }) => {
                        // Arrange
                        const req = { body };

                        // Act
                        await forgotPasswordController(req, res);

                        // Assert
                        expect(res.status).toHaveBeenCalledWith(400);
                        expect(res.send).toHaveBeenCalledWith({
                            success: false,
                            message: expectedMessage,
                        });
                        expect(userModel.findOne).not.toHaveBeenCalled();
                    },
                );
            });

            describe("empty string validation", () => {
                it.each([
                    {
                        field: "email",
                        body: {
                            email: "",
                            answer: "Bowling",
                            newPassword: "newP@ssword123",
                        },
                        expectedMessage: "Email is required",
                    },
                    {
                        field: "answer",
                        body: {
                            email: "sheen@example.com",
                            answer: "",
                            newPassword: "newP@ssword123",
                        },
                        expectedMessage: "Answer is required",
                    },
                    {
                        field: "newPassword",
                        body: {
                            email: "sheen@example.com",
                            answer: "Bowling",
                            newPassword: "",
                        },
                        expectedMessage: "New password is required",
                    },
                ])(
                    "should return error if $field is empty string",
                    async ({ body, expectedMessage }) => {
                        // Arrange
                        const req = { body };

                        // Act
                        await forgotPasswordController(req, res);

                        // Assert
                        expect(res.status).toHaveBeenCalledWith(400);
                        expect(res.send).toHaveBeenCalledWith({
                            success: false,
                            message: expectedMessage,
                        });
                    },
                );
            });
        });

        describe("Database Errors", () => {
            it("should return error if user not found", async () => {
                // Arrange
                const req = {
                    body: {
                        email: "nonexistent@example.com",
                        answer: "Bowling",
                        newPassword: "newP@ssword123",
                    },
                };

                userModel.findOne.mockResolvedValue(null);

                // Act
                await forgotPasswordController(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(404);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Wrong email or answer",
                });
            });

            it("should handle database errors", async () => {
                // Arrange
                const req = {
                    body: {
                        email: "sheen@example.com",
                        answer: "Bowling",
                        newPassword: "newP@ssword123",
                    },
                };

                userModel.findOne.mockRejectedValue(new Error("Database error"));

                // Act
                await forgotPasswordController(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Something went wrong",
                    error: expect.any(Error),
                });
            });
        });
    });
});

//Wong Sheen Kerr (A0269647J)
describe("testController", () => {
    // Debug controller — health check for the auth pipeline.
    // Route: GET /api/v1/auth/test → requireSignIn → isAdmin → testController
    // If can receive "Protected Routes", means both requireSignIn (JWT) and isAdmin middleware passed.
    // If either fails, an error will be returned before reaching here.
    let res;

    beforeEach(() => {
        res = {
            send: jest.fn(),
        };
        jest.clearAllMocks();
    });

    describe("Success", () => {
        it("should return success message for authenticated user", () => {
            // Arrange
            const req = {};

            // Act
            testController(req, res);

            // Assert
            expect(res.send).toHaveBeenCalledWith("Protected Routes");
        });
    });

    describe("Error", () => {
        it("should handle errors in catch block", () => {
            // Arrange
            const req = {};
            const sendError = new Error("Simulated send error");
            const errorRes = {
                send: jest
                    .fn()
                    .mockImplementationOnce(() => {
                        throw sendError;
                    })
                    .mockImplementation(() => { }),
            };

            // Act
            testController(req, errorRes);

            // Assert
            expect(console.log).toHaveBeenCalledWith(sendError);
            expect(errorRes.send).toHaveBeenCalledWith({ error: sendError });
        });
    });

});

// Lim Jia Wei, A0277381W

//import userModel from "../models/userModel.js";
import { getUsersController } from "./authController.js";

// Mock userModel
// jest.mock("../models/userModel.js")

describe("Tests for getUsersController", () => {

    let request;
    let response;

    const mockUsers = [
        {
            name: "admin",
            email: "admin@test.com",
            phone: "123456789",
        },
        {
            name: "user",
            email: "user@test.com",
            phone: "123456789",
        },
    ];

    beforeEach(() => {
        request = {};
        response = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
    })

    afterEach(() => {
        jest.clearAllMocks();
    });

    test("returns 200 after fetching users successfully", async () => {

        // Arrange
        userModel.find.mockResolvedValue(mockUsers);

        // Act
        await getUsersController(request, response);

        // Assert
        expect(response.status).toHaveBeenCalledWith(200);
        expect(response.send).toHaveBeenCalledWith({
            success: true,
            message: "All users fetched successfully",
            users: mockUsers,
        });
        expect(userModel.find).toHaveBeenCalledWith({});

    });

    test("returns 500 after fetching users failed", async () => {

        // Arrange
        userModel.find.mockRejectedValue(mockUsers);

        // Act
        await getUsersController(request, response);

        // Assert
        expect(response.status).toHaveBeenCalledWith(500);
        expect(response.send).toHaveBeenCalledWith({
            success: false,
            message: "Error in getting all users",
            error: mockUsers,
        });
        expect(userModel.find).toHaveBeenCalledWith({});

    });

    test("returns 200 when no users exist", async () => {

        // Arrange
        const mockUsers = [];

        userModel.find.mockResolvedValue(mockUsers);

        // Act
        await getUsersController(request, response);

        // Assert
        expect(response.status).toHaveBeenCalledWith(200);
        expect(response.send).toHaveBeenCalledWith({
            success: true,
            message: "All users fetched successfully",
            users: mockUsers,
        });
        expect(userModel.find).toHaveBeenCalledWith({});

    });

});

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

                /**
                 * AI Usage Declaration
                 * 
                 * Too Used: Gemini 3.0 Pro
                 * 
                 * Prompt: How can I mock method chaining in jest for mongoose query that uses .populate().populate()
                 * 
                 * Response: const mockChainFunction = {
                 *     populate: jest.fn().mockReturnThis(),
                 *     then: function (resolve) {
                 *         resolve(mockOrdersList);
                 *     }
                 * };
                 * 
                 * How the AI output was used:
                 * - I was not sure how to mock the method chaining of .populate() and also ensure
                 * that I can track that the arguments that were passed into the function were correct.
                 * So I used the given code to help me with this particular mocking of Mongoose functions,
                 * since one of the .populate() function returns another function while the 2nd .populate()
                 * function returns the actual data.
                 */
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

                /**
                 * AI Usage Declaration
                 * 
                 * Too Used: Gemini 3.0 Pro
                 * 
                 * Prompt: How can I mock method chaining in jest for mongoose query that uses .populate().populate()
                 * 
                 * Response: const mockChainFunction = {
                 *     populate: jest.fn().mockReturnThis(),
                 *     then: function (resolve) {
                 *         resolve(mockOrdersList);
                 *     }
                 * };
                 * 
                 * How the AI output was used:
                 * - I was not sure how to mock the method chaining of .populate() and also ensure
                 * that I can track that the arguments that were passed into the function were correct.
                 * So I used the given code to help me with this particular mocking of Mongoose functions,
                 * since one of the .populate() function returns another function while the 2nd .populate()
                 * function returns the actual data.
                 */
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
