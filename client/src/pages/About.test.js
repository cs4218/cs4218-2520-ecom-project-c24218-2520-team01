import React from 'react';
import { render, screen } from '@testing-library/react';
import About from './About';

// mock layout
jest.mock('./../components/Layout', () => {
    return jest.fn(({ children, title }) => (
        <div data-testid="layout-mock">
            <div data-testid="layout-title">{title}</div>
            {children}
        </div>
    ));
});

// Rachel Tai Ke Jia, A0258603A

describe('unit tests for about component', () => {
    test('shows layout with title', () => {
        // Arrange
        render(<About />);

        // Act
        const titleElement = screen.getByTestId('layout-title');

        // Assert
        expect(titleElement).toBeInTheDocument();
        expect(titleElement).toHaveTextContent('About us - Ecommerce app');
    });


    test('shows image with correct src and alt', () => {
        // Act
        render(<About />);

        // Assert
        const image = screen.getByAltText('aboutus');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('src', '/images/about.jpeg');
        expect(image).toHaveAttribute('alt', 'aboutus');
    });


    test('shows text content', () => {
        // Act
        render(<About />);

        // Assert
        const paragraph = screen.getByText('Add text');
        expect(paragraph).toBeInTheDocument();
        expect(paragraph).toHaveClass('text-justify', 'mt-2');
        expect(paragraph.tagName).toBe('P');
    });
});