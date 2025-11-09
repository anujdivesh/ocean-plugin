/**
 * Marine Data Processing Utilities
 * Functions for processing and formatting marine forecast data
 */

import { COLOR_INTERPOLATION } from './colorSchemes.js';

// Sea state classification for wave heights with international standards
export const SEA_STATES = [
  { state: "Calm", code: 0, description: "Mirror-like sea", maxHeight: 0.1 },
  { state: "Calm", code: 1, description: "Ripples without crests", maxHeight: 0.5 },
  { state: "Smooth", code: 2, description: "Small wavelets, crests glassy", maxHeight: 1.25 },
  { state: "Slight", code: 3, description: "Large wavelets, some white caps", maxHeight: 2.5 },
  { state: "Moderate", code: 4, description: "Small waves, frequent white caps", maxHeight: 4 },
  { state: "Rough", code: 5, description: "Moderate waves, many white caps", maxHeight: 6 },
  { state: "Very Rough", code: 6, description: "Large waves, foam crests", maxHeight: 9 },
  { state: "High", code: 7, description: "Very large waves, heavy seas", maxHeight: 14 },
  { state: "Very High", code: 8, description: "Exceptionally high waves", maxHeight: Infinity }
];

export const getSeaState = (waveHeight) => {
  if (typeof waveHeight !== 'number' || waveHeight < 0) {
    return SEA_STATES[0];
  }
  
  return SEA_STATES.find(state => waveHeight <= state.maxHeight) || SEA_STATES[SEA_STATES.length - 1];
};

// Wave period classifications for marine forecasting
export const WAVE_PERIOD_CLASSES = [
  { state: "Very Short", code: 0, description: "Wind waves, choppy", maxPeriod: 4 },
  { state: "Short", code: 1, description: "Young wind seas", maxPeriod: 6 },
  { state: "Moderate", code: 2, description: "Developed seas", maxPeriod: 8 },
  { state: "Long", code: 3, description: "Mature swells", maxPeriod: 12 },
  { state: "Very Long", code: 4, description: "Long-distance swells", maxPeriod: 16 },
  { state: "Extreme", code: 5, description: "Ultra-long swells", maxPeriod: Infinity }
];

export const getWavePeriodClass = (period) => {
  if (typeof period !== 'number' || period < 0) {
    return WAVE_PERIOD_CLASSES[0];
  }
  
  return WAVE_PERIOD_CLASSES.find(cls => period <= cls.maxPeriod) || WAVE_PERIOD_CLASSES[WAVE_PERIOD_CLASSES.length - 1];
};

// Peak period classifications (typically longer than mean periods)
export const PEAK_PERIOD_CLASSES = [
  { state: "Choppy", code: 0, description: "Windy conditions", maxPeriod: 5 },
  { state: "Mixed", code: 1, description: "Wind + swell mix", maxPeriod: 8 },
  { state: "Swell", code: 2, description: "Dominant swell", maxPeriod: 12 },
  { state: "Long Swell", code: 3, description: "Distant storm swell", maxPeriod: 18 },
  { state: "Ultra Swell", code: 4, description: "Very distant swell", maxPeriod: Infinity }
];

export const getPeakPeriodClass = (period) => {
  if (typeof period !== 'number' || period < 0) {
    return PEAK_PERIOD_CLASSES[0];
  }
  
  return PEAK_PERIOD_CLASSES.find(cls => period <= cls.maxPeriod) || PEAK_PERIOD_CLASSES[PEAK_PERIOD_CLASSES.length - 1];
};

// Compass direction helper with 16-point compass
const COMPASS_DIRECTIONS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
];

export const getCompassDirection = (degrees) => {
  if (degrees === null || degrees === undefined || isNaN(degrees)) return '';
  const normalizedDegrees = ((degrees % 360) + 360) % 360; // Normalize to 0-360
  const index = Math.round(normalizedDegrees / 22.5) % 16;
  return COMPASS_DIRECTIONS[index];
};

// Get the opposite compass direction (for showing where waves are going TO)
export const getOppositeCompassDirection = (degrees) => {
  if (degrees === null || degrees === undefined || isNaN(degrees)) return '';
  const oppositeDegrees = ((degrees + 180) % 360);
  return getCompassDirection(oppositeDegrees);
};

// Extract coverage timeseries with better error handling
export const extractCoverageTimeseries = (json, variable) => {
  try {
    if (
      !json?.domain?.axes?.t?.values ||
      !json?.ranges?.[variable]?.values
    ) {
      return null;
    }
    
    const times = json.domain.axes.t.values;
    const values = json.ranges[variable].values;
    
    if (times.length !== values.length) {
      console.warn(`Time/value length mismatch for ${variable}: ${times.length} vs ${values.length}`);
      return null;
    }
    
    return { times, values };
  } catch (error) {
    console.error(`Error extracting timeseries for ${variable}:`, error);
    return null;
  }
};

