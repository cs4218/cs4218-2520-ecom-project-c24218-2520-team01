import React from 'react';
import { render, screen } from '@testing-library/react';
import Policy from './Policy';
import Layout from './../components/Layout';

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

describe('unit tests for policy component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should render Layout component with "Privacy Policy" title', () => {
        // Arrange
        const mockLayout = Layout;

        // Act
        render(<Policy />);

        // Assert
        expect(mockLayout).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Privacy Policy'
            }),
            expect.anything()
        );
    });


    test('shows image', () => {
        // Act
        render(<Policy />);

        // Assert
        const img = screen.getByRole('img');
        expect(img).toBeInTheDocument();
    });


    test('shows 7 paragraph elements', () => {
        // Act
        render(<Policy />);

        // Assert
        const paragraphs = screen.getAllByText('add privacy policy');
        expect(paragraphs).toHaveLength(7);
    });
});