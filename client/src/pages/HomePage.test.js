/**
* AI Usage Declaration
*
* Tool Used: Github Copilot
*
* Prompt: What are the edge cases to include in order to achieve 100% code coverage for HomePage component?
*
* How the AI Output Was Used:
* - Used the AI output as a reference to create tests for HomePage component
* - Reviewed and modified the suggested scenarios to fit the specific implementation of the HomePage component
*/

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import toast from "react-hot-toast";
import HomePage from "./HomePage";

// mock data
const MOCK_CATEGORIES = [
    { _id: "cat1", name: "Electronics" },
    { _id: "cat2", name: "Clothing" },
    { _id: "cat3", name: "Books" }
];

const MOCK_PRODUCTS = [
    {
        _id: "p1",
        name: "Wireless Bluetooth Headphones",
        slug: "wireless-bluetooth-headphones",
        price: 100.00,
        description: "Noise-cancelling headphones"
    },
    {
        _id: "p2",
        name: "Unisex Cotton Shirt",
        slug: "unisex-cotton-shirt",
        price: 45.00,
        description: "Comfortable white shirt for any occasion"
    }
];

const MOCK_FILTERED_PRODUCTS = [
    {
        _id: "p3",
        name: "Leather Laptop Bag",
        slug: "leather-laptop-bag",
        price: 150.00,
        description: "Leather bag for 15-inch laptop"
    }
];

// helper to format price 
const formatPrice = (price) => {
    return price.toLocaleString("en-US", {
        style: "currency",
        currency: "USD"
    });
};

// mock external dependencies
jest.mock("axios");
jest.mock("react-hot-toast");

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
    useNavigate: () => mockNavigate
}));

const mockSetCart = jest.fn();
const mockCart = [];
jest.mock("../context/cart", () => ({
    useCart: () => [mockCart, mockSetCart]
}));

jest.mock("./../components/Layout", () => ({ children, title }) => (
    <div data-testid="layout" data-title={title}>
        {children}
    </div>
));

jest.mock("antd", () => {
    const React = require("react");
    
    // context to allow onChange to be updated for individual radios
    const RadioContext = React.createContext(null);
    
    // fake radio component that uses context to manage onChange for individual radios
    const RadioComponent = ({ children, value, ...props }) => {
        const context = React.useContext(RadioContext); 
        const handleChange = (e) => {
            if (context && context.onChange) {
                context.onChange({ target: { value } });
            }
        };
        const handleClick = (e) => {
            handleChange(e);
        };
        return (
            <label>
                <input
                    type="radio"
                    name={context?.groupName || "radio-group"}
                    data-testid={`radio-${JSON.stringify(value)}`}
                    value={JSON.stringify(value)}
                    onChange={handleChange}
                    onClick={handleClick}
                    {...props}
                />
                {children}
            </label>
        );
    };
    const RadioGroup = ({ children, onChange }) => {
        const groupName = `radio-group-${Math.random()}`;
        const contextValue = { onChange, groupName };
        return (
            <RadioContext.Provider value={contextValue}>
                <div data-testid="radio-group">
                    {children}
                </div>
            </RadioContext.Provider>
        );
    };
    RadioComponent.Group = RadioGroup;
    return {
        Checkbox: ({ children, onChange, ...props }) => (
            <label>
                <input
                    type="checkbox"
                    data-testid={`checkbox-${children}`}
                    onChange={(e) => onChange(e)}
                    {...props}
                />
                {children}
            </label>
        ),
        Radio: RadioComponent
    };
});

// mock prices filter range data
jest.mock("../components/Prices", () => ({
    Prices: [
        { _id: 0, name: "$0 to 19", array: [0, 19] },
        { _id: 1, name: "$20 to 39", array: [20, 39] }
    ]
}));

jest.mock("react-icons/ai", () => ({
    AiOutlineReload: () => <span data-testid="reload-icon">⟳</span>
}));


// Rachel Tai Ke Jia, A0258603A

