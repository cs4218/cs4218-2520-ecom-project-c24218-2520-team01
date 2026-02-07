import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import toast from "react-hot-toast";
import axios from "axios";
import { useAuth } from "../../context/auth";
import Profile from "./Profile";

// Add a mock for axios
jest.mock("axios");

// Add a stub for useAuth
jest.mock("../../context/auth", () => ({
    useAuth: jest.fn(),
}));

// Add a mock for React toast
jest.mock("react-hot-toast", () => ({
    success: jest.fn(),
    error: jest.fn(),
}));

// Use a Fake for Layout
jest.mock("../../components/Layout", () => ({ children }) => (
    <div>{children}</div>
));

// Use a Fake for UserMenu
jest.mock("../../components/UserMenu", () => () => (
    <div>User Menu</div>
));

const mockUserData = {
    user: {
        name: "Tomm",
        email: "tomm@example.com",
        phone: "98345678",
        address: "National Road",
    }
};

const updatedUserData = {
    name: "Tomm Doe",
    email: "tomm@example.com",
    phone: "98345991",
    address: "Balin Lane",
};

describe("Unit test for Profile component", () => {
    // Arrange
    const setAuthMock = jest.fn();

    beforeEach(() => {
        // Mock authenticated context and localStorage
        jest.clearAllMocks();
        useAuth.mockReturnValue([mockUserData, setAuthMock]);
        localStorage.setItem(
            "auth",
            JSON.stringify({
            user: mockUserData.user,
            token: "example-token",
            })
        );
    });


    test("Profile component shows existing user data", () => {
        // Act
        const { getByPlaceholderText } = render(<Profile />);

        // Assert
        expect(getByPlaceholderText("Enter Your Name").value).toBe("Tomm");
        expect(getByPlaceholderText("Enter Your Phone").value).toBe("98345678");
        expect(getByPlaceholderText("Enter Your Address").value).toBe("National Road");
    });


    test("Input changes by the user update local states", () => {
        // Arrange
        const { getByPlaceholderText } = render(<Profile />);

        const nameInput = getByPlaceholderText("Enter Your Name");
        const phoneInput = getByPlaceholderText("Enter Your Phone");
        const addressInput = getByPlaceholderText("Enter Your Address");

        // Act
        fireEvent.change(nameInput, { target: { value: "Tomm Doe" } });
        fireEvent.change(phoneInput, { target: { value: "98345991" } });
        fireEvent.change(addressInput, { target: { value: "Balin Lane" } });

        // Assert
        expect(nameInput.value).toBe("Tomm Doe");
        expect(phoneInput.value).toBe("98345991");
        expect(addressInput.value).toBe("Balin Lane");
    });


    test("Submitting the form calls the update Profile API", async () => {
        // Arrange
        axios.put.mockResolvedValue({ 
            data: { updatedUser: updatedUserData } 
        });

        const { getByText, getByPlaceholderText } = render(<Profile />);

        // Act
        fireEvent.change(getByPlaceholderText("Enter Your Name"), {
            target: { value: "Tomm Doe" },
        });

        fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
            target: { value: "98345991" },
        });

        fireEvent.change(getByPlaceholderText("Enter Your Address"), {
            target: { value: "Balin Lane" },
        });

        fireEvent.click(getByText("UPDATE"));

        // Assert
        await waitFor(() => {
            expect(axios.put).toHaveBeenCalledWith(
                "/api/v1/auth/profile", 
                expect.objectContaining({
                    name: "Tomm Doe",
                    phone: "98345991",
                    address: "Balin Lane",
                    password: "",
                })
            );
        });
    });


    test("Successful profile update updates auth context and localStorage", async () => {
        // Arrange
        axios.put.mockResolvedValue({
            data: { updatedUser: updatedUserData },
        });

        const { getByText } = render(<Profile />);

        // Act
        fireEvent.click(getByText("UPDATE"));

        // Assert
        await waitFor(() => {
            expect(setAuthMock).toHaveBeenCalledWith({
                ...mockUserData,
                user: updatedUserData,
            });

            const storedAuth = JSON.parse(localStorage.getItem("auth"));
            expect(storedAuth.user).toEqual(updatedUserData);

            expect(toast.success).toHaveBeenCalledWith(
                "Profile Updated Successfully"
            );
        });
    });

    test("Toast shows message for handleSubmit error", async () => {
        // Arrange
        axios.put.mockResolvedValue({
            data: { error: "Invalid phone number" },
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
        axios.put.mockRejectedValue(new Error("Network Error"));

        const { getByText } = render(<Profile />);

        // Act
        fireEvent.click(getByText("UPDATE"));

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Something went wrong");
        });
    });
});
