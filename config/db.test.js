import mongoose from "mongoose";
import connectDB from "./db.js";

// Lim Jia Wei, A0277381W

jest.mock("mongoose");

describe("Tests for connectDB function", () => {

    // Clear mocks before each test and set default MONGO_URL
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.MONGO_URL = "mongodb://test-url";
    });

    test("Connect to the database successfully and log the host", async () => {

        // Arrange
        const mockHost = "test-host";
        mongoose.connect.mockResolvedValue({
            connection: {
                host: mockHost,
            },
        });

        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

        // Act
        await connectDB();

        // Assert
        expect(mongoose.connect).toHaveBeenCalledWith("mongodb://test-url");
        expect(consoleSpy).toHaveBeenCalled();

        const loggedMessage = consoleSpy.mock.calls[0][0];
        expect(loggedMessage).toContain(`Connected To Mongodb Database ${mockHost}`);

        consoleSpy.mockRestore();
    });

    test("Log error when connection fails", async () => {

        // Arrange
        const mockError = new Error("Connection failed");
        mongoose.connect.mockRejectedValue(mockError);

        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

        // Act
        await connectDB();

        // Assert
        expect(mongoose.connect).toHaveBeenCalledWith("mongodb://test-url");
        expect(consoleSpy).toHaveBeenCalled();

        const loggedMessage = consoleSpy.mock.calls[0][0];
        expect(loggedMessage).toContain(`Error in Mongodb ${mockError}`);

        consoleSpy.mockRestore();
    });
});
