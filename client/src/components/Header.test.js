import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import toast from 'react-hot-toast';
import * as authContext from '../context/auth';
import * as cartContext from '../context/cart';
import * as useCategory from '../hooks/useCategory';
import Header from './Header';

jest.mock('axios', () => ({
    __esModule: true,
    default: {
        defaults: {
            headers: {
                common: {},
            },
        },
    },
}));

// fake for SearchInput component 
jest.mock('./Form/SearchInput', 
    () => () => <div data-testid="search-input">Search Input</div>);

// stub for useCategory hook to return empty array
jest.mock('../hooks/useCategory', () => jest.fn(() => []));

// mock for toast 
jest.mock('react-hot-toast', () => (
    {
        __esModule: true, 
        default: { success: jest.fn(() => {}) } 
    })
);

// fake for Link and NavLink from react-router-dom
var mockLink;
var mockNavLink;
jest.mock('react-router-dom', () => {
    mockLink = jest.fn(({ to, children, className }) => (
        <a href={to} data-testid={`link-${to}`} className={className}>
            {children}
        </a>
    ));
    mockNavLink = jest.fn(({ to, children, className, onClick, role, href, ...props }) => (
        <button onClick={onClick} data-testid={`navlink-${to}`} className={className} {...props}>
            {children}
        </button>
    ));
    return { Link: (props) => mockLink(props), NavLink: (props) => mockNavLink(props) };
});

// fake for localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => { 
            store[key] = value.toString(); 
        }),
        removeItem: jest.fn((key) => { 
            delete store[key]; 
        }),
        clear: jest.fn(() => { 
            store = {}; 
        })
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// stub for auth context
const mockAuthUser = (user = null, token = '') => {
    const mockSetAuth = jest.fn();
    jest.spyOn(authContext, 'useAuth').mockReturnValue([{ user, token }, mockSetAuth]);
    return mockSetAuth;
};

const setupAuth = (user) => mockAuthUser(user, user ? 'token' : '');

// test user 
const TEST_USER = { 
    name: 'Tom', 
    role: 0, 
    id: 1
};


// Rachel Tai Ke Jia, A0258603A

describe('unit tests for header component', () => {
    // Arrange
    beforeEach(() => {
        mockLink.mockClear();
        mockNavLink.mockClear();
        Object.values(localStorageMock).forEach(fn => fn.mockClear?.());
        toast.success.mockClear();
        // stub default unauthenticated state
        jest.spyOn(authContext, 'useAuth').mockReturnValue(
            [{ user: null, token: '' }, jest.fn()]
        );
        jest.spyOn(cartContext, 'useCart').mockReturnValue([[]]);
        useCategory.default.mockReturnValue([]);
    });

    afterEach(() => {
        authContext.useAuth.mockRestore();
        cartContext.useCart.mockRestore();
        useCategory.default.mockRestore();
    });


    test('show admin user name', () => {
        // Arrange
        setupAuth({ name: 'Admin User', role: 1, id: 2 });
        
        // Act
        render(<Header />);
        
        // Assert
        expect(screen.getByText('Admin User')).toBeInTheDocument();
    });


    test('handle logout', () => {
        // Arrange
        const authState = { user: TEST_USER, token: 'token' };
        const mockSetAuth = jest.fn();
        jest.spyOn(authContext, 'useAuth').mockReturnValue([authState, mockSetAuth]);

        // Act
        render(<Header />);
        fireEvent.click(screen.getByText('Logout'));

        // Assert
        expect(mockSetAuth).toHaveBeenCalledTimes(1);
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth');
        expect(toast.success).toHaveBeenCalledWith('Logout Successfully');
    });


    test('display All Categories link', () => {
        // Act
        render(<Header />);
        
        // Assert
        expect(screen.getByText('All Categories')).toBeInTheDocument();
    });


    test('show category name', () => {
        // Arrange
        useCategory.default.mockReturnValue([{ slug: 'cat1', name: 'Electronics' }]);
        
        // Act
        render(<Header />);
        
        // Assert
        expect(screen.getByText('Electronics')).toBeInTheDocument();
    });
});