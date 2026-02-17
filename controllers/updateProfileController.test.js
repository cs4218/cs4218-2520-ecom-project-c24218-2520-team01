import { hashPassword } from "../helpers/authHelper";
import userModel from "../models/userModel";
import { MOCK_USER, UPDATED_PROFILE_INPUT, UPDATED_USER } from "../test/fixtures/mockUser";
import { updateProfileController } from "./authController";

// Rachel Tai Ke Jia, A0258603A

// Mock external dependencies: authHelper and userModel
jest.mock("../helpers/authHelper", () => (
    {
        hashPassword: jest.fn()
    }
));

jest.mock("../models/userModel", () => (
    {
        findById: jest.fn(),
        findByIdAndUpdate: jest.fn()
    }
));

describe("Unit test for updateProfileController", () => {
    // Arrange
    let req, res;
    beforeEach(() => {
        // Create new req, res before each test
        req = {
            user: { _id: MOCK_USER._id },
            body: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn()
        };
        jest.clearAllMocks();
    });


    test("Update profile successfully without password", async () => {
        // Arrange 
        req.body = UPDATED_PROFILE_INPUT;
        userModel.findById.mockResolvedValue(MOCK_USER);

        // Mock database update and return updated user
        userModel.findByIdAndUpdate.mockResolvedValue(UPDATED_USER);

        // Act
        await updateProfileController(req, res);

        // Assert
        expect(userModel.findById).toHaveBeenCalledWith(MOCK_USER._id);
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
            MOCK_USER._id,
            {
                name: UPDATED_PROFILE_INPUT.name,
                password: MOCK_USER.password,
                phone: UPDATED_PROFILE_INPUT.phone,
                address: UPDATED_PROFILE_INPUT.address
            },
            { new: true }
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                updatedUser: UPDATED_USER
            })
        );
    });


    test("Update profile including password", async () => {
        // Arrange
        req.body = { 
            ...UPDATED_PROFILE_INPUT
        };
        userModel.findById.mockResolvedValue(MOCK_USER);

        // Stub for password hashing
        hashPassword.mockResolvedValue("hashed-password");

        // Mock database update and return updated user
        userModel.findByIdAndUpdate.mockResolvedValue({ 
            ...UPDATED_USER, 
            password: "hashed-password" 
        });

        // Act
        await updateProfileController(req, res);

        // Assert
        expect(hashPassword).toHaveBeenCalledWith(UPDATED_PROFILE_INPUT.password);
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
            MOCK_USER._id,
            { ...UPDATED_PROFILE_INPUT, password: "hashed-password" },
            { new: true }
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                updatedUser: { 
                    ...UPDATED_USER, 
                    password: "hashed-password" 
                }
            })
        );
    });

    test("Check that password is not < 6 characters", async () => {
        // Arrange
        req.body.password = "pw";

        // Act
        await updateProfileController(req, res);

        // Assert
        expect(res.json).toHaveBeenCalledWith({
            error: "Passsword is required and is 6 characters long"
        });
        expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });


    test("Vaild password is hashed", async () => {
        // Arrange
        req.body = { password: UPDATED_PROFILE_INPUT.password };
        userModel.findById.mockResolvedValue(MOCK_USER);

        // Stub for password hashing
        hashPassword.mockResolvedValue("pwhashed");

        // Mock database update and return updated user
        userModel.findByIdAndUpdate.mockResolvedValue({ password: "pwhashed" });

        // Act
        await updateProfileController(req, res);

        // Assert
        expect(hashPassword).toHaveBeenCalledWith(UPDATED_PROFILE_INPUT.password);
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
            MOCK_USER._id,
            expect.objectContaining({
                password: "pwhashed"
            }),
            { new: true }
        );
    });

    test("updateProfileController handles errors", async () => {
        // Arrange
        jest.spyOn(console, "log").mockImplementation(() => {});
        userModel.findById.mockRejectedValue(new Error("Network connection error"));

        // Act
        await updateProfileController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Error while updating profile"
            })
        );
        console.log.mockRestore();
    });
});
