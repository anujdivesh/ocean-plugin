/**
 * World-Class Error Boundary Component
 * 
 * Catches React errors and displays user-friendly fallback UI
 * Logs errors for debugging and monitoring
 */

import React from 'react';
import PropTypes from 'prop-types';
import logger from '../utils/logger';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const { errorCount } = this.state;
    
    logger.error('ERROR_BOUNDARY', 'React component error caught', {
      error: error.toString(),
      componentStack: errorInfo.componentStack,
      errorCount: errorCount + 1
    });

    this.setState({
      error,
      errorInfo,
      errorCount: errorCount + 1
    });

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo);
    }
  }

  reportError() {
    // Placeholder for error reporting service (Sentry, LogRocket, etc.)
    // window.errorTracker?.captureException(error, { extra: errorInfo });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    const { error, errorInfo } = this.state;
    
    if (this.state.hasError) {
      // Custom fallback UI from props
      if (this.props.fallback) {
        return this.props.fallback(error, this.handleReset);
      }

      // Default fallback UI
      return (
        <div className="error-boundary-container">
          <div className="error-boundary-content">
            <div className="error-icon">⚠️</div>
            <h2>Oops! Something went wrong</h2>
            <p className="error-message">
              {this.props.userMessage || 
                "We're sorry, but something unexpected happened. The application encountered an error."}
            </p>
            
            {process.env.NODE_ENV === 'development' && error && (
              <details className="error-details">
                <summary>Error Details (Development Only)</summary>
                <pre className="error-stack">
                  {error.toString()}
                  {errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="error-actions">
              <button 
                className="btn btn-primary" 
                onClick={this.handleReset}
              >
                Try Again
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => window.location.reload()}
              >
                Reload Page
              </button>
            </div>

            {this.state.errorCount > 2 && (
              <div className="error-warning">
                <strong>Persistent Error Detected</strong>
                <p>This error has occurred {this.state.errorCount} times. 
                   Consider reloading the page or checking your internet connection.</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.func,
  onReset: PropTypes.func,
  userMessage: PropTypes.string
};

export default ErrorBoundary;
