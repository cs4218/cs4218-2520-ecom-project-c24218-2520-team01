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

    test("Return 200 when category exists", async () => {
        // Arrange
        req.body.name = "existingCategory";

        // Mock categoryModel.findOne to return true
        categoryModel.findOne.mockResolvedValue(true);

        // Act
        await createCategoryController(req, res);

        // Assert
        expect(categoryModel.findOne).toHaveBeenCalledWith({ name: "existingCategory" });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Category already exists",
        });
    });

    test("Return 401 when category name not provided", async () => {
        // Act
        await createCategoryController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(401);
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

    it("Return 500 when an error occurs", async () => {
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