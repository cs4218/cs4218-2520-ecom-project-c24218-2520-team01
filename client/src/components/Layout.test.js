import React from 'react';
import { render, screen } from '@testing-library/react';
import Layout from './Layout';

// mock dependencies 
jest.mock('./Header', () => {
    return function MockHeader() {
        return <div data-testid="header">Header Component</div>;
    };
});

jest.mock('./Footer', () => {
    return function MockFooter() {
        return <div data-testid="footer">Footer Component</div>;
    };
});

jest.mock('react-helmet', () => ({
    Helmet: ({ children }) => <div data-testid="helmet">{children}</div>,
}));

jest.mock('react-hot-toast', () => ({
    Toaster: () => <div data-testid="toaster">Toaster Component</div>,
}));


// Rachel Tai Ke Jia, A0258603A

describe('unit tests for layout component', () => {
    test('shows header component', () => {
        // Arrange
        const testChild = <div>Test</div>;

        // Act
        render(<Layout>{testChild}</Layout>);

        // Assert
        expect(screen.getByTestId('header')).toBeInTheDocument();
    });


    test('shows footer component', () => {
        // Arrange
        const testChild = <div>Test</div>;

        // Act
        render(<Layout>{testChild}</Layout>);

        // Assert
        expect(screen.getByTestId('footer')).toBeInTheDocument();
    });


    test('shows toaster component', () => {
        // Arrange
        const testChild = <div>Test</div>;

        // Act
        render(<Layout>{testChild}</Layout>);

        // Assert
        expect(screen.getByTestId('toaster')).toBeInTheDocument();
    });


    test('shows helmet component', () => {
        // Arrange
        const testChild = <div>Test</div>;

        // Act
        render(<Layout>{testChild}</Layout>);

        // Assert
        expect(screen.getByTestId('helmet')).toBeInTheDocument();
    });


    test('renders children inside', () => {
        // Arrange
        const childContent = 'example child content';

        // Act
        const { container } = render(<Layout><p>{childContent}</p></Layout>);
        const mainElement = container.querySelector('main');

        // Assert
        expect(mainElement).toHaveTextContent(childContent);
    });
});