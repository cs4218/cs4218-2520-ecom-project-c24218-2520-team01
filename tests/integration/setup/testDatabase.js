import dotenv from "dotenv";
import mongoose from "mongoose";

import categoryModel from "../../../models/categoryModel.js";
import orderModel from "../../../models/orderModel.js";
import productModel from "../../../models/productModel.js";
import userModel from "../../../models/userModel.js";

dotenv.config({ path: process.env.NODE_ENV === "production" ? ".env" : ".env.test" });

const getTestMongoUrl = () =>
	process.env.MONGO_URL_TEST || process.env.TEST_MONGO_URL || process.env.MONGO_URL;

export const connectTestDatabase = async () => {
	const mongoUrl = getTestMongoUrl();

	if (!mongoUrl) {
		throw new Error("Missing MONGO_URL/MONGO_URL_TEST for integration tests");
	}

	if (mongoose.connection.readyState === 1) {
		return;
	}

	await mongoose.connect(mongoUrl);
};

export const clearTestData = async () => {
	const collections = [productModel, categoryModel, orderModel, userModel];

	await Promise.all(
		collections.map(async (model) => {
			try {
				await model.deleteMany({});
			} catch (error) {
				if (error?.codeName !== "NamespaceNotFound") {
					throw error;
				}
			}
		}),
	);
};

export const createTestUser = async (userData) => userModel.create(userData);

export const disconnectTestDatabase = async () => {
	if (mongoose.connection.readyState !== 0) {
		await mongoose.disconnect();
	}
};
