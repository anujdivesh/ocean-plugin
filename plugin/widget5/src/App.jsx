import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import './App.css';
import Header from './components/header';
import './utils/NotificationManager'; // Initialize notification system
import { initConsoleErrorSuppressor } from './utils/ConsoleErrorSuppressor';
import TokenError from './components/TokenError';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorType] = useState(null); // Keep for conditional render, but never changes

  useEffect(() => {
    // Authentication DISABLED for widget5
    const initializeApp = async () => {
      console.log('Initializing app WITHOUT token validation...');
      initConsoleErrorSuppressor();
      
      // Skip authentication - directly set authenticated state
      setIsAuthenticated(true);
      setIsLoading(false);
      
      // const token = extractTokenFromURL('token');

      // if (!token) {
      //   console.log('No token found in URL');
      //   setErrorType('no_token');
      //   setIsLoading(false);
      //   return;
      // }

      // try {
      //   const validationResult = await validateTokenOnLoad(
      //     () => {
      //       console.log('Authentication successful - app can load');
      //       setIsAuthenticated(true);
      //     },
      //     () => {
      //       console.log('Authentication failed - app will not load');
      //       setIsAuthenticated(false);
      //       setErrorType('invalid_token');
      //     },
      //     () => {
      //       console.log('Country validation failed - page should not load');
      //       setIsAuthenticated(false);
      //       setErrorType('invalid_country');
      //     }
      //   );

      //   if (validationResult.widgetData) {
      //     setWidgetData(validationResult.widgetData);
      //   }
      //   if (validationResult.validCountries) {
      //     setValidCountries(validationResult.validCountries);
      //   }

      //   console.log('Validation result:', validationResult);
      //   setIsLoading(false);
      // } catch (error) {
      //   console.error('Network error during validation:', error);
      //   setErrorType('network_error');
      //   setIsLoading(false);
      // }
    };

    initializeApp();
  }, []);

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
          <Route path="/" element={<Home />} />
          {/* <Route path="/link1" element={<Link1 />} />
          <Route path="/link2" element={<Link2 />} />
          <Route path="/link3" element={<Link3 />} /> */}
          {/* Redirect any unknown routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
