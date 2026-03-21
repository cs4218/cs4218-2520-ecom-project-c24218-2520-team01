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

	// check if connection already exists and is ready
	if (mongoose.connection.readyState === 1) {
		try {
			await mongoose.connection.db.admin().ping();
			return;
		} catch (error) {
			// connection is stale: disconnect and reconnect
			await mongoose.disconnect();
		}
	}

	// connect with timeout settings
	await mongoose.connect(mongoUrl, {
		serverSelectionTimeoutMS: 15000,
		socketTimeoutMS: 45000,
		connectTimeoutMS: 15000
	});

	// Additional safety check
	await new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			reject(new Error("Database connection verification timeout"));
		}, 10000);

		mongoose.connection.on("connected", () => {
			clearTimeout(timeout);
			resolve();
		});

		if (mongoose.connection.readyState === 1) {
			clearTimeout(timeout);
			resolve();
		}
	});
};

export const clearTestData = async () => {
	// ensure connection is ready before clearing
	if (mongoose.connection.readyState !== 1) {
		throw new Error("Database connection not ready for clearTestData");
	}

	const collections = [productModel, categoryModel, orderModel, userModel];

	// clear collections sequentially to avoid connection pool exhaustion
	for (const model of collections) {
		try {
			await model.deleteMany({});
		} catch (error) {
			// NamespaceNotFound means collection doesn't exist yet
			if (error?.codeName !== "NamespaceNotFound") {
				throw error;
			}
		}
	}
};

export const createTestUser = async (userData) => userModel.create(userData);

export const disconnectTestDatabase = async () => {
	if (mongoose.connection.readyState !== 0) {
		try {
			await mongoose.disconnect();
		} catch (error) {
			console.error("Error disconnecting test database:", error);
			// continue with cleanup even if disconnect fails
		}
	}
};
