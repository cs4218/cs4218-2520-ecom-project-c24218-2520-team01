import categoryModel from "../models/categoryModel.js";
import { createCategoryController, updateCategoryController, categoryControlller, singleCategoryController } from "../controllers/categoryController.js";
import slugify from "slugify";

// Need to mock categoryModel & slugify
jest.mock("../models/categoryModel.js")
jest.mock("slugify")

describe("Tests for createCateogryController", () => {

    // Set up variables for our test cases
    let req, res;

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

    test("Create new category successfully and return 201", async () => {
        // Arrange
        req.body.name = "NewCategory";

        // Mock categoryModel.findOne to return false
        categoryModel.findOne.mockResolvedValue(false);
        slugify.mockReturnValue("newcategory");

        // Mock categoryModel.save to return a new category object
        const savedCategory = { name: "NewCategory", slug: "newcategory" };
        categoryModel.mockImplementation(() => ({
            save: jest.fn().mockResolvedValue(savedCategory)
        }));

        // Act
        await createCategoryController(req, res);

        // Assert
        expect(categoryModel.findOne).toHaveBeenCalledWith({ name: "NewCategory" });
        expect(categoryModel).toHaveBeenCalledWith({ name: "NewCategory", slug: "newcategory" });
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "New category created",
            category: savedCategory,
        });
    });

    test("Return 409 when category exists", async () => {
        /*
        Assumption:Status code 409 is conflicts ususally request cannot
        be completed because it conflicts with the current state of the
        target resource on the serverly
        */

        // Arrange
        req.body.name = "existingCategory";

        // Mock categoryModel.findOne to return true
        categoryModel.findOne.mockResolvedValue(true);

        // Act
        await createCategoryController(req, res);

        // Assert
        expect(categoryModel.findOne).toHaveBeenCalledWith({ name: "existingCategory" });
        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.send).toHaveBeenCalledWith({ // Status should be blank because the request was not even executed
            message: "Category already exists",
        });
    });

    test("Return 400 when category name not provided", async () => {
        /*
        Assumpton: status code 400 is bad request usually used when the request
        is invalid or cannot be processed
        */

        // Act
        await createCategoryController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            message: "Name is required",
        });
    });

    it("Return 500 when an error occurs", async () => {
        // Arrange
        req.body = { name: "someCategory" };
        const mockError = new Error("Some error");

        categoryModel.findOne.mockRejectedValue(mockError);
        // Console is a dependency so just mock it
        console.log = jest.fn();

        // Act
        await createCategoryController(req, res);

        // Assert
        expect(console.log).toHaveBeenCalledWith(mockError);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            error: mockError,
            message: "Error in category",
        });
    });
});

describe("Tests for updateCateogryController", () => {

    // Set up variables for our test cases
    let req, res;

    beforeEach(() => {
        req = {
            params: {},
            body: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        jest.clearAllMocks();
    });

    test("Update category successfully and return 200", async () => {
        // Arrange
        req.params.id = 1;
        req.body.name = "updatedCategory";
        const updatedCategory = { _id: 1, name: "updatedCategory", slug: "updatedcategory" };

        // Mock slugify function
        slugify.mockReturnValue("updatedcategory");

        // Mock categoryModel.findByIdAndUpdate to return the updated category
        categoryModel.findByIdAndUpdate.mockResolvedValue(updatedCategory);

        // Act
        await updateCategoryController(req, res);

        // Assert
        expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledWith(1, { name: "updatedCategory", slug: "updatedcategory" }, { new: true });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Category updated successfully",
            category: updatedCategory,
        });
    });

    test("Return 404 when id cannot be found", async () => {
        /*
        Assumption: The app should inform the user that the category id does not exist
        and no update was made. So return status code 404 is not found usually used when the request
        resource cannot be found.
        */

        // Arrange
        req.params.id = -1;
        req.body.name = "someCateogry";
        const updatedCategory = null;

        slugify.mockReturnValue("somecateogry");

        categoryModel.findByIdAndUpdate.mockResolvedValue(updatedCategory);

        // Act
        await updateCategoryController(req, res);

        // Assert
        expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledWith(-1, { name: "someCateogry", slug: "somecateogry" }, { new: true });
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith({
            message: "Id does not exist",
        });
    });

    test("Return 400 when id is not provided", async () => {
        // Arrange
        req.body.name = "someCategory";

        // Act
        await updateCategoryController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            message: "Id is required",
        });
    });

    test("Return 400 when name is not provided", async () => {
        // Arrange
        req.params.id = "1";

        // Act
        await updateCategoryController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            message: "Name is required",
        });
    });


    test("Return 500 when an error occurs", async () => {
        // Arrange
        req.params.id = 1;
        req.body.name = "someCategory";
        const mockError = new Error("Some error");

        categoryModel.findByIdAndUpdate.mockRejectedValue(mockError);
        // Console is a dependency so just mock it
        console.log = jest.fn();

        // Act
        await updateCategoryController(req, res);

        // Assert
        expect(console.log).toHaveBeenCalledWith(mockError);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            error: mockError,
            message: "Error while updating category",
        });
    });
});

