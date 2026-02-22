import { afterEach, beforeEach, describe, test, expect, jest } from "@jest/globals";

// Mocking of braintree was written by Nicholas Cheng, A0269648H

// Mock braintree
// This is used to modify the return values of the callback function
let mockTokenGenerateError, mockTokenGenerateResponse, mockPaymentError, mockPaymentResponse;
// We need to mock the implementation here because in productController.js braintree is
// initialised at the start of the file.
jest.mock('braintree', () => {
    /**
     * Attribute: https://stackoverflow.com/questions/47155523/jest-mocking-a-function-that-uses-callbacks
     * 
     * How was this used:
     * - braintree's functions takes in a callback function which I will need to mock to ensure that
     * the callback is called with the correct parameters and the correct return values
     * and the communication within the callback. So I used this code as a reference to help me
     * with mocking braintree's functions.
     */
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

        /**
         * AI Usage Declaration
         * 
         * Too Used: Gemini 3.0 Pro
         * 
         * Prompt: I declared the mocked braintree and its functionality at the top of the file how can I make it so that I can access the mocked function from the test cases?
         * 
         * Response:
         * let mockCallbackError, mockCallbackResponse;
         * jest.mock('braintree', () => {
         *    const internalMockGenerate = jest.fn().mockImplementation((params, callback) => {
         *        callback(mockCallbackError, mockCallbackResponse);
         *    });
         *    return {
         *        Environment: {
         *            Sandbox: 'sandbox',
         *        },
         *        BraintreeGateway: jest.fn().mockImplementation(() => {
         *            return {
         *                clientToken: {
         *                    generate: internalMockGenerate // Attach it to the gateway
         *                }
         *            };
         *        }),
         *        _exposedGenerateMock: internalMockGenerate 
         *    };
         * });
         * 
         * How the AI output was used:
         * - I used the AI's suggestion to set the mocked function as a property of the mocked braintree object
         * so that I can access it from the test cases as a variable so that I can check if the function was called
         * with the correct parameters and the correct return values.
         */
        // Expose the const so we can access the mock later in our tests
        _exposedGenerateMock: generateFunctionMock,
        _exposedPaymentMock: paymentFunctionMock
    };
});
jest.mock("../models/productModel.js");
jest.mock("../models/categoryModel.js");
jest.mock("../models/orderModel.js");
jest.mock("fs");
jest.mock("slugify");
// Mock console.log to prevent it from printing to the terminal
jest.spyOn(console, 'log').mockImplementation(() => { });

import braintree from "braintree";
import fs from "fs";
import slugify from "slugify";
import categoryModel from "../models/categoryModel.js";
import orderModel from "../models/orderModel.js";
import productModel from "../models/productModel.js";
import {
    createProductController,
    deleteProductController,
    getProductController,
    getSingleProductController,
    productCategoryController,
    productCountController,
    productFiltersController,
    productListController,
    productPhotoController,
    relatedProductController,
    searchProductController,
    updateProductController,
    braintreeTokenController,
    brainTreePaymentController
} from "./productController.js";

