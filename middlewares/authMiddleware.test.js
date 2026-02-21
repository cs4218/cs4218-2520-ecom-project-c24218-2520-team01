// Mock before imports
// Mock jsonwebtoken and userModel
jest.mock("jsonwebtoken");
jest.mock("../models/userModel.js");

import JWT from "jsonwebtoken";
import userModel from "../models/userModel.js";
import { requireSignIn, isAdmin } from "./authMiddleware.js";

//Wong Sheen Kerr (A0269647J)

describe("Authorization", () => {
	let req;
	let res;
	let next;

	beforeEach(() => {
		// Reset mocks before each test
		jest.clearAllMocks();

		// Setup default request, response, and next function
		req = {
			headers: {},
		};

		res = {
			status: jest.fn().mockReturnThis(),
			send: jest.fn().mockReturnThis(),
		};

		next = jest.fn();

		// Mock console.log to suppress output during tests
		jest.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		// Restore console.log
		jest.restoreAllMocks();
	});

	describe("requireSignIn", () => {
		describe("Success", () => {
			it("should call next() with valid token", async () => {
				// Arrange
				const decodedToken = { _id: "6767", role: 1 };
				req.headers.authorization = "Legit Token";
				JWT.verify.mockReturnValue(decodedToken);

				// Act
				await requireSignIn(req, res, next);

				// Assert
				expect(JWT.verify).toHaveBeenCalledWith(
					req.headers.authorization,
					process.env.JWT_SECRET,
				);
				expect(req.user).toEqual(decodedToken);
				expect(next).toHaveBeenCalled();
			});

			it("should set req.user with token payload", async () => {
				// Arrange
				const decodedToken = { _id: "6767", role: 1 };
				req.headers.authorization = "Legit Token";
				JWT.verify.mockReturnValue(decodedToken);

				// Act
				await requireSignIn(req, res, next);

				// Assert
				expect(req.user).toEqual(decodedToken);
				expect(next).toHaveBeenCalled();
			});

		});

		describe("Error", () => {
			describe("Token Errors", () => {
				const tokenErrorTestCases = [
					{
						name: "no token provided",
						authorization: undefined,
						verifyError: new Error("jwt must be provided"),
					},
					{
						name: "invalid token",
						authorization: "invalidToken",
						verifyError: new Error("invalid token"),
					},
					{
						name: "expired token",
						authorization: "expiredToken",
						verifyError: (() => {
							const err = new Error("jwt expired");
							err.name = "TokenExpiredError";
							return err;
						})(),
					},
					{
						name: "malformed token",
						authorization: "not-a-jwt-at-all",
						verifyError: new Error("jwt malformed"),
					},
					{
						name: "token signed with wrong secret",
						authorization: "wrongSecretToken",
						verifyError: new Error("invalid signature"),
					},
					{
						name: "empty string token",
						authorization: "",
						verifyError: new Error("jwt must be provided"),
					},
				];

				test.each(tokenErrorTestCases)(
					"should return 401 when $name",
					async ({ authorization, verifyError }) => {
						// Arrange
						req.headers.authorization = authorization;
						JWT.verify.mockImplementation(() => {
							throw verifyError;
						});

						// Act
						await requireSignIn(req, res, next);

						// Assert
						expect(JWT.verify).toHaveBeenCalled();
						expect(next).not.toHaveBeenCalled();
						expect(console.log).toHaveBeenCalled();
						expect(res.status).toHaveBeenCalledWith(401);
						expect(res.send).toHaveBeenCalledWith({
							success: false,
							message: "Unauthorized",
						});
					},
				);
			});

			describe("Payload Errors", () => {
				it("should call next() when token missing _id field", async () => {
					// Arrange
					const decodedToken = { role: 1, email: "test@test.com" };
					req.headers.authorization = "validToken";
					JWT.verify.mockReturnValue(decodedToken);

					// Act
					await requireSignIn(req, res, next);

					// Assert
					expect(req.user).toEqual(decodedToken);
					expect(next).toHaveBeenCalled();
				});
			});
		});
	});

	describe("isAdmin", () => {
		describe("Success", () => {
			it("should call next() for admin user (role: 1)", async () => {
				// Arrange
				req.user = { _id: "6767" };
				const adminUser = { _id: "6767", role: 1 };
				userModel.findById.mockResolvedValue(adminUser);

				// Act
				await isAdmin(req, res, next);

				// Assert
				expect(userModel.findById).toHaveBeenCalledWith("6767");
				expect(next).toHaveBeenCalled();
				expect(res.status).not.toHaveBeenCalled();
			});
		});

		describe("Error", () => {
			describe("Role Errors", () => {
				it("should return 401 for user with role: 0 (non-admin)", async () => {
					// Arrange
					req.user = { _id: "6767" };
					const regularUser = { _id: "6767", role: 0 };
					userModel.findById.mockResolvedValue(regularUser);

					// Act
					await isAdmin(req, res, next);

					// Assert
					expect(userModel.findById).toHaveBeenCalledWith("6767");
					expect(res.status).toHaveBeenCalledWith(401);
					expect(res.send).toHaveBeenCalledWith({
						success: false,
						message: "Unauthorized Access",
					});
					expect(next).not.toHaveBeenCalled();
				});

				const roleEdgeCaseTestCases = [
					{
						name: "user with role: undefined",
						user: { _id: "6767", role: undefined },
						expectedUnauthorized: true,
					},
					{
						name: "user with role: null",
						user: { _id: "6767", role: null },
						expectedUnauthorized: true,
					},
					{
						name: 'user with role: "1" (string instead of number)',
						user: { _id: "6767", role: "1" },
						expectedUnauthorized: true,
					},
					{
						name: "user with role: 2 (non-admin positive number)",
						user: { _id: "6767", role: 2 },
						expectedUnauthorized: true,
					},
				];

				test.each(roleEdgeCaseTestCases)(
					"should return 401 for $name",
					async ({ user, expectedUnauthorized }) => {
						// Arrange
						req.user = { _id: "6767" };
						userModel.findById.mockResolvedValue(user);

						// Act
						await isAdmin(req, res, next);

						// Assert
						expect(userModel.findById).toHaveBeenCalledWith("6767");
						if (expectedUnauthorized) {
							expect(res.status).toHaveBeenCalledWith(401);
							expect(res.send).toHaveBeenCalledWith({
								success: false,
								message: "Unauthorized Access",
							});
							expect(next).not.toHaveBeenCalled();
						} else {
							expect(next).toHaveBeenCalled();
							expect(res.status).not.toHaveBeenCalled();
						}
					},
				);
			});

			describe("Database Errors", () => {
				it("should return 401 when user not found in database", async () => {
					// Arrange
					req.user = { _id: "nonexistent" };
					userModel.findById.mockResolvedValue(null);

					// Act
					await isAdmin(req, res, next);

					// Assert
					expect(userModel.findById).toHaveBeenCalledWith("nonexistent");
					expect(res.status).toHaveBeenCalledWith(401);
					// When findById returns null, accessing user.role throws TypeError
					// which is caught by the catch block
					expect(res.send).toHaveBeenCalledWith({
						success: false,
						error: expect.any(TypeError),
						message: "Error in admin middleware",
					});
					expect(next).not.toHaveBeenCalled();
				});

				it("should return 401 when no user is attached to request", async () => {
					// Arrange
					req.user = undefined;
					userModel.findById.mockImplementation(() => {
						throw new Error("User not found");
					});

					// Act
					await isAdmin(req, res, next);

					// Assert
					expect(res.status).toHaveBeenCalledWith(401);
					expect(res.send).toHaveBeenCalledWith({
						success: false,
						error: expect.any(Error),
						message: "Error in admin middleware",
					});
					expect(next).not.toHaveBeenCalled();
				});

				it("should return 401 when findById throws an error", async () => {
					// Arrange
					req.user = { _id: "6767" };
					const dbError = new Error("Database error");
					userModel.findById.mockRejectedValue(dbError);

					// Act
					await isAdmin(req, res, next);

					// Assert
					expect(userModel.findById).toHaveBeenCalledWith("6767");
					expect(res.status).toHaveBeenCalledWith(401);
					expect(res.send).toHaveBeenCalledWith({
						success: false,
						error: dbError,
						message: "Error in admin middleware",
					});
					expect(next).not.toHaveBeenCalled();
				});
			});
		});
	});
});
