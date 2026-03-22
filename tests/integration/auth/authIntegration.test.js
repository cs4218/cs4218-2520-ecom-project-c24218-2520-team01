/**
 * @jest-environment jest-environment-jsdom
 * @jest-environment-options {"customExportConditions":["node","node-addons"],"url":"http://127.0.0.1:16767/"}
 */
// JSDOM idea from https://stackoverflow.com/questions/69227566/consider-using-the-jsdom-test-environment

/**
 * Authentication Integration Tests
 * 
 * APPROACH: Bottom-Up Integration Testing  
 * Lower-level modules (Models, Helpers) are established first inside each story, 
 * then each test adds the next higher layer on top of those dependencies without the need for stubs:
 *
 *   Layer 1 (Bottom):   userModel (Mongoose)  ←  authHelper (bcrypt hashing)
 *   Layer 2 (Middle):   authController (registerController, loginController, forgotPasswordController)
 *   Layer 3 (Top):      authRoute (Express Router) ← authMiddleware (requireSignIn, isAdmin)
 *   Layer 4 (Very Top): React UI (Register, Login, ForgotPassword, PrivateRoute, AdminRoute, AuthProvider)
 *
 * The UI layer is appended only at the very end because it is the highest layer overall. 
 * Even for the integration of the UI layer, it still starts from real model/helper state and then adds the React layer last: 
 * Model/Helper → Controller/Route → UI. 
 * 
 * Wong Sheen Kerr (A0269647J)
 **/

import "@testing-library/jest-dom";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import jwt from "jsonwebtoken";
import request from "supertest";

import { AuthProvider } from "../../../client/src/context/auth.js";
import { CartProvider } from "../../../client/src/context/cart.js";
import { SearchProvider } from "../../../client/src/context/search.js";
import AdminRouteModule from "../../../client/src/components/Routes/AdminRoute.js";
import PrivateRouteModule from "../../../client/src/components/Routes/Private.js";
import ForgotPasswordModule from "../../../client/src/pages/Auth/ForgotPassword.js";
import LoginModule from "../../../client/src/pages/Auth/Login.js";
import RegisterModule from "../../../client/src/pages/Auth/Register.js";
import {
	authIntegrationApp,
	resetAuthIntegrationAxios,
	startAuthIntegrationEnvironment,
} from "./authIntegration.setup.js";
import categoryModel from "../../../models/categoryModel.js";
import userModel from "../../../models/userModel.js";
import { hashPassword, comparePassword } from "../../../helpers/authHelper.js";

/**
 * AI Usage Declaration
 *
 * Tool Used: GPT-5.4
 *
 * Prompt: What bottom-up integration flows should authIntegration.test.js cover for registration, login, protected routes, admin authorization, forgot-password, 
 * and React UI authentication flows?
 *
 * How the AI Output Was Used:
 * - Used only as a planning reference for possible integration scenarios and edge cases.
 * - I determined the final test scope, wrote the assertions, implemented and verified the tests.
 */

// Unwrap default exports when Jest returns a module object.
function resolveDefaultExport(moduleValue) {
	return moduleValue.default ?? moduleValue;
}

// Map imported UI modules to the real React components.
const Register = resolveDefaultExport(RegisterModule);
const Login = resolveDefaultExport(LoginModule);
const ForgotPassword = resolveDefaultExport(ForgotPasswordModule);
const PrivateRoute = resolveDefaultExport(PrivateRouteModule);
const AdminRoute = resolveDefaultExport(AdminRouteModule);

/**
 * AI Usage Declaration (UI Harness)
 *
 * Tool Used: GPT-5.4
 *
 * Prompt: What is a minimal React integration test harness for auth pages
 * using MemoryRouter, providers, protected routes, and simple form helpers?
 *
 * How the AI Output Was Used:
 * - Used only as a reference for UI harness structure and helper ideas.
 * - I chose the final providers, routes, helper functions, and test interactions, and implemented and verified them
 */

// Small home page stub used to check navigation after auth flows.
function TestHomePage() {
	return (
		<div>
			<div>Home Page</div>
			<Link to="/dashboard/user">Go User Dashboard</Link>
			<Link to="/dashboard/admin">Go Admin Dashboard</Link>
		</div>
	);
}

