import React from 'react';

const TokenError = ({ errorType = 'invalid_token' }) => {
  const getErrorMessage = () => {
    switch (errorType) {
      case 'no_token':
        return {
          title: 'Authentication Required',
          message: 'No authentication token was found in the URL parameters.',
          details: 'Please ensure you have a valid token in the URL (e.g., ?token=your_token_here)'
        };
      case 'invalid_token':
        return {
          title: 'Access Denied',
          message: 'The provided authentication token is invalid or has expired.',
          details: 'Please contact your administrator for a valid token.'
        };
             case 'network_error':
         return {
           title: 'Connection Error',
           message: 'Unable to verify your authentication token.',
           details: 'Please check your internet connection and try again.'
         };
       case 'invalid_country':
         return {
           title: 'Access Restricted',
           message: 'You do not have access to the requested country data.',
           details: 'The countries specified in the URL are not available for this widget. Please check your country parameters or contact your administrator.'
         };
       default:
         return {
           title: 'Authentication Error',
           message: 'An error occurred during authentication.',
           details: 'Please try refreshing the page or contact support.'
         };
    }
  };

  const errorInfo = getErrorMessage();

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f5f5',
      padding: '20px'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '3rem',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        maxWidth: '500px',
        width: '100%'
      }}>
        {/* Error Icon */}
        <div style={{
          fontSize: '4rem',
          marginBottom: '1rem',
          color: '#d32f2f'
        }}>
          🔒
        </div>
        
        {/* Error Title */}
        <h1 style={{
          color: '#d32f2f',
          marginBottom: '1rem',
          fontSize: '1.8rem',
          fontWeight: 'bold'
        }}>
          {errorInfo.title}
        </h1>
        
        {/* Error Message */}
        <p style={{
          color: '#333',
          fontSize: '1.1rem',
          marginBottom: '1.5rem',
          lineHeight: '1.5'
        }}>
          {errorInfo.message}
        </p>
        
        {/* Error Details */}
        <div style={{
          background: '#f8f9fa',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid #e9ecef',
          marginBottom: '2rem'
        }}>
          <p style={{
            color: '#6c757d',
            fontSize: '0.9rem',
            margin: '0',
            lineHeight: '1.4'
          }}>
            {errorInfo.details}
          </p>
        </div>
        
        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          {/* <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
          >
            🔄 Refresh Page
          </button>
          
          <button
            onClick={() => {
              // Clear any stored tokens and reload
              localStorage.removeItem('auth_token');
              window.location.reload();
            }}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#545b62'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#6c757d'}
          >
            🗑️ Clear & Retry
          </button> */}
        </div>
        
                 {/* Technical Info */}
         <div style={{
           marginTop: '2rem',
           paddingTop: '1rem',
           borderTop: '1px solid #e9ecef',
           fontSize: '0.8rem',
           color: '#6c757d'
         }}>
           <p style={{ margin: '0.5rem 0' }}>
             <strong>Error Type:</strong> {errorType}
           </p>
           <p style={{ margin: '0.5rem 0' }}>
             <strong>Timestamp:</strong> {new Date().toLocaleString()}
           </p>
           <p style={{ 
             margin: '0.5rem 0',
             wordBreak: 'break-all',
             overflowWrap: 'break-word',
             maxWidth: '100%'
           }}>
             <strong>URL:</strong> {window.location.href}
           </p>
         </div>
      </div>
    </div>
  );
};

export default TokenError;
