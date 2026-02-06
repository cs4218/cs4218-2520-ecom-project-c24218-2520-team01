import React from "react";
import { render, waitFor } from "@testing-library/react";
import axios from "axios";
import Orders from "./Orders";
import { useAuth } from "../../context/auth";

// Add a mock for axios 
jest.mock("axios");

// Use a Stub for moment dependency
jest.mock("moment", () => () => ({
  fromNow: () => "2 days ago",
}));

// Add a stub for useAuth
jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(),
}));

// Use a Fake for Layout
jest.mock("../../components/Layout", () => ({ children }) => (
  <div>{children}</div>
));

// Use a Fake for UserMenu
jest.mock("../../components/UserMenu", () => () => (
  <div>User Menu</div>
));

describe("Unit test for Orders component", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("Orders component calls orders API", async () => {
    // Arrange
    useAuth.mockReturnValue([{ token: "valid-token" }, jest.fn()]);
    axios.get.mockResolvedValue({ data: [] });

    // Act
    render(<Orders />);

    // Assert
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders");
    });
  });


  test("Orders component shows order data fetched", async () => {
    // Arrange
    const ordersData = [
      {
        status: "Processing",
        buyer: { name: "Adam" },
        createAt: "2025-05-07",
        payment: { success: true },
        products: [
            { _id: "1", name: "Watch", description: "Casio", price: "100" }, 
            { _id: "2", name: "Shirt", description: "Uniqlo", price: "30" }
        ],
      },
    ];

    useAuth.mockReturnValue([{ token: "token" }, jest.fn()]);
    axios.get.mockResolvedValue({ data: ordersData });

    // Act
    const { container } = render(<Orders />);

    // Assert
    await waitFor(() => {
      const text = container.textContent;
      expect(text).toContain("Processing"); // status
      expect(text).toContain("Adam"); // buyer name 
      expect(text).toContain("Success"); // payment success
      expect(text).toContain("2"); // products length
    });
  });


  test("Orders component shows info for each order", async () => {
    // Arrange
    const ordersData = [
      {
        status: "Delivered",
        buyer: { name: "John" },
        createAt: "2026-12-11",
        payment: { success: true },
        products: [
          {
            _id: "5627",
            name: "Notebook",
            description: "Black, Typo",
            price: 8,
          },
        ],
      },
    ];

    useAuth.mockReturnValue([{ token: "token" }, jest.fn()]);
    axios.get.mockResolvedValue({ data: ordersData });

    // Act
    const { container } = render(<Orders />);

    // Assert
    await waitFor(() => {
      const text = container.textContent;
      expect(text).toContain("Notebook");  // name
      expect(text).toContain("Black, Typo");  // description 
      expect(text).toContain("Price : 8");  // price
    });
  });


  test("Orders component does not call backend without authentication token", async () => {
    // Arrange
    useAuth.mockReturnValue([null, jest.fn()]);

    // Act
    render(<Orders />);

    // Assert
    expect(axios.get).not.toHaveBeenCalled();
  });

});
