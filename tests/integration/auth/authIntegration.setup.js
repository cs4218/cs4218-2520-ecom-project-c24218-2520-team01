/**
 * AI Usage Declaration
 *
 * Tool Used: GPT-5.4
 *
 * Prompt: How can I set up my test environment for my auth integration testing Independently?
 *
 * How the AI Output Was Used:
 * The AI provided guidance on setting up an isolated test environment using MongoMemoryServer for in-memory database testing, 
 * creating a minimal Express app with auth routes, and bridging axios to use the Node.js HTTP adapter for testing without a browser environment.
 * 
 * The code structure for startAuthIntegrationEnvironment(), createAuthIntegrationApp(), and the axios bridging functions 
 * was adapted from the AI's suggestions.
 *
 **/

import axios from "axios";
import nodeAxios from "axios/dist/node/axios.cjs";
import cors from "cors";
import express from "express";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

import authRoutes from "../../../routes/authRoute.js";
import categoryRoutes from "../../../routes/categoryRoutes.js";

const AUTH_UI_TEST_HOST = "127.0.0.1";
const AUTH_UI_TEST_PORT = 16767;

const originalAxiosState = {
	baseURL: axios.defaults.baseURL,
	authorizationHeader: axios.defaults.headers.common.Authorization,
	methods: {
		get: axios.get,
		post: axios.post,
		put: axios.put,
		delete: axios.delete,
	},
};

function createAuthIntegrationApp() {
	const app = express();
	app.use(cors());
	app.use(express.json());
	app.use("/api/v1/auth", authRoutes);
	app.use("/api/v1/category", categoryRoutes);
	return app;
}

export const authIntegrationApp = createAuthIntegrationApp();

function bridgeAxiosToNodeClient(baseURL) {
	["get", "post", "put", "delete"].forEach((method) => {
		axios[method] = (url, ...rest) => {
			const requestUrl =
				typeof url === "string" && url.startsWith("http")
					? url
					: `${baseURL}${url}`;

			if (method === "get" || method === "delete") {
				const config = rest[0] ?? {};
				return nodeAxios[method](requestUrl, {
					...config,
					headers: {
						...(axios.defaults.headers.common || {}),
						...(config.headers || {}),
					},
				});
			}

			const data = rest[0];
			const config = rest[1] ?? {};
			return nodeAxios[method](requestUrl, data, {
				...config,
				headers: {
					...(axios.defaults.headers.common || {}),
					...(config.headers || {}),
				},
			});
		};
	});
}

function restoreAxios() {
	axios.defaults.baseURL = originalAxiosState.baseURL;
	axios.get = originalAxiosState.methods.get;
	axios.post = originalAxiosState.methods.post;
	axios.put = originalAxiosState.methods.put;
	axios.delete = originalAxiosState.methods.delete;

	if (originalAxiosState.authorizationHeader === undefined) {
		delete axios.defaults.headers.common.Authorization;
	} else {
		axios.defaults.headers.common.Authorization =
			originalAxiosState.authorizationHeader;
	}
}

export function resetAuthIntegrationAxios() {
	bridgeAxiosToNodeClient(`http://${AUTH_UI_TEST_HOST}:${AUTH_UI_TEST_PORT}`);
	axios.defaults.baseURL = `http://${AUTH_UI_TEST_HOST}:${AUTH_UI_TEST_PORT}`;

	if (originalAxiosState.authorizationHeader === undefined) {
		delete axios.defaults.headers.common.Authorization;
	} else {
		axios.defaults.headers.common.Authorization =
			originalAxiosState.authorizationHeader;
	}
}

export async function startAuthIntegrationEnvironment() {
	const mongod = await MongoMemoryServer.create();
	await mongoose.connect(mongod.getUri());

	const server = await new Promise((resolve) => {
		const listener = authIntegrationApp.listen(
			AUTH_UI_TEST_PORT,
			AUTH_UI_TEST_HOST,
			() => resolve(listener),
		);
	});

	resetAuthIntegrationAxios();

	return {
		async stop() {
			restoreAxios();

			if (server) {
				await new Promise((resolve, reject) => {
					server.close((error) => {
						if (error) {
							reject(error);
							return;
						}
						resolve();
					});
				});
			}

			await mongoose.disconnect();
			await mongod.stop();
		},
	};
}
