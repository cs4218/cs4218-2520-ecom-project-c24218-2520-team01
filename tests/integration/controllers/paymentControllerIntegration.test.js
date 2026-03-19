import { beforeAll, afterAll, beforeEach, describe, test, expect, jest } from "@jest/globals";
import {
    braintreeTokenController,
    brainTreePaymentController
} from "../../../controllers/productController.js";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import express from "express";
import productRoutes from "../../../routes/productRoutes.js";
import dotenv from "dotenv";
import JWT from "jsonwebtoken";
import orderModel from "../../../models/orderModel.js";
import userModel from "../../../models/userModel.js";
import categoryModel from "../../../models/categoryModel.js";
import productModel from "../../../models/productModel.js";
import path from "path";
import fs from "fs";

// Written by Nicholas Cheng, A0269648H

const FIXTURE_IMAGE = path.resolve(__dirname, "../../../fixtures/test-image.jpg");

// Mock console.log to prevent it from printing to the terminal
jest.spyOn(console, "log").mockImplementation(() => { });

describe("Braintree token controller integration tests with BrainTree & Database", () => {
    describe("Generate braintree token", () => {
        describe("Successfully generates a token", () => {
            // There is no database involved in this function we we just test with the Braintree API
            test("Successfully generate a braintree token from the Braintree API", async () => {
                let req, res;

                req = {};

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
                expect(response.data.data).toBeDefined();

                // The braintree response should contain a clientToken
                expect(response.data.data.clientToken).toBeDefined();
                expect(response.data.data.clientToken.length).toBeGreaterThan(0);
            }, 15000); // 15 seconds timeout for external API call
        });
    });

    describe("Making payment", () => {

        // Store this to inject the data into the request
        let mongoServer, user, category, product1, product2, product3;

        beforeAll(async () => {
            mongoServer = await MongoMemoryServer.create();
            const uri = mongoServer.getUri();
            await mongoose.connect(uri);

            // Create a user
            user = await new userModel({
                name: "Jane Doe",
                email: "jane@example.com",
                password: "password123",
                phone: "123456789",
                address: "123 Main St",
                answer: "yes"
            }).save();

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

        describe("Successfully places a payment", () => {

            afterEach(async () => {
                // Just clear any orders we have created
                await orderModel.deleteMany({});
            });

            test("Successfully make a payment and save order to database", async () => {
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

                expect(response.statusCode).toBe(200);
                expect(response.data.ok).toBe(true);

                // Verify order was saved in DB
                const orders = await orderModel.find({});
                expect(orders.length).toBe(1);
                expect(orders[0].buyer.toString()).toBe(req.user._id.toString());
                expect(orders[0].products.length).toBe(2);
                expect(orders[0].payment).toBeDefined();
            }, 15000);

            // Bug found : Value cannot be 0
            test("Successfully make a payment and save order to database with a total cost of 0", async () => {
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

                expect(response.statusCode).toBe(400);
                expect(response.data.success).toBe(false);
                expect(response.data.message).toBe("Payment method nonce is not provided");

                // Check database state
                const orders = await orderModel.find({});
                expect(orders.length).toBe(0);
            });

            test("No order is created when cart is empty", async () => {
                const req = {
                    body: {
                        nonce: "fake-valid-nonce",
                        cart: []
                    },
                    user: {
                        _id: user._id
                    }
                };

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

                expect(response.statusCode).toBe(400);
                expect(response.data.success).toBe(false);
                expect(response.data.message).toBe("No transaction is made because cart is empty");

                // Check database state
                const orders = await orderModel.find({});
                expect(orders.length).toBe(0);
            });

            test("No order is created when user id is not provided", async () => {
                const req = {
                    body: {
                        nonce: "fake-valid-nonce",
                        cart: [
                            product1,
                            product2
                        ]
                    },
                };

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

                expect(response.statusCode).toBe(400);
                expect(response.data.success).toBe(false);
                expect(response.data.message).toBe("User id is not provided");

                // Check database state
                const orders = await orderModel.find({});
                expect(orders.length).toBe(0);
            });

            // Bug found : Needs to be result.success not just result
            test("No order is created when nonce is invalid", async () => {
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

                expect(response.statusCode).toBe(500);
                expect(response.data.success).toBe(false);
                expect(response.data.message).toBe("Error while making transaction");

                // Check database state
                const orders = await orderModel.find({});
                expect(orders.length).toBe(0);
            }, 15000);

            test("No order is created when the bank rejects a transaction", async () => {
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

                expect(response.statusCode).toBe(500);
                expect(response.data.success).toBe(false);
                expect(response.data.message).toBe("Error while making transaction");

                // Check database state
                const orders = await orderModel.find({});
                expect(orders.length).toBe(0);
            }, 15000);
        });

        describe("Database errors", () => {

            // Tempoarely close the database connection
            beforeAll(async () => {
                await mongoose.connection.close();
            });

            // Reconnect to the database after all tests are done
            afterAll(async () => {
                const uri = mongoServer.getUri();
                await mongoose.connect(uri);
            });

            test("No order is created when the database is not connected", async () => {

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

                // No need to check the database state because the database is disconnected
                expect(response.statusCode).toBe(500);
                expect(response.data.success).toBe(false);
                expect(response.data.message).toBe("Cannot connect to the database");
            });
        });
    });
});

describe("Braintree token controller integration tests with BrainTree, Database, Express router & authMiddleware", () => {
    let app, mongoServer;
    let user, token, category, product1, product2, product3;

    beforeAll(async () => {

        // Setup Express App
        app = express();
        app.use(express.json());
        app.use("/api/v1/product", productRoutes);

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

    afterEach(async () => {
        // Clear orders after each test
        await orderModel.deleteMany({});
    });

    describe("Fetch braintree token API request", () => {
        test("Generate and retrieve a braintree client token", async () => {
            const response = await request(app).get("/api/v1/product/braintree/token");
            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(response.body.data.clientToken).toBeDefined();
        }, 15000);
    });
});