/**
 * Layer Configuration Service
 * 
 * Handles layer state management, cloning, and configuration updates.
 * 
 * INVARIANTS:
 * - Layer configs are immutable - always clone before modifying
 * - Each layer must have a unique 'value' identifier
 * - Composite layers contain nested 'layers' array
 * - Static layers have 'isStatic: true' flag
 * - Dynamic layer updates preserve original structure
 */

/**
 * Deep clones a layer configuration to prevent mutations
 * @param {Object} layer - Layer configuration object
 * @returns {Object} Deep cloned layer configuration
 */
export const cloneLayerConfig = (layer) => {
  if (!layer || typeof layer !== 'object') {
    return layer;
  }

  const cloned = { ...layer };

  // Deep clone nested arrays
  if (Array.isArray(layer.layers)) {
    cloned.layers = layer.layers.map(cloneLayerConfig);
  }

  // Deep clone nested objects that might be mutated
  if (layer.style && typeof layer.style === 'object') {
    cloned.style = { ...layer.style };
  }

  if (layer.metadata && typeof layer.metadata === 'object') {
    cloned.metadata = { ...layer.metadata };
  }

  return cloned;
};

/**
 * Creates a complete copy of layer configurations array
 * @param {Array} layers - Array of layer configurations
 * @returns {Array} Array of cloned layer configurations
 */
export const cloneLayerConfigs = (layers) => {
  if (!Array.isArray(layers)) {
    return [];
  }
  return layers.map(cloneLayerConfig);
};

/**
 * Updates a specific layer in a layer configuration array
 * @param {Array} layers - Current layer configurations
 * @param {string} layerValue - Layer identifier to update
 * @param {Object} updates - Properties to update
 * @returns {Array} New array with updated layer
 */
export const updateLayerConfig = (layers, layerValue, updates) => {
  return layers.map(layer => {
    if (layer.value === layerValue) {
      return { ...cloneLayerConfig(layer), ...updates };
    }
    
    // Handle composite layers
    if (layer.composite && Array.isArray(layer.layers)) {
      const updatedSubLayers = updateLayerConfig(layer.layers, layerValue, updates);
      if (updatedSubLayers !== layer.layers) {
        return { ...cloneLayerConfig(layer), layers: updatedSubLayers };
      }
    }
    
    return layer;
  });
};

/**
 * Finds a layer configuration by value, supporting composite layers
 * @param {Array} layers - Array of layer configurations
 * @param {string} layerValue - Layer identifier to find
 * @returns {Object|null} Found layer configuration or null
 */
export const findLayerConfig = (layers, layerValue) => {
  if (!Array.isArray(layers)) return null;
  
  for (const layer of layers) {
    if (layer?.value === layerValue) {
      return layer;
    }
    
    // Search in composite layers
    if (layer?.composite && Array.isArray(layer.layers)) {
      const found = findLayerConfig(layer.layers, layerValue);
      if (found) return found;
    }
  }
  
  return null;
};

/**
 * Validates layer configuration structure
 * @param {Object} layer - Layer configuration to validate
 * @returns {Object} Validation result with isValid boolean and errors array
 */
export const validateLayerConfig = (layer) => {
  const errors = [];
  
  if (!layer || typeof layer !== 'object') {
    errors.push('Layer must be an object');
    return { isValid: false, errors };
  }
  
  if (!layer.value || typeof layer.value !== 'string') {
    errors.push('Layer must have a string "value" identifier');
  }
  
  if (!layer.label || typeof layer.label !== 'string') {
    errors.push('Layer must have a string "label"');
  }
  
  if (layer.composite) {
    if (!Array.isArray(layer.layers) || layer.layers.length === 0) {
      errors.push('Composite layer must have non-empty "layers" array');
    } else {
      // Validate sub-layers
      layer.layers.forEach((subLayer, index) => {
        const subValidation = validateLayerConfig(subLayer);
        if (!subValidation.isValid) {
          errors.push(`Sub-layer ${index}: ${subValidation.errors.join(', ')}`);
        }
      });
    }
  } else {
    if (!layer.wmsUrl || typeof layer.wmsUrl !== 'string') {
      errors.push('Non-composite layer must have a string "wmsUrl"');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Merges default layer properties with custom configuration
 * @param {Object} defaultConfig - Default layer properties
 * @param {Object} customConfig - Custom layer properties
 * @returns {Object} Merged layer configuration
 */
export const mergeLayerConfig = (defaultConfig, customConfig) => {
  const merged = cloneLayerConfig(defaultConfig);
  
  // Merge top-level properties
  Object.keys(customConfig).forEach(key => {
    if (key === 'layers' && Array.isArray(customConfig.layers)) {
      // Handle composite layer merging
      merged.layers = customConfig.layers.map(customLayer => {
        const defaultLayer = merged.layers?.find(dl => dl.value === customLayer.value);
        return defaultLayer 
          ? mergeLayerConfig(defaultLayer, customLayer)
          : cloneLayerConfig(customLayer);
      });
    } else {
      merged[key] = customConfig[key];
    }
  });
  
  return merged;
};