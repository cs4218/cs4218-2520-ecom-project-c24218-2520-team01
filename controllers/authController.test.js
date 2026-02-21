// Mock dependencies before imports
jest.mock("../models/userModel.js");
jest.mock("jsonwebtoken");
jest.mock("../helpers/authHelper.js");

//Wong Sheen Kerr (A0269647J)

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

	//=========Missing Fields=================================
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

	it("should return error if name is missing", async () => {
		// Arrange
		const req = {
			body: {
				email: "sheen@example.com",
				password: "P@ssword123",
				phone: "912345678",
				address: "Test Address",
				answer: "Bowling",
			},
		};

		// Act
		await registerController(req, res);

		// Assert
		expect(res.send).toHaveBeenCalledWith({
			success: false,
			message: "Name is required",
		});
	});

	it("should return error if email is missing", async () => {
		// Arrange
		const req = {
			body: {
				name: "Sheen",
				password: "P@ssword123",
				phone: "912345678",
				address: "Test Address",
				answer: "Bowling",
			},
		};

		// Act
		await registerController(req, res);

		// Assert
		expect(res.send).toHaveBeenCalledWith({
			success: false,
			message: "Email is required",
		});
	});

	it("should return error if password is missing", async () => {
		// Arrange
		const req = {
			body: {
				name: "Sheen",
				email: "sheen@example.com",
				phone: "912345678",
				address: "Test Address",
				answer: "Bowling",
			},
		};

		// Act
		await registerController(req, res);

		// Assert
		expect(res.send).toHaveBeenCalledWith({
			success: false,
			message: "Password is required",
		});
	});

	it("should return error if phone is missing", async () => {
		// Arrange
		const req = {
			body: {
				name: "Sheen",
				email: "sheen@example.com",
				password: "P@ssword123",
				address: "Test Address",
				answer: "Bowling",
			},
		};

		// Act
		await registerController(req, res);

		// Assert
		expect(res.send).toHaveBeenCalledWith({
			success: false,
			message: "Phone number is required",
		});
	});

	it("should return error if address is missing", async () => {
		// Arrange
		const req = {
			body: {
				name: "Sheen",
				email: "sheen@example.com",
				password: "P@ssword123",
				phone: "912345678",
				answer: "Bowling",
			},
		};

		// Act
		await registerController(req, res);

		// Assert
		expect(res.send).toHaveBeenCalledWith({
			success: false,
			message: "Address is required",
		});
	});

	it("should return error if answer is missing", async () => {
		// Arrange
		const req = {
			body: {
				name: "Sheen",
				email: "sheen@example.com",
				password: "P@ssword123",
				phone: "912345678",
				address: "Test Address",
			},
		};

		// Act
		await registerController(req, res);

		// Assert
		expect(res.send).toHaveBeenCalledWith({
			success: false,
			message: "Answer is required",
		});
	});

	//=========Existing User=================================
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

	//=========Database Errors=================================
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
		JWT.sign.mockResolvedValue("testToken");

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

	//=========Missing Fields=================================
	it("should return error if email is missing", async () => {
		// Arrange
		const req = {
			body: {
				password: "P@ssword123",
			},
		};

		// Act
		await loginController(req, res);

		// Assert
		expect(res.status).toHaveBeenCalledWith(404);
		expect(res.send).toHaveBeenCalledWith({
			success: false,
			message: "Invalid email or password",
		});
	});

	it("should return error if password is missing", async () => {
		// Arrange
		const req = {
			body: {
				email: "sheen@example.com",
			},
		};

		// Act
		await loginController(req, res);

		// Assert
		expect(res.status).toHaveBeenCalledWith(404);
		expect(res.send).toHaveBeenCalledWith({
			success: false,
			message: "Invalid email or password",
		});
	});

	it("should return error if both email and password are missing", async () => {
		// Arrange
		const req = {
			body: {},
		};

		// Act
		await loginController(req, res);

		// Assert
		expect(res.status).toHaveBeenCalledWith(404);
		expect(res.send).toHaveBeenCalledWith({
			success: false,
			message: "Invalid email or password",
		});
	});

	//=========Database Errors=================================
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

	//=========Missing Fields=================================
	it("should return error if email is missing", async () => {
		// Arrange
		const req = {
			body: {
				answer: "Bowling",
				newPassword: "newP@ssword123",
			},
		};

		// Act
		await forgotPasswordController(req, res);

		// Assert
		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.send).toHaveBeenCalledWith({
			success: false,
			message: "Email is required",
		});
		expect(userModel.findOne).not.toHaveBeenCalled();
	});

	it("should return error if answer is missing", async () => {
		// Arrange
		const req = {
			body: {
				email: "sheen@example.com",
				newPassword: "newP@ssword123",
			},
		};

		// Act
		await forgotPasswordController(req, res);

		// Assert
		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.send).toHaveBeenCalledWith({
			success: false,
			message: "Answer is required",
		});
		expect(userModel.findOne).not.toHaveBeenCalled();
	});

	it("should return error if newPassword is missing", async () => {
		// Arrange
		const req = {
			body: {
				email: "sheen@example.com",
				answer: "Bowling",
			},
		};

		// Act
		await forgotPasswordController(req, res);

		// Assert
		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.send).toHaveBeenCalledWith({
			success: false,
			message: "New password is required",
		});
		expect(userModel.findOne).not.toHaveBeenCalled();
	});

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

	//=========Database Errors=================================
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

// Debug controller — health check for the auth pipeline.
// Route: GET /api/v1/auth/test → requireSignIn → isAdmin → testController
// If can receive "Protected Routes", means both requireSignIn (JWT) and isAdmin middleware passed.
// If either fails, an error will be returned before reaching here.
describe("testController", () => {
	let res;

	beforeEach(() => {
		res = {
			send: jest.fn(),
		};
		jest.clearAllMocks();
	});

	it("should return success message for authenticated user", () => {
		// Arrange
		const req = {};

		// Act
		testController(req, res);

		// Assert
		expect(res.send).toHaveBeenCalledWith("Protected Routes");
	});

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
