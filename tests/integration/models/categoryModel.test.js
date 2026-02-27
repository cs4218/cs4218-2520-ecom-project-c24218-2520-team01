import { afterAll, beforeAll, beforeEach, describe, test, expect } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import Category from "../../../models/categoryModel.js";

// Written by Nicholas Cheng, A0269648H

/**
 * Assumption: We still do these schema checks as an extra layer of
 * protection to ensure what we add to the database is valid.
 */
describe("Category Schema on MongoDB", () => {
    describe("Integration test for category model", () => {
        // For our in memory MongoDB
        let mongoDb;

        beforeAll(async () => {
            // Create a new in memory MongoDB
            mongoDb = await MongoMemoryServer.create();
            const uri = mongoDb.getUri();
            await mongoose.connect(uri);
            await Category.init();
        });

        afterAll(async () => {
            // Disconnect and stop this MongoDB
            await mongoose.disconnect();
            await mongoDb.stop();
        });

        beforeEach(async () => {
            // Clear all orders before each test
            await Category.deleteMany({});

            // Add a dummy category to the database
            const categoryObject = new Category({
                name: "Toys",
                slug: "toys",
            });
            await categoryObject.save();
        });
        describe("Test name field behaviour", () => {
            test("Successfully create a new & unique category inside the database", async () => {
                // Arrange
                const categoryData = {
                    name: "Electronics",
                    slug: "electronics",
                };

                // Act
                const category = new Category(categoryData);
                const savedCategory = await category.save();

                // Assert
                expect(savedCategory._id).toBeDefined();
                expect(savedCategory.name).toEqual(categoryData.name);
                expect(savedCategory.slug).toEqual(categoryData.slug);
            });

            test("Fail to create a category if the category name is not given", async () => {
                // Arrange
                const categoryData = {
                    slug: "electronics",
                };

                const missingNameCategory = new Category(categoryData);

                // Act & Assert
                await expect(missingNameCategory.save()).rejects.toThrow();
            });

            test("Fail to create a category if the category name is blank", async () => {
                // Arrange
                const categoryData = {
                    name: "",
                    slug: "electronics",
                };

                const blankNameCategory = new Category(categoryData);

                // Act & Assert
                await expect(blankNameCategory.save()).rejects.toThrow();
            });

            test("Fail to create a category if the category name already exists", async () => {
                // Arrange
                const categoryData = {
                    name: "Toys",
                    slug: "toys",
                };

                const existingNameCategory = new Category(categoryData);

                // Act & Assert
                await expect(existingNameCategory.save()).rejects.toThrow();
            });
        })
    })
})