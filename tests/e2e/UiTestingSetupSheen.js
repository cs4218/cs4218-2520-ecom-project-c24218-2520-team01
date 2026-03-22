import express from "express";
import { hashPassword } from "../../helpers/authHelper.js";
import {
	e2eCategories,
	e2ePayment,
	e2eProducts,
	e2eUsers,
} from "./e2eFixturesSheen.js";
import categoryModel from "../../models/categoryModel.js";
import orderModel from "../../models/orderModel.js";
import productModel from "../../models/productModel.js";
import userModel from "../../models/userModel.js";

/**
 * AI Usage Declaration
 *
 * Tool Used: GPT-5.4
 *
 * Prompt:
 * - Asked for reference ideas on how to separate Playwright E2E test-data
 *   setup and cleanup from global setup/teardown so future test changes can stay local.
 *
 * How the AI Output Was Used:
 * - Used a portion of the suggestions for the code separation below.
 * Wong Sheen Kerr (A0269647J)
 */
const router = express.Router();

router.post("/reset-and-prepare-test-data", async (req, res) => {
	try {
		await Promise.all([
			orderModel.deleteMany({}),
			productModel.deleteMany({}),
			categoryModel.deleteMany({}),
			userModel.deleteMany({}),
		]);

		const categories = await categoryModel.insertMany(e2eCategories);
		const categoryIdsByName = new Map(
			categories.map((category) => [category.name, category._id]),
		);

		const products = await productModel.insertMany(
			e2eProducts.map((product) => ({
				...product,
				category: categoryIdsByName.get(product.category),
			})),
		);

		const testUsers = {};
		for (const [key, user] of Object.entries(e2eUsers)) {
			const password = await hashPassword(user.password);
			testUsers[key] = await userModel.create({
				...user,
				password,
			});
		}

		res.status(200).send({
			success: true,
			fixtures: {
				categories: categories.map(({ _id, name, slug }) => ({
					_id,
					name,
					slug,
				})),
				products: products.map(({ _id, name, slug, price }) => ({
					_id,
					name,
					slug,
					price,
				})),
				users: Object.fromEntries(
					Object.entries(testUsers).map(([key, user]) => [
						key,
						{
							_id: user._id,
							name: user.name,
							email: user.email,
							role: user.role,
						},
					]),
				),
				payment: e2ePayment,
			},
		});
	} catch (error) {
		console.log(error);
		res.status(500).send({
			success: false,
			message: "Failed to reset and prepare E2E test data",
			error,
		});
	}
});

export default router;
