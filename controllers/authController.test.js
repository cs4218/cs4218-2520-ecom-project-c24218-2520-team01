// Mock dependencies before imports
jest.mock("../models/userModel.js");
jest.mock("../models/orderModel.js");
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
	updateProfileController,
	getOrdersController,
	getAllOrdersController,
	orderStatusController,
} from "./authController.js";

// Import dependencies
import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";
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

describe("updateProfileController", () => {
	let res;

	beforeEach(() => {
		res = {
			status: jest.fn().mockReturnThis(),
			send: jest.fn(),
			json: jest.fn(),
		};
		jest.clearAllMocks();
	});

	it("should update user profile successfully", async () => {
		// Arrange
		const req = {
			user: { _id: "anextremerandomlongid5" },
			body: {
				name: "Updated Name",
				email: "updated@example.com",
				password: "validpassword",
				address: "Updated Address",
				phone: "9876543210",
			},
		};

		const mockUser = {
			_id: "anextremerandomlongid5",
			name: "Old Name",
			password: "hashedPassword",
			address: "Old Address",
			phone: "912345678",
		};

		userModel.findById.mockResolvedValue(mockUser);
		hashPassword.mockResolvedValue("newHashedPassword");
		userModel.findByIdAndUpdate.mockResolvedValue({
			_id: "anextremerandomlongid5",
			name: "Updated Name",
		});

		// Act
		await updateProfileController(req, res);

		// Assert
		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.send).toHaveBeenCalledWith(
			expect.objectContaining({
				success: true,
				message: "Profile updated successfully",
			}),
		);
	});

	it("should update password when provided with valid length", async () => {
		// Arrange
		const req = {
			user: { _id: "anextremerandomlongid5" },
			body: {
				password: "newpassword",
			},
		};

		const mockUser = {
			_id: "anextremerandomlongid5",
			name: "Old Name",
			password: "oldHashedPassword",
		};

		userModel.findById.mockResolvedValue(mockUser);
		hashPassword.mockResolvedValue("newHashedPassword");
		userModel.findByIdAndUpdate.mockResolvedValue({
			_id: "anextremerandomlongid5",
			password: "newHashedPassword",
		});

		// Act
		await updateProfileController(req, res);

		// Assert
		expect(hashPassword).toHaveBeenCalledWith("newpassword");
		expect(res.status).toHaveBeenCalledWith(200);
	});

	it("should return error if password is empty", async () => {
		// Arrange
		const req = {
			user: { _id: "anextremerandomlongid5" },
			body: {
				password: "   ",
			},
		};

		userModel.findById.mockResolvedValue({
			_id: "anextremerandomlongid5",
			name: "Old Name",
			password: "oldHashedPassword",
		});

		// Act
		await updateProfileController(req, res);

		// Assert
		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			success: false,
			message: "Password is required",
		});
	});

	it("should return error if password is less than 6 characters", async () => {
		// Arrange
		const req = {
			user: { _id: "anextremerandomlongid5" },
			body: {
				password: "12345",
			},
		};

		userModel.findById.mockResolvedValue({
			_id: "anextremerandomlongid5",
			name: "Old Name",
			password: "oldHashedPassword",
		});

		// Act
		await updateProfileController(req, res);

		// Assert
		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			success: false,
			message: "Password must be at least 6 characters long",
		});
	});
	//=========Database Errors=================================
	it("should handle database errors", async () => {
		// Arrange
		const req = {
			user: { _id: "anextremerandomlongid5" },
			body: {},
		};

		userModel.findById.mockRejectedValue(new Error("Database error"));

		// Act
		await updateProfileController(req, res);

		// Assert
		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.send).toHaveBeenCalledWith({
			success: false,
			message: "Error while updating profile",
			error: expect.any(Error),
		});
	});
});

describe("getOrdersController", () => {
	let res;

	beforeEach(() => {
		res = {
			json: jest.fn(),
			status: jest.fn().mockReturnThis(),
			send: jest.fn(),
		};
		jest.clearAllMocks();
	});

	it("should get user orders successfully", async () => {
		// Arrange
		const req = {
			user: { _id: "anextremerandomlongid5" },
		};

		const mockOrders = [
			{
				_id: "order1",
				products: [{ name: "Product 1" }],
				buyer: { name: "Buyer 1" },
			},
		];

		orderModel.find.mockReturnValue({
			populate: jest.fn().mockReturnValue({
				populate: jest.fn().mockResolvedValue(mockOrders),
			}),
		});

		// Act
		await getOrdersController(req, res);

		// Assert
		expect(res.json).toHaveBeenCalledWith(mockOrders);
	});

	it("should handle database errors", async () => {
		// Arrange
		const req = {
			user: { _id: "anextremerandomlongid5" },
		};

		orderModel.find.mockReturnValue({
			populate: jest.fn().mockReturnValue({
				populate: jest.fn().mockRejectedValue(new Error("Database error")),
			}),
		});

		// Act
		await getOrdersController(req, res);

		// Assert
		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.send).toHaveBeenCalledWith({
			success: false,
			message: "Error while getting orders",
			error: expect.any(Error),
		});
	});
});

describe("getAllOrdersController", () => {
	let res;

	beforeEach(() => {
		res = {
			json: jest.fn(),
			status: jest.fn().mockReturnThis(),
			send: jest.fn(),
		};
		jest.clearAllMocks();
	});

	it("should get all orders successfully", async () => {
		// Arrange
		const req = {};

		const mockOrders = [
			{
				_id: "order1",
				products: [{ name: "Product 1" }],
				buyer: { name: "Buyer 1" },
			},
		];

		orderModel.find.mockReturnValue({
			populate: jest.fn().mockReturnValue({
				populate: jest.fn().mockReturnValue({
					sort: jest.fn().mockResolvedValue(mockOrders),
				}),
			}),
		});

		// Act
		await getAllOrdersController(req, res);

		// Assert
		expect(res.json).toHaveBeenCalledWith(mockOrders);
	});

	it("should handle database errors", async () => {
		// Arrange
		const req = {};

		orderModel.find.mockReturnValue({
			populate: jest.fn().mockReturnValue({
				populate: jest.fn().mockReturnValue({
					sort: jest.fn().mockRejectedValue(new Error("Database error")),
				}),
			}),
		});

		// Act
		await getAllOrdersController(req, res);

		// Assert
		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.send).toHaveBeenCalledWith({
			success: false,
			message: "Error while getting orders",
			error: expect.any(Error),
		});
	});
});

describe("orderStatusController", () => {
	let res;

	beforeEach(() => {
		res = {
			json: jest.fn(),
			status: jest.fn().mockReturnThis(),
			send: jest.fn(),
		};
		jest.clearAllMocks();
	});

	it("should update order status successfully", async () => {
		// Arrange
		const req = {
			params: { orderId: "anextremerandomlongid5" },
			body: { status: "Shipped" },
		};

		const mockOrder = {
			_id: "anextremerandomlongid5",
			status: "Shipped",
		};

		orderModel.findByIdAndUpdate.mockResolvedValue(mockOrder);

		// Act
		await orderStatusController(req, res);

		// Assert
		expect(res.json).toHaveBeenCalledWith(mockOrder);
	});

	it("should handle database errors", async () => {
		// Arrange
		const req = {
			params: { orderId: "anextremerandomlongid5" },
			body: { status: "Shipped" },
		};

		orderModel.findByIdAndUpdate.mockRejectedValue(new Error("Database error"));

		// Act
		await orderStatusController(req, res);

		// Assert
		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.send).toHaveBeenCalledWith({
			success: false,
			message: "Error while updating order",
			error: expect.any(Error),
		});
	});
});
