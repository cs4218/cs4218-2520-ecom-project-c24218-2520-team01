import { beforeAll, afterAll, beforeEach, describe, test, expect, jest } from "@jest/globals";
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
    createCategoryController,
    updateCategoryController,
    categoryController,
    singleCategoryController,
    deleteCategoryController
} from '../../../controllers/categoryController.js';
import categoryModel from '../../../models/categoryModel.js';

// Written by Nicholas Cheng, A0269648H

// Mock console.log to prevent it from printing to the terminal
jest.spyOn(console, "log").mockImplementation(() => { });

/**
 * I will follow a bottom up approach starting with the database and the controller.
 * The the unit testing of the controller and the category model has already been done.
 * Then I will add in continue incrementally adding in the auth middleware and then the Router component.
 */
describe('Integration tests for Category Controller + Database', () => {
    let mongoServer;

    beforeAll(async () => {
        // Start in memory MongoDB
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        await mongoose.connect(uri);
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        // Clean up the database before each test
        await categoryModel.deleteMany({});

        // Add some categories to the database for testing
        await categoryModel.create({
            name: 'Electronic',
            slug: 'electronic'
        });

        await categoryModel.create({
            name: 'Clothes',
            slug: 'clothes'
        });
    });

    describe('Create category', () => {
        let req, res;

        beforeEach(() => {
            // Mock Express req and res objects since req and res are handled by the router.
            req = {
                body: {}
            };
            res = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn()
            };
        });

        test('Create a new category successfully with a unique category name in the database', async () => {
            req.body.name = 'Toys';

            await createCategoryController(req, res);

            // Assert response
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                message: 'New category created',
                category: expect.objectContaining({
                    name: 'Toys',
                    slug: 'toys'
                })
            }));

            // Assert database state
            const categoryInDb = await categoryModel.findOne({ name: 'Toys' });
            expect(categoryInDb).toBeTruthy();
            expect(categoryInDb.name).toBe('Toys');
            expect(categoryInDb.slug).toBe('toys');
        });

        test('Return 422 if category name is empty and database state remains unchanged', async () => {
            req.body.name = '';

            await createCategoryController(req, res);

            // Assert response
            expect(res.status).toHaveBeenCalledWith(422);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: 'Category name cannot be empty'
            });

            // Assert database state
            const count = await categoryModel.countDocuments();
            expect(count).toBe(2); // Because we only have 1 category inside the database
        });

        test('Return 422 if category name is null and database state remains unchanged', async () => {
            req.body.name = null;

            await createCategoryController(req, res);

            // Assert response
            expect(res.status).toHaveBeenCalledWith(422);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: 'Category name cannot be empty'
            });

            // Assert database state
            const count = await categoryModel.countDocuments();
            expect(count).toBe(2); // Because we only have 1 category inside the database
        });

        test('Return 409 if category already exists and database stae remains unchanged', async () => {
            // Seed database
            req.body.name = 'Electronic';

            await createCategoryController(req, res);

            // Assert response
            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: 'Category already exists'
            });

            // Assert database state
            const count = await categoryModel.countDocuments();
            expect(count).toBe(2); // Because we only have 1 category inside the database
        });
    });

    describe('Update category', () => {
        let req, res;

        beforeEach(() => {
            // Mock Express req and res objects since req and res are handled by the router.
            req = {
                params: {},
                body: {}
            };
            res = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn()
            };
        });

        test('Update a category successfully and reflect changes in the database', async () => {
            // Retrieve the predefined category from our in memory database
            const initialCategory = await categoryModel.findOne({ name: 'Electronic' });

            req.params.id = initialCategory._id.toString();
            req.body.name = 'Electronics';

            await updateCategoryController(req, res);

            // Assert response
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                message: 'Category updated successfully',
                category: expect.objectContaining({
                    name: 'Electronics',
                    slug: 'electronics'
                })
            }));

            // Assert database state
            const categoryInDb = await categoryModel.findById(initialCategory._id);
            expect(categoryInDb).toBeTruthy();
            expect(categoryInDb.name).toBe('Electronics');
            expect(categoryInDb.slug).toBe('electronics');
            // Ensure that not a new category object gets created
            const count = await categoryModel.countDocuments();
            expect(count).toBe(2);
        });

        test('Return 422 if new category name is empty string and category is not updated', async () => {
            // Retrieve the predefined category from our in memory database
            const initialCategory = await categoryModel.findOne({ name: 'Electronic' });

            req.params.id = initialCategory._id.toString();
            req.body.name = '';

            await updateCategoryController(req, res);

            // Assert response
            expect(res.status).toHaveBeenCalledWith(422);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: 'New category name cannot be empty'
            });

            // Assert database state
            const categoryInDb = await categoryModel.findById(initialCategory._id);
            expect(categoryInDb.name).toBe('Electronic'); // Ensure that the existing category is not updated
            const count = await categoryModel.countDocuments();
            expect(count).toBe(2);
        });

        test('Return 422 if new category name is null and category is not updated', async () => {
            // Retrieve the predefined category from our in memory database
            const initialCategory = await categoryModel.findOne({ name: 'Electronic' });

            req.params.id = initialCategory._id.toString();
            req.body.name = null;

            await updateCategoryController(req, res);

            // Assert response
            expect(res.status).toHaveBeenCalledWith(422);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: 'New category name cannot be empty'
            });

            // Assert database state
            const categoryInDb = await categoryModel.findById(initialCategory._id);
            expect(categoryInDb.name).toBe('Electronic'); // Ensure that the existing category is not updated
            const count = await categoryModel.countDocuments();
            expect(count).toBe(2);
        });

        test('Return 422 if new category name is whitespace and category is not updated', async () => {
            // Retrieve the predefined category from our in memory database
            const initialCategory = await categoryModel.findOne({ name: 'Electronic' });

            req.params.id = initialCategory._id.toString();
            req.body.name = '    ';

            await updateCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(422);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: 'New category name cannot be empty'
            });

            // Assert database state
            const categoryInDb = await categoryModel.findById(initialCategory._id);
            expect(categoryInDb.name).toBe('Electronic'); // Ensure that the existing category is not updated
            const count = await categoryModel.countDocuments();
            expect(count).toBe(2);
        });

        test('Return 422 if category id is empty or missing and database state remains unchanged', async () => {
            req.params.id = null;
            req.body.name = 'Toys';

            await updateCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(422);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: 'Category id cannot be empty'
            });

            // Assert database state
            const count = await categoryModel.countDocuments();
            expect(count).toBe(2);
        });

        test('Return 404 if category to update is not found and database state remains unchanged', async () => {
            // Provide a valid but non-existent mongoose ID
            req.params.id = new mongoose.Types.ObjectId().toString();
            req.body.name = 'Toys';

            await updateCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: 'Category not found'
            });

            // Assert database state
            const count = await categoryModel.countDocuments();
            expect(count).toBe(2);
        });

        test('Return 500 when category id is invalid and database state remains unchanged', async () => {
            req.params.id = "invalid id";
            req.body.name = 'Toys';

            await updateCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: 'Error while updating category',
                error: expect.any(Object)
            });

            // Assert database state
            const count = await categoryModel.countDocuments();
            expect(count).toBe(2);
        });
    });

    describe('Get all categories', () => {
        let req, res;

        beforeEach(() => {
            // Mock Express req and res objects since req and res are handled by the router.
            req = {};
            res = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn()
            };
        });

        test('Successfully fetch all categories from the database', async () => {
            await categoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: 'All categories fetched',
                category: [
                    expect.objectContaining({ name: 'Electronic', slug: 'electronic' }),
                    expect.objectContaining({ name: 'Clothes', slug: 'clothes' })
                ]
            });
        });

        test('Successfully fetch empty list when there are no categories', async () => {
            // Clear the database (remove the predefined categories)
            await categoryModel.deleteMany({});

            await categoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: 'All categories fetched',
                category: []
            });
        });
    });

    describe('Get single category', () => {
        let req, res;

        beforeEach(() => {
            req = { params: {} };
            res = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn()
            };
        });

        test('Successfully fetch a single category by slug', async () => {
            req.params.slug = 'electronic';

            await singleCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: 'Get single category successfully',
                category: expect.objectContaining({
                    name: 'Electronic',
                    slug: 'electronic'
                })
            });
        });

        test('Return 404 when category with slug cannot be found', async () => {
            req.params.slug = 'medicine';

            await singleCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: 'No category found'
            });
        });

        test('Return 422 when slug value is null or missing', async () => {
            req.params.slug = null;

            await singleCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(422);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: 'Category slug cannot be empty'
            });
        });
    });

    describe('Delete category', () => {
        let req, res;

        beforeEach(() => {
            req = { params: {} };
            res = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn()
            };
        });

        test('Successfully delete a category from the database', async () => {
            const initialCategory = await categoryModel.findOne({ name: 'Electronic' });
            req.params.id = initialCategory._id.toString();

            await deleteCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: 'Category deleted successfully'
            });

            // Assert database state
            const count = await categoryModel.countDocuments();
            expect(count).toBe(1);
        });

        test('Return 404 when category id value cannot be found and database state remains unchanged', async () => {
            req.params.id = new mongoose.Types.ObjectId().toString();

            await deleteCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: 'Failed to delete because no category is found'
            });

            // Assert database state
            const count = await categoryModel.countDocuments();
            expect(count).toBe(2);
        });

        test('Return 422 when category id is null or missing and database state remains unchanged', async () => {
            req.params.id = null;

            await deleteCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(422);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: 'Category id cannot be empty'
            });

            // Assert database state
            const count = await categoryModel.countDocuments();
            expect(count).toBe(2);
        });

        test('Return 500 when category id is invalid and database state remains unchanged', async () => {
            req.params.id = "invalid id";

            await deleteCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: 'Error while deleting category',
                error: expect.any(Object)
            });

            // Assert database state
            const count = await categoryModel.countDocuments();
            expect(count).toBe(2);
        });
    });
});