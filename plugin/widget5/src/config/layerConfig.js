/**
 * Layer Configuration for Cook Islands Dashboard
 * Centralizes layer-specific settings for consistency across components
 */

// Inundation layer identifiers - exact match to avoid false positives
export const INUNDATION_LAYER_IDS = [
  'H_max',          // THREDDS inundation layer
  'raro_inun/Band1',
  'raro_inun'
];

/**
 * Check if a layer value corresponds to an inundation layer
 * Uses exact matching against known inundation layer identifiers
 * @param {string} layerValue - The layer value to check
 * @returns {boolean} True if the layer is an inundation layer
 */
export const isInundationLayer = (layerValue) => {
  if (!layerValue) return false;
  return INUNDATION_LAYER_IDS.some(id => layerValue === id || layerValue.endsWith(id));
};

// Layer bounds for auto-zoom functionality
export const LAYER_BOUNDS = {
  // Rarotonga inundation layer bounds (THREDDS - actual data extent from GetCapabilities)
  'H_max': {
    southWest: [-21.281671213355985, -159.83717346191406],
    northEast: [-21.19118441998148, -159.71783447265625]
  },
  // Rarotonga inundation layer bounds (legacy ncWMS)
  'raro_inun/Band1': {
    southWest: [-21.28, -159.85],
    northEast: [-21.17, -159.70]
  },
  'raro_inun': {
    southWest: [-21.28, -159.85],
    northEast: [-21.17, -159.70]
  }
};

/**
 * Get bounds for a layer if available
 * Uses exact matching first, then checks for parent key matching
 * @param {string} layerValue - The layer value
 * @returns {Object|null} Bounds object with southWest and northEast, or null
 */
export const getLayerBounds = (layerValue) => {
  if (!layerValue) return null;
  
  // Check for exact match first
  if (LAYER_BOUNDS[layerValue]) {
    return LAYER_BOUNDS[layerValue];
  }
  
  // Check if the layer value starts with a known parent key (e.g., 'raro_inun/Band1' starts with 'raro_inun')
  for (const key of Object.keys(LAYER_BOUNDS)) {
    if (layerValue.startsWith(key + '/') || layerValue.startsWith(key)) {
      return LAYER_BOUNDS[key];
    }
  }
  
  return null;
};

// Zoom threshold for showing popup instead of bottom canvas for inundation
export const INUNDATION_POPUP_ZOOM_THRESHOLD = 14;