describe("Tests for categoryControlller (Get all categories)", () => {

    // Set up variables for our test cases
    let req, res;

    beforeEach(() => {
        req = {
            params: {},
            body: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        jest.clearAllMocks();
    });

    test("Fetch all categories successfully and return 200", async () => {
        // Arrange
        const fetchedCategory = [
            { _id: 1, name: "Electronics", slug: "electronics" },
            { _id: 2, name: "Clothes", slug: "clothes" }
        ];
        // Mock categoryModel.find to return the fetched categories
        categoryModel.find.mockResolvedValue(fetchedCategory);

        // Act
        await categoryControlller(req, res);

        // Assert
        expect(categoryModel.find).toHaveBeenCalledWith({});
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "All categories fetched successfully",
            category: fetchedCategory,
        });
    });

    test("Return 500 when an error occurs", async () => {
        /* 
        Assumption: If the database connection is not established any function to MongoDB
        will raise an error and not return null.
        */

        // Arrange
        const mockError = new Error("Some error");

        categoryModel.find.mockRejectedValue(mockError);
        // Console is a dependency so just mock it
        console.log = jest.fn();

        // Act
        await categoryControlller(req, res);

        // Assert
        expect(console.log).toHaveBeenCalledWith(mockError);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            error: mockError,
            message: "Error while getting all categories",
        });
    });
});

describe("Tests for singleCategoryController", () => {

    // Set up variables for our test cases
    let req, res;

    beforeEach(() => {
        req = {
            params: {},
            body: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        jest.clearAllMocks();
    });

    test("Fetch a single category successfully and return 200", async () => {
        // Arrange
        req.params.slug = "electronics";
        const fetchedCategory = { _id: 1, name: "Electronics", slug: "electronics" };

        // Mock categoryModel.findOne to return the fetched category
        categoryModel.findOne.mockResolvedValue(fetchedCategory);

        // Act
        await singleCategoryController(req, res);

        // Assert
        expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "electronics" });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Single category fetched successfully",
            category: fetchedCategory,
        });
    });

    test("Return a 400 when slug is not provided", async () => {
        /*
        Assumption: The app should inform the user that the slug is required.
        And also an empty string is valid because an empty string is a valid string
        which MongoDB can still store / process without any issues.
        */

        // Arrange
        req.params.slug = null;


        // Act
        await singleCategoryController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            message: "Category name is not provided",
        });
    });

    test("Return 500 when an error occurs", async () => {
        /* 
        Assumption: If the database connection is not established any function to MongoDB
        will raise an error and not return null.
        */

        // Arrange
        req.params.slug = "electronics";
        const mockError = new Error("Some error");

        categoryModel.findOne.mockRejectedValue(mockError);
        // Console is a dependency so just mock it
        console.log = jest.fn();

        // Act
        await singleCategoryController(req, res);

        // Assert
        expect(console.log).toHaveBeenCalledWith(mockError);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            error: mockError,
            message: "Error while getting single category",
        });
    });
});