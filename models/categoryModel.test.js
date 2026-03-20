import { afterAll, beforeAll, beforeEach, describe, test, expect } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import Category from "./categoryModel.js";

// Written by Nicholas Cheng, A0269648H

/**
 * Assumption: We still do these schema checks as an extra layer of
 * protection to ensure what we add to the database is valid.
 */
describe("Category Schema on MongoDB", () => {
    describe("Unit test for category model", () => {
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
            test("Successfully create a new category when a unique name is given", async () => {
                // Arrange
                const categoryData = {
                    name: "Electronics",
                    slug: "electronics",
                };

                // Act
                const newCategory = new Category(categoryData);
                const savedCategory = await newCategory.save();

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
        });

        describe("Test slug field behaviour", () => {
            test("Successfully create a new category when a unique slug is given", async () => {
                /**
                 * Assumption: Having a look at the front end the slug is used to build the URL
                 * so we assume that each category should have a unique slug if not multiple categories
                 * will be linked to the same page which can be the case but we assume this is not.
                 */
                // Arrange
                const categoryData = {
                    name: "Clothes",
                    slug: "clothes",
                };

                // Act
                const newCategory = new Category(categoryData);
                const savedCategory = await newCategory.save();

                // Assert
                expect(savedCategory._id).toBeDefined();
                expect(savedCategory.name).toEqual(categoryData.name);
                expect(savedCategory.slug).toEqual(categoryData.slug);
            });

            test("Slug value of a newly created category will be lowercase", async () => {
                // Arrange
                const categoryData = {
                    name: "Clothes",
                    slug: "CloThEs",
                };

                // Act
                const newCategory = new Category(categoryData);
                const savedCategory = await newCategory.save();

                // Assert
                expect(savedCategory._id).toBeDefined();
                expect(savedCategory.name).toEqual(categoryData.name);
                expect(savedCategory.slug).toEqual(categoryData.slug.toLowerCase());
            });

            test("Fail to create a category if the category slug is not given", async () => {
                // Arrange
                const categoryData = {
                    name: "Electronics",
                };

                const missingSlugCategory = new Category(categoryData);

                // Act & Assert
                await expect(missingSlugCategory.save()).rejects.toThrow();
            });

            test("Fail to create a category if the category slug is blank", async () => {
                // Arrange
                const categoryData = {
                    name: "Electronics",
                    slug: "",
                };

                const blankSlugCategory = new Category(categoryData);

                // Act & Assert
                await expect(blankSlugCategory.save()).rejects.toThrow();
            });

            test("Fail to create a category if the category slug already exists", async () => {
                // Arrange
                const categoryData = {
                    name: "Blocks",
                    slug: "toys", // For some reason this category is for toys
                };

                const existingSlugCategory = new Category(categoryData);

                // Act & Assert
                await expect(existingSlugCategory.save()).rejects.toThrow();
            });
        });
    });
});