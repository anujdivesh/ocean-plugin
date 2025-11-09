import React from 'react';
import Home from '../pages/Home';

/**
 * EnhancedForecastApp - Wrapper component for Home
 * This will be replaced with the new ForecastApp component in Phase 4
 */
const EnhancedForecastApp = ({ widgetData, validCountries }) => {
  return <Home widgetData={widgetData} validCountries={validCountries} />;
};

export default EnhancedForecastApp;
