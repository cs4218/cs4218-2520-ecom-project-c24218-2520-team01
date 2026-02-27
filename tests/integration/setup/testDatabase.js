import mongoose from "mongoose";
import userModel from "../../../models/userModel.js";
import orderModel from "../../../models/orderModel.js";
import productModel from "../../../models/productModel.js";
import categoryModel from "../../../models/categoryModel.js";

// database is used only for automated tests, not for dev or production

// Rachel Tai Ke Jia, A0258603A
export const connectTestDatabase = async () => {
    try {
        const testDatabaseUri = process.env.MONGO_URL || "mongodb://localhost:27017/test";
        
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(testDatabaseUri);
            console.log("Connected to test database");
        }
    } catch (error) {
        console.log(`Error in connecting to test Mongodb ${error}`.bgRed.white);
        throw error;
    }
};


export const disconnectTestDatabase = async () => {
    try {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
            console.log("Disconnected from test database");
        }
    } catch (error) {
        console.log(`Error disconnecting from test database: ${error}`.bgRed.white);
        throw error;
    }
};


export const clearTestData = async () => {
    try {
        await userModel.deleteMany({});
        await categoryModel.deleteMany({});
        await orderModel.deleteMany({});
        await productModel.deleteMany({});
    } catch (error) {
        console.log(`Error clearing the test data: ${error}`.bgRed.white);
        throw error;
    }
};


export const createTestUser = async (userData) => {
    try {
        const user = await new userModel(userData).save();
        return user;
    } catch (error) {
        console.log(`Error creating a test user: ${error}`.bgRed.white);
        throw error;
    }
};