function renderAuthUiHarness(initialEntries = ["/"]) {
	// Wrap the auth pages with the same providers they expect in the app.
	return render(
		<AuthProvider>
			<SearchProvider>
				<CartProvider>
					// MemoryRouter gives the UI tests real route transitions in jsdom.
					<MemoryRouter initialEntries={initialEntries}>
						<Routes>
							// Test-only routes keep the harness small while still using the real auth pages and route guards.
							<Route path="/" element={<TestHomePage />} />
							<Route path="/register" element={<Register />} />
							<Route path="/login" element={<Login />} />
							<Route path="/forgot-password" element={<ForgotPassword />} />
							<Route path="/dashboard" element={<PrivateRoute />}>
								<Route path="user" element={<div>User Dashboard</div>} />
							</Route>
							<Route path="/dashboard" element={<AdminRoute />}>
								<Route path="admin" element={<div>Admin Dashboard</div>} />
							</Route>
							<Route path="*" element={<div>Not Found</div>} />
						</Routes>
					</MemoryRouter>
				</CartProvider>
			</SearchProvider>
		</AuthProvider>,
	);
}

const fillRegisterForm = (overrides = {}) => {
	const values = {
		name: "UI Test User",
		email: `register_${Date.now()}@example.com`,
		password: "password123",
		phone: "86767676",
		address: "6767 Test Street",
		dob: "2000-01-01",
		answer: "bowling",
		...overrides,
	};

	fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
		target: { value: values.name },
	});
	fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
		target: { value: values.email },
	});
	fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
		target: { value: values.password },
	});
	fireEvent.change(screen.getByPlaceholderText("Enter Your Phone"), {
		target: { value: values.phone },
	});
	fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
		target: { value: values.address },
	});
	fireEvent.change(document.getElementById("exampleInputDOB1"), {
		target: { value: values.dob },
	});
	fireEvent.change(screen.getByPlaceholderText("What is Your Favorite Sport"), {
		target: { value: values.answer },
	});

	return values;
};

const fillLoginForm = (overrides = {}) => {
	const values = {
		email: "login@example.com",
		password: "password123",
		...overrides,
	};

	fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
		target: { value: values.email },
	});
	fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
		target: { value: values.password },
	});

	return values;
};

const fillForgotPasswordForm = (overrides = {}) => {
	const values = {
		email: "forgot@example.com",
		answer: "bowling",
		newPassword: "newpassword6767",
		...overrides,
	};

	fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
		target: { value: values.email },
	});
	fireEvent.change(
		screen.getByPlaceholderText("Enter Your favorite Sport Name"),
		{
			target: { value: values.answer },
		},
	);
	fireEvent.change(screen.getByPlaceholderText("Enter Your New Password"), {
		target: { value: values.newPassword },
	});

	return values;
};

const registrationMissingFieldCases = [
	{
		field: "name",
		missingBody: {
			email: "missing-name@example.com",
			password: "password123",
			phone: "86767676",
			address: "6767 Test Street",
			answer: "bowling",
		},
		expectedMessage: "Name is required",
	},
	{
		field: "email",
		missingBody: {
			name: "Test User",
			password: "password123",
			phone: "86767676",
			address: "6767 Test Street",
			answer: "bowling",
		},
		expectedMessage: "Email is required",
	},
	{
		field: "password",
		missingBody: {
			name: "Test User",
			email: "missing-password@example.com",
			phone: "86767676",
			address: "6767 Test Street",
			answer: "bowling",
		},
		expectedMessage: "Password is required",
	},
	{
		field: "phone",
		missingBody: {
			name: "Test User",
			email: "missing-phone@example.com",
			password: "password123",
			address: "6767 Test Street",
			answer: "bowling",
		},
		expectedMessage: "Phone number is required",
	},
	{
		field: "address",
		missingBody: {
			name: "Test User",
			email: "missing-address@example.com",
			password: "password123",
			phone: "86767676",
			answer: "bowling",
		},
		expectedMessage: "Address is required",
	},
	{
		field: "answer",
		missingBody: {
			name: "Test User",
			email: "missing-answer@example.com",
			password: "password123",
			phone: "86767676",
			address: "6767 Test Street",
		},
		expectedMessage: "Answer is required",
	},
];

const forgotPasswordMissingFieldCases = [
	{
		field: "email",
		missingBody: {
			answer: "MySecretAnswer",
			newPassword: "newpass",
		},
		expectedMessage: "Email is required",
	},
	{
		field: "answer",
		missingBody: {
			email: "forgot@example.com",
			newPassword: "newpass",
		},
		expectedMessage: "Answer is required",
	},
	{
		field: "newPassword",
		missingBody: {
			email: "forgot@example.com",
			answer: "MySecretAnswer",
		},
		expectedMessage: "New password is required",
	},
];

