import React from 'react';
import { render, screen } from '@testing-library/react';
import Footer from './Footer';

// mock link from react-router-dom
var mockNavigate;
jest.mock('react-router-dom', () => {
    mockNavigate = jest.fn(({ to, children }) => (
        <a href={to} data-to={to}>
            {children}
        </a>
    ));
    return {
        Link: (props) => mockNavigate(props)
    };
});

// Rachel Tai Ke Jia, A0258603A
describe('unit test for footer component', () => {
    beforeEach(() => {
        mockNavigate.mockClear();
    });


    test('shows copyright text', () => {
        // Arrange
        render(<Footer />);

        // Act
        const heading = screen.getByText(/All Rights Reserved/i);

        // Assert
        expect(heading).toHaveTextContent('TestingComp');
    });


    test('shows links in correct order', () => {
        // Arrange
        render(<Footer />);

        // Act
        const linkElements = screen.getAllByRole('link');
        const linkLabels = linkElements.map((link) => link.textContent);

        // Assert
        expect(linkLabels).toEqual(['About', 'Contact', 'Privacy Policy']);
    });


    test('links navigate to correct pages', () => {
        // Arrange
        render(<Footer />);

        // Act
        const pages = mockNavigate.mock.calls.map((call) => call[0].to);

        // Assert
        expect(pages).toEqual(['/about', '/contact', '/policy']);
    });
});