import { beforeAll, afterAll, beforeEach, describe, test, expect, jest } from "@jest/globals";
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { createCategoryController } from '../../../controllers/categoryController.js';
import categoryModel from '../../../models/categoryModel.js';

// Written by Nicholas Cheng, A0269648H

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

        // Add 1 dummy category to the database for testing purposes
        await categoryModel.create({
            name: 'Electronic',
            slug: 'electronic'
        });
    });

    describe('Create category', () => {
        let req, res;

        beforeEach(() => {
            // Mock Express req and res objects since req and res are handle by the router.
            req = {
                body: {}
            };
            res = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn()
            };
        });

        test('Create a new category successfully with a unique category name', async () => {
            req.body.name = 'Toys';

            await createCategoryController(req, res);

            // Assert Response
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                message: 'New category created',
                category: expect.objectContaining({
                    name: 'Toys',
                    slug: 'toys'
                })
            }));

            // Assert Database State
            const categoryInDb = await categoryModel.findOne({ name: 'Toys' });
            expect(categoryInDb).toBeTruthy();
            expect(categoryInDb.name).toBe('Toys');
            expect(categoryInDb.slug).toBe('toys');
        });

        test('Return 422 if category name is empty and database state remains unchanged', async () => {
            req.body.name = '';

            await createCategoryController(req, res);

            // Assert Response
            expect(res.status).toHaveBeenCalledWith(422);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: 'Category name cannot be empty'
            });

            // Assert Database State
            const count = await categoryModel.countDocuments();
            expect(count).toBe(1); // Because we only have 1 category inside the database
        });

        test('Return 422 if category name is null and database state remains unchanged', async () => {
            req.body.name = null;

            await createCategoryController(req, res);

            // Assert Response
            expect(res.status).toHaveBeenCalledWith(422);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: 'Category name cannot be empty'
            });

            // Assert Database State
            const count = await categoryModel.countDocuments();
            expect(count).toBe(1); // Because we only have 1 category inside the database
        });

        test('Return 409 if category already exists and database stae remains unchanged', async () => {
            // Seed database
            req.body.name = 'Electronic';

            await createCategoryController(req, res);

            // Assert Response
            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: 'Category already exists'
            });

            // Assert Database State
            const count = await categoryModel.countDocuments();
            expect(count).toBe(1); // Because we only have 1 category inside the database
        });
    });

});
