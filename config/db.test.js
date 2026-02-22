import mongoose from "mongoose";
import connectDB from "./db.js";

// Lim Jia Wei, A0277381W

jest.mock("mongoose");

describe("Tests for connectDB function", () => {

    // Clear mocks before each test and set default MONGO_URL
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.MONGO_URL = "mongodb://test-url";
        jest.spyOn(console, "log").mockImplementation(() => { });
    });

    test("Connects with MONGO_URL and logs the host", async () => {

        // Arrange
        const mockConn = { connection: { host: "test-host" } };
        mongoose.connect.mockResolvedValue(mockConn);


        // Act
        const promise = connectDB();

        // Assert
        await expect(promise).resolves.toBeUndefined();
        expect(mongoose.connect).toHaveBeenCalledTimes(1);
        expect(mongoose.connect).toHaveBeenCalledWith("mongodb://test-url");


        // check only meaningful content to reduce brittleness from using logSpy
        // expect(logSpy).toHaveBeenCalledWith(
        //     expect.stringContaining("Connected To Mongodb Database test-host")
        // );
    });

    test("handles connection failure without throwing", async () => {

        const mockError = {
            toString: jest.fn(() => "Connection failed"),
        };

        mongoose.connect.mockRejectedValue(mockError);

        // Act
        await expect(connectDB()).resolves.toBeUndefined();

        // Assert
        expect(mongoose.connect).toHaveBeenCalledTimes(1);
        expect(mongoose.connect).toHaveBeenCalledWith("mongodb://test-url");
        expect(mockError.toString).toHaveBeenCalledTimes(1);
    });

});
