import { beforeAll, afterAll, beforeEach, afterEach, describe, test, expect, jest } from "@jest/globals";
import {
    braintreeTokenController,
    brainTreePaymentController
} from "../../../controllers/productController.js";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import express from "express";
import productRoutes from "../../../routes/productRoutes.js";
import JWT from "jsonwebtoken";
import orderModel from "../../../models/orderModel.js";
import userModel from "../../../models/userModel.js";
import categoryModel from "../../../models/categoryModel.js";
import productModel from "../../../models/productModel.js";
import path from "path";
import fs from "fs";

const FIXTURE_IMAGE = path.resolve(__dirname, "../../../fixtures/test-image.jpg");

// Written by Nicholas Cheng, A0269648H

// Mock console.log to prevent it from printing to the terminal
jest.spyOn(console, "log").mockImplementation(() => { });

let mongoServer;
let user, token, category, product1, product2, product3;

beforeAll(async () => {

    // Setup MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Create dummy data
    // Create a user
    user = await new userModel({
        name: "Jane Doe",
        email: "jane@example.com",
        password: "password123",
        phone: "123456789",
        address: "123 Main St",
        answer: "yes"
    }).save();

    // Create a user token using the JWT_SECRET from .env
    token = JWT.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

    // Create a category
    category = await new categoryModel({
        name: "Electronics",
        slug: "electronics"
    }).save();

    // Create some products
    product1 = await new productModel({
        name: "Laptop",
        slug: "laptop",
        description: "A fast laptop",
        price: 3000, // This price will trigger a Braintree no response according to their testing documentation
        category: category._id,
        quantity: 5,
        photo: {
            data: fs.readFileSync(FIXTURE_IMAGE),
            contentType: FIXTURE_IMAGE.type
        }
    }).save();

    product2 = await new productModel({
        name: "Keyboard",
        slug: "keyboard",
        description: "A super mechanical keyboard",
        price: 2000, // This price will trigger a bank transaction declined error
        category: category._id,
        quantity: 10,
        photo: {
            data: fs.readFileSync(FIXTURE_IMAGE),
            contentType: FIXTURE_IMAGE.type
        }
    }).save();

    product3 = await new productModel({
        name: "Mouse",
        slug: "mouse",
        description: "A FREE mouse",
        price: 0,
        category: category._id,
        quantity: 0,
        photo: {
            data: fs.readFileSync(FIXTURE_IMAGE),
            contentType: FIXTURE_IMAGE.type
        }
    }).save();
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe("Integration test with Braintree & Generate Token Controller", () => {
    describe("Successfully generates a token", () => {
        // There is no database involved in this function we we just test with the Braintree API
        test("Successfully generate a braintree token from the Braintree API", async () => {
            let req, res;

            req = {};

            // Arrange & Act
            const response = await new Promise((resolve, reject) => {
                res = {
                    status: jest.fn().mockReturnThis(),
                    send: jest.fn((data) => {
                        resolve({
                            statusCode: res.status.mock.calls[0][0], // To get the status code from the mocked function of status
                            data: data
                        });
                    }),
                };

                try {
                    braintreeTokenController(req, res);
                } catch (error) {
                    reject(error);
                }
            });

            // Assertions
            expect(response.statusCode).toBe(200);
            expect(response.data).toBeDefined();

            // The braintree response should contain a clientToken
            expect(response.data.clientToken).toBeDefined();
            expect(response.data.clientToken.length).toBeGreaterThan(0);
        }, 15000); // 15 seconds timeout for external API call
    });
});

describe("Integration test with Braintree & Payment Controller & Database", () => {
    /**
     * NOTE: Braintree has a failsafe for duplicate transaction request sent to their server.
     * This interval is within 30 seconds, so if the integration test were to be repeated in quick succession,
     * some of the integration test will fail because it is sending the exact same transaction request within this timeframe.
     */
    afterEach(async () => {
        // Just clear any orders we have created
        await orderModel.deleteMany({});
    });

    describe("Successfully places a payment", () => {

        test("Successfully make a payment and save order to database", async () => {
            // Arrange
            const req = {
                body: {
                    nonce: "fake-valid-nonce",
                    cart: [
                        product1,
                        product2
                    ]
                },
                user: {
                    _id: user._id
                }
            };

            // Act
            const response = await new Promise((resolve, reject) => {
                const res = {
                    status: jest.fn().mockReturnThis(),
                    json: jest.fn((data) => {
                        resolve({
                            statusCode: res.status.mock.calls[0][0],
                            data: data
                        });
                    }),
                    send: jest.fn((data) => {
                        resolve({
                            statusCode: res.status.mock.calls[0][0],
                            data: data
                        });
                    })
                };

                try {
                    brainTreePaymentController(req, res);
                } catch (error) {
                    reject(error);
                }
            });

            // Assert
            expect(response.statusCode).toBe(200);
            expect(response.data.ok).toBe(true);

            // Verify order was saved in DB
            const orders = await orderModel.find({});
            expect(orders.length).toBe(1);
            expect(orders[0].buyer.toString()).toBe(req.user._id.toString());
            expect(orders[0].products.length).toBe(2);
            expect(orders[0].payment).toBeDefined();
        }, 15000);

        test("Successfully make a payment and save order to database with a total cost of 0", async () => {
            // Arrange
            const req = {
                body: {
                    nonce: "fake-valid-nonce",
                    cart: [
                        product3
                    ]
                },
                user: {
                    _id: user._id
                }
            };

            // Act
            const response = await new Promise((resolve, reject) => {
                const res = {
                    status: jest.fn().mockReturnThis(),
                    json: jest.fn((data) => {
                        resolve({
                            statusCode: res.status.mock.calls[0][0],
                            data: data
                        });
                    }),
                    send: jest.fn((data) => {
                        resolve({
                            statusCode: res.status.mock.calls[0][0],
                            data: data
                        });
                    })
                };

                try {
                    brainTreePaymentController(req, res);
                } catch (error) {
                    reject(error);
                }
            });

            // Assert
            expect(response.statusCode).toBe(200);
            expect(response.data.ok).toBe(true);

            // Verify order was saved in DB
            const orders = await orderModel.find({});
            expect(orders.length).toBe(1);
            expect(orders[0].buyer.toString()).toBe(req.user._id.toString());
            expect(orders[0].products.length).toBe(1);
            expect(orders[0].payment).toBeDefined();
        }, 15000);
    });

    describe("Missing fields or validation errors", () => {
        test("No order is created when no nonce is provided", async () => {
            // Arrange
            const req = {
                body: {
                    cart: [
                        product1,
                        product2
                    ]
                },
                user: {
                    _id: user._id
                }
            };

            // Act
            const response = await new Promise((resolve, reject) => {
                const res = {
                    status: jest.fn().mockReturnThis(),
                    send: jest.fn((data) => {
                        resolve({
                            statusCode: res.status.mock.calls[0][0],
                            data: data
                        });
                    })
                };

                try {
                    brainTreePaymentController(req, res);
                } catch (error) {
                    reject(error);
                }
            });

            // Assert
            expect(response.statusCode).toBe(400);
            expect(response.data.success).toBe(false);
            expect(response.data.message).toBe("Payment method nonce is not provided");

            // Check database state
            const orders = await orderModel.find({});
            expect(orders.length).toBe(0);
        });

        test("No order is created when cart is empty", async () => {
            // Arrange
            const req = {
                body: {
                    nonce: "fake-valid-nonce",
                    cart: []
                },
                user: {
                    _id: user._id
                }
            };

            // Act
            const response = await new Promise((resolve, reject) => {
                const res = {
                    status: jest.fn().mockReturnThis(),
                    send: jest.fn((data) => {
                        resolve({
                            statusCode: res.status.mock.calls[0][0],
                            data: data
                        });
                    })
                };

                try {
                    brainTreePaymentController(req, res);
                } catch (error) {
                    reject(error);
                }
            });

            // Assert
            expect(response.statusCode).toBe(400);
            expect(response.data.success).toBe(false);
            expect(response.data.message).toBe("No transaction is made because cart is empty");

            // Check database state
            const orders = await orderModel.find({});
            expect(orders.length).toBe(0);
        });

        test("No order is created when user id is not provided", async () => {
            // Arrange
            const req = {
                body: {
                    nonce: "fake-valid-nonce",
                    cart: [
                        product1,
                        product2
                    ]
                },
            };

            // Act
            const response = await new Promise((resolve, reject) => {
                const res = {
                    status: jest.fn().mockReturnThis(),
                    send: jest.fn((data) => {
                        resolve({
                            statusCode: res.status.mock.calls[0][0],
                            data: data
                        });
                    })
                };

                try {
                    brainTreePaymentController(req, res);
                } catch (error) {
                    reject(error);
                }
            });

            // Assert
            expect(response.statusCode).toBe(400);
            expect(response.data.success).toBe(false);
            expect(response.data.message).toBe("User id is not provided");

            // Check database state
            const orders = await orderModel.find({});
            expect(orders.length).toBe(0);
        });

        test("No order is created when nonce is invalid", async () => {
            // Arrange
            const req = {
                body: {
                    nonce: "fake-consumed-nonce", // This is just one of the many invalid nonce values which Braintree provides
                    cart: [
                        product1,
                        product2
                    ]
                },
                user: {
                    _id: user._id
                }
            };

            // Act
            const response = await new Promise((resolve, reject) => {
                const res = {
                    status: jest.fn().mockReturnThis(),
                    send: jest.fn((data) => {
                        resolve({
                            statusCode: res.status.mock.calls[0][0],
                            data: data
                        });
                    }),
                    json: jest.fn((data) => {
                        resolve({
                            statusCode: res.status.mock.calls[0][0],
                            data: data
                        });
                    })
                };

                try {
                    brainTreePaymentController(req, res);
                } catch (error) {
                    reject(error);
                }
            });

            // Assert
            expect(response.statusCode).toBe(500);
            expect(response.data.success).toBe(false);
            expect(response.data.message).toBe("Error while making transaction");

            // Check database state
            const orders = await orderModel.find({});
            expect(orders.length).toBe(0);
        }, 15000);
    });

    describe("Braintree errors", () => {
        test("No order is created when Braintree is not responding", async () => {
            // Arrange
            const req = {
                body: {
                    nonce: "fake-valid-nonce",
                    cart: [
                        product1 // Sending a 3000 as amount will return a Braintree error 3000 which is when the server is unresponsive
                    ]
                },
                user: {
                    _id: user._id
                }
            };

            // Act
            const response = await new Promise((resolve, reject) => {
                const res = {
                    status: jest.fn().mockReturnThis(),
                    send: jest.fn((data) => {
                        resolve({
                            statusCode: res.status.mock.calls[0][0],
                            data: data
                        });
                    }),
                    json: jest.fn((data) => {
                        resolve({
                            statusCode: res.status.mock.calls[0][0],
                            data: data
                        });
                    })
                };

                try {
                    brainTreePaymentController(req, res);
                } catch (error) {
                    reject(error);
                }
            });

            // Assert
            expect(response.statusCode).toBe(500);
            expect(response.data.success).toBe(false);
            expect(response.data.message).toBe("Error while making transaction");

            // Check database state
            const orders = await orderModel.find({});
            expect(orders.length).toBe(0);
        }, 15000);

        test("No order is created when the bank rejects a transaction", async () => {
            // Arrange
            const req = {
                body: {
                    nonce: "fake-valid-nonce",
                    cart: [
                        product2 // Sending 2000 as amount will return a Braintree error 2038 which is when the bank rejects a transaction
                    ]
                },
                user: {
                    _id: user._id
                }
            };

            // Act
            const response = await new Promise((resolve, reject) => {
                const res = {
                    status: jest.fn().mockReturnThis(),
                    send: jest.fn((data) => {
                        resolve({
                            statusCode: res.status.mock.calls[0][0],
                            data: data
                        });
                    }),
                    json: jest.fn((data) => {
                        resolve({
                            statusCode: res.status.mock.calls[0][0],
                            data: data
                        });
                    })
                };

                try {
                    brainTreePaymentController(req, res);
                } catch (error) {
                    reject(error);
                }
            });

            // Assert
            expect(response.statusCode).toBe(500);
            expect(response.data.success).toBe(false);
            expect(response.data.message).toBe("Error while making transaction");

            // Check database state
            const orders = await orderModel.find({});
            expect(orders.length).toBe(0);
        }, 15000);
    });
});

describe("Braintree token controller integration tests with BrainTree, Database, Express router & authMiddleware", () => {

    let app;

    beforeAll(async () => {
        // Setup Express App
        app = express();
        app.use(express.json());
        app.use("/api/v1/product", productRoutes);
    });

    afterEach(async () => {
        // Clear orders after each test
        await orderModel.deleteMany({});
    });

    describe("Fetch braintree token API request", () => {
        test("Generate and retrieve a braintree client token", async () => {
            // Act
            const response = await request(app).get("/api/v1/product/braintree/token");

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.clientToken).toBeDefined();
        }, 15000);
    });

    describe("Send payment request through the API endpoint", () => {
        describe("Successfully make a payment with valid inputs", () => {
            test("Successfully make a payment with valid token and save order to database", async () => {
                // Arrange & Act
                const response = await request(app)
                    .post("/api/v1/product/braintree/payment")
                    .set("Authorization", token)
                    .send({
                        nonce: "fake-valid-commercial-nonce",
                        cart: [product1, product2]
                    });

                // Assert
                expect(response.status).toBe(200);
                expect(response.body.ok).toBe(true);

                // Verify order in database
                const orders = await orderModel.find({});
                expect(orders.length).toBe(1);
                expect(orders[0].buyer.toString()).toBe(user._id.toString());
                expect(orders[0].products.length).toBe(2);
            }, 15000);

            test("Successfully make a payment with a total cost of 0 and save order to database", async () => {
                // Arrange & Act
                const response = await request(app)
                    .post("/api/v1/product/braintree/payment")
                    .set("Authorization", token)
                    .send({
                        nonce: "fake-valid-commercial-nonce",
                        cart: [product3]
                    });

                // Assert
                expect(response.status).toBe(200);
                expect(response.body.ok).toBe(true);

                // Verify order in database
                const orders = await orderModel.find({});
                expect(orders.length).toBe(1);
                expect(orders[0].buyer.toString()).toBe(user._id.toString());
                expect(orders[0].products.length).toBe(1);
            }, 15000);
        });

        describe("Sending a payment request with invalid inputs", () => {
            test("Sending a payment request with no nonce", async () => {
                // Arrange & Act
                const response = await request(app)
                    .post("/api/v1/product/braintree/payment")
                    .set("Authorization", token)
                    .send({
                        cart: [product1, product2]
                    });

                // Assert
                expect(response.status).toBe(400);
                expect(response.body.success).toBe(false);
            }, 15000);

            test("Sending a payment request with invalid nonce", async () => {
                // Arrange & Act
                const response = await request(app)
                    .post("/api/v1/product/braintree/payment")
                    .set("Authorization", token)
                    .send({
                        nonce: "fake-luhn-invalid-nonce",
                        cart: [product1, product2]
                    });

                // Assert
                expect(response.status).toBe(500);
                expect(response.body.success).toBe(false);
            }, 15000);

            test("Sending a payment request with empty cart", async () => {
                // Arrange & Act
                const response = await request(app)
                    .post("/api/v1/product/braintree/payment")
                    .set("Authorization", token)
                    .send({
                        nonce: "fake-valid-nonce",
                        cart: []
                    });

                // Assert
                expect(response.status).toBe(400);
                expect(response.body.success).toBe(false);
            }, 15000);
        });

        describe("Sending a payment request when braintree server is down", () => {
            test("Fails to make payment if braintree server is down", async () => {
                // Arrange & Act
                const response = await request(app)
                    .post("/api/v1/product/braintree/payment")
                    .set("Authorization", token)
                    .send({
                        nonce: "fake-valid-nonce",
                        cart: [product1]
                    });

                // Assert
                expect(response.status).toBe(500);
                expect(response.body.success).toBe(false);

                // Verify NO order in database
                const orders = await orderModel.find({});
                expect(orders.length).toBe(0);
            }, 15000);

            test("Fails to make payment if the bank rejects the transaction", async () => {
                // Arrange & Act
                const response = await request(app)
                    .post("/api/v1/product/braintree/payment")
                    .set("Authorization", token)
                    .send({
                        nonce: "fake-valid-nonce",
                        cart: [product2]
                    });

                // Assert
                expect(response.status).toBe(500);
                expect(response.body.success).toBe(false);

                // Verify NO order in database
                const orders = await orderModel.find({});
                expect(orders.length).toBe(0);
            }, 15000);
        });

        describe("Sending a payment request when the user is not authenticated", () => {
            test("Fails to make payment if no token is provided", async () => {
                // Arrange & Act
                const response = await request(app)
                    .post("/api/v1/product/braintree/payment")
                    .send({
                        nonce: "fake-valid-nonce",
                        cart: [product1, product2]
                    });

                // Assert
                expect(response.status).toBe(401);
                expect(response.body.success).toBe(false);

                // Verify NO order in database
                const orders = await orderModel.find({});
                expect(orders.length).toBe(0);
            }, 15000);

            test("Fails to make payment if token is invalid", async () => {
                // Arrange & Act
                const response = await request(app)
                    .post("/api/v1/product/braintree/payment")
                    .set("Authorization", "invalid-token")
                    .send({
                        nonce: "fake-valid-nonce",
                        cart: [product1, product2]
                    });

                // Assert
                expect(response.status).toBe(401);
                expect(response.body.success).toBe(false);

                // Verify NO order in database
                const orders = await orderModel.find({});
                expect(orders.length).toBe(0);
            }, 15000);
        });
    });
});