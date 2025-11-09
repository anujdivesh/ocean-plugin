/**
 * Legend Range Calculator Service
 * 
 * Handles legend range calculations, color mapping, and scale generation.
 * 
 * INVARIANTS:
 * - Min value is always less than or equal to max value
 * - Scale ticks are sorted in ascending order
 * - Color ranges match the number of scale intervals
 * - Percentage calculations are clamped to [0, 100]
 * - NaN/Infinite values are filtered out before calculations
 */

/**
 * Validates and sanitizes numeric input
 * @param {any} value - Value to validate
 * @returns {number|null} Sanitized number or null if invalid
 */
const sanitizeNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

/**
 * Calculates min and max values from a dataset
 * @param {Array} values - Array of numeric values
 * @returns {Object} Object with min and max properties
 */
export const calculateMinMax = (values) => {
  if (!Array.isArray(values) || values.length === 0) {
    return { min: 0, max: 1 };
  }

  const sanitizedValues = values
    .map(sanitizeNumber)
    .filter(val => val !== null);

  if (sanitizedValues.length === 0) {
    return { min: 0, max: 1 };
  }

  let min = sanitizedValues[0];
  let max = sanitizedValues[0];

  for (let i = 1; i < sanitizedValues.length; i++) {
    const val = sanitizedValues[i];
    if (val < min) min = val;
    if (val > max) max = val;
  }

  // Handle case where all values are the same
  if (min === max) {
    return { min: min - 0.5, max: max + 0.5 };
  }

  // Ensure min is less than max (invariant)
  if (min > max) {
    return { min: max, max: min };
  }

  return { min, max };
};

/**
 * Generates evenly spaced scale ticks between min and max
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {number} tickCount - Number of ticks to generate
 * @returns {Array} Array of tick values
 */
export const generateEvenTicks = (min, max, tickCount = 5) => {
  const sanitizedMin = sanitizeNumber(min);
  const sanitizedMax = sanitizeNumber(max);
  const sanitizedCount = Math.max(2, Math.floor(tickCount));

  if (sanitizedMin === null || sanitizedMax === null) {
    return [0, 1];
  }

  if (sanitizedMin === sanitizedMax) {
    return [sanitizedMin];
  }

  const ticks = [];
  const step = (sanitizedMax - sanitizedMin) / (sanitizedCount - 1);

  for (let i = 0; i < sanitizedCount; i++) {
    const tick = sanitizedMin + (step * i);
    ticks.push(Number(tick.toFixed(10))); // Avoid floating point precision issues
  }

  return ticks;
};

/**
 * Generates nice-looking scale ticks using smart rounding
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {number} targetCount - Target number of ticks
 * @returns {Array} Array of rounded tick values
 */
export const generateNiceTicks = (min, max, targetCount = 5) => {
  const sanitizedMin = sanitizeNumber(min);
  const sanitizedMax = sanitizeNumber(max);

  if (sanitizedMin === null || sanitizedMax === null) {
    return [0, 1];
  }

  if (sanitizedMin === sanitizedMax) {
    return [sanitizedMin];
  }

  const range = sanitizedMax - sanitizedMin;
  const roughStep = range / (targetCount - 1);
  
  // Find a "nice" step size
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalizedStep = roughStep / magnitude;
  
  let niceStep;
  if (normalizedStep <= 1) niceStep = 1;
  else if (normalizedStep <= 2) niceStep = 2;
  else if (normalizedStep <= 5) niceStep = 5;
  else niceStep = 10;
  
  niceStep *= magnitude;
  
  // Find nice bounds
  const niceMin = Math.floor(sanitizedMin / niceStep) * niceStep;
  const niceMax = Math.ceil(sanitizedMax / niceStep) * niceStep;
  
  // Generate ticks
  const ticks = [];
  for (let tick = niceMin; tick <= niceMax + niceStep * 0.001; tick += niceStep) {
    const roundedTick = Number(tick.toFixed(10));
    if (roundedTick >= sanitizedMin && roundedTick <= sanitizedMax) {
      ticks.push(roundedTick);
    }
  }
  
  return ticks.length > 0 ? ticks : [sanitizedMin, sanitizedMax];
};

