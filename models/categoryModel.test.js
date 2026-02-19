import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import Category from "./categoryModel.js";

// By: Nicholas Cheng A0269648H

/**
 * Assumption: We test the model to ensure that the schema is based on what we expect the database should behave.
 * We want to make sure these database rules follows if our functions do not do some preliminary checks before doing CRUD operations.
 */
describe("Tests for the category schema", () => {
    // For our in memory MongoDB
    let mongoServer;

    beforeAll(async () => {
        // Create a new in memory MongoDB
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        await mongoose.connect(uri);
    });

    afterAll(async () => {
        // Disconnect and stop this MongoDB
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        // Clear all categories before each test
        await Category.deleteMany({});

        // Add some predefined categories
        await Category.insertMany([
            { name: "Electronics", slug: "electronics" },
            { name: "Clothing", slug: "clothing" },
            { name: "Books", slug: "books" },
        ]);
    });

    test("Successfully create & save a new category inside the database", async () => {
        // Arrange
        const categoryData = {
            name: "Furniture",
            slug: "furniture",
        };

        // Act
        const category = new Category(categoryData);
        const savedCategory = await category.save();

        // Assert 
        expect(savedCategory._id).toBeDefined();
        expect(savedCategory.name).toBe(categoryData.name);
        expect(savedCategory.slug).toBe(categoryData.slug);
    });

    test("Slug value should be lowercase reguardless of the string that was passed in", async () => {
        // Arrange
        const categoryData = {
            name: "Furniture",
            slug: "FuRniTuRe",
        };
        const category = new Category(categoryData);

        // Act
        const savedCategory = await category.save();

        // Assert 
        expect(savedCategory._id).toBeDefined();
        expect(savedCategory.name).toBe(categoryData.name);
        expect(savedCategory.slug).toBe("furniture");
    });


    test("Fail to create category if the category name already exist", async () => {
        /**
         * Assumption: We should not allow duplicate categories to be added into the database.
         */

        // Arrange
        const categoryData = {
            name: "Electronics",
            slug: "electronics",
        };

        const duplicateCategory = new Category(categoryData);

        // Act & Assert
        await expect(duplicateCategory.save()).rejects.toThrow();
    });

    test("Fail to create category if the category name is not given", async () => {
        /**
         * Assumption: The name of the category is requied it cannot be blank.
         */

        // Arrange
        const categoryData = {
            name: "",
            slug: "toys",
        };

        const missingNameCategory = new Category(categoryData);

        // Act & Assert
        await expect(missingNameCategory.save()).rejects.toThrow();
    });

    test("Fail to create category if slug is not given", async () => {
        /**
         * Assumption: We cannot have a blank slug because when taking a glance at the codebase we will use it as part of a url.
         * By having some blank slug values will cause the program to have issues
         */

        // Arrange
        const categoryData = {
            name: "Toys",
            slug: "",
        };

        const missingNameCategory = new Category(categoryData);

        // Act & Assert
        await expect(missingNameCategory.save()).rejects.toThrow();
    });

    test("Fail to create category if the category name is just whitespaces", async () => {
        /**
         * Assumption: Having just whitespaces is just the same as it being blank.
         */

        // Arrange
        const categoryData = {
            name: "   ",
            slug: "toys",
        };

        const missingNameCategory = new Category(categoryData);

        // Act & Assert
        await expect(missingNameCategory.save()).rejects.toThrow();
    });

    test("Fail to create category if slug is just whitespaces", async () => {
        /**
         * Assumption: Having just whitespaces is just the same as it being blank.
         */

        // Arrange
        const categoryData = {
            name: "Toys",
            slug: "   ",
        };

        const missingNameCategory = new Category(categoryData);

        // Act & Assert
        await expect(missingNameCategory.save()).rejects.toThrow();
    });
});
