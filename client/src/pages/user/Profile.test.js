import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import toast from "react-hot-toast";
import axios from "axios";
import { useAuth } from "../../context/auth";
import { MOCK_USER, UPDATED_PROFILE_INPUT } from "../../../../test/fixtures/mockUser";
import Profile from "./Profile";

// Rachel Tai Ke Jia, A0258603A

// Add a mock for axios
jest.mock("axios");

// Add a stub for useAuth
jest.mock("../../context/auth", () => ({
    useAuth: jest.fn()
}));

// Add a mock for React toast
jest.mock("react-hot-toast", () => ({
    success: jest.fn(),
    error: jest.fn()
}));

// Use a Fake for Layout
jest.mock("../../components/Layout", () => ({ children }) => (
    <div>{children}</div>
));

// Use a Fake for UserMenu
jest.mock("../../components/UserMenu", () => () => (
    <div>User Menu</div>
));

const MOCK_AUTH = {
    user: {
        name: MOCK_USER.name,
        email: MOCK_USER.email,
        phone: MOCK_USER.phone,
        address: MOCK_USER.address
    }
};

describe("Unit test for Profile component", () => {
    // Arrange
    const setAuthMock = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock authenticated context and localStorage
        useAuth.mockReturnValue([MOCK_AUTH, setAuthMock]);
        localStorage.setItem(
            "auth",
            JSON.stringify({
                user: MOCK_AUTH.user,
                token: "example-token"
            })
        );
    });


    test("Profile component shows existing user data", () => {
        // Act
        const { getByPlaceholderText } = render(<Profile />);

        // Assert
        expect(getByPlaceholderText("Enter Your Name").value).toBe(MOCK_USER.name);
        expect(getByPlaceholderText("Enter Your Phone").value).toBe(MOCK_USER.phone);
        expect(getByPlaceholderText("Enter Your Address").value).toBe(MOCK_USER.address);
    });


    test("Input changes update local state", () => {
        // Arrange
        const { getByPlaceholderText } = render(<Profile />);
        const nameInput = getByPlaceholderText("Enter Your Name");
        const passwordInput = getByPlaceholderText("Enter Your Password");
        const phoneInput = getByPlaceholderText("Enter Your Phone");
        const addressInput = getByPlaceholderText("Enter Your Address");

        // Act
        fireEvent.change(nameInput, { target: { value: UPDATED_PROFILE_INPUT.name } });
        fireEvent.change(passwordInput, { target: { value: UPDATED_PROFILE_INPUT.password } });
        fireEvent.change(phoneInput, { target: { value: UPDATED_PROFILE_INPUT.phone } });
        fireEvent.change(addressInput, { target: { value: UPDATED_PROFILE_INPUT.address } });

        // Assert
        expect(nameInput.value).toBe(UPDATED_PROFILE_INPUT.name);
        expect(passwordInput.value).toBe(UPDATED_PROFILE_INPUT.password);
        expect(phoneInput.value).toBe(UPDATED_PROFILE_INPUT.phone);
        expect(addressInput.value).toBe(UPDATED_PROFILE_INPUT.address);
    });


    test("Submitting the form calls the update Profile API", async () => {
        // Arrange
        // Mock axios API call
        axios.put.mockResolvedValue({ 
            data: { updatedUser: UPDATED_PROFILE_INPUT } 
        });
        const { getByText, getByPlaceholderText } = render(<Profile />);

        // Act
        fireEvent.change(getByPlaceholderText("Enter Your Name"), {
            target: { value: UPDATED_PROFILE_INPUT.name }
        });
        fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
            target: { value: UPDATED_PROFILE_INPUT.phone }
        });
        fireEvent.change(getByPlaceholderText("Enter Your Address"), {
            target: { value: UPDATED_PROFILE_INPUT.address }
        });
        fireEvent.click(getByText("UPDATE"));

        // Assert
        await waitFor(() => {
            expect(axios.put).toHaveBeenCalledWith(
                "/api/v1/auth/profile", 
                expect.objectContaining({
                    name: UPDATED_PROFILE_INPUT.name,
                    phone: UPDATED_PROFILE_INPUT.phone,
                    address: UPDATED_PROFILE_INPUT.address,
                    password: ""
                })
            );
        });
    });


    test("Successful profile updates across auth context and localStorage", async () => {
        // Arrange
        axios.put.mockResolvedValue({
            data: { updatedUser: UPDATED_PROFILE_INPUT }
        });
        const { getByText } = render(<Profile />);

        // Act
        fireEvent.click(getByText("UPDATE"));

        // Assert
        await waitFor(() => {
            expect(setAuthMock).toHaveBeenCalledWith({
                ...MOCK_AUTH,
                user: UPDATED_PROFILE_INPUT
            });
            const storedAuth = JSON.parse(localStorage.getItem("auth"));
            expect(storedAuth.user).toEqual(UPDATED_PROFILE_INPUT);
            expect(toast.success).toHaveBeenCalledWith(
                "Profile Updated Successfully"
            );
        });
    });

    test("Toast shows message for handleSubmit error", async () => {
        // Arrange
        axios.put.mockResolvedValue({
            data: { error: "Invalid phone number" }
        });
        const { getByText } = render(<Profile />);

        // Act 
        fireEvent.click(getByText("UPDATE"));

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Invalid phone number");
        });
    });

    test("Toast shows error message for API error", async () => {
        // Arrange
        jest.spyOn(console, "log").mockImplementation(() => {});
        axios.put.mockRejectedValue(new Error("Network Error"));
        const { getByText } = render(<Profile />);

        // Act
        fireEvent.click(getByText("UPDATE"));

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Something went wrong");
        });
        console.log.mockRestore();
    });

    test("Edge case when user is null in auth context", () => {
        // Arrange 
        // Mock useAuth to return null user
        useAuth.mockReturnValue([{ user: null }, jest.fn()]);

        // Act
        const { getByPlaceholderText } = render(<Profile />);

        // Assert
        expect(getByPlaceholderText("Enter Your Name").value).toBe("");
        expect(getByPlaceholderText("Enter Your Phone").value).toBe("");
        expect(getByPlaceholderText("Enter Your Address").value).toBe("");
    });

});