/**
 * Calculates the position percentage of a value within a range
 * @param {number} value - Value to calculate position for
 * @param {number} min - Range minimum
 * @param {number} max - Range maximum
 * @returns {number} Position as percentage (0-100)
 */
export const calculatePositionPercentage = (value, min, max) => {
  const sanitizedValue = sanitizeNumber(value);
  const sanitizedMin = sanitizeNumber(min);
  const sanitizedMax = sanitizeNumber(max);

  if (sanitizedValue === null || sanitizedMin === null || sanitizedMax === null) {
    return 0;
  }

  if (sanitizedMin === sanitizedMax) {
    return 50; // Center position for single value
  }

  const percentage = ((sanitizedValue - sanitizedMin) / (sanitizedMax - sanitizedMin)) * 100;
  
  // Clamp to [0, 100] range (invariant)
  return Math.max(0, Math.min(100, percentage));
};

/**
 * Generates color stops for a gradient based on values and colors
 * @param {Array} values - Array of numeric values
 * @param {Array} colors - Array of color strings
 * @returns {Array} Array of CSS gradient stop strings
 */
export const generateColorStops = (values, colors) => {
  if (!Array.isArray(values) || !Array.isArray(colors)) {
    return ['#ffffff 0%', '#000000 100%'];
  }

  if (values.length !== colors.length) {
    console.warn('Legend Range Calculator: Values and colors arrays must have same length');
    return ['#ffffff 0%', '#000000 100%'];
  }

  const { min, max } = calculateMinMax(values);
  
  return values.map((value, index) => {
    const position = calculatePositionPercentage(value, min, max);
    const color = colors[index] || '#ffffff';
    return `${color} ${position.toFixed(1)}%`;
  });
};

/**
 * Creates a complete legend configuration object
 * @param {Object} options - Legend configuration options
 * @returns {Object} Complete legend configuration
 */
export const createLegendConfig = (options = {}) => {
  const {
    values = [],
    colors = [],
    title = 'Legend',
    unit = '',
    unitSymbol = '',
    tickCount = 5,
    useNiceTicks = true,
    customTicks = null
  } = options;

  const { min, max } = calculateMinMax(values);
  
  let scaleTicks;
  if (customTicks && Array.isArray(customTicks)) {
    scaleTicks = [...customTicks].sort((a, b) => a - b);
  } else if (useNiceTicks) {
    scaleTicks = generateNiceTicks(min, max, tickCount);
  } else {
    scaleTicks = generateEvenTicks(min, max, tickCount);
  }

  const gradientStops = generateColorStops(scaleTicks, colors);

  return {
    title,
    unit,
    unitSymbol,
    minValue: min,
    maxValue: max,
    scaleTicks,
    gradientStops,
    displayType: 'gradient',
    valueFormatter: (value) => {
      const num = sanitizeNumber(value);
      if (num === null) return '';
      
      // Smart formatting based on magnitude
      if (Math.abs(num) >= 1000) {
        return num.toFixed(0);
      } else if (Math.abs(num) >= 10) {
        return num.toFixed(1);
      } else {
        return num.toFixed(2);
      }
    }
  };
};

/**
 * Updates an existing legend configuration with new data
 * @param {Object} existingConfig - Existing legend configuration
 * @param {Object} updates - Properties to update
 * @returns {Object} Updated legend configuration
 */
export const updateLegendConfig = (existingConfig, updates) => {
  const merged = { ...existingConfig, ...updates };
  
  // Recalculate dependent properties if values changed
  if (updates.values || updates.colors) {
    const recalculated = createLegendConfig({
      ...merged,
      values: updates.values || existingConfig.values,
      colors: updates.colors || existingConfig.colors
    });
    
    return { ...merged, ...recalculated };
  }
  
  return merged;
};