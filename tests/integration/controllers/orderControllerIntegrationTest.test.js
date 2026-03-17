import { beforeEach, afterEach, beforeAll, afterAll, describe, test, expect, jest } from "@jest/globals";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { getOrdersController } from "../../../controllers/authController.js";
import orderModel from "../../../models/orderModel.js";
import userModel from "../../../models/userModel.js";
import productModel from "../../../models/productModel.js";
import categoryModel from "../../../models/categoryModel.js";
import path from "path";
import fs from "fs";

const FIXTURE_IMAGE = path.resolve(__dirname, "../../../fixtures/test-image.jpg");

// Written by Nicholas Cheng, A0269648H

// Mock console.log
jest.spyOn(console, "log").mockImplementation(() => { });

describe("Integration tests for Order Controller with just the Database", () => {

    let mongoServer, user, category, product;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        await mongoose.connect(uri);

        // Create our dummy data
        user = await new userModel({
            name: "Jane Doe",
            email: "jane@example.com",
            password: "password123",
            phone: "123456789",
            address: "123 Main St",
            answer: "yes"
        }).save();

        category = await new categoryModel({
            name: "Electronics",
            slug: "electronics"
        }).save();

        product = await new productModel({
            name: "Laptop",
            slug: "laptop",
            description: "A fast laptop",
            price: 1500,
            category: category._id,
            quantity: 10,
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

    describe("Get all orders", () => {
        let req, res, order1, order2;

        beforeEach(async () => {
            req = {
                user: {}
            };
            res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
                send: jest.fn(),
            };

            // Clean up the order table before moving to the next test case
            await orderModel.deleteMany({});

            // Create some sample orders
            order1 = await new orderModel({
                products: [product._id],
                payment: { success: true },
                buyer: user._id,
                status: "Not Process"
            }).save();

            // Order by some other user
            order2 = await new orderModel({
                products: [product._id],
                payment: { success: true },
                buyer: new mongoose.Types.ObjectId(),
                status: "Processing"
            }).save();
        });

        test("Fetch all user orders from the database", async () => {
            // Set user in request
            req.user._id = user._id;

            await getOrdersController(req, res);

            // Just check if the orders is returned we do not need to care about the fields returned
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith([expect.objectContaining({ _id: order1._id })]);

            const responseData = res.json.mock.calls[0][0];
            expect(responseData.length).toBe(1);
        });

        test("should return 422 if user id is missing", async () => {
            req.user = {}; // No _id

            await getOrdersController(req, res);

            expect(res.status).toHaveBeenCalledWith(422);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "User id cannot be empty"
            });
        });

        test("should return 500 when database operation fails", async () => {
            req.user._id = new mongoose.Types.ObjectId();

            // Spy on orderModel.find to throw an error
            const findSpy = jest.spyOn(orderModel, "find").mockImplementationOnce(() => {
                throw new Error("Simulated database failure");
            });

            await getOrdersController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: "Error while getting orders",
            }));

            findSpy.mockRestore();
        });
    });
});
