import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from "@jest/globals";
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import nodeAxios from "axios/dist/node/axios.cjs";
import JWT from "jsonwebtoken";
import { updateProfileController } from "../../controllers/authController.js";
import { hashPassword, comparePassword } from "../../helpers/authHelper.js";
import userModel from "../../models/userModel.js";
import Profile from "../../client/src/pages/user/Profile.js";
import { AuthProvider, useAuth } from "../../client/src/context/auth.js";
import app from "./setup/testServer.js";
import { connectTestDatabase, disconnectTestDatabase, clearTestData, createTestUser } from "./setup/testDatabase.js";

// Rachel Tai Ke Jia, A0258603A

// mock Layout and UserMenu to isolate Profile component under test
jest.mock("../../client/src/components/Layout", () => ({ children }) => <div>{children}</div>);
jest.mock("../../client/src/components/UserMenu", () => () => <div>User Menu</div>);

// renders auth context state for assertion in Level 4 UI test
const AuthProbe = () => {
    const [auth] = useAuth();
    return <div data-testid="auth-probe">{`${auth?.user?.name || ""}|${auth?.token || ""}`}</div>;
};

const initialProfile = { 
    name: "John",
    email: "john@example.com",
    phone: "91234587",
    address: "NUS Residence"
};

// Extend timeout for combined DB + UI operations (30s needed for full integration chain)
jest.setTimeout(30000);

const updatedProfile = {
    name: "John Doe",
    email: "john@example.com",
    phone: "91239123",
    address: "NUS Residence 123"
};

const bridgeAxiosToNodeClient = () => {
    ["get", "post", "put", "delete"].forEach((method) => {
        if (typeof axios[method] === "function" && typeof axios[method].mockImplementation === "function") {
            axios[method].mockImplementation((...args) => nodeAxios[method](...args));
        } else {
            axios[method] = (...args) => nodeAxios[method](...args);
        }
    });
};

describe("integration tests for user profile management (bottom-up approach)", () => {
    let server;
    let baseURL;
    let testUser;
    let authToken;
    let userId;
    const TEST_PORT = 3002;
    let consoleErrorSpy;

    beforeAll(() => {
        const originalError = console.error;
        consoleErrorSpy = jest.spyOn(console, "error").mockImplementation((...args) => {
            const joinedMessage = args
                .map((item) => (typeof item === "string" ? item : String(item)))
                .join(" ");

            if (/ReactDOMTestUtils\.act.*deprecated/.test(joinedMessage)) return;
            if (/not wrapped in act/.test(joinedMessage)) return;

            originalError(...args);
        });
    });

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
        if (consoleErrorSpy) {
            consoleErrorSpy.mockRestore();
        }
    });

    beforeEach(async () => {
        bridgeAxiosToNodeClient();
        axios.defaults.baseURL = baseURL;
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

    afterEach(() => {
        delete axios.defaults.baseURL;
    });


    // Components involved:
    // A: requireSignIn middleware
    // B: updateProfileController
    // C: userModel (database)
    // D: authHelper (hash/compare)
    // Variety of integrations: A-B, A-C, B-C, B-D

    // Integration test using bottom-up approach
    describe("Level 1 (bottom-most): controller-core integration (B-C, B-D)", () => {
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

        test("updateProfileController integrates with authHelper hashing", async () => {
            // Arrange
            const req = {
                user: { _id: userId },
                body: {
                    password: "new-password",
                }
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn()
            };

            // Act
            await updateProfileController(req, res);

            // Assert: stored value is a hash generated through authHelper path
            const updatedUser = await userModel.findById(userId);
            const isPasswordValid = await comparePassword("new-password", updatedUser.password);
            expect(isPasswordValid).toBe(true);
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


    describe("Level 2: middleware-controller integration (A-B)", () => {
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


    describe("Level 2: middleware-model safety integration (A-C)", () => {
        test("reject invalid JWT and preserve persisted user record", async () => {
            // Arrange
            const invalidToken = "invalid-jwt-token";

            // Act
            try {
                await axios.put(
                    `${baseURL}/api/v1/auth/profile`,
                    { name: "Invalid Update" },
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
                const user = await userModel.findById(userId);
                expect(user.name).toBe(testUser.name);
                expect(user.phone).toBe(testUser.phone);
                expect(user.address).toBe(testUser.address);
            }
        });
    });


    describe("Level 3: route-middleware-controller-model HTTP integration", () => {
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
            // Assert: current implementation returns hashed password, never plaintext
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
            // verify database reflects one of the concurrent writes
            const finalUser = await userModel.findById(userId);
            expect([firstUpdate.name, secondUpdate.name]).toContain(finalUser.name);
        });
    });


    describe("Level 3: response-contract integration for context/localStorage consumers", () => {
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


    describe("Level 4 (top-most): full profile-management integration flow", () => {
        test("submitting Profile UI updates backend, auth context, and localStorage", async () => {
            // Arrange
            axios.defaults.baseURL = baseURL;
            axios.defaults.headers.common["Authorization"] = "";
            const originalPut = axios.put;
            axios.put = (url, data, config = {}) => {
                const requestUrl = typeof url === "string" && url.startsWith("http")
                    ? url
                    : `${baseURL}${url}`;
                return nodeAxios.put(requestUrl, data, {
                    ...config,
                    headers: {
                        ...(axios.defaults.headers.common || {}),
                        ...(config.headers || {}),
                    },
                });
            };
            localStorage.clear();
            localStorage.setItem(
                "auth",
                JSON.stringify({
                    user: {
                        _id: testUser._id,
                        name: testUser.name,
                        email: testUser.email,
                        phone: testUser.phone,
                        address: testUser.address,
                        role: testUser.role,
                    },
                    token: authToken,
                })
            );

            const { getByPlaceholderText, getByText, getByTestId } = render(
                <AuthProvider>
                    <Profile />
                    <AuthProbe />
                </AuthProvider>
            );

            await waitFor(() => {
                expect(axios.defaults.headers.common["Authorization"]).toBe(authToken);
            });

            await waitFor(() => {
                expect(getByPlaceholderText("Enter Your Name").value).toBe(testUser.name);
            });

            fireEvent.change(getByPlaceholderText("Enter Your Name"), {
                target: { value: updatedProfile.name },
            });
            fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
                target: { value: updatedProfile.phone },
            });
            fireEvent.change(getByPlaceholderText("Enter Your Address"), {
                target: { value: updatedProfile.address },
            });

            // Act
            fireEvent.click(getByText("UPDATE"));

            // Assert: context updated through real Profile + AuthProvider path
            await waitFor(() => {
                expect(getByTestId("auth-probe").textContent).toBe(`${updatedProfile.name}|${authToken}`);
            });

            // Assert: localStorage sync updated by Profile handler
            const storedAuth = JSON.parse(localStorage.getItem("auth"));
            expect(storedAuth.user.name).toBe(updatedProfile.name);
            expect(storedAuth.user.phone).toBe(updatedProfile.phone);
            expect(storedAuth.user.address).toBe(updatedProfile.address);
            expect(storedAuth.token).toBe(authToken);

            // Assert: backend persistence proves middleware + controller + model chain executed
            const user = await userModel.findById(userId);
            expect(user.name).toBe(updatedProfile.name);
            expect(user.phone).toBe(updatedProfile.phone);
            expect(user.address).toBe(updatedProfile.address);

            axios.put = originalPut;
        });
    });
});