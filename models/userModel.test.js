import { afterAll, beforeAll, beforeEach, describe, test, expect } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import User from "./userModel.js";

// Lim Jia Wei, A0277381W

/**
* AI Usage Declaration
*
* Tool Used: Gemini 3.1 Pro
*
* Prompt: How do I test the user model on MongoDB? Recommend some unit tests that I may start off with
*
* How the AI Output Was Used:
* - Used some of the AI output as reference to test the user model on MongoDB
*/

describe("Tests for User Model", () => {
  let mongoDb;

  beforeAll(async () => {

    // Set up MongoDB in-memory server
    mongoDb = await MongoMemoryServer.create();
    const uri = mongoDb.getUri();
    await mongoose.connect(uri);
    await User.init();

  });

  afterAll(async () => {

    await mongoose.disconnect();
    await mongoDb.stop();

  });

  beforeEach(async () => {

    // Clear any existing users before each test
    await User.deleteMany({});

  });

  describe("Successfully create user object", () => {
    test("Successfully creates user with all valid field values", async () => {

      // Arrange
      const userObject = new User({
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
        phone: "12345678",
        address: "123 Main St",
        answer: "My Answer",
        role: 1,
      });

      // Act
      const user = await userObject.save();

      // Assert
      expect(user._id).toBeDefined();
      expect(user.name).toBe("John Doe");
      expect(user.email).toBe("john@example.com");
      expect(user.password).toBe("password123");
      expect(user.phone).toBe("12345678");
      expect(user.address).toBe("123 Main St");
      expect(user.answer).toBe("My Answer");
      expect(user.role).toBe(1);

    });
  });

  describe("Test missing fields behaviour", () => {
    test("Should throw an error if name is undefined", async () => {

      // Arrange
      const userObject = new User({
        email: "john@example.com",
        password: "password123",
        phone: "12345678",
        address: "123 Main St",
        answer: "My Answer",
      });

      // Act
      let error;
      try {
        await userObject.save();
      } catch (err) {
        error = err;
      }

      // Assert
      expect(error).toBeDefined();

    });

    test("Should throw an error if email is undefined", async () => {

      // Arrange
      const userObject = new User({
        name: "John Doe",
        password: "password123",
        phone: "12345678",
        address: "123 Main St",
        answer: "My Answer",
      });

      // Act
      let error;
      try {
        await userObject.save();
      } catch (err) {
        error = err;
      }

      // Assert
      expect(error).toBeDefined();

    });

    test("Should throw an error if password is not defined", async () => {

      // Arrange
      const userObject = new User({
        name: "John Doe",
        email: "john@example.com",
        phone: "12345678",
        address: "123 Main St",
        answer: "My Answer",
      });

      // Act
      let error;
      try {
        await userObject.save();
      } catch (err) {
        error = err;
      }

      // Assert
      expect(error).toBeDefined();

    });

    test("Should throw an error if phone is not defined", async () => {

      // Arrange
      const userObject = new User({
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
        address: "123 Main St",
        answer: "My Answer",
      });

      // Act
      let error;
      try {
        await userObject.save();
      } catch (err) {
        error = err;
      }

      // Assert
      expect(error).toBeDefined();

    });

    test("Should throw an error if address is not defined", async () => {

      // Arrange
      const userObject = new User({
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
        phone: "12345678",
        answer: "My Answer",
      });

      // Act
      let error;
      try {
        await userObject.save();
      } catch (err) {
        error = err;
      }

      // Assert
      expect(error).toBeDefined();

    });

    test("Should throw an error if answer is not defined", async () => {

      // Arrange
      const userObject = new User({
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
        phone: "12345678",
        address: "123 Main St",
      });

      // Act
      let error;
      try {
        await userObject.save();
      } catch (err) {
        error = err;
      }

      // Assert
      expect(error).toBeDefined();

    });
  });

  describe("Test unique constraints", () => {

    test("Should throw an error if email is not unique", async () => {

      // Arrange
      const userObject1 = new User({
        name: "John Doe",
        email: "unique@example.com",
        password: "password123",
        phone: "12345678",
        address: "123 Main St",
        answer: "My Answer",
      });
      await userObject1.save();

      const userObject2 = new User({
        name: "Jane Doe",
        email: "unique@example.com",
        password: "password456",
        phone: "87654321",
        address: "456 Other St",
        answer: "Another Answer",
      });

      // Act
      let error;
      try {
        await userObject2.save();
      } catch (err) {
        error = err;
      }

      // Assert
      expect(error).toBeDefined();

    });
  });
});
