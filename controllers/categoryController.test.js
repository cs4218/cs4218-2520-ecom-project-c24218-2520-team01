import { afterEach, beforeEach, describe, expect, jest } from "@jest/globals";
import categoryModel from "../models/categoryModel.js";
import {
    createCategoryController,
    updateCategoryController
} from "./categoryController.js";
import slugify from "slugify";

// Written by Nicholas Cheng, A0269648H

// Mock categoryModel
jest.mock("../models/categoryModel.js");

// Mock slugify
jest.mock("slugify");

describe("Category CRUD operations", () => {
    describe("Unit test for createCategoryController", () => {
        // Set up variables for our test cases
        let req, res, consoleSpy;

        // Before each test case we reset our variables / mocks
        beforeEach(() => {
            req = {
                body: {},
            };
            res = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn(),
            };
            // Spy instead of mock because we might want to log in between tests.
            consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
            jest.clearAllMocks();
        });

        afterEach(() => {
            consoleSpy.mockRestore();
        });

        describe("Successful creation of a category", () => {
            test("Return 201 when a unique category name is provided", async () => {
                // Arrange
                req.body.name = "Electronic";
                // Mimic a sample return object from mongoose
                const mockCategoryObject = {
                    _id: "1",
                    name: "Electronic",
                    slug: "electronic"
                };

                // Mock our dependencies & what they will return
                categoryModel.findOne.mockResolvedValue(null);
                slugify.mockReturnValue("electronic");

                categoryModel.mockImplementation(() => ({
                    save: jest.fn().mockResolvedValue(mockCategoryObject)
                }));

                // Act
                await createCategoryController(req, res);

                // Assert
                expect(categoryModel.findOne).toHaveBeenCalledWith({ name: "Electronic" });
                expect(slugify).toHaveBeenCalledWith("Electronic");
                expect(categoryModel).toHaveBeenCalledWith({
                    name: "Electronic",
                    slug: "electronic"
                });
                expect(res.status).toHaveBeenCalledWith(201);
                expect(res.send).toHaveBeenCalledWith({
                    success: true,
                    message: "New category created",
                    category: mockCategoryObject,
                });
            });
        })

        describe("Validation errors when creating a category", () => {
            test("Return 422 when category name is an empty string", async () => {
                /**
                 * Assumption: Status code 422 is used for validation errors.
                 * In addition taking a quick look at the codebase, slug value is used as part of a URL
                 * So we should not allow empty string category names
                 */

                // Arrange
                req.body.name = "";

                // Act
                await createCategoryController(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(422);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Category name cannot be empty",
                });
            });

            test("Return 422 when category name is just white spaces", async () => {
                /**
                 * Assumption: An input with whitespaces is just the same as just having an empty string
                 */

                // Arrange
                req.body.name = "    ";

                // Act
                await createCategoryController(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(422);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Category name cannot be empty",
                });
            });

            test("Return 422 when category name is null", async () => {
                // Arrange
                req.body.name = null;

                // Act
                await createCategoryController(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(422);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Category name cannot be empty",
                });
            });

            test("Return 409 when category name already exists", async () => {
                /**
                 * Assumption: Status code 409 is for request that cannot
                 * be completed because it conflicts with the current state of the
                 * target resource on the server.
                 * 
                 * I also asusme that succes should be false because letting the user know
                 * that the category already exists. By returning true we are letting the user
                 * know that the duplicated catgory is created.
                 */

                // Arrange
                req.body.name = "Electronic"; // Assume this is already in the database
                // Mock this object to be returned when doing findOne()
                const mockCategoryObject = {
                    _id: "1",
                    name: "Electronic",
                    slug: "electronic"
                };

                categoryModel.findOne.mockResolvedValue(mockCategoryObject);

                // Act
                await createCategoryController(req, res);

                // Assert
                expect(categoryModel.findOne).toHaveBeenCalledWith({ name: "Electronic" });
                expect(res.status).toHaveBeenCalledWith(409);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Category already exists",
                });
            });
        })

        describe("Errors reguarding the database", () => {
            test("Return 500 when a database error occurs", async () => {
                // Arrange
                req.body.name = "Electronic";
                const mockError = new Error("Database error");

                categoryModel.findOne.mockImplementation(() => {
                    throw mockError;
                });

                // Act
                await createCategoryController(req, res);

                // Assert
                expect(categoryModel.findOne).toHaveBeenCalledWith({ name: "Electronic" });
                expect(consoleSpy).toHaveBeenCalledWith(mockError);
                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    error: mockError,
                    message: "Error in creating category",
                });
            });
        })
    })

    describe("Unit tests for updateCategoryController", () => {
        // Set up variables for our test cases
        let req, res, consoleSpy;

        // Before each test case we reset our variables / mocks
        beforeEach(() => {
            req = {
                params: {},
                body: {},
            };
            res = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn(),
            };
            // Spy instead of mock because we might want to log in between tests.
            consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
            jest.clearAllMocks();
        });

        afterEach(() => {
            consoleSpy.mockRestore();
        });

        describe("Successful update of category", () => {
            test("Return 200 when an update to a category is successful", async () => {
                // Arrange
                req.body.name = "Electronic";
                req.params.id = "1";
                // Mimic a sample return object from mongoose
                const mockUpdatedCategoryObject = {
                    _id: "1",
                    name: "Electronic",
                    slug: "electronic"
                };

                // Mock our dependencies & what they will return
                categoryModel.findByIdAndUpdate.mockResolvedValue(mockUpdatedCategoryObject);
                slugify.mockReturnValue("electronic");

                // Act
                await updateCategoryController(req, res);

                // Assert
                expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
                    "1",
                    {
                        name: "Electronic",
                        slug: "electronic"
                    },
                    { new: true }
                );
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith({
                    success: true,
                    message: "Category updated successfully",
                    category: mockUpdatedCategoryObject,
                });
            });
        })

        describe("Validation errors when updating category", () => {
            test("Return 422 when category name is an empty string", async () => {
                /**
                 * Assumption: We should not allow the user to update a category
                 * to a empty name.
                 */

                // Arrange
                req.body.name = "";
                req.params.id = "1";

                // Act
                await updateCategoryController(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(422);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "New category name cannot be empty",
                });
            });

            test("Return 422 when category name is just white spaces", async () => {
                /**
                 * Assumption: Changing to a string with blanks is the same as
                 * changing it into an empty string
                 */

                // Arrange
                req.body.name = "    ";
                req.params.id = "1";

                // Act
                await updateCategoryController(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(422);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "New category name cannot be empty",
                });
            });

            test("Return 422 when category name is null", async () => {
                // Arrange
                req.body.name = null;
                req.params.id = "1";

                // Act
                await updateCategoryController(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(422);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "New category name cannot be empty",
                });
            });

            test("Return 422 when category id is null", async () => {
                /**
                 * Assumption: We do not need to worry about blank ids and what not
                 * because the findByIdAndUpdate function will handle those for us since
                 * they cannot find that id.
                 */
                // Arrange
                req.body.name = "Toys";
                req.params.id = null;

                // Act
                await updateCategoryController(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(422);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Category id cannot be empty",
                });
            });

            test("Return 404 when category id is null", async () => {
                /**
                 * Assumption: Status 404 is ususally used when some resource cannot be found.
                 */
                // Arrange
                req.body.name = "Toys";
                req.params.id = "1000000000";

                categoryModel.findByIdAndUpdate.mockResolvedValue(null);
                slugify.mockReturnValue("toys");


                // Act
                await updateCategoryController(req, res);

                // Assert
                expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
                    "1000000000",
                    {
                        name: "Toys",
                        slug: "toys"
                    },
                    { new: true }
                );
                expect(res.status).toHaveBeenCalledWith(404);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Category not found",
                });
            });
        })

        describe("Errors reguarding the database", () => {
            test("Return 500 when a database error occurs", async () => {
                // Arrange
                req.body.name = "Electronic";
                req.params.id = "1";
                const mockError = new Error("Database error");

                categoryModel.findByIdAndUpdate.mockImplementation(() => {
                    throw mockError;
                });
                slugify.mockReturnValue("electronic");

                // Act
                await updateCategoryController(req, res);

                // Assert
                expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
                    "1",
                    {
                        name: "Electronic",
                        slug: "electronic"
                    },
                    { new: true }
                );
                expect(slugify).toHaveBeenCalledWith("Electronic");
                expect(consoleSpy).toHaveBeenCalledWith(mockError);
                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    error: mockError,
                    message: "Error in updating category",
                });
            });
        })
    });
})