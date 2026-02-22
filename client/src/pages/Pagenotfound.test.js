import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PageNotFound from './Pagenotfound'; 

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

describe('unit tests for Pagenotfound component', () => {
    test('shows 404 title', () => {
        // Act
        render(
        <MemoryRouter>
            <PageNotFound />
        </MemoryRouter>
        );

        // Assert
        expect(screen.getByText('404')).toBeInTheDocument();
    });


    test('shows "Oops ! Page Not Found" heading', () => {
        // Act
        render(
        <MemoryRouter>
            <PageNotFound />
        </MemoryRouter>
        );

        // Assert
        expect(screen.getByText('Oops ! Page Not Found')).toBeInTheDocument();
    });


    test('shows "Go Back" link', () => {
        // Act
        render(
        <MemoryRouter>
            <PageNotFound />
        </MemoryRouter>
        );

        // Assert
        const link = screen.getByRole('link', { name: /go back/i });
        expect(link).toBeInTheDocument();
        expect(link).toHaveTextContent('Go Back');
    });


    test('shows link with home route /', () => {
        // Act
        render(
        <MemoryRouter>
            <PageNotFound />
        </MemoryRouter>
        );

        // Assert
        const link = screen.getByRole('link', { name: /go back/i });
        expect(link).toHaveAttribute('href', '/');
    });
});