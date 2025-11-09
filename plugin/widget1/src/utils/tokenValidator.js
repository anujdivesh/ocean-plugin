import React from 'react';

/**
 * Token Validation Utility
 * 
 * This utility provides functions to:
 * 1. Extract tokens from URL parameters
 * 2. Validate tokens against the ocean-middleware API
 * 3. Handle authentication state
 * 
 * Usage:
 * import { validateTokenOnLoad, extractTokenFromURL } from './utils/tokenValidator';
 * 
 * // Call this on app startup
 * validateTokenOnLoad();
 */

const API_BASE_URL = 'https://ocean-middleware.spc.int/middleware/api/account/';
const WIDGET_API_BASE_URL = 'https://ocean-middleware.spc.int/middleware/api/widget/';

// Widget ID - change this when reusing for different widgets
const WIDGET_ID = 1;

/**
 * Extracts token from URL parameters
 * @param {string} paramName - The parameter name to look for (default: 'token')
 * @returns {string|null} - The token if found, null otherwise
 */
export const extractTokenFromURL = (paramName = 'token') => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(paramName);
};

/**
 * Extracts country codes from URL parameters
 * @param {string} paramName - The parameter name to look for (default: 'country')
 * @returns {string[]} - Array of country codes, empty array if none found
 */
export const extractCountriesFromURL = (paramName = 'country') => {
  const urlParams = new URLSearchParams(window.location.search);
  const countriesParam = urlParams.get(paramName);
  
  console.log(`Extracting countries from URL parameter '${paramName}':`, countriesParam);
  
  if (!countriesParam) {
    console.log('No country parameter found in URL');
    return [];
  }
  
  // Split by comma and trim whitespace
  const countries = countriesParam.split(',').map(country => country.trim()).filter(country => country.length > 0);
  console.log('Extracted countries:', countries);
  
  return countries;
};

/**
 * Validates a token against the ocean-middleware API
 * @param {string} token - The JWT token to validate
 * @returns {Promise<boolean>} - True if valid, false otherwise
 */