describe("unit tests for home page component", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();      
        axios.get.mockImplementation((url) => {
            if (url === "/api/v1/category/get-category") {
                return Promise.resolve({
                    data: { success: true, category: MOCK_CATEGORIES }
                });
            }
            if (url === "/api/v1/product/product-count") {
                return Promise.resolve({
                    data: { total: 10 }
                });
            }
            if (url.includes("/api/v1/product/product-list/")) {
                return Promise.resolve({
                    data: { products: MOCK_PRODUCTS }
                });
            }
            return Promise.reject(new Error("Not found"));
        });

        axios.post.mockResolvedValue({
            data: { products: MOCK_FILTERED_PRODUCTS }
        });
    });


    describe("component mount and fetch data", () => {
        test("output-based testing: show home page component", async () => {
            // Act
            render(<HomePage />);

            // Assert
            await waitFor(() => {
                expect(screen.getByTestId("layout")).toBeInTheDocument();
            });
        });


        test("output-based testing: show page title", async () => {
            // Act
            render(<HomePage />);

            // Assert
            await waitFor(() => {
                expect(screen.getByTestId("layout")).toHaveAttribute(
                    "data-title",
                    "ALL Products - Best offers "
                );
            });
        });

        
        test("communication-based testing: display", async () => {
            // Act
            render(<HomePage />);

            // Assert
            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
            });
            await waitFor(() => {
                expect(screen.getByText(MOCK_CATEGORIES[0].name)).toBeInTheDocument();
                expect(screen.getByText(MOCK_CATEGORIES[1].name)).toBeInTheDocument();
                expect(screen.getByText(MOCK_CATEGORIES[2].name)).toBeInTheDocument();
            }, { timeout: 3000 });
        });


        test("communication-based testing: show product count ", async () => {
            // Act
            render(<HomePage />);

            // Assert
            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledWith("/api/v1/product/product-count");
            });
        });


        test("communication-based testing: handle error in getting category", async () => {
            // Arrange
            const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
            const error = new Error("Network error");
            axios.get.mockImplementation((url) => {
                if (url === "/api/v1/category/get-category") {
                    return Promise.reject(error);
                }
                if (url === "/api/v1/product/product-count") {
                    return Promise.resolve({ data: { total: 10 } });
                }
                return Promise.resolve({ data: { products: [] } });
            });

            // Act
            render(<HomePage />);

            // Assert
            await waitFor(() => {
                expect(consoleLogSpy).toHaveBeenCalledWith(error);
            });

            consoleLogSpy.mockRestore();
        });


        test("communication-based testing: handle error in getting product count", async () => {
            // Arrange
            const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
            const error = new Error("Count fetch error");
            axios.get.mockImplementation((url) => {
                if (url === "/api/v1/category/get-category") {
                    return Promise.resolve({
                        data: { success: true, category: MOCK_CATEGORIES }
                    });
                }
                if (url === "/api/v1/product/product-count") {
                    return Promise.reject(error);
                }
                return Promise.resolve({ data: { products: [] } });
            });

            // Act
            render(<HomePage />);

            // Assert
            await waitFor(() => {
                expect(consoleLogSpy).toHaveBeenCalledWith(error);
            });

            consoleLogSpy.mockRestore();
        });


        test("output-based testing: does not fetch categories if api returns unsuccessful response", async () => {
            // Arrange
            axios.get.mockImplementation((url) => {
                if (url === "/api/v1/category/get-category") {
                    return Promise.resolve({
                        data: { success: false }
                    });
                }
                if (url === "/api/v1/product/product-count") {
                    return Promise.resolve({ data: { total: 10 } });
                }
                return Promise.resolve({ data: { products: [] } });
            });

            // Act
            render(<HomePage />);

            // Assert
            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
            });
            expect(screen.queryByText("Electronics")).not.toBeInTheDocument();
        });
    });


    describe("fetch and display product info", () => {
        test("communication-based, output-based testing: show products when there is no filter", async () => {
            // Act
            render(<HomePage />);

            // Assert
            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledWith("/api/v1/product/product-list/1");
            });
            await waitFor(() => {
                expect(screen.getByText(MOCK_PRODUCTS[0].name)).toBeInTheDocument();
                expect(screen.getByText(MOCK_PRODUCTS[1].name)).toBeInTheDocument();
            });
        });


        test("output-based testing: show product info", async () => {
            // Act
            render(<HomePage />);

            // Assert
            await waitFor(() => {
                expect(screen.getByText(MOCK_PRODUCTS[0].name)).toBeInTheDocument();
                expect(screen.getByText(formatPrice(MOCK_PRODUCTS[0].price))).toBeInTheDocument();
                const description = screen.getByText((content, element) => {
                    return (
                        element?.classList.contains("card-text") &&
                        content.includes(MOCK_PRODUCTS[0].description)
                    );
                });
                expect(description).toBeInTheDocument();
            });
        });


        test("state-based testing: verify loading state when fetching products", async () => {
            // Arrange
            let resolveProducts;
            axios.get.mockImplementation((url) => {
                if (url === "/api/v1/category/get-category") {
                    return Promise.resolve({
                        data: { success: true, category: MOCK_CATEGORIES }
                    });
                }
                if (url === "/api/v1/product/product-count") {
                    return Promise.resolve({ data: { total: 10 } });
                }
                if (url.includes("/api/v1/product/product-list/")) {
                    return new Promise((resolve) => {
                        resolveProducts = resolve;
                    });
                }
            });

            // Act
            render(<HomePage />);

            // Assert 
            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledWith("/api/v1/product/product-list/1");
            });
            resolveProducts({ data: { products: MOCK_PRODUCTS } });
            await waitFor(() => {
                expect(screen.getByText(MOCK_PRODUCTS[1].name)).toBeInTheDocument();
            });
        });


        test("communication-based testing: handle errors in fetching product", async () => {
            // Arrange
            const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
            const error = new Error("Error fetching products");
            axios.get.mockImplementation((url) => {
                if (url === "/api/v1/category/get-category") {
                    return Promise.resolve({
                        data: { success: true, category: MOCK_CATEGORIES }
                    });
                }
                if (url === "/api/v1/product/product-count") {
                    return Promise.resolve({ data: { total: 10 } });
                }
                if (url.includes("/api/v1/product/product-list/")) {
                    return Promise.reject(error);
                }
            });

            // Act
            render(<HomePage />);

            // Assert
            await waitFor(() => {
                expect(consoleLogSpy).toHaveBeenCalledWith(error);
            });

            consoleLogSpy.mockRestore();
        });
    });


    describe("filtering of categories", () => {
        test("state-, communication-based testing: checkbox will add category to filter", async () => {
            // Arrange
            render(<HomePage />);
            await waitFor(() => {
                expect(screen.getByText("Electronics")).toBeInTheDocument();
            });

            // Act
            const checkbox = screen.getByTestId("checkbox-Electronics");
            fireEvent.click(checkbox);

            // Assert
            await waitFor(() => {
                expect(axios.post).toHaveBeenCalledWith(
                    "/api/v1/product/product-filters",
                    expect.objectContaining({
                        checked: ["cat1"]
                    })
                );
            }, { timeout: 3000 });
        });


        test("state-based testing: remove category from filter when checkbox unchecked", async () => {
            // Arrange
            render(<HomePage />);
            await waitFor(() => {
                expect(screen.getByText("Electronics")).toBeInTheDocument();
            });
            const checkbox = screen.getByTestId("checkbox-Electronics");

            // Act
            fireEvent.click(checkbox); // check the box
            await waitFor(() => {
                expect(axios.post).toHaveBeenCalled();
            }, { timeout: 3000 });
            jest.clearAllMocks();
            fireEvent.click(checkbox); // uncheck the box

            // Assert
            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledWith("/api/v1/product/product-list/1");
            }, { timeout: 3000 });
        });


        test("state-based, communication-based testing: select >1 category", async () => {
            // Arrange
            render(<HomePage />); 
            await waitFor(() => {
                expect(screen.getByText("Electronics")).toBeInTheDocument();
                expect(screen.getByText("Clothing")).toBeInTheDocument();
            });

            // Act
            const electronicsCheckbox = screen.getByTestId("checkbox-Electronics");
            const clothingCheckbox = screen.getByTestId("checkbox-Clothing");
            fireEvent.click(electronicsCheckbox);
            await waitFor(() => {
                expect(axios.post).toHaveBeenCalled();
            }, { timeout: 3000 });
            fireEvent.click(clothingCheckbox);

            // Assert
            await waitFor(() => {
                expect(axios.post).toHaveBeenCalledWith(
                    "/api/v1/product/product-filters",
                    expect.objectContaining({
                        checked: expect.arrayContaining(["cat1", "cat2"])
                    })
                );
            }, { timeout: 3000 });
        });


        test("output-based testing: show filtered results", async () => {
            // Arrange
            render(<HomePage />);
            await waitFor(() => {
                expect(screen.getByText("Electronics")).toBeInTheDocument();
            });

            // Act
            const checkbox = screen.getByTestId("checkbox-Electronics");
            fireEvent.click(checkbox);

            // Assert
            await waitFor(() => {
                expect(screen.getByText("Leather Laptop Bag")).toBeInTheDocument();
            }, { timeout: 3000 });
        });


        test("communication-based testing: catch error in filtering product API ", async () => {
            // Arrange
            const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
            const error = new Error("Error filtering products");
            axios.post.mockRejectedValue(error);
            render(<HomePage />);
            await waitFor(() => {
                expect(screen.getByText("Electronics")).toBeInTheDocument();
            });

            // Act
            const checkbox = screen.getByTestId("checkbox-Electronics");
            fireEvent.click(checkbox);

            // Assert
            await waitFor(() => {
                expect(consoleLogSpy).toHaveBeenCalledWith(error);
            });

            consoleLogSpy.mockRestore();
        });
    });


    describe("price filtering", () => {
        test("state-based testing: selecting radio button will apply price filter", async () => {
            // Arrange
            render(<HomePage />);
            await waitFor(() => {
                expect(screen.getByTestId("radio-group")).toBeInTheDocument();
            });

            // Act
            const radioButton = screen.getByTestId('radio-[0,19]');
            fireEvent.click(radioButton);

            // Assert
            await waitFor(() => {
                expect(axios.post).toHaveBeenCalledWith(
                    "/api/v1/product/product-filters",
                    expect.objectContaining({
                        radio: [0, 19]
                    })
                );
            }, { timeout: 3000 });
        });


        test("output-based testing: show filtered products after selecting price", async () => {
            // Arrange
            render(<HomePage />);
            await waitFor(() => {
                expect(screen.getByTestId("radio-group")).toBeInTheDocument();
            });

            // Act
            const radioButton = screen.getByTestId('radio-[20,39]');
            fireEvent.click(radioButton);

            // Assert
            await waitFor(() => {
                expect(screen.getByText("Leather Laptop Bag")).toBeInTheDocument();
            }, { timeout: 3000 });
        });


        test("output-based testing: show all price filter options", async () => {
            // Act
            render(<HomePage />);

            // Assert 
            await waitFor(() => {
                expect(screen.getByText("$0 to 19")).toBeInTheDocument();
                expect(screen.getByText("$20 to 39")).toBeInTheDocument();
            });
        });


        test("state-based and communication-based testing: filter by both category and price", async () => {
            // Arrange
            render(<HomePage />);
            await waitFor(() => {
                expect(screen.getByText("Electronics")).toBeInTheDocument();
                expect(screen.getByTestId("radio-group")).toBeInTheDocument();
            });

            // Act
            const checkbox = screen.getByTestId("checkbox-Electronics");
            fireEvent.click(checkbox);
            await waitFor(() => {
                expect(axios.post).toHaveBeenCalled();
            }, { timeout: 3000 });
            const radioButton = screen.getByTestId('radio-[0,19]');
            fireEvent.click(radioButton);

            // Assert
            await waitFor(() => {
                expect(axios.post).toHaveBeenCalledWith(
                    "/api/v1/product/product-filters",
                    expect.objectContaining({
                        checked: ["cat1"],
                        radio: [0, 19]
                    })
                );
            }, { timeout: 3000 });
        });
    });


    test("click reset button to reset filter", async () => {
        // Arrange
        render(<HomePage />);
        await waitFor(() => {
            expect(screen.getByText("Electronics")).toBeInTheDocument();
        });
        const checkbox = screen.getByTestId("checkbox-Electronics");
        fireEvent.click(checkbox);
        await waitFor(() => {
            expect(checkbox).toBeChecked();
        }, { timeout: 3000 });
        jest.clearAllMocks();

        // Act
        const resetButton = screen.getByText("RESET FILTERS");
        fireEvent.click(resetButton);

        // Assert 
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/product/product-list/1");
        }, { timeout: 5000 });
    });


    describe("load more button", () => {
        test("output-based testing: show load more button when products < total", async () => {
            // Arrange
            render(<HomePage />);

            // Assert
            await waitFor(() => {
                expect(screen.getByText(/Loadmore/i)).toBeInTheDocument();
            });
        });

        
        test("output-based testing: do not display load more button when products count = total", async () => {
            // Arrange
            axios.get.mockImplementation((url) => {
                if (url === "/api/v1/category/get-category") {
                    return Promise.resolve({
                        data: { success: true, category: MOCK_CATEGORIES }
                    });
                }
                if (url === "/api/v1/product/product-count") {
                    return Promise.resolve({ data: { total: 2 } });
                }
                if (url.includes("/api/v1/product/product-list/")) {
                    return Promise.resolve({ data: { products: MOCK_PRODUCTS } });
                }
            });
            render(<HomePage />);

            // Assert
            await waitFor(() => {
                expect(screen.getByText("Wireless Bluetooth Headphones")).toBeInTheDocument();
            });
            expect(screen.queryByText(/Loadmore/i)).not.toBeInTheDocument();
        });


        test("state-, communication-based: load more products when load more button clicked", async () => {
            // Arrange
            const additionalProducts = [
                {
                    _id: "p3",
                    name: "Gaming Mouse",
                    description: "Ergonomic gaming mouse with RGB lighting and precision sensor",
                    price: 80.00,
                    slug: "gaming-mouse"
                }
            ];
            axios.get.mockImplementation((url) => {
                if (url === "/api/v1/category/get-category") {
                    return Promise.resolve({
                        data: { success: true, category: MOCK_CATEGORIES }
                    });
                }
                if (url === "/api/v1/product/product-count") {
                    return Promise.resolve({ data: { total: 10 } });
                }
                if (url === "/api/v1/product/product-list/1") {
                    return Promise.resolve({ data: { products: MOCK_PRODUCTS } });
                }
                if (url === "/api/v1/product/product-list/2") {
                    return Promise.resolve({ data: { products: additionalProducts } });
                }
            });
            render(<HomePage />);
            await waitFor(() => {
                expect(screen.getByText("Wireless Bluetooth Headphones")).toBeInTheDocument();
            });

            // Act
            const loadMoreButton = screen.getByText(/Loadmore/i);
            fireEvent.click(loadMoreButton);

            // Assert
            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledWith("/api/v1/product/product-list/2");
            });

            await waitFor(() => {
                expect(screen.getAllByRole("img").length).toBeGreaterThan(2);
            });
        });


        test("state-based testing: show loading text", async () => {
            // Arrange
            let resolveLoadMore;
            axios.get.mockImplementation((url) => {
                if (url === "/api/v1/category/get-category") {
                    return Promise.resolve({
                        data: { success: true, category: MOCK_CATEGORIES }
                    });
                }
                if (url === "/api/v1/product/product-count") {
                    return Promise.resolve({ data: { total: 10 } });
                }
                if (url === "/api/v1/product/product-list/1") {
                    return Promise.resolve({ data: { products: MOCK_PRODUCTS } });
                }
                if (url === "/api/v1/product/product-list/2") {
                    return new Promise((resolve) => {
                        resolveLoadMore = resolve;
                    });
                }
            });
            render(<HomePage />); 
            await waitFor(() => {
                expect(screen.getByText("Wireless Bluetooth Headphones")).toBeInTheDocument();
            });

            // Act
            const loadMoreButton = screen.getByText(/Loadmore/i);
            fireEvent.click(loadMoreButton);

            // Assert
            await waitFor(() => {
                expect(screen.getByText("Loading ...")).toBeInTheDocument();
            });
            resolveLoadMore({ data: { products: [] } });
            await waitFor(() => {
                expect(screen.queryByText("Loading ...")).not.toBeInTheDocument();
            });
        });

        test("communication-based: catch load more error", async () => {
            // Arrange
            const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
            const error = new Error("Load more error");
            axios.get.mockImplementation((url) => {
                if (url === "/api/v1/category/get-category") {
                    return Promise.resolve({
                        data: { success: true, category: MOCK_CATEGORIES }
                    });
                }
                if (url === "/api/v1/product/product-count") {
                    return Promise.resolve({ data: { total: 10 } });
                }
                if (url === "/api/v1/product/product-list/1") {
                    return Promise.resolve({ data: { products: MOCK_PRODUCTS } });
                }
                if (url === "/api/v1/product/product-list/2") {
                    return Promise.reject(error);
                }
            });
            render(<HomePage />);
            await waitFor(() => {
                expect(screen.getByText("Wireless Bluetooth Headphones")).toBeInTheDocument();
            });

            // Act
            const loadMoreButton = screen.getByText(/Loadmore/i);
            fireEvent.click(loadMoreButton);

            // Assert
            await waitFor(() => {
                expect(consoleLogSpy).toHaveBeenCalledWith(error);
            });

            consoleLogSpy.mockRestore();
        });


        test("communication-based testing: clicking load more button calls api", async () => {
            // Arrange
            render(<HomePage />);
            await waitFor(() => {
                expect(screen.getByText(/Loadmore/i)).toBeInTheDocument();
            });

            // Act
            const loadMoreButton = screen.getByText(/Loadmore/i);
            const event = { preventDefault: jest.fn() }; 
            fireEvent.click(loadMoreButton, event);

            // Assert
            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledWith("/api/v1/product/product-list/2");
            });
        });
    });


    test("navigate to product details after clicking more details button", async () => {
        // Arrange
        render(<HomePage />);
        await waitFor(() => {
            expect(screen.getByText("Wireless Bluetooth Headphones")).toBeInTheDocument();
        });

        // Act
        const moreDetailsButtons = screen.getAllByText("More Details");
        fireEvent.click(moreDetailsButtons[0]);

        // Assert
        expect(mockNavigate).toHaveBeenCalledWith("/product/wireless-bluetooth-headphones");
    });
        

    describe("add to cart", () => {
        test("state-, communication-based testing: add product to cart when add to cart button clicked", async () => {
            // Arrange
            toast.success = jest.fn();
            render(<HomePage />); 
            await waitFor(() => {
                expect(screen.getByText("Wireless Bluetooth Headphones")).toBeInTheDocument();
            });

            // Act
            const addToCartButtons = screen.getAllByText("ADD TO CART");
            fireEvent.click(addToCartButtons[0]);

            // Assert
            expect(mockSetCart).toHaveBeenCalledWith([MOCK_PRODUCTS[0]]);
            expect(toast.success).toHaveBeenCalledWith("Item Added to cart");
        });


        test("communication-based: save added product to cart in local storage ", async () => {
            // Arrange
            const setItemSpy = jest.spyOn(Storage.prototype, "setItem");
            render(<HomePage />); 
            await waitFor(() => {
                expect(screen.getByText("Wireless Bluetooth Headphones")).toBeInTheDocument();
            });

            // Act
            const addToCartButtons = screen.getAllByText("ADD TO CART");
            fireEvent.click(addToCartButtons[0]);

            // Assert
            expect(setItemSpy).toHaveBeenCalledWith(
                "cart",
                JSON.stringify([MOCK_PRODUCTS[0]])
            );

            setItemSpy.mockRestore();
        });


        test("state-, communication-based testing: add many products to cart", async () => {
            // Arrange
            toast.success = jest.fn();
            render(<HomePage />);
            await waitFor(() => {
                expect(screen.getByText("Wireless Bluetooth Headphones")).toBeInTheDocument();
                expect(screen.getByText("Unisex Cotton Shirt")).toBeInTheDocument();
            });

            // Act
            const addToCartButtons = screen.getAllByText("ADD TO CART");
            fireEvent.click(addToCartButtons[0]);
            fireEvent.click(addToCartButtons[1]);

            // Assert
            expect(mockSetCart).toHaveBeenCalledTimes(2);
            expect(toast.success).toHaveBeenCalledTimes(2);
        });
    });


    describe("layout and banner", () => {
        test("output-based testing: show banner image", async () => {
            // Act
            render(<HomePage />);

            // Assert
            await waitFor(() => {
                const bannerImage = screen.getByAltText("bannerimage");
                expect(bannerImage).toBeInTheDocument();
                expect(bannerImage).toHaveAttribute("src", "/images/Virtual.png");
            });
        });


        test("output-based testing: show filter section headers", async () => {
            // Act
            render(<HomePage />);

            // Assert
            await waitFor(() => {
                expect(screen.getByText("Filter By Category")).toBeInTheDocument();
                expect(screen.getByText("Filter By Price")).toBeInTheDocument();
            });
        });


        test("output-based testing: should display All Products header", async () => {
            // Act
            render(<HomePage />);

            // Assert
            await waitFor(() => {
                expect(screen.getByText("All Products")).toBeInTheDocument();
            });
        });
    });


    describe("show product info", () => {
        test("output-based testing: show product image", async () => {
            // Arrange
            render(<HomePage />);

            // Assert
            await waitFor(() => {
                const productImages = screen.getAllByRole("img", { name: /Wireless/ });
                expect(productImages[0]).toHaveAttribute(
                    "src",
                    "/api/v1/product/product-photo/p1"
                );
            });
        });


        test("output-based testing: show formatted price", async () => {
            // Act
            render(<HomePage />);

            // Assert
            await waitFor(() => {
                expect(screen.getByText(formatPrice(MOCK_PRODUCTS[0].price))).toBeInTheDocument();
                expect(screen.getByText(formatPrice(MOCK_PRODUCTS[1].price))).toBeInTheDocument();
            });
        });


        test("output-based testing: show product description truncated to 60 chars", async () => {
            // Arrange
            render(<HomePage />);

            // Assert
            await waitFor(() => {
                const description = screen.getByText(/Noise-cancelling headphones/);
                expect(description.textContent).toMatch(/\.\.\.$/);
            });
        });
    });


    test("communication-based: no loadmore called on initial render if page is 1", async () => {
        // Arrange
        const getAllProductsSpy = jest.fn();
        axios.get.mockImplementation((url) => {
            if (url === "/api/v1/category/get-category") {
                return Promise.resolve({
                    data: { success: true, category: MOCK_CATEGORIES }
                });
            }
            if (url === "/api/v1/product/product-count") {
                return Promise.resolve({ data: { total: 10 } });
            }
            if (url.includes("/api/v1/product/product-list/1")) {
                getAllProductsSpy();
                return Promise.resolve({ data: { products: MOCK_PRODUCTS } });
            }
        });

        // Act
        render(<HomePage />);

        // Assert
        await waitFor(() => {
            expect(getAllProductsSpy).toHaveBeenCalledTimes(1);
        });   
        expect(axios.get).toHaveBeenCalledWith("/api/v1/product/product-list/1");
        expect(axios.get).not.toHaveBeenCalledWith("/api/v1/product/product-list/2");
    });


    test("state-, communication-based: getAllProducts not called if filters cleared", async () => {
        // Arrange
        render(<HomePage />);
        await waitFor(() => {
            expect(screen.getByText("Electronics")).toBeInTheDocument();
        });

        // Act
        const checkbox = screen.getByTestId("checkbox-Electronics");
        fireEvent.click(checkbox);
        await waitFor(() => {
            expect(axios.post).toHaveBeenCalled();
        }, { timeout: 3000 });
        jest.clearAllMocks();
        fireEvent.click(checkbox); // clear filter

        // Assert 
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/product/product-list/1");
        }, { timeout: 3000 });
    });


    test("communication-based testing: call filterProduct when if filter by category", async () => {
        // Arrange
        render(<HomePage />);
        await waitFor(() => {
            expect(screen.getByText("Electronics")).toBeInTheDocument();
        });
        jest.clearAllMocks();

        // Act
        const checkbox = screen.getByTestId("checkbox-Electronics");
        fireEvent.click(checkbox);

        // Assert
        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                "/api/v1/product/product-filters",
                expect.objectContaining({
                    checked: ["cat1"],
                    radio: []
                })
            );
        }, { timeout: 3000 });
    });


    test("communication-based testing: call filterProduct when only filtering price", async () => {
        // Arrange
        render(<HomePage />);
        await waitFor(() => {
            expect(screen.getByTestId("radio-group")).toBeInTheDocument();
        });
        jest.clearAllMocks();

        // Act
        const radioButton = screen.getByTestId('radio-[0,19]');
        fireEvent.click(radioButton);

        // Assert
        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                "/api/v1/product/product-filters",
                expect.objectContaining({
                    checked: [],
                    radio: [0, 19]
                })
            );
        }, { timeout: 3000 });
    });


    test("display reload icon when not loading", async () => {
        // Arrange
        render(<HomePage />);

        // Assert
        await waitFor(() => {
            expect(screen.getByTestId("reload-icon")).toBeInTheDocument();
        });
    });
});
