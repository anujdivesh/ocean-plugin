import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import './App.css';
import Header from './components/header';
import ErrorBoundary from './components/ErrorBoundary';
import './utils/NotificationManager'; // Initialize notification system
import { initConsoleErrorSuppressor } from './utils/ConsoleErrorSuppressor';
import logger from './utils/logger';
import TokenError from './components/TokenError';
import { validateTokenOnLoad, extractTokenFromURL } from './utils/tokenValidator';

function App() {
  // Authentication enabled for production
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorType, setErrorType] = useState(null);
  const [widgetData, setWidgetData] = useState(null);
  const [validCountries, setValidCountries] = useState(['TUV']); // Tuvalu by default

  useEffect(() => {
    // Authentication enabled
    const initializeApp = async () => {
      logger.info('APP', 'Initializing Tuvalu Multi-Island Widget with token and country validation...');
      
      // Initialize console error suppressor for known WMS server issues
      initConsoleErrorSuppressor();
      
      // Check if token exists in URL first
      const token = extractTokenFromURL('token');
      
      if (!token) {
        logger.warn('APP', 'No token found in URL');
        setErrorType('no_token');
        setIsLoading(false);
        return;
      }
      
      try {
        const validationResult = await validateTokenOnLoad(
          () => {
            logger.info('APP', 'Authentication successful - app can load');
            setIsAuthenticated(true);
          },
          () => {
            logger.warn('APP', 'Authentication failed - app will not load');
            setIsAuthenticated(false);
            setErrorType('invalid_token');
          },
          () => {
            logger.warn('APP', 'Country validation failed - page should not load');
            // Country validation failed, so we should not show the app
            setIsAuthenticated(false);
            setErrorType('invalid_country');
          }
        );
        
        // Store widget data and valid countries if available
        if (validationResult.widgetData) {
          setWidgetData(validationResult.widgetData);
        }
        if (validationResult.validCountries) {
          setValidCountries(validationResult.validCountries);
        }
        
        logger.info('APP', 'Validation result:', validationResult);
        setIsLoading(false);
      } catch (error) {
        logger.error('APP', 'Network error during validation:', error);
        setErrorType('network_error');
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Show loading state while validating token
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: 'var(--color-background)'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔍</div>
          <h3>Validating Authentication...</h3>
          <p>Please wait while we verify your access token and country permissions.</p>
        </div>
      </div>
    );
  }

  // Show error message if not authenticated
  if (!isAuthenticated || errorType) {
    return <TokenError errorType={errorType || 'invalid_token'} />;
  }

  return (
    <ErrorBoundary userMessage="The Tuvalu Marine Forecast application encountered an unexpected error. Please try refreshing the page.">
      <Router 
        basename={process.env.NODE_ENV === 'development' ? '/' : process.env.PUBLIC_URL}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <div style={{ 
          backgroundColor: 'var(--color-background)', 
          minHeight: '100vh',
          transition: 'background-color 0.3s ease'
        }}>
          <Header />
          <Routes>
            <Route path="/" element={<Home widgetData={widgetData} validCountries={validCountries} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
