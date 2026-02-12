import orderModel from "../models/orderModel.js";
import { getOrdersController } from "../controllers/authController.js";

describe("Tests for getOrdersController", () => {

    // Set up variables for our test cases
    let req, res;

    // beforeEach(() => {
    //     req = {
    //         body: {},
    //     };
    //     res = {
    //         status: jest.fn().mockReturnThis(),
    //         send: jest.fn(),
    //     };
    //     jest.clearAllMocks();
    // });

    test("Create new category successfully and return 201", async () => {
        // // Arrange
        // req.body.name = "NewCategory";

        // // Mock categoryModel.findOne to return false
        // categoryModel.findOne.mockResolvedValue(false);
        // slugify.mockReturnValue("newcategory");

        // // Mock categoryModel.save to return a new category object
        // const savedCategory = { name: "NewCategory", slug: "newcategory" };
        // categoryModel.mockImplementation(() => ({
        //     save: jest.fn().mockResolvedValue(savedCategory)
        // }));

        // // Act
        // await createCategoryController(req, res);

        // // Assert
        // expect(categoryModel.findOne).toHaveBeenCalledWith({ name: "NewCategory" });
        // expect(categoryModel).toHaveBeenCalledWith({ name: "NewCategory", slug: "newcategory" });
        // expect(res.status).toHaveBeenCalledWith(201);
        // expect(res.send).toHaveBeenCalledWith({
        //     success: true,
        //     message: "New category created",
        //     category: savedCategory,
        // });
    });
});