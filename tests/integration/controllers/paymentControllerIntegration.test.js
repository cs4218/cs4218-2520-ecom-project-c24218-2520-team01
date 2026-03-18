import { beforeAll, afterAll, beforeEach, describe, test, expect, jest } from "@jest/globals";
import { braintreeTokenController } from "../../../controllers/paymentController.js";

// Written by Nicholas Cheng, A0269648H

// Mock console.log to prevent it from printing to the terminal
jest.spyOn(console, "log").mockImplementation(() => { });

describe("Braintree token controller integration tests with BrainTree", () => {
    describe("Generate braintree token", () => {
        test("Successfully generate a braintree token from the Braintree API", async () => {
            let req, res;

            req = {};

            const response = await new Promise((resolve, reject) => {
                res = {
                    status: jest.fn().mockReturnThis(),
                    send: jest.fn((data) => {
                        resolve({
                            statusCode: res.status.mock.calls[0][0], // To get the status code from the mocked function of status
                            data: data
                        });
                    }),
                };

                try {
                    braintreeTokenController(req, res);
                } catch (error) {
                    reject(error);
                }
            });

            // Assertions
            expect(response.statusCode).toBe(200);
            expect(response.data.data).toBeDefined();

            // The braintree response should contain a clientToken
            expect(response.data.data.clientToken).toBeDefined();
            expect(response.data.data.clientToken.length).toBeGreaterThan(0);
        }, 15000); // 15 seconds timeout for external API call
    });
});