describe("Authentication Integration Tests", () => {
	let testEnvironment;

	beforeAll(async () => {
		process.env.SUPPRESS_JEST_WARNINGS = "true";
		testEnvironment = await startAuthIntegrationEnvironment();

		// Set JWT secret for test environment
		process.env.JWT_SECRET = "test-jwt-secret";

		if (!window.matchMedia) {
			Object.defineProperty(window, "matchMedia", {
				writable: true,
				value: (query) => ({
					matches: false,
					media: query,
					onchange: null,
					addListener() {},
					removeListener() {},
					addEventListener() {},
					removeEventListener() {},
					dispatchEvent() {
						return false;
					},
				}),
			});
		}

	});

	afterAll(async () => {
		if (testEnvironment) {
			await testEnvironment.stop();
		}
	});

	afterEach(async () => {
		cleanup();
		localStorage.clear();
		resetAuthIntegrationAxios();

		// Clean up database after each test for isolation
		await userModel.deleteMany({});
		await categoryModel.deleteMany({});
	});

	// =========================================================================
	// Story 1: Registration Flow Integration
	// Integration: authRoute -> registerController -> hashPassword -> userModel
	// =========================================================================
	describe("Registration Flow Integration", () => {
		// Layer 1 foundation: direct userModel state and helper-produced hashes.
		// Layer 2 added in each request: authRoute -> registerController.
		// Layer 3 confirmed by assertions: helper hashing and model persistence.
		const validUser = {
			name: "Test User",
			email: "tesss@example.com",
			password: "password123",
			phone: "86767676",
			address: "6767 Test Street",
			answer: "bowling",
		};

		it("should register a new user, hash password via authHelper, and persist to DB", async () => {
			// Layer 1 foundation: DB starts empty, so any saved record must come from the real model/helper dependencies used by this request.
			// Layer 2 added here: authRoute accepts POST /register and hands off to registerController.
			const res = await request(authIntegrationApp)
				.post("/api/v1/auth/register")
				.send(validUser);

			// Assert HTTP response
			expect(res.status).toBe(201);
			expect(res.body.success).toBe(true);
			expect(res.body.message).toBe("User registered successfully");
			expect(res.body.user).toHaveProperty("name", validUser.name);
			expect(res.body.user).toHaveProperty("email", validUser.email);

			// Layer 3 verified here: controller delegated to authHelper/userModel,and we read the persisted document directly from the DB.
			const savedUser = await userModel.findOne({ email: validUser.email });
			expect(savedUser).not.toBeNull();
			expect(savedUser.name).toBe(validUser.name);
			expect(savedUser.phone).toBe(validUser.phone);
			expect(savedUser.address).toBe(validUser.address);
			expect(savedUser.answer).toBe(validUser.answer);

			// Layer 3 helper effect: authHelper hashed the password before save.
			expect(savedUser.password).not.toBe(validUser.password);
			expect(savedUser.password.length).toBeGreaterThan(0);
		});

		it("should reject registration when email already exists in DB", async () => {
			// Layer 1 foundation added here: create a real persisted user and helper hash so the higher registration layers must react to actual DB state.
			const hashedPwd = await hashPassword("existingpass");
			await userModel.create({
				name: "Existing User",
				email: validUser.email,
				password: hashedPwd,
				phone: "812367677",
				address: "67 Existing Ave",
				answer: "existing",
			});

			// Layer 2 added here: authRoute/registerController now runs against the real DB state instead of mocks.
			const res = await request(authIntegrationApp)
				.post("/api/v1/auth/register")
				.send(validUser);

			expect(res.status).toBe(200);
			expect(res.body.success).toBe(false);
			expect(res.body.message).toBe("Already registered, please login");

			// Layer 3 assertion: lower model state remains unchanged after rejection.
			const count = await userModel.countDocuments({ email: validUser.email });
			expect(count).toBe(1);
		});

		/**
		 * External Reference:
		 * Parameterized test pattern adapted from:
		 * https://stackoverflow.com/questions/52996062/using-jests-test-each-parameterized-test-variable-scope
		 **/
		describe("Validation Errors", () => {
			describe("missing field validation", () => {
				it.each(registrationMissingFieldCases)(
					"should return validation error when $field is missing",
					async ({ missingBody, expectedMessage }) => {
						// Layer 2 only: route/controller validation rejects before any helper hashing or model persistence layer is added.
						const res = await request(authIntegrationApp)
							.post("/api/v1/auth/register")
							.send(missingBody);

						expect(res.status).toBe(200);
						expect(res.body.success).toBe(false);
						expect(res.body.message).toBe(expectedMessage);
					},
				);
			});
		});
	});

	// =========================================================================
	// Story 2: Login Flow Integration
	// Integration: authRoute -> loginController -> comparePassword -> JWT.sign
	// =========================================================================
	describe("Login Flow Integration", () => {
		// Layer 1 foundation: real stored user plus helper-produced password hash.
		// Layer 2 added in each request: authRoute -> loginController.
		// Layer 3 confirmed by assertions: comparePassword and JWT generation.
		beforeEach(async () => {
			// Layer 1 foundation for this story: create a real user with a helper hash before the route/controller layer is invoked.
			const hashedPwd = await hashPassword("correctpassword");
			await userModel.create({
				name: "Login User",
				email: "login@example.com",
				password: hashedPwd,
				phone: "96767676",
				address: "6767 Login Road",
				answer: "petname",
				role: 0,
			});
		});

		it("should login successfully and return a valid JWT token", async () => {
			// Layer 2 added here: authRoute/loginController runs on top of the stored user created in Layer 1.
			const res = await request(authIntegrationApp)
				.post("/api/v1/auth/login")
				.send({ email: "login@example.com", password: "correctpassword" });

			expect(res.status).toBe(200);
			expect(res.body.success).toBe(true);
			expect(res.body.message).toBe("Login successfully");
			expect(res.body.token).toBeDefined();

			// Layer 3 assertion: controller returned user data derived from the model layer.
			expect(res.body.user.email).toBe("login@example.com");
			expect(res.body.user.name).toBe("Login User");
			expect(res.body.user.role).toBe(0);

			// Layer 3 added by the controller flow: comparePassword succeeded and JWT.sign produced a valid token payload.
			const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
			expect(decoded._id).toBeDefined();
		});

		it("should reject login with incorrect password (401)", async () => {
			// Layer 2 added here: route/controller reaches comparePassword against the real user record and rejects on mismatch.
			const res = await request(authIntegrationApp)
				.post("/api/v1/auth/login")
				.send({ email: "login@example.com", password: "wrongpassword" });

			expect(res.status).toBe(401);
			expect(res.body.success).toBe(false);
			expect(res.body.message).toBe("Invalid password");
		});

		it("should reject login with non-existent email (404)", async () => {
			// Layer 2 added here: route/controller checks the model layer and finds no matching user document to continue upward.
			const res = await request(authIntegrationApp)
				.post("/api/v1/auth/login")
				.send({ email: "nobody@example.com", password: "anypassword" });

			expect(res.status).toBe(404);
			expect(res.body.success).toBe(false);
			expect(res.body.message).toBe("Email is not registered");
		});

		it("should reject login with missing email or password (404)", async () => {
			// Layer 2 only: controller validation stops before comparePassword or JWT generation is added to the flow.
			const res = await request(authIntegrationApp)
				.post("/api/v1/auth/login")
				.send({ email: "login@example.com" }); // missing password

			expect(res.status).toBe(404);
			expect(res.body.success).toBe(false);
			expect(res.body.message).toBe("Invalid email or password");
		});
	});

	// =========================================================================
	// Story 3: Protected User Route Integration
	// Integration: requireSignIn middleware -> JWT verification -> route handler
	// =========================================================================
	describe("Protected User Route Integration", () => {
		// Layer 1 foundation: real user document plus JWT derived from that user.
		// Layer 2 added in each request: requireSignIn middleware.
		// Layer 3 confirmed by assertions: protected route handler is reached or blocked.
		let userToken;

		beforeEach(async () => {
			// Layer 1 foundation: create a persisted user first, then create the JWT that the middleware layer will verify.
			const user = await userModel.create({
				name: "Protected User",
				email: "protected@example.com",
				password: await hashPassword("protectedpass"),
				phone: "92223333",
				address: "789 Secure Blvd",
				answer: "secure",
				role: 0,
			});
			userToken = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
				expiresIn: "7d",
			});
		});

		it("should allow access to /user-auth with a valid token", async () => {
			// Layer 2 added here: requireSignIn verifies the JWT against the real user identity.
			const res = await request(authIntegrationApp)
				.get("/api/v1/auth/user-auth")
				.set("Authorization", userToken);

			// Layer 3 reached only after middleware succeeds: the route handler responds with the protected payload.
			expect(res.status).toBe(200);
			expect(res.body.ok).toBe(true);
		});

		it("should reject access to /user-auth with no token (401)", async () => {
			// Layer 2 only: request is blocked at requireSignIn before the route handler layer is added.
			const res = await request(authIntegrationApp).get("/api/v1/auth/user-auth");

			expect(res.status).toBe(401);
			expect(res.body.success).toBe(false);
			expect(res.body.message).toBe("Unauthorized");
		});

		it("should reject access to /user-auth with an invalid token (401)", async () => {
			// Layer 2 only: middleware rejects an invalid JWT before the request can reach the protected route handler.
			const res = await request(authIntegrationApp)
				.get("/api/v1/auth/user-auth")
				.set("Authorization", "invalid.token.value");

			expect(res.status).toBe(401);
			expect(res.body.success).toBe(false);
			expect(res.body.message).toBe("Unauthorized");
		});

		it("should reject access to /user-auth with an expired token (401)", async () => {
			// Layer 1 foundation variant: produce an already-expired token to show the middleware layer rejects stale real credentials.
			const expiredToken = jwt.sign(
				{ _id: "someUserId" },
				process.env.JWT_SECRET,
				{ expiresIn: "0s" },
			);

			// Small delay to ensure expiry
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Layer 2 only: requireSignIn rejects the expired token before the route handler is reached.
			const res = await request(authIntegrationApp)
				.get("/api/v1/auth/user-auth")
				.set("Authorization", expiredToken);

			expect(res.status).toBe(401);
			expect(res.body.success).toBe(false);
		});
	});

	// =========================================================================
	// Story 4: Admin Authorization Integration
	// Integration: requireSignIn + isAdmin middleware -> userModel role check -> route
	// =========================================================================
	describe("Admin Authorization Integration", () => {
		// Layer 1 foundation: real admin/user documents plus JWTs.
		// Layer 2 added in each request: requireSignIn.
		// Layer 3 added after sign-in: isAdmin reads the persisted role.
		// Layer 4 confirmed by assertions: route handler is reached or blocked.
		let adminToken;
		let userToken;

		beforeEach(async () => {
			// Layer 1 foundation: persist the admin role that isAdmin must read.
			const adminUser = await userModel.create({
				name: "Admin User",
				email: "admin@example.com",
				password: await hashPassword("adminpass"),
				phone: "99998888",
				address: "1 Admin Plaza",
				answer: "adminanswer",
				role: 1,
			});
			adminToken = jwt.sign({ _id: adminUser._id }, process.env.JWT_SECRET, {
				expiresIn: "7d",
			});

			// Layer 1 foundation: persist a non-admin user as the negative control.
			const regularUser = await userModel.create({
				name: "Regular User",
				email: "regular@example.com",
				password: await hashPassword("regularpass"),
				phone: "88887777",
				address: "2 User Lane",
				answer: "useranswer",
				role: 0,
			});
			userToken = jwt.sign({ _id: regularUser._id }, process.env.JWT_SECRET, {
				expiresIn: "7d",
			});
		});

		it("should allow admin access to /admin-auth", async () => {
			// Layer 2 added here: requireSignIn verifies the JWT.
			// Layer 3 added immediately after: isAdmin checks the persisted role.
			const res = await request(authIntegrationApp)
				.get("/api/v1/auth/admin-auth")
				.set("Authorization", adminToken);

			// Layer 4 reached only if both middleware layers pass.
			expect(res.status).toBe(200);
			expect(res.body.ok).toBe(true);
		});

		it("should reject regular user from /admin-auth (401)", async () => {
			// Layer 2 added here: requireSignIn accepts the JWT.
			// Layer 3 stops the flow here: isAdmin reads role 0 from the model and blocks before the route handler layer is reached.
			const res = await request(authIntegrationApp)
				.get("/api/v1/auth/admin-auth")
				.set("Authorization", userToken);

			expect(res.status).toBe(401);
			expect(res.body.success).toBe(false);
			expect(res.body.message).toBe("Unauthorized Access");
		});

		it("should allow admin access to /test route (requireSignIn + isAdmin)", async () => {
			// Layer 2 and Layer 3 are added by the middleware chain before the test route handler responds.
			const res = await request(authIntegrationApp)
				.get("/api/v1/auth/test")
				.set("Authorization", adminToken);

			expect(res.status).toBe(200);
			expect(res.text).toBe("Protected Routes");
		});

		it("should reject unauthenticated request to /admin-auth (401)", async () => {
			// Layer 2 only: requireSignIn blocks before isAdmin or the route handler can be added.
			const res = await request(authIntegrationApp).get("/api/v1/auth/admin-auth");

			expect(res.status).toBe(401);
			expect(res.body.success).toBe(false);
		});
	});

	// =========================================================================
	// Story 5: Forgot Password Flow Integration
	// Integration: authRoute -> forgotPasswordController -> hashPassword -> userModel.findByIdAndUpdate -> DB update
	// =========================================================================
	describe("Forgot Password Flow Integration", () => {
		// Layer 1 foundation: real stored credential with helper-produced hash.
		// Layer 2 added in each request: authRoute -> forgotPasswordController.
		// Layer 3 confirmed by assertions: helper hashing and model update.
		const testEmail = "forgot@example.com";
		const testAnswer = "MySecretAnswer";
		const oldPassword = "oldpassword123";

		beforeEach(async () => {
			// Layer 1 foundation for this story: create the real stored credential that the reset flow must locate and update.
			const hashedPwd = await hashPassword(oldPassword);
			await userModel.create({
				name: "Forgot User",
				email: testEmail,
				password: hashedPwd,
				phone: "81112222",
				address: "10 Reset Ave",
				answer: testAnswer,
				role: 0,
			});
		});

		it("should reset password with correct security answer and update DB", async () => {
			const newPassword = "newpassword6767";

			// Layer 2 added here: authRoute/forgotPasswordController runs against the real user state.
			const res = await request(authIntegrationApp).post("/api/v1/auth/forgot-password").send({
				email: testEmail,
				answer: testAnswer,
				newPassword: newPassword,
			});

			expect(res.status).toBe(200);
			expect(res.body.success).toBe(true);
			expect(res.body.message).toBe("Password reset successfully");

			// Layer 3 verified here: helper hashing and model persistence changed the persisted password state.
			const updatedUser = await userModel.findOne({ email: testEmail });
			// New password hash should differ from old
			const oldMatch = await comparePassword(oldPassword, updatedUser.password);
			expect(oldMatch).toBe(false);
			// New password should match
			const newMatch = await comparePassword(newPassword, updatedUser.password);
			expect(newMatch).toBe(true);
		});

		it("should verify the new password works for login after reset", async () => {
			const newPassword = "resetlogintest";

			// Layer 2 first pass: forgot-password route/controller updates the persisted credential through helper hashing + model persistence.
			await request(authIntegrationApp).post("/api/v1/auth/forgot-password").send({
				email: testEmail,
				answer: testAnswer,
				newPassword: newPassword,
			});

			// Layer 3 added next: login route/controller is exercised on top of the updated persisted state.
			const loginRes = await request(authIntegrationApp)
				.post("/api/v1/auth/login")
				.send({ email: testEmail, password: newPassword });

			expect(loginRes.status).toBe(200);
			expect(loginRes.body.success).toBe(true);
			expect(loginRes.body.token).toBeDefined();

			// Layer 3 negative check: comparePassword now rejects the old secret.
			const oldLoginRes = await request(authIntegrationApp)
				.post("/api/v1/auth/login")
				.send({ email: testEmail, password: oldPassword });

			expect(oldLoginRes.status).toBe(401);
			expect(oldLoginRes.body.success).toBe(false);
		});

		it("should reject password reset with wrong security answer (404)", async () => {
			// Layer 2 added here: controller reads the persisted user state but blocks before the helper/model update layer can run.
			const res = await request(authIntegrationApp).post("/api/v1/auth/forgot-password").send({
				email: testEmail,
				answer: "WrongAnswer",
				newPassword: "newpass",
			});

			expect(res.status).toBe(404);
			expect(res.body.success).toBe(false);
			expect(res.body.message).toBe("Wrong email or answer");

			// Layer 3 assertion: the lower model state is unchanged after rejection.
			const loginRes = await request(authIntegrationApp)
				.post("/api/v1/auth/login")
				.send({ email: testEmail, password: oldPassword });

			expect(loginRes.status).toBe(200);
			expect(loginRes.body.success).toBe(true);
		});

		it("should reject password reset with wrong email (404)", async () => {
			// Layer 2 only: controller checks the model layer and fails to find a matching account before any update layer is added.
			const res = await request(authIntegrationApp).post("/api/v1/auth/forgot-password").send({
				email: "wrong@example.com",
				answer: testAnswer,
				newPassword: "newpass",
			});

			expect(res.status).toBe(404);
			expect(res.body.success).toBe(false);
			expect(res.body.message).toBe("Wrong email or answer");
		});

		/**
		 * External Reference:
		 * Parameterized test pattern adapted from:
		 * https://stackoverflow.com/questions/52996062/using-jests-test-each-parameterized-test-variable-scope
		 **/
		describe("Validation Errors", () => {
			describe("missing field validation", () => {
				it.each(forgotPasswordMissingFieldCases)(
					"should reject password reset when $field is missing (400)",
					async ({ missingBody, expectedMessage }) => {
						// Layer 2 only: controller validation stops before helper hashing or model update layers are added.
						const res = await request(authIntegrationApp)
							.post("/api/v1/auth/forgot-password")
							.send(missingBody);

						expect(res.status).toBe(400);
						expect(res.body.success).toBe(false);
						expect(res.body.message).toBe(expectedMessage);
					},
				);
			});
		});
	});

	// =========================================================================
	// Layer 4: React UI Integration
	// Integration: UI -> Router/Context -> authRoute -> Controller -> Helper -> DB
	// =========================================================================
	describe("Layer 4: UI Integration", () => {
		// Highest layer overall:
		// Layer 1 foundation inside each UI story: real model state, helper hashes, and mounted backend routes/controllers.
		// Layer 2 added in each UI story: React UI plus Router/Context harness.
		// Layer 3 added by user events: axios -> authRoute -> controller -> helper -> model/DB, with assertions reading back those real dependencies directly.
		describe("Story 1: Registration UI Integration", () => {
			it("should register through the real Register page and persist a hashed password", async () => {
				// Layer 1 foundation: backend routes/controllers are already mounted, and the DB starts empty for this story.
				// Layer 2 added here: render the real Register page with Router and Context on top of the mounted backend stack.
				renderAuthUiHarness(["/register"]);
				const formValues = fillRegisterForm();

				// Layer 3 added here: the UI event dispatches axios through the real auth route/controller/helper/model stack.
				fireEvent.click(screen.getByText("REGISTER"));

				await screen.findByText("LOGIN FORM");

				// Layer 1 readback: verify the real persisted state produced by the full UI-driven flow.
				const savedUser = await userModel.findOne({ email: formValues.email });
				expect(savedUser).not.toBeNull();
				expect(savedUser.name).toBe(formValues.name);

				const passwordMatches = await comparePassword(
					formValues.password,
					savedUser.password,
				);
				expect(passwordMatches).toBe(true);
			});
		});

		describe("Story 2: Login UI Integration", () => {
			it("should login through the real Login page and persist auth state", async () => {
				// Layer 1 foundation: create a real stored user and helper hash before the UI layer is rendered.
				await userModel.create({
					name: "Login UI User",
					email: "login-ui@example.com",
					password: await hashPassword("correctpassword"),
					phone: "96767676",
					address: "6767 Login Road",
					answer: "petname",
					role: 0,
				});

				// Layer 2 added here: render the Login page with Router/Context.
				renderAuthUiHarness(["/login"]);
				fillLoginForm({
					email: "login-ui@example.com",
					password: "correctpassword",
				});

				// Layer 3 added here: clicking Login drives the real backend stack, then AuthProvider persists the session in localStorage.
				fireEvent.click(screen.getByText("LOGIN"));

				await screen.findByText("Home Page");

				const storedAuth = JSON.parse(localStorage.getItem("auth"));
				expect(storedAuth.user.email).toBe("login-ui@example.com");
				expect(storedAuth.token).toBeDefined();
			});
		});

		describe("Story 3: Protected Route UI Integration", () => {
			it("should allow PrivateRoute after a successful real UI login", async () => {
				// Layer 1 foundation: create the persisted user that login will target.
				await userModel.create({
					name: "Protected UI User",
					email: "protected-ui@example.com",
					password: await hashPassword("protectedpass"),
					phone: "92223333",
					address: "789 Secure Blvd",
					answer: "secure",
					role: 0,
				});
				// Layer 2 added here: render the UI login flow and routing shell.
				renderAuthUiHarness(["/login"]);
				fillLoginForm({
					email: "protected-ui@example.com",
					password: "protectedpass",
				});
				// Layer 3 added here: UI login establishes the authenticated session through the real backend login stack.
				fireEvent.click(screen.getByText("LOGIN"));
				await screen.findByText("Home Page");
				// Layer 4 added here: PrivateRoute consumes that session and reaches the protected UI child only after the auth layers succeeded.
				fireEvent.click(screen.getByText("Go User Dashboard"));
				await screen.findByText("User Dashboard");
			});

			it("should show the guard spinner when no authenticated UI session exists", async () => {
				// Layer 2 only: render the UI guard directly on top of empty auth state, so PrivateRoute blocks before a protected child renders.
				renderAuthUiHarness(["/dashboard/user"]);

				await screen.findByText(/redirecting to you in/i);
				expect(screen.queryByText("User Dashboard")).not.toBeInTheDocument();
			});
		});

		describe("Story 4: Admin Authorization UI Integration", () => {
			it("should allow AdminRoute after a successful admin UI login", async () => {
				// Layer 1 foundation: create a real admin user for the auth and authorization layers to read.
				await userModel.create({
					name: "Admin UI User",
					email: "admin-ui@example.com",
					password: await hashPassword("adminpass"),
					phone: "99998888",
					address: "1 Admin Plaza",
					answer: "adminanswer",
					role: 1,
				});
				// Layer 2 added here: render the Login/AdminRoute UI shell.
				renderAuthUiHarness(["/login"]);
				fillLoginForm({
					email: "admin-ui@example.com",
					password: "adminpass",
				});
				// Layer 3 added here: UI login drives the real login route/controller.
				fireEvent.click(screen.getByText("LOGIN"));
				await screen.findByText("Home Page");
				// Layer 4 added here: AdminRoute checks the authenticated session and reaches the admin child only after the authz layers pass.
				fireEvent.click(screen.getByText("Go Admin Dashboard"));
				await screen.findByText("Admin Dashboard");
			});

			it("should keep regular users blocked from the admin page after real UI login", async () => {
				// Layer 1 foundation: create a regular user so the authorization layer can deny admin access based on persisted role 0.
				await userModel.create({
					name: "Regular UI User",
					email: "regular-ui@example.com",
					password: await hashPassword("regularpass"),
					phone: "88887777",
					address: "2 User Lane",
					answer: "useranswer",
					role: 0,
				});
				// Layer 2 added here: render the Login/AdminRoute UI shell.
				renderAuthUiHarness(["/login"]);
				fillLoginForm({
					email: "regular-ui@example.com",
					password: "regularpass",
				});
				// Layer 3 added here: UI login authenticates successfully.
				fireEvent.click(screen.getByText("LOGIN"));
				await screen.findByText("Home Page");
				// Layer 4 stops here: AdminRoute reads the authenticated role through the real backend checks and blocks the admin child.
				fireEvent.click(screen.getByText("Go Admin Dashboard"));
				await screen.findByText(/redirecting to you in/i);
				expect(screen.queryByText("Admin Dashboard")).not.toBeInTheDocument();
			});
		});

		describe("Story 5: Forgot Password UI Integration", () => {
			it("should reset the password through the real UI and allow login with the new password", async () => {
				// Layer 1 foundation: create the real stored credential that the reset and login flows will both operate on.
				await userModel.create({
					name: "Forgot UI User",
					email: "forgot-ui@example.com",
					password: await hashPassword("oldpassword123"),
					phone: "81112222",
					address: "10 Reset Ave",
					answer: "golf",
					role: 0,
				});

				// Layer 2 added here: render the Forgot Password page with the UI harness on top of the mounted backend.
				renderAuthUiHarness(["/forgot-password"]);
				fillForgotPasswordForm({
					email: "forgot-ui@example.com",
					answer: "golf",
					newPassword: "newpassword6767",
				});

				// Layer 3 added here: UI reset drives the forgot-password route, controller, helper hashing, and model update.
				fireEvent.click(screen.getByText("RESET"));
				await screen.findByText("LOGIN FORM");

				// Layer 4 added here: UI login is executed on top of the updated persisted credential to prove the reset took effect end-to-end.
				fillLoginForm({
					email: "forgot-ui@example.com",
					password: "newpassword6767",
				});
				fireEvent.click(screen.getByText("LOGIN"));

				await screen.findByText("Home Page");

				// Layer 1 readback: confirm the final persisted password matches the UI-driven reset flow.
				const updatedUser = await userModel.findOne({
					email: "forgot-ui@example.com",
				});
				const newPasswordMatches = await comparePassword(
					"newpassword6767",
					updatedUser.password,
				);
				expect(newPasswordMatches).toBe(true);
			});
		});
	});
});
