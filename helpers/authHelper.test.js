import bcrypt from "bcrypt";
import { hashPassword, comparePassword } from "./authHelper.js";

// Mock bcrypt
jest.mock("bcrypt");

describe("Authentication Helpers", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("hashPassword", () => {
		describe("Success", () => {
			it("should hash password successfully", async () => {
				// Arrange
				const password = "P@ssword123";
				const hashedPassword = "hashedPassworld";
				bcrypt.hash.mockResolvedValue(hashedPassword);

				// Act
				const result = await hashPassword(password);

				// Assert
				expect(result).toBe(hashedPassword);
				expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
			});

			it("should handle empty string password", async () => {
				// Arrange
				const password = "";
				const hashedPassword = "hashedEmptyPassword";
				bcrypt.hash.mockResolvedValue(hashedPassword);

				// Act
				const result = await hashPassword(password);

				// Assert
				expect(result).toBe(hashedPassword);
				expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
			});

			it("should handle very long password", async () => {
				// Arrange
				const password = "a".repeat(676767);
				const hashedPassword = "hashedLongPassword";
				bcrypt.hash.mockResolvedValue(hashedPassword);

				// Act
				const result = await hashPassword(password);

				// Assert
				expect(result).toBe(hashedPassword);
				expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
			});

			it("should handle special characters and unicode", async () => {
				// Arrange
				const password = "P@$$wörd!黄循🎉\n\t";
				const hashedPassword = "hashedSpecialPassword";
				bcrypt.hash.mockResolvedValue(hashedPassword);

				// Act
				const result = await hashPassword(password);

				// Assert
				expect(result).toBe(hashedPassword);
				expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
			});

		});

		describe("Error", () => {
			describe("Input Errors", () => {
				it("should handle null password", async () => {
					// Arrange
					const password = null;
					const error = new Error("Password cannot be null");
					bcrypt.hash.mockRejectedValue(error);
					const consoleSpy = jest.spyOn(console, "log").mockImplementation();

					// Act
					const result = await hashPassword(password);

					// Assert
					expect(result).toBeUndefined();
					expect(consoleSpy).toHaveBeenCalledWith(error);

					// Cleanup
					consoleSpy.mockRestore();
				});

				it("should handle undefined password", async () => {
					// Arrange
					const password = undefined;
					const error = new Error("Password cannot be undefined");
					bcrypt.hash.mockRejectedValue(error);
					const consoleSpy = jest.spyOn(console, "log").mockImplementation();

					// Act
					const result = await hashPassword(password);

					// Assert
					expect(result).toBeUndefined();
					expect(consoleSpy).toHaveBeenCalledWith(error);

					// Cleanup
					consoleSpy.mockRestore();
				});
			});

			it("should handle errors during hashing", async () => {
				// Arrange
				const password = "P@ssword123";
				const error = new Error("Hashing failed");
				bcrypt.hash.mockRejectedValue(error);
				const consoleSpy = jest.spyOn(console, "log").mockImplementation();

				// Act
				const result = await hashPassword(password);

				// Assert
				expect(result).toBeUndefined();
				expect(consoleSpy).toHaveBeenCalledWith(error);

				// Cleanup
				consoleSpy.mockRestore();
			});
		});
	});

	describe("comparePassword", () => {
		describe("Success", () => {
			it("should return true for matching passwords", async () => {
				// Arrange
				const password = "P@ssword123";
				const hashedPassword = "hashedPassworld";
				bcrypt.compare.mockResolvedValue(true);

				// Act
				const result = await comparePassword(password, hashedPassword);

				// Assert
				expect(result).toBe(true);
				expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
			});

			it("should return false for non-matching passwords", async () => {
				// Arrange
				const password = "P@ssword123";
				const hashedPassword = "hashedPassworld";
				bcrypt.compare.mockResolvedValue(false);

				// Act
				const result = await comparePassword(password, hashedPassword);

				// Assert
				expect(result).toBe(false);
				expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
			});

			it("should handle empty string password", async () => {
				// Arrange
				const password = "";
				const hashedPassword = "hashedPassworld";
				bcrypt.compare.mockResolvedValue(false);

				// Act
				const result = await comparePassword(password, hashedPassword);

				// Assert
				expect(result).toBe(false);
				expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
			});

			it("should handle very long password comparison", async () => {
				// Arrange
				const password = "a".repeat(6767);
				const hashedPassword = "hashedLongPassword";
				bcrypt.compare.mockResolvedValue(true);

				// Act
				const result = await comparePassword(password, hashedPassword);

				// Assert
				expect(result).toBe(true);
				expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
			});
		});

		describe("Error", () => {
			describe("Input Errors", () => {
				it("should handle null password", async () => {
					// Arrange
					const password = null;
					const hashedPassword = "hashedPassworld";
					const error = new Error("Password cannot be null");
					bcrypt.compare.mockRejectedValue(error);

					// Act & Assert
					await expect(
						comparePassword(password, hashedPassword),
					).rejects.toThrow("Password cannot be null");
					expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
				});

				it("should handle undefined password", async () => {
					// Arrange
					const password = undefined;
					const hashedPassword = "hashedPassworld";
					const error = new Error("Password cannot be undefined");
					bcrypt.compare.mockRejectedValue(error);

					// Act & Assert
					await expect(
						comparePassword(password, hashedPassword),
					).rejects.toThrow("Password cannot be undefined");
					expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
				});

				it("should handle null hashedPassword", async () => {
					// Arrange
					const password = "P@ssword123";
					const hashedPassword = null;
					const error = new Error("Hashed password cannot be null");
					bcrypt.compare.mockRejectedValue(error);

					// Act & Assert
					await expect(
						comparePassword(password, hashedPassword),
					).rejects.toThrow("Hashed password cannot be null");
					expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
				});

				it("should handle undefined hashedPassword", async () => {
					// Arrange
					const password = "P@ssword123";
					const hashedPassword = undefined;
					const error = new Error("Hashed password cannot be undefined");
					bcrypt.compare.mockRejectedValue(error);

					// Act & Assert
					await expect(
						comparePassword(password, hashedPassword),
					).rejects.toThrow("Hashed password cannot be undefined");
					expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
				});
			});

			it("should handle errors during comparison", async () => {
				// Arrange
				const password = "P@ssword123";
				const hashedPassword = "hashedPassworld";
				const error = new Error("Comparison failed");
				bcrypt.compare.mockRejectedValue(error);

				// Act
				const resultPromise = comparePassword(password, hashedPassword);

				// Assert
				await expect(resultPromise).rejects.toThrow("Comparison failed");
				expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
			});
		});
	});
});
