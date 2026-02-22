import React from 'react';
import { render, screen } from '@testing-library/react';
import Contact from './Contact';

// mock layout
jest.mock('./../components/Layout', () => {
    return function MockLayout({ children, title }) {
        return (
            <div data-testid="layout" data-title={title}>
                {children}
            </div>
        );
    };
});

// mock react icons
jest.mock('react-icons/bi', () => ({
    BiMailSend: () => <span data-testid="icon-mail">BiMailSend</span>,
    BiPhoneCall: () => <span data-testid="icon-phone">BiPhoneCall</span>,
    BiSupport: () => <span data-testid="icon-support">BiSupport</span>,
}));

// Rachel Tai Ke Jia, A0258603A
describe('unit tests for contact component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });


    test('shows CONTACT US heading', () => {
        // Act
        render(<Contact />);

        // Assert
        const heading = screen.getByText('CONTACT US');
        expect(heading).toBeInTheDocument();
    });

 
    test('shows paragraph', () => {
        // Act
        render(<Contact />);

        // Assert
        expect(screen.getByText(/For any query or info about product/i)).toBeInTheDocument();
        expect(screen.getByText(/feel free to call anytime/i)).toBeInTheDocument();
        expect(screen.getByText(/We are available 24X7/i)).toBeInTheDocument();
    });


    test('shows email info', () => {
        // Act
        render(<Contact />);

        // Assert
        expect(screen.getByText(/www.help@ecommerceapp.com/)).toBeInTheDocument();
    });


    test('shows phone contact', () => {
        // Act
        render(<Contact />);

        // Assert
        expect(screen.getByText(/012-3456789/)).toBeInTheDocument();
    });


    test('shows toll free number', () => {
        // Act
        render(<Contact />);

        // Assert
        expect(screen.getByText(/1800-0000-0000/)).toBeInTheDocument();
        expect(screen.getByText(/toll free/)).toBeInTheDocument();
    });


    test('shows email icon (BiMailSend)', () => {
        // Act
        render(<Contact />);

        // Assert
        expect(screen.getByTestId('icon-mail')).toBeInTheDocument();
    });


    test('shows phone icon (BiPhoneCall)', () => {
        // Act
        render(<Contact />);

        // Assert
        expect(screen.getByTestId('icon-phone')).toBeInTheDocument();
    });


    test('shows support icon (BiSupport)', () => {
        // Act
        render(<Contact />);

        // Assert
        expect(screen.getByTestId('icon-support')).toBeInTheDocument();
    });
});