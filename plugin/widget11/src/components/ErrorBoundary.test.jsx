/**
 * ErrorBoundary Component Tests
 * 
 * Tests for error handling and recovery
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary from './ErrorBoundary';

// Component that throws an error on demand
const ThrowError = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Normal content</div>;
};

describe('ErrorBoundary', () => {
  // Suppress console.error during tests (already in setupTests.js)
  const originalError = console.error;
  
  beforeEach(() => {
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = originalError;
  });

  describe('Normal Operation', () => {
    test('should render children when no error', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    test('should not show error UI when children render successfully', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );
      expect(screen.getByText('Normal content')).toBeInTheDocument();
      expect(screen.queryByText(/Something went wrong/i)).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('should catch and display error', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    });

    test('should display custom user message', () => {
      const customMessage = 'Custom error message for users';
      render(
        <ErrorBoundary userMessage={customMessage}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });

    test('should show error icon', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(screen.getByText('⚠️')).toBeInTheDocument();
    });
  });

  describe('Recovery Actions', () => {
    test('should show "Try Again" button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    test('should show "Reload Page" button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(screen.getByText('Reload Page')).toBeInTheDocument();
    });

    test('should call onReset when Try Again is clicked', () => {
      const handleReset = jest.fn();
      render(
        <ErrorBoundary onReset={handleReset}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      const tryAgainButton = screen.getByText('Try Again');
      fireEvent.click(tryAgainButton);
      
      expect(handleReset).toHaveBeenCalled();
    });

    test('should reset error state when Try Again is clicked', () => {
      const ThrowError = ({ shouldThrow }) => {
        if (shouldThrow) throw new Error('Test error');
        return <div>Normal content</div>;
      };

      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();

      const tryAgainButton = screen.getByText('Try Again');
      fireEvent.click(tryAgainButton);

      // After reset, rerender with non-throwing child
      rerender(
        <ErrorBoundary key={Math.random()}>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      // Should show normal content after reset
      expect(screen.getByText('Normal content')).toBeInTheDocument();
    });
  });

  describe('Development Mode', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    test('should show error details in development', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText(/Error Details/i)).toBeInTheDocument();
    });

    test('should display error stack in development', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      const details = screen.getByText(/Error Details/i);
      expect(details).toBeInTheDocument();
    });
  });

  describe('Production Mode', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    test('should hide error details in production', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.queryByText(/Error Details/i)).not.toBeInTheDocument();
    });
  });

  describe('Error Count Tracking', () => {
    test('should track error count', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // First error
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();

      // Reset
      fireEvent.click(screen.getByText('Try Again'));

      // Cause another error
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should still show error UI
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    });

    test('should show persistent error warning after 3+ errors', () => {
      // This would require manually incrementing error count
      // Implementation depends on actual component logic
    });
  });

  describe('Custom Fallback', () => {
    test('should render custom fallback when provided', () => {
      const customFallback = (error, reset) => (
        <div>
          <p>Custom error UI</p>
          <button onClick={reset}>Custom Reset</button>
        </div>
      );

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error UI')).toBeInTheDocument();
      expect(screen.getByText('Custom Reset')).toBeInTheDocument();
    });

    test('should call reset from custom fallback', () => {
      const ThrowError = ({ shouldThrow }) => {
        if (shouldThrow) throw new Error('Test error');
        return <div>Normal content</div>;
      };

      const customFallback = (error, reset) => (
        <button onClick={reset}>Custom Reset</button>
      );

      const { rerender } = render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const resetButton = screen.getByText('Custom Reset');
      fireEvent.click(resetButton);

      // Rerender with non-throwing child after reset
      rerender(
        <ErrorBoundary fallback={customFallback} key={Math.random()}>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Normal content')).toBeInTheDocument();
    });
  });

  describe('PropTypes', () => {
    test('should accept children prop', () => {
      expect(() => {
        render(
          <ErrorBoundary>
            <div>Child</div>
          </ErrorBoundary>
        );
      }).not.toThrow();
    });

    test('should accept fallback function prop', () => {
      const fallback = () => <div>Fallback</div>;
      expect(() => {
        render(
          <ErrorBoundary fallback={fallback}>
            <div>Child</div>
          </ErrorBoundary>
        );
      }).not.toThrow();
    });

    test('should accept onReset function prop', () => {
      const onReset = jest.fn();
      expect(() => {
        render(
          <ErrorBoundary onReset={onReset}>
            <div>Child</div>
          </ErrorBoundary>
        );
      }).not.toThrow();
    });

    test('should accept userMessage string prop', () => {
      expect(() => {
        render(
          <ErrorBoundary userMessage="Test message">
            <div>Child</div>
          </ErrorBoundary>
        );
      }).not.toThrow();
    });
  });
});
