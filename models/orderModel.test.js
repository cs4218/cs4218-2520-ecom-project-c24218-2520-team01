import { afterAll, beforeAll, beforeEach, describe, test, expect } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import Category from "./categoryModel.js";
import Order from "./orderModel.js";
import Product from "./productModel.js";
import User from "./userModel.js";


// Written by Nicholas Cheng, A0269648H

/**
 * Assumption: We still do these schema checks as an extra layer of
 * protection to ensure what we add to the database is valid.
 */
describe("Order Schema on MongoDB", () => {
    describe("Unit test for order model", () => {
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

        describe("Successfully create order object", () => {
            // This is the success case where everything is provided correctly
            test("Successfully create order with all valid field values", async () => {
                // Arrange
                const orderObject = new Order({
                    products: [dummyProductId, dummyProductId],
                    payment: paymentObject,
                    buyer: dummyUserId,
                    status: "Shipped",
                });

                // Act
                const order = await orderObject.save()

                // Assert
                expect(order._id).toBeDefined()
                expect(order.products).toEqual([dummyProductId, dummyProductId])
                expect(order.payment).toEqual(paymentObject)
                expect(order.buyer).toEqual(dummyUserId)
                expect(order.status).toEqual("Shipped")
            });
        })
        describe("Test products field behaviour", () => {
            test("Should throw an error if products is empty", async () => {
                /**
                 * Assumption: We should not allow empty products as this will mean the order
                 * is empty and invalid.
                 */
                // Arrange
                const orderObject = new Order({
                    products: [],
                    payment: paymentObject,
                    buyer: dummyUserId,
                    status: "Shipped",
                });

                // Act & Assert
                await expect(orderObject.save()).rejects.toThrow();
            });

            test("Should throw an error if products is not defined", async () => {
                // Arrange
                const orderObject = new Order({
                    payment: paymentObject,
                    buyer: dummyUserId,
                    status: "Shipped",
                });

                // Act & Assert
                await expect(orderObject.save()).rejects.toThrow();
            });

            test("Should throw am error if product id is invalid", async () => {
                /**
                 * Assumption: If the product ID does not match any of the
                 * existing products id then this order will be invalid.
                 */
                // Arrange
                const orderObject = new Order({
                    products: [new mongoose.Types.ObjectId(), dummyProductId],
                    payment: paymentObject,
                    buyer: dummyUserId,
                    status: "Shipped",
                });

                // Act & Assert
                await expect(orderObject.save()).rejects.toThrow();
            });

            test("Should throw an error if product id is wrong", async () => {
                // This test is is different as this is if the id is not based
                // on MongoDB's ObjectId syntax.
                // Arrange
                const orderObject = new Order({
                    products: ["abcde", dummyProductId],
                    payment: paymentObject,
                    buyer: dummyUserId,
                    status: "Shipped",
                });

                // Act & Assert
                await expect(orderObject.save()).rejects.toThrow();
            });
        });

        describe("Test payment field behaviour", () => {
            test("Should throw an error if payment is empty", async () => {
                /**
                 * Assumption: We should not allow empty payment
                 * as we assume the payment information is important for the company
                 * when used for auditing purposes and ensuring payment is made.
                 */
                // Arrange
                const orderObject = new Order({
                    products: [dummyProductId],
                    payment: {},
                    buyer: dummyUserId,
                    status: "Shipped",
                });

                // Act & Assert
                await expect(orderObject.save()).rejects.toThrow();
            });

            test("Should throw an error if payment is not defined", async () => {
                // Arrange
                const orderObject = new Order({
                    products: [dummyProductId],
                    buyer: dummyUserId,
                    status: "Shipped",
                });

                // Act & Assert
                await expect(orderObject.save()).rejects.toThrow();
            });
        });

        describe("Test buyer field behaviour", () => {
            test("Should throw an error if buyer is not defined", async () => {
                // Arrange
                const orderObject = new Order({
                    products: [dummyProductId],
                    payment: paymentObject,
                    status: "Shipped",
                });

                // Act & Assert
                await expect(orderObject.save()).rejects.toThrow();
            });

            test("Should throw am error if buyer id is invalid", async () => {
                /**
                 * Assumption: If the buyer ID does not match any of the
                 * existing buyer id then this order will be invalid.
                 */
                // Arrange
                const orderObject = new Order({
                    products: [dummyProductId],
                    payment: paymentObject,
                    buyer: new mongoose.Types.ObjectId(),
                    status: "Shipped",
                });

                // Act & Assert
                await expect(orderObject.save()).rejects.toThrow();
            });

            test("Should throw an error if buyer id is wrong", async () => {
                // This test is is different as this is if the id is not based
                // on MongoDB's ObjectId syntax.
                // Arrange
                const orderObject = new Order({
                    products: [dummyProductId],
                    payment: paymentObject,
                    buyer: "abcde",
                    status: "Shipped",
                });

                // Act & Assert
                await expect(orderObject.save()).rejects.toThrow();
            });
        });

        describe("Test status field behaviour", () => {

            test("Defaut value for status is not provided is 'Not Process'", async () => {
                // Arrange
                const orderObject = new Order({
                    products: [dummyProductId],
                    payment: paymentObject,
                    buyer: dummyUserId,
                });

                // Act
                const order = await orderObject.save()

                // Assert
                expect(order.status).toBe("Not Process")
            });

            test("Should throw an error if status is not a valid enum value", async () => {
                // It will accept one of the 5 values: "Not Process", "Processing", "Shipped", "Delivered", "Cancel"
                // Arrange
                const orderObject = new Order({
                    products: [dummyProductId],
                    payment: paymentObject,
                    buyer: dummyUserId,
                    status: "Funny Status",
                });

                // Act & Assert
                await expect(orderObject.save()).rejects.toThrow();
            });

            test("Should update status to another valid status", async () => {
                // It will accept one of the 5 values: "Not Process", "Processing", "Shipped", "Delivered", "Cancel"
                // Arrange
                const orderObject = new Order({
                    products: [dummyProductId],
                    payment: paymentObject,
                    buyer: dummyUserId,
                    status: "Processing",
                });

                const order = await orderObject.save()

                // Act
                const updatedOrder = await Order.findByIdAndUpdate(order._id, { status: "Delivered" }, { new: true })

                // Assert
                expect(updatedOrder.status).toBe("Delivered")
            });

            test("Should throw an error when updating status to an invalid status", async () => {
                // It will accept one of the 5 values: "Not Process", "Processing", "Shipped", "Delivered", "Cancel"
                // Arrange
                const orderObject = new Order({
                    products: [dummyProductId],
                    payment: paymentObject,
                    buyer: dummyUserId,
                    status: "Processing",
                });

                const order = await orderObject.save()

                // Act & Assert
                await expect(Order.findByIdAndUpdate(order._id, { status: "Finished" }, { runValidators: true })).rejects.toThrow();
            });
        });
    });
});