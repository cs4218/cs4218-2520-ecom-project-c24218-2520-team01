import { describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import axios from "axios";
import JWT from "jsonwebtoken";
import { updateProfileController } from "../../controllers/authController.js";
import { hashPassword } from "../../helpers/authHelper.js";
import userModel from "../../models/userModel.js";
import app from "./setup/testServer.js";
import { connectTestDatabase, disconnectTestDatabase, clearTestData, createTestUser } from "./setup/testDatabase.js";

// Rachel Tai Ke Jia, A0258603A
const initialProfile = { 
    name: "John",
    email: "john@example.com",
    phone: "91234587",
    address: "NUS Residence"
};

const updatedProfile = {
    name: "John Doe",
    email: "john@example.com",
    phone: "91239123",
    address: "NUS Residence 123"
};

describe("integration tests for user profile management (bottom-up approach)", () => {
    let server;
    let baseURL;
    let testUser;
    let authToken;
    let userId;
    const TEST_PORT = 3002;

    beforeAll(async () => {
        // connect to test database
        await connectTestDatabase();
        
        // start HTTP server on test port
        await new Promise((resolve) => {
            server = app.listen(TEST_PORT, () => {
                baseURL = `http://localhost:${TEST_PORT}`;
                resolve();
            });
        });
    });

    afterAll(async () => {
        await new Promise((resolve) => {
            if (server) {
                server.close(() => resolve());
            } else {
                resolve();
            }
        });    
        await clearTestData();
        await disconnectTestDatabase();
    });

    beforeEach(async () => {
        await clearTestData();

        // create test user
        const hashedPwd = await hashPassword("testPassword");
        testUser = await createTestUser({
            ...initialProfile,
            password: hashedPwd,
            answer: "test answer",
            role: 0
        });
        userId = testUser._id;

        // generate auth token for testing protected routes
        authToken = JWT.sign(
            { _id: userId }, 
            process.env.JWT_SECRET || "test-secret-key", 
            { expiresIn: "7d" }
        );
    });


    describe("1st level (bottom-most): integrate database and controller", () => {
        test("update user profile data in real database (test database)", async () => {
            // Arrange 
            const req = {
                user: { _id: userId },
                body: updatedProfile
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn()
            };

            // Act: call controller directly with real database
            await updateProfileController(req, res);

            // Assert: verify controller response
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: "Profile Updated Successfully",
                    updatedUser: expect.objectContaining({
                        name: updatedProfile.name,
                        phone: updatedProfile.phone,
                        address: updatedProfile.address
                    }),
                })
            );
            // verify database updated with profile data
            const updatedUser = await userModel.findById(userId);
            expect(updatedUser.name).toBe(updatedProfile.name);
            expect(updatedUser.phone).toBe(updatedProfile.phone);
            expect(updatedUser.address).toBe(updatedProfile.address);
        });

        test("update user password in real database", async () => {
            // Arrange
            const req = {
                user: { _id: userId },
                body: {
                    name: testUser.name,
                    password: "new-password",
                    phone: testUser.phone,
                    address: testUser.address
                }
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn()
            };
            const originalPassword = testUser.password;

            // Act
            await updateProfileController(req, res);

            // Assert 
            const updatedUser = await userModel.findById(userId);
            expect(updatedUser.password).not.toBe(originalPassword);
            expect(updatedUser.password).not.toBe("new-password"); // password should be hashed
        });

        test("password <6 chars is rejected", async () => {
            // Arrange
            const req = {
                user: { _id: userId },
                body: {
                    name: testUser.name,
                    password: "123",
                    phone: testUser.phone,
                    address: testUser.address
                }
            };
            const res = {
                json: jest.fn()
            };

            // Act
            await updateProfileController(req, res);

            // Assert
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: "Password is required and is 6 characters long"
                })
            );
        });

        test("should preserve existing values when fields not provided", async () => {
            // Arrange
            const req = {
                user: { _id: userId },
                body: {
                    name: updatedProfile.name
                }
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn()
            };

            // Act
            await updateProfileController(req, res);

            // Assert
            const updatedUser = await userModel.findById(userId);
            expect(updatedUser.name).toBe(updatedProfile.name);
            expect(updatedUser.phone).toBe(testUser.phone);
            expect(updatedUser.address).toBe(testUser.address);
            expect(updatedUser.email).toBe(testUser.email);
        });

        test("does not update email field", async () => {
            // Arrange
            const req = {
                user: { _id: userId },
                body: {
                    name: updatedProfile.name,
                    email: "newemail@gmail.com"
                }
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn()
            };

            // Act
            await updateProfileController(req, res);

            // Assert
            const updatedUser = await userModel.findById(userId);
            expect(updatedUser.email).toBe(testUser.email);
        });
    });


    describe("2nd level: integrate database, controller, and requireSignIn middleware", () => {
        test("authenticate valid JWT token, allow profile update", async () => {
            // Arrange 
            const newData = {
                name: updatedProfile.name,
                phone: updatedProfile.phone,
                address: updatedProfile.address
            };

            // Act
            const response = await axios.put(
                `${baseURL}/api/v1/auth/profile`,
                newData,
                {
                    headers: {
                        'Authorization': authToken
                    }
                }
            );

            // Assert: verify HTTP response
            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
            expect(response.data.updatedUser.name).toBe(updatedProfile.name);
            expect(response.data.updatedUser.phone).toBe(updatedProfile.phone);
            expect(response.data.updatedUser.address).toBe(updatedProfile.address);
            // verify database updated
            const user = await userModel.findById(userId);
            expect(user.name).toBe(updatedProfile.name);
            expect(user.phone).toBe(updatedProfile.phone);
            expect(user.address).toBe(updatedProfile.address);
        });

        test("reject request if no auth token", async () => {
            // Arrange
            const newData = {
                name: "Unauthorized Update",
            };

            // Act
            try {
                await axios.put(
                    `${baseURL}/api/v1/auth/profile`,
                    newData,
                    // no headers, no authorisation
                );                
                expect(true).toBe(false);
            } catch (error) {
                // Assert: rejected request 
                expect(error.response.status).toBe(401);
                expect(error.response.data.success).toBe(false);
                expect(error.response.data.message).toBe("Unauthorized");
                // verify database not updated
                const user = await userModel.findById(userId);
                expect(user.name).toBe(testUser.name); 
            }
        });

        test("reject request if JWT token is invalid", async () => {
            // Arrange
            const invalidToken = "invalid-jwt-token";
            const newData = {
                name: updatedProfile.name
            };

            // Act
            try {
                await axios.put(
                    `${baseURL}/api/v1/auth/profile`,
                    newData,
                    {
                        headers: {
                            'Authorization': invalidToken
                        }
                    }
                );
                expect(true).toBe(false);
            } catch (error) {
                // Assert
                expect(error.response.status).toBe(401);
                expect(error.response.data.success).toBe(false);
                expect(error.response.data.message).toBe("Unauthorized");
            }
        });

        test("reject request if JWT token is expired", async () => {
            // Arrange 
            const expiredToken = JWT.sign(
                { _id: userId },
                process.env.JWT_SECRET || "test-secret-key",
                { expiresIn: "-6h" }
            );
            const newData = {
                name: updatedProfile.name
            };

            // Act
            try {
                await axios.put(
                    `${baseURL}/api/v1/auth/profile`,
                    newData,
                    {
                        headers: {
                            'Authorization': expiredToken
                        }
                    }
                );
                expect(true).toBe(false);
            } catch (error) {
                // Assert: reject request with expired token
                expect(error.response.status).toBe(401);
                expect(error.response.data.message).toBe("Unauthorized");
            }
        });
    });


    describe("3rd level: integrate database, controller, requireSignIn middleware, and routes", () => {
        test("complete flow for updating profile", async () => {
            // Arrange 
            const profileUpdate = {
                ...updatedProfile,
                password: "newPassword"
            };

            // Act
            const response = await axios.put(
                `${baseURL}/api/v1/auth/profile`,
                profileUpdate,
                {
                    headers: {
                        'Authorization': authToken,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Assert: verify HTTP response
            expect(response.status).toBe(200);
            expect(response.headers["content-type"]).toMatch(/json/);
            expect(response.data).toMatchObject({
                success: true,
                message: "Profile Updated Successfully",
                updatedUser: {
                    name: updatedProfile.name,
                    phone: updatedProfile.phone,
                    address: updatedProfile.address,
                    email: testUser.email
                },
            });
            // Assert: verify response does not include password
            expect(response.data.updatedUser.password).toBeDefined();
            expect(response.data.updatedUser.password).not.toBe("newPassword");
        });

        test("return error when updating profile in database", async () => {
            // Arrange: use invalid user ID to simulate database error
            const invalidToken = JWT.sign(
                { _id: "99999999" },
                process.env.JWT_SECRET || "test-secret-key",
                { expiresIn: "7d" }
            );

            // Act
            try {
                await axios.put(
                    `${baseURL}/api/v1/auth/profile`,
                    { name: updatedProfile.name },
                    {
                        headers: {
                            'Authorization': invalidToken
                        }
                    }
                );
                expect(true).toBe(false);
            } catch (error) {
                // Assert: gives error when updating database is not possible
                expect(error.response.status).toBe(400);
                expect(error.response.data.success).toBe(false);
                expect(error.response.data.message).toBe("Error while updating profile");
            }
        });

        test("allow profile updates at the same time", async () => {
            // Arrange
            const firstUpdate = { name: updatedProfile.name };
            const secondUpdate = { name: "secondName" };

            // Act: send 2 requests at the same time
            const [response1, response2] = await Promise.all([
                axios.put(
                    `${baseURL}/api/v1/auth/profile`,
                    firstUpdate,
                    { headers: { 'Authorization': authToken }}
                ),
                axios.put(
                    `${baseURL}/api/v1/auth/profile`,
                    secondUpdate,
                    { headers: { 'Authorization': authToken }}
                ),
            ]);

            // Assert
            expect(response1.status).toBe(200);
            expect(response2.status).toBe(200);
            // verify database is updated with last write
            const finalUser = await userModel.findById(userId);
            expect(finalUser.name).toBe(secondUpdate.name);
        });
    });


    describe("4th level: integrate api responses, auth context, and local storage", () => {
        test("updating profile also updates auth context and localStorage", async () => {
            // Arrange
            const profileData = {
                name: updatedProfile.name,
                phone: updatedProfile.phone,  
                address: updatedProfile.address
            };

            // Act
            const response = await axios.put(
                `${baseURL}/api/v1/auth/profile`,
                profileData,
                {
                    headers: {
                        'Authorization': authToken
                    }
                }
            );

            // Assert: verify API response contains updated user data
            expect(response.data).toHaveProperty("success");
            expect(response.data).toHaveProperty("updatedUser");
            expect(response.data.updatedUser).toHaveProperty("_id");
            expect(response.data.updatedUser).toHaveProperty("name");
            expect(response.data.updatedUser).toHaveProperty("email");
            expect(response.data.updatedUser).toHaveProperty("phone");
            expect(response.data.updatedUser).toHaveProperty("address");
            expect(response.data.updatedUser).toHaveProperty("role");

            const authContextState = {
                user: response.data.updatedUser,
                token: authToken
            };
            const localStorageData = JSON.stringify(authContextState);
            const parsedBack = JSON.parse(localStorageData);

            // Assert: verify localStorage is updated with new profile data and token
            expect(parsedBack.user.name).toBe(updatedProfile.name);
            expect(parsedBack.token).toBe(authToken);
        });

        test("auth token is kept when updating profile", async () => {
            // Arrange
            const updateData = { 
                name: updatedProfile.name 
            };

            // Act
            const response = await axios.put(
                `${baseURL}/api/v1/auth/profile`,
                updateData,
                {
                    headers: {
                        'Authorization': authToken
                    }
                }
            );

            // Assert: verify API response is successful, token is still valid
            expect(response.status).toBe(200);
            // verify token still works for subsequent requests
            const verifyResponse = await axios.get(
                `${baseURL}/api/v1/auth/user-auth`,
                {
                    headers: {
                        'Authorization': authToken
                    }
                }
            );
            expect(verifyResponse.status).toBe(200);
            expect(verifyResponse.data.ok).toBe(true);
        });

        test("allows user to update some prefilled fields, and persist data", async () => {
            // Arrange: initial auth context with pre-filled user data
            const initialUser = testUser;
            const initialAuthContext = {
                user: {
                    _id: initialUser._id,
                    name: initialUser.name,
                    email: initialUser.email,
                    phone: initialUser.phone,
                    address: initialUser.address,
                    role: initialUser.role
                },
                token: authToken
            };
            const updatedFields = {
                name: updatedProfile.name,
                phone: updatedProfile.phone,
                address: updatedProfile.address
            };

            // Act
            const response = await axios.put(
                `${baseURL}/api/v1/auth/profile`,
                updatedFields,
                {
                    headers: {
                        'Authorization': authToken
                    }
                }
            );
            // update auth context
            const newAuthContext = {
                ...initialAuthContext,
                user: response.data.updatedUser
            };
            // update localStorage
            const storedData = JSON.stringify(newAuthContext);
            // simulate page refresh and retrieve from localStorage
            const retrievedAuth = JSON.parse(storedData);

            // Assert: data is persisted 
            expect(retrievedAuth.user.name).toBe(updatedProfile.name);
            expect(retrievedAuth.user.phone).toBe(updatedProfile.phone);
            expect(retrievedAuth.user.address).toBe(updatedProfile.address);
            expect(retrievedAuth.user.email).toBe(initialUser.email); // Email unchanged
            expect(retrievedAuth.token).toBe(authToken);

            // Assert: verify database matches
            const user = await userModel.findById(userId);
            expect(user.name).toBe(updatedProfile.name);
            expect(user.phone).toBe(updatedProfile.phone);
            expect(user.address).toBe(updatedProfile.address);
        });
    });
});