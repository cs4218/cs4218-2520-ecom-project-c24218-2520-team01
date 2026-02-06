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

describe("Unit test for Profile component", () => {
    // Arrange
    const setAuthMock = jest.fn();

    const authData = {
        user: {
            name: "Tomm",
            email: "tomm@example.com",
            phone: "98345678",
            address: "National Road",
        },
    };

    beforeEach(() => {
        // Mock authenticated user context
        useAuth.mockReturnValue([authData, setAuthMock]);

        // Seed localStorage to match real app behaviour
        localStorage.setItem(
            "auth",
            JSON.stringify({
                user: authData.user,
                token: "fake-token",
            })
        );

        jest.clearAllMocks();
    });


    test("Profile component shows existing user data from context", () => {
        // Act
        const { getByPlaceholderText } = render(<Profile />);

        // Assert
        expect(getByPlaceholderText("Enter Your Name").value).toBe("Tomm");
        expect(getByPlaceholderText("Enter your email").value).toBe("tomm@example.com");
        expect(getByPlaceholderText("Enter Your Phone").value).toBe("98345678");
        expect(getByPlaceholderText("Enter Your Address").value).toBe("National Road");
    });


    test("Input changes by the user update local component state", () => {
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


    test("Submitting the form calls the correct profile update API", async () => {
        // Arrange
        axios.put.mockResolvedValue({
        data: {
            updatedUser: {
                name: "Tomm Doe",
                email: "tomm@example.com",
                phone: "98345991",
                address: "Balin Lane",
            },
        },
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
            expect(axios.put).toHaveBeenCalledWith("/api/v1/auth/profile", {
                name: "Tomm Doe",
                email: "tomm@example.com",
                password: "",
                phone: "98345991",
                address: "Balin Lane",
            });
        });
    });

    test("Successful profile update updates auth context and localStorage", async () => {
        // Arrange
        const updatedUser = {
            name: "Tomm Doe",
            email: "tomm@example.com",
            phone: "98345991",
            address: "Balin Lane",
        };

        axios.put.mockResolvedValue({
            data: {
                updatedUser,
            },
        });

        const { getByText } = render(<Profile />);

        // Act
        fireEvent.click(getByText("UPDATE"));

        // Assert
        await waitFor(() => {
        expect(setAuthMock).toHaveBeenCalledWith({
            ...authData,
            user: updatedUser,
        });

        const storedAuth = JSON.parse(localStorage.getItem("auth"));
        expect(storedAuth.user).toEqual(updatedUser);

        expect(toast.success).toHaveBeenCalledWith(
            "Profile Updated Successfully"
        );
        });
    });

    test("API failure shows error toast message", async () => {
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
