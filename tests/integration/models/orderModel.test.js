import { afterAll, beforeAll, beforeEach, describe, test, expect } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import Category from "../../../models/categoryModel.js";
import Order from "../../../models/orderModel.js";
import Product from "../../../models/productModel.js";
import User from "../../../models/userModel.js";


// Written by Nicholas Cheng, A0269648H

/**
 * Assumption: We still do these schema checks as an extra layer of
 * protection to ensure what we add to the database is valid.
 */
describe("Order Schema on MongoDB", () => {
    describe("Integration test for order model", () => {
        // For our in memory MongoDB
        let mongoDb, dummyUserId, dummyProductId, dummyCategoryId, paymentObject;

        beforeAll(async () => {
            // Create a new in memory MongoDB
            mongoDb = await MongoMemoryServer.create();
            const uri = mongoDb.getUri();
            await mongoose.connect(uri);
            await Order.init();
            await Product.init();
            await User.init();
            await Category.init();

            // This is a sample response from braintree documentation
            paymentObject = {
                result: {
                    success: true,
                    transaction: {
                        type: "credit",
                        status: "submitted_for_settlement"
                    }
                }
            };

            // Create a dummy user
            const userObject = new User({
                name: "John Doe",
                email: "john.doe@example.com",
                password: "password",
                phone: "12345678",
                address: "123 Main St",
                answer: "Question"
            });
            const user = await userObject.save();
            dummyUserId = user._id;

            // Create a dummy category
            const categoryObject = new Category({
                name: "Electronics",
                slug: "electronics"
            });
            const category = await categoryObject.save();
            dummyCategoryId = category._id;

            // Create a dummy product
            const productObject = new Product({
                name: "RTX 4090",
                slug: "rtx-4090",
                description: "GPU",
                price: 4000,
                category: dummyCategoryId,
                quantity: 10,
                photo: "image.jpg",
                shipping: true
            });
            const product = await productObject.save();
            dummyProductId = product._id;

        });

        afterAll(async () => {
            // Disconnect and stop this MongoDB
            await mongoose.disconnect();
            await mongoDb.stop();
        });

        beforeEach(async () => {
            // Clear all orders before each test
            await Order.deleteMany({});
        });
        describe("Test products field behaviour", () => {

            test("Successfully create order with at least 1 product", async () => {
                // Arrange
                const orderObject = new Order({
                    products: [dummyProductId, dummyProductId],
                    payment: paymentObject,
                    buyer: dummyUserId,
                    status: "Not Process",
                });

                // Act
                const order = await orderObject.save()

                // Assert
                expect(order._id).toBeDefined()
                expect(order.products).toEqual([dummyProductId, dummyProductId])
                expect(order.payment).toEqual(paymentObject)
                expect(order.buyer).toEqual(dummyUserId)
                expect(order.status).toEqual("Not Process")
            });

            test("Should throw error if products is empty", async () => {
                /**
                 * Assumption: We should not allow empty products as this will mean the order
                 * is empty and invalid.
                 */
                // Arrange
                const orderObject = new Order({
                    products: [],
                    payment: paymentObject,
                    buyer: dummyUserId,
                    status: "Not Process",
                });

                // Act & Assert
                await expect(orderObject.save()).rejects.toThrow();
            });
        });
    });
});