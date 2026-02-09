import categoryModel from "../models/categoryModel.js";
import { createCategoryController, updateCategoryController } from "../controllers/categoryController.js";
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


    test("Return 500 when an error occurs", async () => {
        // Arrange
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