export const validateToken = async (token) => {
  if (!token) {
    console.warn('No token provided for validation');
    return false;
  }

  try {
    const response = await fetch(API_BASE_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 200) {
      console.log('Token validation successful');
      return true;
    } else {
      console.warn(`Token validation failed with status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
};

/**
 * Validates countries against the widget API
 * @param {string} token - The JWT token to use for authentication
 * @param {string[]} requestedCountries - Array of country codes to validate
 * @returns {Promise<{valid: boolean, validCountries: string[], widgetData: any}>} - Validation result
 */
export const validateCountries = async (token, requestedCountries = []) => {
  console.log('=== Starting country validation ===');
  console.log('Token provided:', !!token);
  console.log('Requested countries:', requestedCountries);
  
  if (!token) {
    console.warn('No token provided for country validation');
    return { valid: false, validCountries: [], widgetData: null };
  }

  if (requestedCountries.length === 0) {
    console.log('No countries requested - skipping country validation');
    return { valid: true, validCountries: [], widgetData: null };
  }

  try {
    const response = await fetch(`${WIDGET_API_BASE_URL}${WIDGET_ID}/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 200) {
      const widgetData = await response.json();
      console.log('Widget data retrieved successfully:', widgetData);

      // Check if widget has country information
      if (!widgetData.country) {
        console.warn('Widget has no country information');
        return { valid: false, validCountries: [], widgetData };
      }

      // Get the widget's country code
      const widgetCountryCode = widgetData.country.short_name;
      console.log('Widget country code:', widgetCountryCode);

      // Check if any of the requested countries match the widget's country
      const validCountries = requestedCountries.filter(country => 
        country.toUpperCase() === widgetCountryCode.toUpperCase()
      );

      const isValid = validCountries.length > 0;
      console.log(`Country validation result: ${isValid ? 'valid' : 'invalid'}`);
      console.log('Requested countries:', requestedCountries);
      console.log('Valid countries:', validCountries);

      return { valid: isValid, validCountries, widgetData };
    } else {
      console.warn(`Widget API request failed with status: ${response.status}`);
      return { valid: false, validCountries: [], widgetData: null };
    }
  } catch (error) {
    console.error('Error validating countries:', error);
    return { valid: false, validCountries: [], widgetData: null };
  }
};

/**
 * Stores the token in localStorage for future use
 * @param {string} token - The JWT token to store
 */
export const storeToken = (token) => {
  if (token) {
    localStorage.setItem('auth_token', token);
    console.log('Token stored in localStorage');
  }
};

/**
 * Retrieves the token from localStorage
 * @returns {string|null} - The stored token or null if not found
 */
export const getStoredToken = () => {
  return localStorage.getItem('auth_token');
};

/**
 * Removes the token from localStorage
 */
export const clearStoredToken = () => {
  localStorage.removeItem('auth_token');
  console.log('Token cleared from localStorage');
};

/**
 * Checks if the current page should load based on token and country validation
 * @param {Function} onValidToken - Callback function when token is valid
 * @param {Function} onInvalidToken - Callback function when token is invalid
 * @param {Function} onInvalidCountry - Callback function when country validation fails
 * @param {string} tokenParamName - The URL parameter name for token (default: 'token')
 * @param {string} countryParamName - The URL parameter name for countries (default: 'country')
 */
export const validateTokenOnLoad = async (
  onValidToken = () => console.log('Token is valid - page can load'),
  onInvalidToken = () => console.error('Invalid or missing token - preventing page load'),
  onInvalidCountry = () => console.log('Country validation failed - showing default page'),
  tokenParamName = 'token',
  countryParamName = 'country'
) => {
  console.log('Starting token and country validation on page load...');
  
  // First, try to get token from URL
  let token = extractTokenFromURL(tokenParamName);
  
  // If no token in URL, try to get from localStorage
  if (!token) {
    token = getStoredToken();
    console.log('No token in URL, checking localStorage...');
  }
  
  if (!token) {
    console.warn('No token found in URL or localStorage');
    onInvalidToken();
    return { tokenValid: false, countryValid: false, widgetData: null };
  }
  
  // Store the token for future use
  storeToken(token);
  
  // Validate the token first
  const tokenValid = await validateToken(token);
  
  if (!tokenValid) {
    clearStoredToken(); // Clear invalid token
    onInvalidToken();
    return { tokenValid: false, countryValid: false, widgetData: null };
  }
  
  // Token is valid, now check countries if any are specified
  const requestedCountries = extractCountriesFromURL(countryParamName);
  console.log('Requested countries from URL:', requestedCountries);
  
  if (requestedCountries.length === 0) {
    console.log('No countries specified - proceeding with token validation only');
    onValidToken();
    return { tokenValid: true, countryValid: true, widgetData: null };
  }
  
  // Validate countries
  const countryValidation = await validateCountries(token, requestedCountries);
  
  if (countryValidation.valid) {
    console.log('Country validation successful');
    onValidToken();
    return { 
      tokenValid: true, 
      countryValid: true, 
      widgetData: countryValidation.widgetData,
      validCountries: countryValidation.validCountries
    };
  } else {
    console.log('Country validation failed - page should not load');
    onInvalidCountry();
    return { 
      tokenValid: true, 
      countryValid: false, 
      widgetData: countryValidation.widgetData,
      validCountries: []
    };
  }
};

/**
 * Higher-order component that wraps a component with token validation
 * @param {React.Component} Component - The component to wrap
 * @param {Object} options - Configuration options
 * @returns {React.Component} - Wrapped component with token validation
 */
export const withTokenValidation = (Component, options = {}) => {
  const {
    paramName = 'token',
    fallbackComponent = null,
    redirectTo = null
  } = options;

  return function TokenValidatedComponent(props) {
    const [isValid, setIsValid] = React.useState(null);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
      const validateAndSetState = async () => {
        // eslint-disable-next-line no-unused-vars
        const valid = await validateTokenOnLoad(
          () => setIsValid(true),
          () => setIsValid(false),
          paramName
        );
        setIsLoading(false);
      };

      validateAndSetState();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // paramName is a prop from closure, not a dependency

    if (isLoading) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontFamily: 'Arial, sans-serif'
        }}>
          <div>Validating authentication...</div>
        </div>
      );
    }

    if (!isValid) {
      if (fallbackComponent) {
        return React.createElement(fallbackComponent, props);
      }
      if (redirectTo) {
        window.location.href = redirectTo;
        return null;
      }
      return null;
    }

    return React.createElement(Component, props);
  };
};

// Named exports for tree-shaking
const tokenValidatorModule = {
  extractTokenFromURL,
  extractCountriesFromURL,
  validateToken,
  validateCountries,
  storeToken,
  getStoredToken,
  clearStoredToken,
  validateTokenOnLoad,
  withTokenValidation
};

export default tokenValidatorModule;