// Filter to six-hourly data with validation
export const filterToSixHourly = (times, values) => {
  const filteredTimes = [];
  const filteredValues = [];
  
  if (!times || !values || times.length !== values.length) {
    return { times: filteredTimes, values: filteredValues };
  }
  
  for (let i = 0; i < times.length; i++) {
    try {
      const date = new Date(times[i]);
      if (isNaN(date.getTime())) continue; // Skip invalid dates
      
      const hour = date.getUTCHours();
      
      // Keep times at 00:00, 06:00, 12:00, 18:00 UTC
      if (hour % COLOR_INTERPOLATION.SIX_HOUR_INTERVAL === 0) {
        filteredTimes.push(times[i]);
        filteredValues.push(values[i]);
      }
    } catch (error) {
      console.warn(`Invalid time format at index ${i}:`, times[i]);
      continue;
    }
  }
  
  return { times: filteredTimes, values: filteredValues };
};

// Enhanced time formatting with proper error handling
export const formatTableTime = (timeStr) => {
  try {
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) {
      return timeStr;
    }
    
    // Format exactly like Niue: Day-of-week / Day number / Hour
    const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    const dayCode = days[date.getDay()];
    const dayNum = String(date.getDate());
    const hour = `${String(date.getHours()).padStart(2, '0')}hr`;
    
    return `${dayCode}\n${dayNum}\n${hour}`;
  } catch (error) {
    console.warn('Invalid time format:', timeStr, error);
    return timeStr;
  }
};

// Smart number formatting with proper type checking
export const formatSmart = (value, decimalPlaces = 0) => {
  if (value === null || value === undefined) return '';
  
  let numValue;
  if (typeof value === 'number') {
    numValue = value;
  } else if (typeof value === 'string') {
    numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return String(value).slice(0, 8); // Truncate long strings
    }
  } else {
    return String(value).slice(0, 8);
  }
  
  if (!isFinite(numValue)) return '';
  
  const dp = Math.max(0, Math.min(10, Math.floor(decimalPlaces))); // Clamp decimal places
  return numValue.toFixed(dp);
};

// Parse label configuration string
export const parseLabelConfig = (label) => {
  const configMatch = label.match(/\{([^}]*)\}/);
  let config = {
    calc: false,
    type: 'bu',
    min: 0,
    max: 10,
    decimalPlaces: 0
  };
  
  if (configMatch) {
    const configParts = configMatch[1].split('/');
    configParts.forEach(part => {
      const trimmed = part.trim().toLowerCase();
      if (trimmed === 'calc') {
        config.calc = true;
      } else if (['jet', 'dir', 'rd', 'bu', 'ylgnbu', 'viridis', 'spectral', 'magenta', 'plasma'].includes(trimmed)) {
        config.type = trimmed;
      } else if (/^\d+\s*-\s*\d+$/.test(trimmed)) {
        const [min, max] = trimmed.split('-').map(Number);
        if (!isNaN(min) && !isNaN(max) && max > min) {
          config.min = min;
          config.max = max;
        }
      } else if (/^\d+$/.test(trimmed)) {
        const dp = parseInt(trimmed, 10);
        if (dp >= 0 && dp <= 10) {
          config.decimalPlaces = dp;
        }
      }
    });
  }
  
  const cleanLabel = label.replace(/\{[^}]*\}/, '').trim();
  return { ...config, cleanLabel };
};

// Calculate dynamic range with proper validation
export const calculateDynamicRange = (values, defaultMin = 0, defaultMax = 10) => {
  if (!Array.isArray(values)) {
    return { min: defaultMin, max: defaultMax };
  }
  
  const validValues = values.filter(v => 
    typeof v === 'number' && 
    isFinite(v) && 
    !isNaN(v)
  );
  
  if (validValues.length === 0) {
    return { min: defaultMin, max: defaultMax };
  }
  
  const min = Math.min(...validValues);
  const max = Math.max(...validValues);
  
  // Avoid division by zero or very small ranges
  const range = max - min;
  if (range <= 0) {
    return { min: Math.max(0, min - 1), max: min + 1 };
  }
  
  const padding = range * COLOR_INTERPOLATION.RANGE_PADDING_PERCENT;
  
  return {
    min: Math.max(0, Math.floor((min - padding) * 10) / 10),
    max: Math.ceil((max + padding) * 10) / 10
  };
};