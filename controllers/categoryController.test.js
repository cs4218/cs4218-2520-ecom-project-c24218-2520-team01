import { afterEach, beforeEach, describe, expect, jest } from "@jest/globals";
import categoryModel from "../models/categoryModel.js";
import {
    createCategoryController,
    updateCategoryController,
    categoryController,
    singleCategoryController,
    deleteCategoryController
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
                // If findOne is called that means we did not exit the function
                expect(categoryModel.findOne).toHaveBeenCalledTimes(0);
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
                expect(categoryModel.findOne).toHaveBeenCalledTimes(0);
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
                expect(categoryModel.findOne).toHaveBeenCalledTimes(0);
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

        describe("Errors regarding the database", () => {
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
                    message: "Error while creating category",
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
                expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledTimes(0);
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
                expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledTimes(0);
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
                expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledTimes(0);
                expect(res.status).toHaveBeenCalledWith(422);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Category id cannot be empty",
                });
            });

            test("Return 404 when category id cannot be found", async () => {
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

        describe("Errors regarding the database", () => {
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
                    message: "Error while updating category",
                });
            });
        })
    });

    describe("Unit tests for categoryController", () => {
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

        describe("Successfully fetch categories from the database", () => {
            test("Return 200 and all the categories", async () => {
                // Arrange
                const mockCategoryList = [
                    {
                        _id: "1",
                        name: "Electronic",
                        slug: "electronic"
                    },
                    {
                        _id: "2",
                        name: "Clothing",
                        slug: "clothing"
                    }
                ];

                // Mock our dependencies & what they will return
                categoryModel.find.mockResolvedValue(mockCategoryList);

                // Act
                await categoryController(req, res);

                // Assert
                expect(categoryModel.find).toHaveBeenCalledWith({});
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith({
                    success: true,
                    message: "All categories fetched",
                    category: mockCategoryList,
                });
            });

            test("Return 200 when there are no categories from the database", async () => {
                /**
                 * Assumption: Even if the database is empty,
                 * we can still return an empty list of categories which still makes the
                 * system be in a valid state.
                 */
                // Arrange
                const mockCategoryList = [];

                // Mock our dependencies & what they will return
                categoryModel.find.mockResolvedValue(mockCategoryList);

                // Act
                await categoryController(req, res);

                // Assert
                expect(categoryModel.find).toHaveBeenCalledWith({});
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith({
                    success: true,
                    message: "All categories fetched",
                    category: mockCategoryList,
                });
            });
        })

        describe("Errors regarding the database", () => {
            test("Return 500 when a database error occurs", async () => {
                // Arrange
                const mockError = new Error("Database error");
                categoryModel.find.mockImplementation(() => {
                    throw mockError;
                });

                // Act
                await categoryController(req, res);

                // Assert
                expect(categoryModel.find).toHaveBeenCalledWith({});
                expect(consoleSpy).toHaveBeenCalledWith(mockError);
                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    error: mockError,
                    message: "Error while fetching categories",
                });
            });
        })
    })

    describe("Unit tests for singleCategoryController", () => {
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

        describe("Successfully fetch a single category from the database", () => {
            test("Return 200 when the fetch is successful", async () => {
                // Arrange
                req.params.slug = "clothing";
                // Mimic a sample return object from mongoose
                const mockCategoryObject = {
                    _id: "1",
                    name: "Clothing",
                    slug: "clothing"
                };

                // Mock our dependencies & what they will return
                categoryModel.findOne.mockResolvedValue(mockCategoryObject);

                // Act
                await singleCategoryController(req, res);

                // Assert
                expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "clothing" });
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith({
                    success: true,
                    message: "Get single category successfully",
                    category: mockCategoryObject,
                });
            });
        })

        describe("Validation error when fetching a single category", () => {
            test("Return 404 when category with slug value cannot be found", async () => {
                /**
                 * Assumption: Return a 404 to alert the user that the category cannot be found.
                 * This will have the same effect as if the slug value is a empty string.
                 */
                // Arrange
                req.params.slug = "medicine";

                categoryModel.findOne.mockResolvedValue(null);

                // Act
                await singleCategoryController(req, res);

                // Assert
                expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "medicine" });
                expect(res.status).toHaveBeenCalledWith(404);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "No category found",
                });
            });

            test("Return 422 when slug value is null", async () => {
                // Arrange
                req.params.slug = null;

                // Act
                await singleCategoryController(req, res);

                // Assert
                expect(categoryModel.findOne).toHaveBeenCalledTimes(0);
                expect(res.status).toHaveBeenCalledWith(422);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Category slug cannot be empty",
                });
            });
        })

        describe("Errors regarding the database", () => {
            test("Return 500 when a database error occurs", async () => {
                // Arrange
                req.params.slug = "toys";
                const mockError = new Error("Database error");
                categoryModel.findOne.mockImplementation(() => {
                    throw mockError;
                });

                // Act
                await singleCategoryController(req, res);

                // Assert
                expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "toys" });
                expect(consoleSpy).toHaveBeenCalledWith(mockError);
                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    error: mockError,
                    message: "Error while fetching single category",
                });
            });
        })
    })
    describe("Unit tests for deleteCategoryController", () => {
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

        describe("Successfully delete a category from the database", () => {
            test("Return 200 when the deletion is successful", async () => {
                // Arrange
                req.params.id = "1";
                // Mimic a sample return object from mongoose
                const mockCategoryObject = {
                    _id: "1",
                    name: "Clothing",
                    slug: "clothing"
                };

                // Mock our dependencies & what they will return
                categoryModel.findByIdAndDelete.mockResolvedValue(mockCategoryObject);

                // Act
                await deleteCategoryController(req, res);

                // Assert
                expect(categoryModel.findByIdAndDelete).toHaveBeenCalledWith("1");
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith({
                    success: true,
                    message: "Category deleted successfully",
                });
            });
        })

        describe("Validation error when deleting a category", () => {
            test("Return 404 when category with id value cannot be found", async () => {
                /**
                 * Assumption: Return a 404 to alert the user that the category cannot be found.
                 * This will have the same effect as if the id value is a empty string.
                 */
                // Arrange
                req.params.id = "100000000";

                categoryModel.findByIdAndDelete.mockResolvedValue(null);

                // Act
                await deleteCategoryController(req, res);

                // Assert
                expect(categoryModel.findByIdAndDelete).toHaveBeenCalledWith("100000000");
                expect(res.status).toHaveBeenCalledWith(404);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Failed to delete because no category is found",
                });
            });

            test("Return 422 when category is null", async () => {
                // Arrange
                req.params.slug = null;

                // Act
                await deleteCategoryController(req, res);

                // Assert
                expect(categoryModel.findByIdAndDelete).toHaveBeenCalledTimes(0);
                expect(res.status).toHaveBeenCalledWith(422);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Category id cannot be empty",
                });
            });
        })

        describe("Errors regarding the database", () => {
            test("Return 500 when a database error occurs", async () => {
                // Arrange
                req.params.id = "1";
                const mockError = new Error("Database error");
                categoryModel.findByIdAndDelete.mockImplementation(() => {
                    throw mockError;
                });

                // Act
                await deleteCategoryController(req, res);

                // Assert
                expect(categoryModel.findByIdAndDelete).toHaveBeenCalledWith("1");
                expect(consoleSpy).toHaveBeenCalledWith(mockError);
                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    error: mockError,
                    message: "Error while deleting category",
                });
            });
        })
    })
});