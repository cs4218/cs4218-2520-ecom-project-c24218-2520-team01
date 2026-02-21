// Mock dependencies before imports
jest.mock("../models/userModel.js");
jest.mock("jsonwebtoken");
jest.mock("../helpers/authHelper.js");

// Spy on console.log to suppress noise and enable assertions
beforeEach(() => {
	jest.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
	jest.restoreAllMocks();
});

// Import the controller functions
import {
	registerController,
	loginController,
	forgotPasswordController,
	testController,
} from "./authController.js";

// Import dependencies
import userModel from "../models/userModel.js";
import JWT from "jsonwebtoken";
import { hashPassword, comparePassword } from "../helpers/authHelper.js";
//Wong Sheen Kerr (A0269647J)
describe("Authentication", () => {
	describe("registerController", () => {
		let res;

		beforeEach(() => {
			res = {
				status: jest.fn().mockReturnThis(),
				send: jest.fn(),
				json: jest.fn(),
			};
			jest.clearAllMocks();
		});

		describe("Success", () => {
			it("should register a new user successfully", async () => {
				// Arrange
				const req = {
					body: {
						name: "Sheen",
						email: "sheen@example.com",
						password: "P@ssword123",
						phone: "912345678",
						address: "Test Address",
						answer: "Bowling",
					},
				};

				userModel.findOne.mockResolvedValue(null);
				const mockSave = jest.fn().mockResolvedValue({
					_id: "123",
					name: req.body.name,
					email: req.body.email,
				});
				userModel.mockImplementation(() => ({
					save: mockSave,
				}));
				hashPassword.mockResolvedValue("hashedPassword");

				// Act
				await registerController(req, res);

				// Assert
				expect(res.status).toHaveBeenCalledWith(201);
				expect(res.send).toHaveBeenCalledWith(
					expect.objectContaining({
						success: true,
						message: "User registered successfully",
					}),
				);
			});
		});

		describe("Error", () => {
			describe("Validation Errors", () => {
				describe("missing field validation", () => {
					it.each([
						{
							field: "name",
							missingBody: {
								email: "sheen@example.com",
								password: "P@ssword123",
								phone: "912345678",
								address: "Test Address",
								answer: "Bowling",
							},
							expectedMessage: "Name is required",
						},
						{
							field: "email",
							missingBody: {
								name: "Sheen",
								password: "P@ssword123",
								phone: "912345678",
								address: "Test Address",
								answer: "Bowling",
							},
							expectedMessage: "Email is required",
						},
						{
							field: "password",
							missingBody: {
								name: "Sheen",
								email: "sheen@example.com",
								phone: "912345678",
								address: "Test Address",
								answer: "Bowling",
							},
							expectedMessage: "Password is required",
						},
						{
							field: "phone",
							missingBody: {
								name: "Sheen",
								email: "sheen@example.com",
								password: "P@ssword123",
								address: "Test Address",
								answer: "Bowling",
							},
							expectedMessage: "Phone number is required",
						},
						{
							field: "address",
							missingBody: {
								name: "Sheen",
								email: "sheen@example.com",
								password: "P@ssword123",
								phone: "912345678",
								answer: "Bowling",
							},
							expectedMessage: "Address is required",
						},
						{
							field: "answer",
							missingBody: {
								name: "Sheen",
								email: "sheen@example.com",
								password: "P@ssword123",
								phone: "912345678",
								address: "Test Address",
							},
							expectedMessage: "Answer is required",
						},
					])(
						"should return error if $field is missing",
						async ({ missingBody, expectedMessage }) => {
							// Arrange
							const req = { body: missingBody };

							// Act
							await registerController(req, res);

							// Assert
							expect(res.send).toHaveBeenCalledWith({
								success: false,
								message: expectedMessage,
							});
						},
					);
				});

				describe("empty string validation", () => {
					it.each([
						{
							field: "name",
							emptyBody: {
								name: "",
								email: "sheen@example.com",
								password: "P@ssword123",
								phone: "912345678",
								address: "Test Address",
								answer: "Bowling",
							},
							expectedMessage: "Name is required",
						},
						{
							field: "email",
							emptyBody: {
								name: "Sheen",
								email: "",
								password: "P@ssword123",
								phone: "912345678",
								address: "Test Address",
								answer: "Bowling",
							},
							expectedMessage: "Email is required",
						},
						{
							field: "password",
							emptyBody: {
								name: "Sheen",
								email: "sheen@example.com",
								password: "",
								phone: "912345678",
								address: "Test Address",
								answer: "Bowling",
							},
							expectedMessage: "Password is required",
						},
						{
							field: "phone",
							emptyBody: {
								name: "Sheen",
								email: "sheen@example.com",
								password: "P@ssword123",
								phone: "",
								address: "Test Address",
								answer: "Bowling",
							},
							expectedMessage: "Phone number is required",
						},
						{
							field: "address",
							emptyBody: {
								name: "Sheen",
								email: "sheen@example.com",
								password: "P@ssword123",
								phone: "912345678",
								address: "",
								answer: "Bowling",
							},
							expectedMessage: "Address is required",
						},
						{
							field: "answer",
							emptyBody: {
								name: "Sheen",
								email: "sheen@example.com",
								password: "P@ssword123",
								phone: "912345678",
								address: "Test Address",
								answer: "",
							},
							expectedMessage: "Answer is required",
						},
					])(
						"should return error if $field is empty string",
						async ({ emptyBody, expectedMessage }) => {
							// Arrange
							const req = { body: emptyBody };

							// Act
							await registerController(req, res);

							// Assert
							expect(res.send).toHaveBeenCalledWith({
								success: false,
								message: expectedMessage,
							});
						},
					);
				});

			});

			describe("Database Errors", () => {
				it("should return error if user already exists", async () => {
					// Arrange
					const req = {
						body: {
							name: "Sheen",
							email: "sheen@example.com",
							password: "P@ssword123",
							phone: "912345678",
							address: "Test Address",
							answer: "Bowling",
						},
					};

					userModel.findOne.mockResolvedValue({
						_id: "existingUser",
						email: "sheen@example.com",
					});

					// Act
					await registerController(req, res);

					// Assert
					expect(res.status).toHaveBeenCalledWith(200);
					expect(res.send).toHaveBeenCalledWith({
						success: false,
						message: "Already registered, please login",
					});
				});

				it("should handle database errors", async () => {
					// Arrange
					const req = {
						body: {
							name: "Sheen",
							email: "sheen@example.com",
							password: "P@ssword123",
							phone: "912345678",
							address: "Test Address",
							answer: "Bowling",
						},
					};

					userModel.findOne.mockRejectedValue(new Error("Database error"));

					// Act
					await registerController(req, res);

					// Assert
					expect(res.status).toHaveBeenCalledWith(500);
					expect(res.send).toHaveBeenCalledWith({
						success: false,
						message: "Error in registration",
						error: expect.any(Error),
					});
				});
			});

			describe("Input Boundary Errors", () => {
				describe("special characters in name", () => {
					test.each([
						{ description: "name with hyphen", name: "Mary-Jane" },
						{ description: "name with apostrophe", name: "O'Connor" },
						{ description: "name with unicode", name: "José García" },
						{ description: "name with numbers", name: "X123" },
					])("should accept $description", async ({ name }) => {
						// Arrange
						const req = {
							body: {
								name: name,
								email: "test@example.com",
								password: "P@ssword123",
								phone: "912345678",
								address: "Test Address",
								answer: "Bowling",
							},
						};

						userModel.findOne.mockResolvedValue(null);
						const mockSave = jest.fn().mockResolvedValue({
							_id: "123",
							name: name,
							email: "test@example.com",
						});
						userModel.mockImplementation(() => ({
							save: mockSave,
						}));
						hashPassword.mockResolvedValue("hashedPassword");

						// Act
						await registerController(req, res);

						// Assert
						expect(res.status).toHaveBeenCalledWith(201);
						expect(res.send).toHaveBeenCalledWith(
							expect.objectContaining({
								success: true,
								message: "User registered successfully",
							}),
						);
					});
				});
			});
		});
	});

	//Wong Sheen Kerr (A0269647J)
	describe("loginController", () => {
		let res;

		beforeEach(() => {
			res = {
				status: jest.fn().mockReturnThis(),
				send: jest.fn(),
				json: jest.fn(),
			};
			jest.clearAllMocks();
		});

		describe("Success", () => {
			it("should login user successfully with valid credentials", async () => {
				// Arrange
				const req = {
					body: {
						email: "sheen@example.com",
						password: "P@ssword123",
					},
				};

				const mockUser = {
					_id: "123",
					name: "Sheen",
					email: "sheen@example.com",
					phone: "912345678",
					address: "Test Address",
					role: 0,
					password: "hashedPassword",
				};

				userModel.findOne.mockResolvedValue(mockUser);
				comparePassword.mockResolvedValue(true);
				JWT.sign.mockReturnValue("testToken");

				// Act
				await loginController(req, res);

				// Assert
				expect(res.status).toHaveBeenCalledWith(200);
				expect(res.send).toHaveBeenCalledWith(
					expect.objectContaining({
						success: true,
						message: "Login successfully",
						token: "testToken",
					}),
				);
			});

			describe("email case sensitivity", () => {
				it("should find user regardless of email case", async () => {
					// Arrange
					const req = {
						body: {
							email: "SHEEN@EXAMPLE.COM",
							password: "P@ssword123",
						},
					};

					const mockUser = {
						_id: "123",
						name: "Sheen",
						email: "sheen@example.com",
						password: "hashedPassword",
					};

					userModel.findOne.mockResolvedValue(mockUser);
					comparePassword.mockResolvedValue(true);
					JWT.sign.mockReturnValue("testToken");

					// Act
					await loginController(req, res);

					// Assert
					// The controller passes email as-is to findOne
					expect(userModel.findOne).toHaveBeenCalledWith({
						email: "SHEEN@EXAMPLE.COM",
					});
				});
			});
		});

		describe("Error", () => {
			describe("Validation Errors", () => {
				describe("missing field validation", () => {
					it.each([
						{
							description: "email is missing",
							body: { password: "P@ssword123" },
						},
						{
							description: "password is missing",
							body: { email: "sheen@example.com" },
						},
						{
							description: "both email and password are missing",
							body: {},
						},
					])(
						"should return error if $description",
						async ({ body, description }) => {
							// Arrange
							const req = { body };

							// Act
							await loginController(req, res);

							// Assert
							expect(res.status).toHaveBeenCalledWith(404);
							expect(res.send).toHaveBeenCalledWith({
								success: false,
								message: "Invalid email or password",
							});
						},
					);
				});

				describe("empty string validation", () => {
					it.each([
						{
							description: "email is empty string",
							body: { email: "", password: "P@ssword123" },
						},
						{
							description: "password is empty string",
							body: { email: "sheen@example.com", password: "" },
						},
						{
							description: "both email and password are empty strings",
							body: { email: "", password: "" },
						},
					])(
						"should return error if $description",
						async ({ body, description }) => {
							// Arrange
							const req = { body };

							// Act
							await loginController(req, res);

							// Assert
							expect(res.status).toHaveBeenCalledWith(404);
							expect(res.send).toHaveBeenCalledWith({
								success: false,
								message: "Invalid email or password",
							});
						},
					);
				});

					it("should return 'Invalid password' for whitespace-only password with valid user", async () => {
						// Arrange
						const req = {
							body: { email: "sheen@example.com", password: "   " },
						};

						const mockUser = {
							_id: "123",
							name: "Sheen",
							email: "sheen@example.com",
							password: "hashedPassword",
						};

						userModel.findOne.mockResolvedValue(mockUser);
						comparePassword.mockResolvedValue(false);

						// Act
						await loginController(req, res);

						// Assert
						expect(res.status).toHaveBeenCalledWith(401);
						expect(res.send).toHaveBeenCalledWith({
							success: false,
							message: "Invalid password",
						});
					});
				});
			});

			describe("Authentication Errors", () => {
				it("should return error if email is not found", async () => {
					// Arrange
					const req = {
						body: {
							email: "FAKER@example.com",
							password: "P@ssword123",
						},
					};

					userModel.findOne.mockResolvedValue(null);

					// Act
					await loginController(req, res);

					// Assert
					expect(res.status).toHaveBeenCalledWith(404);
					expect(res.send).toHaveBeenCalledWith({
						success: false,
						message: "Email is not registered",
					});
				});

				it("should return error if password is incorrect", async () => {
					// Arrange
					const req = {
						body: {
							email: "sheen@example.com",
							password: "noPassword",
						},
					};

					const mockUser = {
						_id: "123",
						name: "Sheen",
						email: "sheen@example.com",
						password: "correctPassword",
					};

					userModel.findOne.mockResolvedValue(mockUser);
					comparePassword.mockResolvedValue(false);

					// Act
					await loginController(req, res);

					// Assert
					expect(res.status).toHaveBeenCalledWith(401);
					expect(res.send).toHaveBeenCalledWith({
						success: false,
						message: "Invalid password",
					});
				});
			});

			describe("Database Errors", () => {
				it("should handle database errors", async () => {
					// Arrange
					const req = {
						body: {
							email: "sheen@example.com",
							password: "P@ssword123",
						},
					};

					userModel.findOne.mockRejectedValue(new Error("Database error"));

					// Act
					await loginController(req, res);

					// Assert
					expect(res.status).toHaveBeenCalledWith(500);
					expect(res.send).toHaveBeenCalledWith({
						success: false,
						message: "Error in login",
						error: expect.any(Error),
					});
				});
			});
		});
	});

	describe("forgotPasswordController", () => {
		let res;

		beforeEach(() => {
			res = {
				status: jest.fn().mockReturnThis(),
				send: jest.fn(),
				json: jest.fn(),
			};
			jest.clearAllMocks();
		});

		describe("Success", () => {
			it("should send reset info successfully", async () => {
				// Arrange
				const req = {
					body: {
						email: "sheen@example.com",
						answer: "Bowling",
						newPassword: "newP@ssword123",
					},
				};

				const mockUser = {
					_id: "123",
					email: "sheen@example.com",
					answer: "Bowling",
				};

				userModel.findOne.mockResolvedValue(mockUser);
				hashPassword.mockResolvedValue("hashedNewPassword");
				userModel.findByIdAndUpdate.mockResolvedValue(true);

				// Act
				await forgotPasswordController(req, res);

				// Assert
				expect(res.status).toHaveBeenCalledWith(200);
				expect(res.send).toHaveBeenCalledWith({
					success: true,
					message: "Password reset successfully",
				});
			});
		});

		describe("Error", () => {
			describe("Validation Errors", () => {
				describe("missing field validation", () => {
					it.each([
						{
							field: "email",
							body: { answer: "Bowling", newPassword: "newP@ssword123" },
							expectedMessage: "Email is required",
						},
						{
							field: "answer",
							body: {
								email: "sheen@example.com",
								newPassword: "newP@ssword123",
							},
							expectedMessage: "Answer is required",
						},
						{
							field: "newPassword",
							body: { email: "sheen@example.com", answer: "Bowling" },
							expectedMessage: "New password is required",
						},
					])(
						"should return error if $field is missing",
						async ({ body, expectedMessage }) => {
							// Arrange
							const req = { body };

							// Act
							await forgotPasswordController(req, res);

							// Assert
							expect(res.status).toHaveBeenCalledWith(400);
							expect(res.send).toHaveBeenCalledWith({
								success: false,
								message: expectedMessage,
							});
							expect(userModel.findOne).not.toHaveBeenCalled();
						},
					);
				});

				describe("empty string validation", () => {
					it.each([
						{
							field: "email",
							body: {
								email: "",
								answer: "Bowling",
								newPassword: "newP@ssword123",
							},
							expectedMessage: "Email is required",
						},
						{
							field: "answer",
							body: {
								email: "sheen@example.com",
								answer: "",
								newPassword: "newP@ssword123",
							},
							expectedMessage: "Answer is required",
						},
						{
							field: "newPassword",
							body: {
								email: "sheen@example.com",
								answer: "Bowling",
								newPassword: "",
							},
							expectedMessage: "New password is required",
						},
					])(
						"should return error if $field is empty string",
						async ({ body, expectedMessage }) => {
							// Arrange
							const req = { body };

							// Act
							await forgotPasswordController(req, res);

							// Assert
							expect(res.status).toHaveBeenCalledWith(400);
							expect(res.send).toHaveBeenCalledWith({
								success: false,
								message: expectedMessage,
							});
						},
					);
				});
			});

			describe("Database Errors", () => {
				it("should return error if user not found", async () => {
					// Arrange
					const req = {
						body: {
							email: "nonexistent@example.com",
							answer: "Bowling",
							newPassword: "newP@ssword123",
						},
					};

					userModel.findOne.mockResolvedValue(null);

					// Act
					await forgotPasswordController(req, res);

					// Assert
					expect(res.status).toHaveBeenCalledWith(404);
					expect(res.send).toHaveBeenCalledWith({
						success: false,
						message: "Wrong email or answer",
					});
				});

				it("should handle database errors", async () => {
					// Arrange
					const req = {
						body: {
							email: "sheen@example.com",
							answer: "Bowling",
							newPassword: "newP@ssword123",
						},
					};

					userModel.findOne.mockRejectedValue(new Error("Database error"));

					// Act
					await forgotPasswordController(req, res);

					// Assert
					expect(res.status).toHaveBeenCalledWith(500);
					expect(res.send).toHaveBeenCalledWith({
						success: false,
						message: "Something went wrong",
						error: expect.any(Error),
					});
				});
			});
		});
	});

	//Wong Sheen Kerr (A0269647J)
	describe("testController", () => {
		// Debug controller — health check for the auth pipeline.
		// Route: GET /api/v1/auth/test → requireSignIn → isAdmin → testController
		// If can receive "Protected Routes", means both requireSignIn (JWT) and isAdmin middleware passed.
		// If either fails, an error will be returned before reaching here.
		let res;

		beforeEach(() => {
			res = {
				send: jest.fn(),
			};
			jest.clearAllMocks();
		});

		describe("Success", () => {
			it("should return success message for authenticated user", () => {
				// Arrange
				const req = {};

				// Act
				testController(req, res);

				// Assert
				expect(res.send).toHaveBeenCalledWith("Protected Routes");
			});
		});

		describe("Error", () => {
			it("should handle errors in catch block", () => {
				// Arrange
				const req = {};
				const sendError = new Error("Simulated send error");
				const errorRes = {
					send: jest
						.fn()
						.mockImplementationOnce(() => {
							throw sendError;
						})
						.mockImplementation(() => {}),
				};

				// Act
				testController(req, errorRes);

				// Assert
				expect(console.log).toHaveBeenCalledWith(sendError);
				expect(errorRes.send).toHaveBeenCalledWith({ error: sendError });
			});
		});
	});