// Written by A0273278U (Zaidan)
describe("Product CRUD", () => {
    describe("createProductController", () => {
        let req, res;

        beforeEach(() => {
            jest.clearAllMocks();

            req = {
                fields: {
                    name: "Test Product",
                    description: "Test Description",
                    price: 100,
                    category: "category-id",
                    quantity: 10,
                    shipping: true,
                },
                files: {
                    photo: {
                        path: "/tmp/photo.jpg",
                        type: "image/jpeg",
                        size: 500000,
                    },
                },
            };

            res = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn(),
            };
        });

        describe("Successful - all fields available", () => {
            test("returns 201 when all fields are provided", async () => {
                slugify.mockReturnValue("test-product");
                fs.readFileSync.mockReturnValue(Buffer.from("fake-image-data"));

                const mockProduct = {
                    ...req.fields,
                    slug: "test-product",
                    photo: { data: null, contentType: null },
                    save: jest.fn().mockResolvedValue(true),
                };

                productModel.mockImplementation(() => mockProduct);

                await createProductController(req, res);

                expect(slugify).toHaveBeenCalledWith("Test Product");
                expect(fs.readFileSync).toHaveBeenCalledWith("/tmp/photo.jpg");
                expect(mockProduct.save).toHaveBeenCalled();
                expect(res.status).toHaveBeenCalledWith(201);
                expect(res.send).toHaveBeenCalledWith({
                    success: true,
                    message: "Product Created Successfully",
                    products: mockProduct,
                });
            });
        });

        describe("Validation errors - missing required fields", () => {
            test("returns error when name is missing", async () => {
                req.fields.name = null;

                await createProductController(req, res);

                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith({
                    error: "Name is Required",
                });
            });

            test("returns error when description is missing", async () => {
                req.fields.description = null;

                await createProductController(req, res);

                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith({
                    error: "Description is Required",
                });
            });

            test("returns error when price is missing", async () => {
                req.fields.price = null;

                await createProductController(req, res);

                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith({
                    error: "Price is Required",
                });
            });

            test("returns error when category is missing", async () => {
                req.fields.category = null;

                await createProductController(req, res);

                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith({
                    error: "Category is Required",
                });
            });

            test("returns error when quantity is missing", async () => {
                req.fields.quantity = null;

                await createProductController(req, res);

                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith({
                    error: "Quantity is Required",
                });
            });

            test("returns error when photo is missing", async () => {
                req.files.photo = null;

                await createProductController(req, res);

                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith({
                    error: "Photo is Required",
                });
            });

            test("returns error when photo exceeds 1MB", async () => {
                req.files.photo = {
                    path: "/tmp/photo.jpg",
                    type: "image/jpeg",
                    size: 2000000,
                };

                await createProductController(req, res);

                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith({
                    error: "Photo Should Be Smaller Than 1MB",
                });
            });
        });

        describe("Database error", () => {
            test("returns 500 when there is a database error", async () => {
                const error = new Error("Database connection failed");

                productModel.mockImplementation(() => {
                    throw new Error("Database connection failed");
                });

                await createProductController(req, res);

                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Error in creating product",
                    error,
                });
            });
        });
    });

    describe("deleteProductController", () => {
        let req, res, product;

        beforeEach(() => {
            jest.clearAllMocks();

            product = {
                _id: "60d5ecb54b24a10015f1e3d1",
                name: "item",
                slug: "item",
                description: "description",
                price: 999,
                category: "60d5ecb54b24a10015f1e3c1",
                quantity: 1,
                shipping: true,
                createdAt: "2026-01-15T10:30:00.000Z",
                updatedAt: "2026-01-15T10:30:00.000Z",
            };

            res = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn(),
            };
        });

        describe("Successful", () => {
            test("returns 200 when pid exists and deletes product", async () => {
                req = {
                    params: {
                        pid: "60d5ecb54b24a10015f1e3d1",
                    },
                };
                productModel.findByIdAndDelete.mockReturnValue(product);

                await deleteProductController(req, res);

                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith({
                    success: true,
                    message: "Product deleted successfully",
                    product,
                });
            });
        });

        describe("Errors", () => {
            describe("Validation errors", () => {
                test("returns 404 if pid not in database", async () => {
                    req = {
                        params: {
                            pid: "60d5ecb54b24a10015f1e3d1",
                        },
                    };
                    productModel.findByIdAndDelete.mockResolvedValue(null);

                    await deleteProductController(req, res);

                    expect(res.status).toHaveBeenCalledWith(404);
                    expect(res.send).toHaveBeenCalledWith({
                        success: false,
                        message: "Product does not exist",
                    });
                });
                test("returns 400 if pid malformed", async () => {
                    req = {
                        params: {
                            pid: ["60d5ecb54b24a10015f1e3d1"],
                        },
                    };

                    const error = new Error("Cast to ObjectId failed");
                    error.name = "CastError";
                    productModel.findByIdAndDelete.mockRejectedValue(error);

                    await deleteProductController(req, res);

                    expect(res.status).toHaveBeenCalledWith(400);
                    expect(res.send).toHaveBeenCalledWith({
                        success: false,
                        message: "Invalid product ID format",
                        error,
                    });
                });
                test("returns 400 if no pid in params", async () => {
                    req = {
                        params: {},
                    };

                    await deleteProductController(req, res);

                    expect(res.status).toHaveBeenCalledWith(400);
                    expect(res.send).toHaveBeenCalledWith({
                        success: false,
                        message: "Product ID is required",
                    });
                });
            });

            describe("Database error", () => {
                test("returns 500 when there is a database error", async () => {
                    const error = new Error("Database connection failed");

                    req = {
                        params: {
                            pid: "0",
                        },
                    };

                    productModel.findByIdAndDelete.mockRejectedValue(error);

                    await deleteProductController(req, res);

                    expect(res.status).toHaveBeenCalledWith(500);
                    expect(res.send).toHaveBeenCalledWith({
                        success: false,
                        message: "Error while deleting product",
                        error,
                    });
                });
            });
        });
    });

    describe("updateProductController", () => {
        let req, res;

        beforeEach(() => {
            jest.clearAllMocks();

            req = {
                params: {
                    pid: "010",
                },
                fields: {
                    name: "Test Product",
                    description: "Test Description",
                    price: 100,
                    category: "category-id",
                    quantity: 10,
                    shipping: true,
                },
                files: {
                    photo: {
                        path: "/tmp/photo.jpg",
                        type: "image/jpeg",
                        size: 500000,
                    },
                },
            };

            res = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn(),
            };
        });

        describe("Successful - all fields available", () => {
            test("returns 201 when all fields are provided", async () => {
                slugify.mockReturnValue("test-product");
                fs.readFileSync.mockReturnValue(Buffer.from("fake-image-data"));

                const product = {
                    ...req.fields,
                    slug: "test-product",
                    photo: { data: null, contentType: null },
                    save: jest.fn().mockResolvedValue(true),
                };

                productModel.findByIdAndUpdate.mockResolvedValue(product);

                await updateProductController(req, res);

                expect(fs.readFileSync).toHaveBeenCalledWith("/tmp/photo.jpg");
                expect(product.save).toHaveBeenCalled();
                expect(res.status).toHaveBeenCalledWith(201);
                expect(res.send).toHaveBeenCalledWith({
                    success: true,
                    message: "Product Updated Successfully",
                    products: product,
                });
            });
        });

        describe("Errors", () => {
            describe("Validation errors - missing required fields", () => {
                test("returns error when pid is missing", async () => {
                    req.params.pid = null;

                    await updateProductController(req, res);

                    expect(res.status).toHaveBeenCalledWith(500);
                    expect(res.send).toHaveBeenCalledWith({
                        error: "PID is Required",
                    });
                });
                test("returns error when name is missing", async () => {
                    req.fields.name = null;

                    await updateProductController(req, res);

                    expect(res.status).toHaveBeenCalledWith(500);
                    expect(res.send).toHaveBeenCalledWith({
                        error: "Name is Required",
                    });
                });

                test("returns error when description is missing", async () => {
                    req.fields.description = null;

                    await updateProductController(req, res);

                    expect(res.status).toHaveBeenCalledWith(500);
                    expect(res.send).toHaveBeenCalledWith({
                        error: "Description is Required",
                    });
                });

                test("returns error when price is missing", async () => {
                    req.fields.price = null;

                    await updateProductController(req, res);

                    expect(res.status).toHaveBeenCalledWith(500);
                    expect(res.send).toHaveBeenCalledWith({
                        error: "Price is Required",
                    });
                });

                test("returns error when category is missing", async () => {
                    req.fields.category = null;

                    await updateProductController(req, res);

                    expect(res.status).toHaveBeenCalledWith(500);
                    expect(res.send).toHaveBeenCalledWith({
                        error: "Category is Required",
                    });
                });

                test("returns error when quantity is missing", async () => {
                    req.fields.quantity = null;

                    await updateProductController(req, res);

                    expect(res.status).toHaveBeenCalledWith(500);
                    expect(res.send).toHaveBeenCalledWith({
                        error: "Quantity is Required",
                    });
                });

                test("returns error when photo is missing", async () => {
                    req.files.photo = null;

                    await updateProductController(req, res);

                    expect(res.status).toHaveBeenCalledWith(500);
                    expect(res.send).toHaveBeenCalledWith({
                        error: "Photo is Required",
                    });
                });

                test("returns error when photo exceeds 1MB", async () => {
                    req.files.photo = {
                        path: "/tmp/photo.jpg",
                        type: "image/jpeg",
                        size: 2000000,
                    };

                    await updateProductController(req, res);

                    expect(res.status).toHaveBeenCalledWith(500);
                    expect(res.send).toHaveBeenCalledWith({
                        error: "Photo Should Be Smaller Than 1MB",
                    });
                });
            });

            describe("Database errors", () => {
                test("returns 500 when there is a database error", async () => {
                    const error = new Error("Database connection failed");
                    productModel.findByIdAndUpdate.mockRejectedValue(error);

                    await updateProductController(req, res);

                    expect(res.status).toHaveBeenCalledWith(500);
                    expect(res.send).toHaveBeenCalledWith({
                        success: false,
                        message: "Error in updating product",
                        error,
                    });
                });
            });
        });
    });

    describe("getProductController", () => {
        let req, res;

        beforeEach(() => {
            jest.clearAllMocks();

            req = {};

            res = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn(),
            };
        });
        describe("Successful", () => {
            test("returns 200 with products when successful", async () => {
                const products = [{ name: "product" }];
                productModel.find.mockReturnValue({
                    populate: jest.fn().mockReturnThis(),
                    select: jest.fn().mockReturnThis(),
                    limit: jest.fn().mockReturnThis(),
                    sort: jest.fn().mockResolvedValue(products),
                });

                await getProductController(req, res);

                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith({
                    success: true,
                    counTotal: 1,
                    message: "All Products: ",
                    products: products,
                });
            });
        });

        describe("Errors", () => {
            describe("Database error", () => {
                test("returns 500 when there is a database error", async () => {
                    const error = new Error("Database connection failed");
                    productModel.find.mockReturnValue({
                        populate: jest.fn().mockReturnThis(),
                        select: jest.fn().mockReturnThis(),
                        limit: jest.fn().mockReturnThis(),
                        sort: jest.fn().mockRejectedValue(error),
                    });

                    await getProductController(req, res);

                    expect(res.status).toHaveBeenCalledWith(500);
                    expect(res.send).toHaveBeenCalledWith({
                        success: false,
                        message: "Error in getting products",
                        error: error.message,
                    });
                });
            });
        });
    });

    describe("getSingleProductController", () => {
        let req, res, product;

        beforeEach(() => {
            jest.clearAllMocks();

            product = {
                _id: "60d5ecb54b24a10015f1e3d1",
                name: "item",
                slug: "item",
                description: "description",
                price: 999,
                category: "60d5ecb54b24a10015f1e3c1",
                quantity: 1,
                shipping: true,
                createdAt: "2026-01-15T10:30:00.000Z",
                updatedAt: "2026-01-15T10:30:00.000Z",
            };

            req = {
                params: {
                    slug: "item",
                },
            };

            res = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn(),
            };
        });
        describe("Successful", () => {
            test("returns 200 with product if it exists", async () => {
                productModel.findOne.mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        populate: jest.fn().mockResolvedValue(product),
                    }),
                });

                await getSingleProductController(req, res);

                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith({
                    success: true,
                    message: "Single Product Fetched",
                    product,
                });
            });
        });

        describe("Errors", () => {
            describe("Validation errors", () => {
                test("returns 404 without product if it doesn't exist", async () => {
                    productModel.findOne.mockReturnValue({
                        select: jest.fn().mockReturnValue({
                            populate: jest.fn().mockResolvedValue(null),
                        }),
                    });

                    req.params.slug = "item2";

                    await getSingleProductController(req, res);

                    expect(res.status).toHaveBeenCalledWith(404);
                    expect(res.send).toHaveBeenCalledWith({
                        success: false,
                        message: "Product not found",
                    });
                });
            });

            describe("Database error", () => {
                test("returns 500 when there is a database error", async () => {
                    const error = new Error("Database connection failed");
                    productModel.findOne.mockReturnValue({
                        select: jest.fn().mockReturnValue({
                            populate: jest.fn().mockRejectedValue(error),
                        }),
                    });

                    await getSingleProductController(req, res);

                    expect(res.status).toHaveBeenCalledWith(500);
                    expect(res.send).toHaveBeenCalledWith({
                        success: false,
                        message: "Error while getting single product",
                        error,
                    });
                });
            });
        });
    });

    describe("productPhotoController", () => {
        let req, res;

        beforeEach(() => {
            jest.clearAllMocks();

            req = {
                params: {
                    pid: "60d5ecb54b24a10015f1e3d1",
                },
            };

            res = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn(),
                set: jest.fn(),
            };
        });

        describe("Successful", () => {
            test("returns 200 with photo when successful", async () => {
                const photoData = Buffer.from("fake-image-data");
                const product = {
                    photo: {
                        data: photoData,
                        contentType: "image/jpeg",
                    },
                };

                productModel.findById.mockReturnValue({
                    select: jest.fn().mockResolvedValue(product),
                });

                await productPhotoController(req, res);

                expect(productModel.findById).toHaveBeenCalledWith(
                    "60d5ecb54b24a10015f1e3d1",
                );
                expect(res.set).toHaveBeenCalledWith(
                    "Content-type",
                    "image/jpeg",
                );
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith(photoData);
            });
        });

        describe("Errors", () => {
            describe("Database error", () => {
                test("returns 500 when there is a database error", async () => {
                    const error = new Error("Database connection failed");
                    productModel.findById.mockReturnValue({
                        select: jest.fn().mockRejectedValue(error),
                    });

                    await productPhotoController(req, res);

                    expect(res.status).toHaveBeenCalledWith(500);
                    expect(res.send).toHaveBeenCalledWith({
                        success: false,
                        message: "Error while getting photo",
                        error,
                    });
                });
            });
            describe("Validation error", () => {
                test("returns 404 when there is a no product", async () => {
                    productModel.findById.mockReturnValue({
                        select: jest.fn().mockResolvedValue(null),
                    });

                    await productPhotoController(req, res);

                    expect(res.status).toHaveBeenCalledWith(404);
                    expect(res.send).toHaveBeenCalledWith({
                        success: false,
                        message: "Product not found",
                    });
                });

                test("returns 404 when there is a no photo", async () => {
                    productModel.findById.mockReturnValue({
                        select: jest.fn().mockResolvedValue({
                            photo: {
                                data: null,
                                contentType: null,
                            },
                        }),
                    });

                    await productPhotoController(req, res);

                    expect(res.status).toHaveBeenCalledWith(404);
                    expect(res.send).toHaveBeenCalledWith({
                        success: false,
                        message: "No photo available",
                    });
                });
            });
        });
    });
});

