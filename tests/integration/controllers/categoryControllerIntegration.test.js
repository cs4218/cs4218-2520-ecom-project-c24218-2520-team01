import { beforeAll, afterAll, beforeEach, describe, test, expect, jest } from "@jest/globals";
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import express from 'express';
import JWT from 'jsonwebtoken';
import categoryRoutes from '../../../routes/categoryRoutes.js';
import userModel from '../../../models/userModel.js';
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
describe('Integration tests for Category Controller with just the Database', () => {
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
        await new categoryModel({
            name: 'Electronic',
            slug: 'electronic'
        }).save();

        await new categoryModel({
            name: 'Clothes',
            slug: 'clothes'
        }).save();
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

        describe("Successfully create category", () => {
            test('Create a new category successfully with a unique category name in the database', async () => {
                // Arrange
                req.body.name = 'Toys';

                // Act
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
        });


        describe("Failure cases where fields are invalid or missing", () => {
            test('Return 422 if category name is empty and database state remains unchanged', async () => {
                // Arrange
                req.body.name = '';

                // Act
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

            test('Return 422 if category name is just white spaces and database state remains unchanged', async () => {
                // Arrange
                req.body.name = '    ';

                // Act
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
                // Arrange
                req.body.name = null;

                // Act
                await createCategoryController(req, res);

                // Assert response
                expect(res.status).toHaveBeenCalledWith(422);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: 'Category name cannot be empty'
                });

                // Assert database state
                const count = await categoryModel.countDocuments();
                expect(count).toBe(2); // Because we only have 2 categories inside the database
            });

            test('Return 409 if category already exists and database state remains unchanged', async () => {
                // Arrange
                req.body.name = 'Electronic';

                // Act
                await createCategoryController(req, res);

                // Assert response
                expect(res.status).toHaveBeenCalledWith(409);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: 'Category already exists'
                });

                // Assert database state
                const count = await categoryModel.countDocuments();
                expect(count).toBe(2); // Because we only have 2 category inside the database
            });

            test('Return 500 if category name does not exist but the slug does, and database state remains unchanged', async () => {
                // Arrange
                req.body.name = 'electronic';

                // Act
                await createCategoryController(req, res);

                // Assert response
                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    error: expect.any(Error),
                    message: 'Error while creating category'
                });

                // Assert database state
                const count = await categoryModel.countDocuments();
                expect(count).toBe(2); // Because we only have 2 category inside the database
            });
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

        describe("Successfully update category", () => {
            test('Update a category successfully and reflect changes in the database', async () => {
                // Arrange
                // Retrieve the predefined category from our in memory database
                const initialCategory = await categoryModel.findOne({ name: 'Electronic' });

                req.params.id = initialCategory._id.toString();
                req.body.name = 'Electronics';

                // Act
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
        });

        describe("Failure cases where fields are invalid or missing", () => {
            test('Return 422 if new category name is empty string and category is not updated', async () => {
                // Arrange
                // Retrieve the predefined category from our in memory database
                const initialCategory = await categoryModel.findOne({ name: 'Electronic' });

                req.params.id = initialCategory._id.toString();
                req.body.name = '';

                // Act
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
                // Arrange
                // Retrieve the predefined category from our in memory database
                const initialCategory = await categoryModel.findOne({ name: 'Electronic' });

                req.params.id = initialCategory._id.toString();
                req.body.name = null;

                // Act
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
                // Arrange
                // Retrieve the predefined category from our in memory database
                const initialCategory = await categoryModel.findOne({ name: 'Electronic' });

                req.params.id = initialCategory._id.toString();
                req.body.name = '    ';

                // Act
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

            test('Return 422 if category id is empty or missing and database state remains unchanged', async () => {
                // Arrange
                req.body.name = 'Toys';

                // Act
                await updateCategoryController(req, res);

                // Assert response
                expect(res.status).toHaveBeenCalledWith(422);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: 'Category id cannot be empty'
                });

                // Assert database state
                const count = await categoryModel.countDocuments();
                expect(count).toBe(2);
            });

            test('Return 422 if category id is null and database state remains unchanged', async () => {
                // Arrange
                req.params.id = null;
                req.body.name = 'Toys';

                // Act
                await updateCategoryController(req, res);

                // Assert response
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
                // Arrange
                // Provide a valid but non-existent mongoose ID
                req.params.id = new mongoose.Types.ObjectId().toString();
                req.body.name = 'Toys';

                // Act
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
                // Arrange
                req.params.id = "invalid id";
                req.body.name = 'Toys';

                // Act
                await updateCategoryController(req, res);

                // Assert response
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

        describe("Success cases", () => {
            test('Successfully fetch all categories from the database', async () => {
                // Act
                await categoryController(req, res);

                // Assert response
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
                // Arrange
                // Clear the database (remove the predefined categories)
                await categoryModel.deleteMany({});

                // Act
                await categoryController(req, res);

                // Assert response
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith({
                    success: true,
                    message: 'All categories fetched',
                    category: []
                });
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

        describe("Successfully retrieve the category", () => {
            test('Successfully fetch a single category by slug', async () => {
                // Arrange
                req.params.slug = 'electronic';

                // Act
                await singleCategoryController(req, res);

                // Assert response
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
        });

        describe("Failure cases where fields are invalid or missing", () => {
            test('Return 404 when category with slug cannot be found', async () => {
                // Arrange
                req.params.slug = 'medicine';

                // Act
                await singleCategoryController(req, res);

                // Assert response
                expect(res.status).toHaveBeenCalledWith(404);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: 'No category found'
                });
            });

            test('Return 422 when slug value is empty or missing', async () => {
                // Arrange
                req.params.slug = '';

                // Act
                await singleCategoryController(req, res);

                // Assert response
                expect(res.status).toHaveBeenCalledWith(422);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: 'Category slug cannot be empty'
                });
            });

            test('Return 422 when slug value is null', async () => {
                // Arrange
                req.params.slug = null;

                // Act
                await singleCategoryController(req, res);

                // Assert response
                expect(res.status).toHaveBeenCalledWith(422);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: 'Category slug cannot be empty'
                });
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

        describe("Successfully delete category", () => {
            test('Successfully delete a category from the database', async () => {
                // Arrange
                const initialCategory = await categoryModel.findOne({ name: 'Electronic' });
                req.params.id = initialCategory._id.toString();

                // Act
                await deleteCategoryController(req, res);

                // Assert response
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith({
                    success: true,
                    message: 'Category deleted successfully'
                });

                // Assert database state
                const count = await categoryModel.countDocuments();
                expect(count).toBe(1);
            });
        });

        describe("Failure cases where fields are missing or invalid", () => {
            test('Return 404 when category id value cannot be found and database state remains unchanged', async () => {
                // Arrange
                req.params.id = new mongoose.Types.ObjectId().toString();

                // Act
                await deleteCategoryController(req, res);

                // Assert response
                expect(res.status).toHaveBeenCalledWith(404);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: 'Failed to delete because no category is found'
                });

                // Assert database state
                const count = await categoryModel.countDocuments();
                expect(count).toBe(2);
            });

            test('Return 422 when category id is empty or missing and database state remains unchanged', async () => {
                // Act
                await deleteCategoryController(req, res);

                // Assert response
                expect(res.status).toHaveBeenCalledWith(422);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: 'Category id cannot be empty'
                });

                // Assert database state
                const count = await categoryModel.countDocuments();
                expect(count).toBe(2);
            });

            test('Return 422 when category id is null and database state remains unchanged', async () => {
                // Arrange
                req.params.id = null;

                // Act
                await deleteCategoryController(req, res);

                // Assert response
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
                // Arrange
                req.params.id = "invalid id";

                // Act
                await deleteCategoryController(req, res);

                // Assert response
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
});

describe('Integration tests for Category Controller with the Database, Express Router & Auth Middleware', () => {
    let app;
    let mongoServer;
    let adminToken;
    let regularToken;

    beforeAll(async () => {
        // Start in memory MongoDB
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        await mongoose.connect(uri);

        // Setup Express app
        app = express();
        app.use(express.json());

        // Define a dummy JWT_SECRET for the test
        process.env.JWT_SECRET = 'testsecret';

        // Mount the routes
        app.use('/api/v1/category', categoryRoutes);
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        await userModel.deleteMany({});

        // Create an admin user to generate a valid token
        const adminUser = await new userModel({
            name: 'Admin',
            email: 'admin@example.com',
            password: 'password123',
            phone: '1234567890',
            address: 'Admin St',
            answer: 'admin',
            role: 1
        }).save();

        // Generate JWT token for the admin
        adminToken = JWT.sign({ _id: adminUser._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        // Create a regular user to generate a valid non-admin token
        const regularUser = await new userModel({
            name: 'User',
            email: 'user@example.com',
            password: 'password123',
            phone: '1234567890',
            address: 'User St',
            answer: 'user',
            role: 0
        }).save();

        // Generate JWT token for regular user
        regularToken = JWT.sign({ _id: regularUser._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    });

    describe('Create category via API requests', () => {

        beforeEach(async () => {
            // Clean up the database before each test
            await categoryModel.deleteMany({});

            // Add some categories for testing
            await new categoryModel({
                name: 'Electronic',
                slug: 'electronic'
            }).save();
        });

        describe("Successfully create category", () => {
            test('Create a new category successfully with a valid admin token and unique category name', async () => {
                // Arrange & Act
                const res = await request(app)
                    .post('/api/v1/category/create-category')
                    .set('Authorization', adminToken)
                    .send({ name: 'Toys' });

                // Assert response
                expect(res.status).toBe(201);
                expect(res.body.success).toBe(true);
                expect(res.body.message).toBe('New category created');
                expect(res.body.category.name).toBe('Toys');

                // Assert database state
                const categoryInDb = await categoryModel.findOne({ name: 'Toys' });
                expect(categoryInDb).toBeTruthy();
                expect(categoryInDb.name).toBe('Toys');
                expect(categoryInDb.slug).toBe('toys');

                const count = await categoryModel.countDocuments();
                expect(count).toBe(2);
            });
        });

        describe("Failure cases where fields are missing or invalid", () => {
            test('Return 401 Unauthorized if no token is provided', async () => {
                // Arrange & Act
                const res = await request(app)
                    .post('/api/v1/category/create-category')
                    .send({ name: 'Toys' });

                // Assert response
                expect(res.status).toBe(401);
                expect(res.body.success).toBe(false);
                expect(res.body.message).toBe('Unauthorized');

                // Assert database state remains unchanged
                const count = await categoryModel.countDocuments();
                expect(count).toBe(1);
            });

            test('Return 401 Unauthorized Access if user is not an admin', async () => {
                // Arrange & Act
                const res = await request(app)
                    .post('/api/v1/category/create-category')
                    .set('Authorization', regularToken)
                    .send({ name: 'Toys' });

                // Assert response
                expect(res.status).toBe(401);
                expect(res.body.success).toBe(false);
                expect(res.body.message).toBe('Unauthorized Access');

                // Assert database state remains unchanged
                const count = await categoryModel.countDocuments();
                expect(count).toBe(1);
            });

            test('Return 422 if category name is empty string', async () => {
                // Arrange & Act
                const res = await request(app)
                    .post('/api/v1/category/create-category')
                    .set('Authorization', adminToken)
                    .send({ name: '' });

                // Assert response
                expect(res.status).toBe(422);
                expect(res.body.success).toBe(false);
                expect(res.body.message).toBe('Category name cannot be empty');

                const count = await categoryModel.countDocuments();
                expect(count).toBe(1);
            });

            test('Return 422 if category name is null or missing', async () => {
                // Arrange & Act
                const res = await request(app)
                    .post('/api/v1/category/create-category')
                    .set('Authorization', adminToken)
                    .send({ name: null });

                // Assert response
                expect(res.status).toBe(422);
                expect(res.body.success).toBe(false);
                expect(res.body.message).toBe('Category name cannot be empty');

                const count = await categoryModel.countDocuments();
                expect(count).toBe(1);
            });

            test('Return 409 if category already exists', async () => {
                // Arrange & Act
                const res = await request(app)
                    .post('/api/v1/category/create-category')
                    .set('Authorization', adminToken)
                    .send({ name: 'Electronic' });

                // Assert response
                expect(res.status).toBe(409);
                expect(res.body.success).toBe(false);
                expect(res.body.message).toBe('Category already exists');

                const count = await categoryModel.countDocuments();
                expect(count).toBe(1);
            });
        });
    });

    describe('Update category via API requests', () => {

        let categoryToUpdate;

        beforeEach(async () => {
            // Clean up the database before each test
            await categoryModel.deleteMany({});

            // Add some categories for testing
            categoryToUpdate = await new categoryModel({
                name: 'Electronic',
                slug: 'electronic'
            }).save();
        });

        afterAll(async () => {
            await categoryModel.deleteMany({});
        });

        describe("Successfully update category", () => {
            test('Update a category successfully with a valid admin token', async () => {
                // Arrange
                // This is to get the id for the category
                const id = categoryToUpdate._id;

                // Act
                const res = await request(app)
                    .put(`/api/v1/category/update-category/${id}`)
                    .set('Authorization', adminToken)
                    .send({ name: 'Computers' });

                // Assert response
                expect(res.status).toBe(200);
                expect(res.body.success).toBe(true);
                expect(res.body.message).toBe('Category updated successfully');
                expect(res.body.category.name).toBe('Computers');
                expect(res.body.category.slug).toBe('computers');

                // Assert database state
                const categoryInDb = await categoryModel.findById(id);
                expect(categoryInDb.name).toBe('Computers');
            });
        });

        describe("Failure cases where fields are missing or invalid", () => {
            test('Return 401 Unauthorized if no token is provided', async () => {
                // Arrange
                const id = categoryToUpdate._id;

                // Act
                const res = await request(app)
                    .put(`/api/v1/category/update-category/${id}`)
                    .send({ name: 'Computers' });

                // Assert response
                expect(res.status).toBe(401);
                expect(res.body.success).toBe(false);
                expect(res.body.message).toBe('Unauthorized');
            });

            test('Return 401 Unauthorized Access if user is not an admin', async () => {
                // Arrange
                const id = categoryToUpdate._id;

                // Act
                const res = await request(app)
                    .put(`/api/v1/category/update-category/${id}`)
                    .set('Authorization', regularToken)
                    .send({ name: 'Computers' });

                // Assert response
                expect(res.status).toBe(401);
                expect(res.body.success).toBe(false);
                expect(res.body.message).toBe('Unauthorized Access');

                // Assert database state remains unchanged
                const categoryInDb = await categoryModel.findById(id);
                expect(categoryInDb.name).toBe('Electronic');
            });

            test('Return 422 if new category name is empty string', async () => {
                // Arrange
                const id = categoryToUpdate._id;

                // Act
                const res = await request(app)
                    .put(`/api/v1/category/update-category/${id}`)
                    .set('Authorization', adminToken)
                    .send({ name: '' });

                // Assert response
                expect(res.status).toBe(422);
                expect(res.body.success).toBe(false);
                expect(res.body.message).toBe('New category name cannot be empty');

                // Assert database state remains unchanged
                const categoryInDb = await categoryModel.findById(id);
                expect(categoryInDb.name).toBe('Electronic');
            });

            test('Return 422 if new category name is null or missing', async () => {
                // Arrange
                const id = categoryToUpdate._id;

                // Act
                const res = await request(app)
                    .put(`/api/v1/category/update-category/${id}`)
                    .set('Authorization', adminToken)
                    .send({ name: null });

                // Assert response
                expect(res.status).toBe(422);
                expect(res.body.success).toBe(false);
                expect(res.body.message).toBe('New category name cannot be empty');

                // Assert database state remains unchanged
                const categoryInDb = await categoryModel.findById(id);
                expect(categoryInDb.name).toBe('Electronic');
            });

            test('Return 404 if category to update is not found', async () => {
                // Arrange
                const fakeId = new mongoose.Types.ObjectId();

                // Act
                const res = await request(app)
                    .put(`/api/v1/category/update-category/${fakeId}`)
                    .set('Authorization', adminToken)
                    .send({ name: 'Computers' });

                expect(res.status).toBe(404);
                expect(res.body.success).toBe(false);
                expect(res.body.message).toBe('Category not found');

                // Assert database state remains unchanged
                const categoryInDb = await categoryModel.findById(categoryToUpdate._id);
                expect(categoryInDb.name).toBe('Electronic');
            });

            test('Return 500 when category id is invalid', async () => {
                // Arrange & Act
                const res = await request(app)
                    .put(`/api/v1/category/update-category/invalid-id`)
                    .set('Authorization', adminToken)
                    .send({ name: 'Computers' });

                // Assert response
                expect(res.status).toBe(500);
                expect(res.body.success).toBe(false);
                expect(res.body.message).toBe('Error while updating category');

                // Assert database state remains unchanged
                const categoryInDb = await categoryModel.findById(categoryToUpdate._id);
                expect(categoryInDb.name).toBe('Electronic');
            });
        });
    });

    describe('Get all categories via API requests', () => {

        beforeAll(async () => {
            // Add some categories for testing
            await new categoryModel({
                name: 'Electronic',
                slug: 'electronic'
            }).save();
            await new categoryModel({
                name: 'Toys',
                slug: 'toys'
            }).save();
        });

        afterAll(async () => {
            await categoryModel.deleteMany({});
        });


        /**
         * We do not need to test if the api request returns an empty list because 
         * it still returns something but it is just empty.
         */
        describe("Successfully fetch all categories", () => {
            test('Successfully fetch all categories', async () => {

                // Act
                const res = await request(app).get('/api/v1/category/get-category');

                // Assert response
                expect(res.status).toBe(200);
                expect(res.body.success).toBe(true);
                expect(res.body.message).toBe('All categories fetched');
                expect(res.body.category).toBeInstanceOf(Array);
                expect(res.body.category.length).toBe(2);
                expect(res.body.category).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({ name: 'Electronic', slug: 'electronic' }),
                        expect.objectContaining({ name: 'Toys', slug: 'toys' })
                    ])
                );
            });
        });
    });

    describe('Get single category via API requests', () => {

        beforeAll(async () => {

            // Add some categories for testing
            await new categoryModel({
                name: 'Electronic',
                slug: 'electronic'
            }).save();
        });

        afterAll(async () => {
            await categoryModel.deleteMany({});
        });

        describe("Successfully fetch a single category", () => {
            test('Successfully fetch a single category by slug', async () => {
                // Act
                const res = await request(app).get('/api/v1/category/single-category/electronic');

                // Assert response
                expect(res.status).toBe(200);
                expect(res.body.success).toBe(true);
                expect(res.body.message).toBe('Get single category successfully');
                expect(res.body.category.name).toBe('Electronic');
                expect(res.body.category.slug).toBe('electronic');
            });
        });

        describe("Failed to fetch a single category", () => {
            test('Return 404 when category with slug cannot be found', async () => {
                // Act
                const res = await request(app).get('/api/v1/category/single-category/shoes');

                // Assert Response
                expect(res.status).toBe(404);
                expect(res.body.success).toBe(false);
                expect(res.body.message).toBe('No category found');
            });
        });
    });

    describe('Delete category via API requests', () => {
        let categoryToDelete;

        beforeEach(async () => {
            // Add a category for delete testing
            categoryToDelete = await new categoryModel({
                name: 'Electronic',
                slug: 'electronic'
            }).save();
        });

        afterEach(async () => {
            await categoryModel.deleteMany({});
        });

        describe("Successfully delete a category", () => {
            test('Successfully delete a category with a valid admin token', async () => {
                // Arrange
                const id = categoryToDelete._id;

                // Act
                const res = await request(app)
                    .delete(`/api/v1/category/delete-category/${id}`)
                    .set('Authorization', adminToken);

                // Assert response
                expect(res.status).toBe(200);
                expect(res.body.success).toBe(true);
                expect(res.body.message).toBe('Category deleted successfully');

                // Assert database state is empty
                const count = await categoryModel.countDocuments();
                expect(count).toBe(0);
            });
        });

        describe("Failed to delete a category", () => {
            test('Return 401 Unauthorized if no token is provided', async () => {
                // Arrange
                const id = categoryToDelete._id;

                // Act
                const res = await request(app)
                    .delete(`/api/v1/category/delete-category/${id}`);

                // Assert response
                expect(res.status).toBe(401);
                expect(res.body.success).toBe(false);
                expect(res.body.message).toBe('Unauthorized');

                // Assert database state remains unchanged
                const count = await categoryModel.countDocuments();
                expect(count).toBe(1);
            });

            test('Return 401 Unauthorized Access if user is not an admin', async () => {
                // Arrange
                const id = categoryToDelete._id;

                // Act
                const res = await request(app)
                    .delete(`/api/v1/category/delete-category/${id}`)
                    .set('Authorization', regularToken);

                // Assert response
                expect(res.status).toBe(401);
                expect(res.body.success).toBe(false);
                expect(res.body.message).toBe('Unauthorized Access');

                // Assert database state remains unchanged
                const count = await categoryModel.countDocuments();
                expect(count).toBe(1);
            });

            test('Return 404 if category to delete is not found', async () => {
                // Arrange
                const fakeId = new mongoose.Types.ObjectId();

                // Act
                const res = await request(app)
                    .delete(`/api/v1/category/delete-category/${fakeId}`)
                    .set('Authorization', adminToken);

                // Assert response
                expect(res.status).toBe(404);
                expect(res.body.success).toBe(false);
                expect(res.body.message).toBe('Failed to delete because no category is found');

                // Assert database state remains unchanged
                const count = await categoryModel.countDocuments();
                expect(count).toBe(1);
            });

            test('Return 500 when category id is invalid', async () => {
                // Arrange & Act
                const res = await request(app)
                    .delete(`/api/v1/category/delete-category/invalid-id`)
                    .set('Authorization', adminToken);

                // Assert response
                expect(res.status).toBe(500);
                expect(res.body.success).toBe(false);
                expect(res.body.message).toBe('Error while deleting category');

                // Assert database state remains unchanged
                const count = await categoryModel.countDocuments();
                expect(count).toBe(1);
            });
        });
    });
});