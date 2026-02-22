import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import Spinner from './Spinner';

// mock navigation and use location hooks from react-router-dom
const mockNavigate = jest.fn();
const mockUseLocation = jest.fn();

jest.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
    useLocation: () => mockUseLocation()
}));


// Rachel Tai Ke Jia, A0258603A

describe('unit tests for Spinner component', () => {
    beforeEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
        mockNavigate.mockClear();
        mockUseLocation.mockReturnValue({
            pathname: '/dashboard',
        });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    
    test('shows spinner component with UI elements', () => {
        // Arrange
        const expectedCountdownText = 'redirecting to you in 3 second';

        // Act
        render(<Spinner />);

        // Assert
        const heading = screen.getByRole('heading');
        const spinner = screen.getByRole('status');
        const loadingText = screen.getByText('Loading...');

        expect(heading).toHaveTextContent(expectedCountdownText);
        expect(spinner).toBeInTheDocument();
        expect(loadingText).toBeInTheDocument();
    });


    test('shows initial count  of 3 seconds', () => {
        // Act
        render(<Spinner />);

        // Assert
        expect(screen.getByText(/redirecting to you in 3 second/)).toBeInTheDocument();
    });


    test('navigates to login after 3 secs with default path', () => {
        // Arrange
        jest.useFakeTimers();
        const expectedPath = '/login';
        const expectedState = { state: '/dashboard' };

        // Act
        render(<Spinner />);
        act(() => {
            jest.advanceTimersByTime(3000);
        });

        // Assert
        expect(mockNavigate).toHaveBeenCalledWith(expectedPath, expectedState);
        expect(mockNavigate).toHaveBeenCalledTimes(1);

        jest.useRealTimers();
    });
});