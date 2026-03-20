import { test, expect } from '@playwright/test';
import { hashPassword } from '../../helpers/authHelper';
import categoryModel from '../../models/categoryModel';
import userModel from '../../models/userModel';
import productModel from '../../models/productModel';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// Written by Nicholas Cheng, A0269648H

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURE_IMAGE = path.resolve(__dirname, "../fixtures/test-image.jpg");
const USER_EMAIL = "jane@test.com";
const USER_PASSWORD = "Password";

let user, category, product;

test.describe.configure({ mode: 'parallel' });

test.beforeAll(async ({ }) => {

    await mongoose.connect(process.env.MONGO_URL);

    // Create a user
    user = await new userModel({
        name: "Jane Doe",
        email: USER_EMAIL,
        password: await hashPassword(USER_PASSWORD),
        phone: "123456789",
        address: "123 Main St",
        answer: "yes"
    }).save();

    category = await new categoryModel({
        name: 'Test',
        slug: 'test',
    }).save();
});

test.beforeEach(async ({ page }) => {

    product = await new productModel({
        name: "Ball",
        slug: "ball",
        description: "A round GOLDEN ball",
        price: 3000,
        category: category._id,
        quantity: 5,
        photo: {
            data: fs.readFileSync(FIXTURE_IMAGE),
            contentType: FIXTURE_IMAGE.type
        }
    }).save();

    await page.goto('http://localhost:3000/');
});


test.afterAll(async ({ }) => {
    // Clean up the dummy data
    await userModel.findByIdAndDelete(user._id);
    await categoryModel.findByIdAndDelete(category._id);
    await productModel.findByIdAndDelete(product._id);

    await mongoose.disconnect();
});