// Written by A0273278U (Zaidan)
describe("Product Filters", () => {
    let req, res, products;

    beforeEach(() => {
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn(),
        };
    });
    describe("productFiltersController", () => {
        describe("Successful", () => {
            beforeEach(() => {
                products = [
                    {
                        _id: "64b0c5e2f1a2b3c4d5e6f7a8",
                        name: "Textbook",
                        slug: "textbook",
                        description: "A comprehensive CS textbook",
                        price: 49.99,
                        category: "64a1b2c3d4e5f6a7b8c9d0e1",
                        quantity: 10,
                        photo: {
                            data: "<Buffer ...>",
                            contentType: "image/png",
                        },
                        shipping: true,
                        createdAt: "2024-01-15T10:30:00.000Z",
                        updatedAt: "2024-01-15T10:30:00.000Z",
                    },
                    {
                        _id: "64b0c5e2f1a2b3c4d5e6f7a9",
                        name: "Laptop",
                        slug: "laptop",
                        description: "A lightweight laptop for students",
                        price: 999.99,
                        category: "64a1b2c3d4e5f6a7b8c9d0e2",
                        quantity: 5,
                        photo: {
                            data: "<Buffer ...>",
                            contentType: "image/jpeg",
                        },
                        shipping: true,
                        createdAt: "2024-02-20T14:00:00.000Z",
                        updatedAt: "2024-02-20T14:00:00.000Z",
                    },
                ];
            });

            test("returns 200 without filters", async () => {
                req = { body: {} };
                productModel.find.mockResolvedValue(products);

                await productFiltersController(req, res);

                expect(productModel.find).toHaveBeenCalledWith({});
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith({
                    success: true,
                    products: products,
                });
            });

            test("returns 200 with filters", async () => {
                req = {
                    body: {
                        checked: ["cat1"],
                        radio: [10, 100],
                    },
                };
                productModel.find.mockResolvedValue(products);

                await productFiltersController(req, res);

                expect(productModel.find).toHaveBeenCalledWith({
                    category: ["cat1"],
                    price: { $gte: 10, $lte: 100 },
                });
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith({
                    success: true,
                    products: products,
                });
            });
        });
        describe("Errors", () => {
            describe("Database error", () => {
                test("returns 500 when there is a database error", async () => {
                    const error = new Error("Database connection failed");
                    req = { body: {} };
                    productModel.find.mockRejectedValue(error);

                    await productFiltersController(req, res);

                    expect(res.status).toHaveBeenCalledWith(500);
                    expect(res.send).toHaveBeenCalledWith({
                        success: false,
                        message: "Error while filtering products",
                        error,
                    });
                });
            });
        });
    });
    describe("productCountController", () => {
        beforeEach(() => {
            req = {};
        });
        describe("Successful", () => {
            test("returns count with 200 when successful", async () => {
                const total = 1;
                productModel.find.mockReturnValue({
                    estimatedDocumentCount: () => total,
                });

                await productCountController(req, res);

                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith({
                    success: true,
                    total,
                });
            });
        });
        describe("Errors", () => {
            describe("Database errors", () => {
                test("returns 500 when there is a database error", async () => {
                    const error = new Error("Database connection failed");
                    req = { body: {} };

                    productModel.find.mockReturnValue({
                        estimatedDocumentCount: () => {
                            throw new Error("Database connection failed");
                        },
                    });

                    await productCountController(req, res);

                    expect(res.status).toHaveBeenCalledWith(500);
                    expect(res.send).toHaveBeenCalledWith({
                        success: false,
                        message: "Error in product count",
                        error,
                    });
                });
            });
        });
    });
    describe("productListController", () => {
        describe("Successful", () => {
            test("returns 200 with paginated products", async () => {
                const products = [{ name: "product1" }, { name: "product2" }];
                req = { params: {} };

                productModel.find.mockReturnValue({
                    select: jest.fn().mockReturnThis(),
                    skip: jest.fn().mockReturnThis(),
                    limit: jest.fn().mockReturnThis(),
                    sort: jest.fn().mockResolvedValue(products),
                });

                await productListController(req, res);

                expect(productModel.find).toHaveBeenCalledWith({});
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith({
                    success: true,
                    products,
                });
            });

            test("returns 200 with products for a specific page", async () => {
                const products = [{ name: "product3" }];
                req = { params: { page: 2 } };

                const mockSort = jest.fn().mockResolvedValue(products);
                const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
                const mockSkip = jest
                    .fn()
                    .mockReturnValue({ limit: mockLimit });
                const mockSelect = jest
                    .fn()
                    .mockReturnValue({ skip: mockSkip });
                productModel.find.mockReturnValue({ select: mockSelect });

                await productListController(req, res);

                expect(mockSelect).toHaveBeenCalledWith("-photo");
                expect(mockSkip).toHaveBeenCalledWith(6);
                expect(mockLimit).toHaveBeenCalledWith(6);
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith({
                    success: true,
                    products,
                });
            });
        });

        describe("Errors", () => {
            describe("Database error", () => {
                test("returns 500 when there is a database error", async () => {
                    const error = new Error("Database connection failed");
                    req = { params: {} };

                    productModel.find.mockReturnValue({
                        select: jest.fn().mockReturnThis(),
                        skip: jest.fn().mockReturnThis(),
                        limit: jest.fn().mockReturnThis(),
                        sort: jest.fn().mockRejectedValue(error),
                    });

                    await productListController(req, res);

                    expect(res.status).toHaveBeenCalledWith(500);
                    expect(res.send).toHaveBeenCalledWith({
                        success: false,
                        message: "error in per page ctrl",
                        error,
                    });
                });
            });
        });
    });

    describe("searchProductController", () => {
        describe("Successful", () => {
            test("returns 200 when successful", async () => {
                const keyword = "product";
                req = { params: { keyword } };
                const products = [{ name: "product1" }, { name: "product2" }];

                const mockSelect = jest.fn().mockReturnValue(products);
                productModel.find.mockReturnValue({ select: mockSelect });

                await searchProductController(req, res);

                expect(productModel.find).toHaveBeenCalledWith({
                    $or: [
                        { name: { $regex: keyword, $options: "i" } },
                        { description: { $regex: keyword, $options: "i" } },
                    ],
                });
                expect(mockSelect).toHaveBeenCalledWith("-photo");
                expect(res.json).toHaveBeenCalledWith(products);
            });
        });
        describe("Errors", () => {
            describe("Database error", () => {
                test("returns 500 when there is a database error", async () => {
                    const error = new Error("Database connection failed");
                    req = { params: {} };

                    productModel.find.mockReturnValue({
                        select: jest.fn().mockRejectedValue(error),
                    });

                    await searchProductController(req, res);

                    expect(res.status).toHaveBeenCalledWith(400);
                    expect(res.send).toHaveBeenCalledWith({
                        success: false,
                        message: "Error In Search Product API",
                        error,
                    });
                });
            });
        });
    });
    describe("relatedProductController", () => {
        describe("Successful", () => {
            test("returns 200 when successful", async () => {
                const cid = 0;
                const pid = 0;
                req = { params: { pid, cid } };
                const products = [{ name: "product1" }, { name: "product2" }];

                const mockPopulate = jest.fn().mockReturnValue(products);
                const mockLimit = jest
                    .fn()
                    .mockReturnValue({ populate: mockPopulate });
                const mockSelect = jest
                    .fn()
                    .mockReturnValue({ limit: mockLimit });
                productModel.find.mockReturnValue({ select: mockSelect });

                await relatedProductController(req, res);

                expect(productModel.find).toHaveBeenCalledWith({
                    category: cid,
                    _id: { $ne: pid },
                });
                expect(mockSelect).toHaveBeenCalledWith("-photo");
                expect(mockLimit).toHaveBeenCalledWith(3);
                expect(mockPopulate).toHaveBeenCalledWith("category");
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith({
                    success: true,
                    products,
                });
            });
        });
        describe("Errors", () => {
            describe("Database error", () => {
                test("returns 500 when there is a database error", async () => {
                    const error = new Error("Database connection failed");
                    const cid = 0;
                    const pid = 0;
                    req = { params: { pid, cid } };

                    productModel.find.mockReturnValue({
                        select: jest.fn().mockReturnThis(),
                        limit: jest.fn().mockReturnThis(),
                        populate: jest.fn().mockRejectedValue(error),
                    });

                    await relatedProductController(req, res);

                    expect(res.status).toHaveBeenCalledWith(500);
                    expect(res.send).toHaveBeenCalledWith({
                        success: false,
                        message: "Error while getting related product",
                        error,
                    });
                });
            });
        });
    });
    describe("productCategoryController", () => {
        describe("Successful", () => {
            test("returns 200 when successful", async () => {
                const slug = "exist";
                const category = "category";
                req = { params: { slug } };
                const products = [{ name: "product1" }, { name: "product2" }];

                categoryModel.findOne.mockReturnValue(category);
                const mockPopulate = jest.fn().mockResolvedValue(products);
                productModel.find.mockReturnValue({ populate: mockPopulate });

                await productCategoryController(req, res);

                expect(categoryModel.findOne).toHaveBeenCalledWith({ slug });
                expect(productModel.find).toHaveBeenCalledWith({ category });
                expect(mockPopulate).toHaveBeenCalledWith("category");
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith({
                    success: true,
                    category,
                    products,
                });
            });
        });
        describe("Errors", () => {
            test("returns 500 when there is a category database error", async () => {
                const error = new Error("Database connection failed");
                const slug = "exist";
                req = { params: { slug } };

                categoryModel.findOne.mockRejectedValue(error);

                await productCategoryController(req, res);

                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Error while getting products",
                    error,
                });
            });

            test("returns 500 when there is a products database error", async () => {
                const error = new Error("Database connection failed");
                const slug = "exist";
                req = { params: { slug } };

                categoryModel.findOne.mockResolvedValue("category");
                productModel.find.mockReturnValue({
                    populate: jest.fn().mockRejectedValue(error),
                });

                await productCategoryController(req, res);

                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Error while getting products",
                    error,
                });
            });
        });
    });
});

// Written by Nicholas Cheng, A0269648H

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