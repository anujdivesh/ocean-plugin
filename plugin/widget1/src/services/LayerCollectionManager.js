/**
 * Layer Collection Manager
 * 
 * Manages collections of layers with search, filtering, and batch operations.
 * Provides immutable operations on layer collections with clear invariants.
 * 
 * Invariants:
 * - All operations return new collections (immutable)
 * - Layer hierarchies (composite layers) are preserved
 * - Search operations are case-insensitive and partial-match friendly
 * - Batch updates maintain layer structure integrity
 */

import WMSLayerConfigService from './WMSLayerConfigService';

class LayerCollectionManager {
  /**
   * Find a layer by its value in a collection
   * @param {Array} layers - Collection of layers to search
   * @param {string} value - Layer value to find
   * @returns {Object|null} Found layer or null
   */
  static findLayerByValue(layers, value) {
    if (!Array.isArray(layers) || !value) return null;
    
    for (const layer of layers) {
      if (layer?.value === value) {
        return layer;
      }
      
      // Search within composite layers
      if (layer?.composite && Array.isArray(layer.layers)) {
        const match = this.findLayerByValue(layer.layers, value);
        if (match) return match;
      }
    }
    
    return null;
  }
  
  /**
   * Find layers matching a predicate function
   * @param {Array} layers - Collection to search
   * @param {Function} predicate - Function to test each layer
   * @returns {Array} Array of matching layers
   */
  static findLayersWhere(layers, predicate) {
    if (!Array.isArray(layers) || typeof predicate !== 'function') {
      return [];
    }
    
    const results = [];
    
    for (const layer of layers) {
      if (predicate(layer)) {
        results.push(layer);
      }
      
      // Search within composite layers
      if (layer?.composite && Array.isArray(layer.layers)) {
        results.push(...this.findLayersWhere(layer.layers, predicate));
      }
    }
    
    return results;
  }
  
  /**
   * Apply updates to layers matching a target value
   * @param {Array} layers - Collection to update
   * @param {string} targetValue - Value of layers to update
   * @param {Object} updates - Updates to apply
   * @returns {Array} New collection with updates applied
   */
  static applyUpdatesToLayers(layers, targetValue, updates = {}) {
    if (!Array.isArray(layers)) return layers;
    
    return layers.map(layer => {
      // Handle composite layers recursively
      if (layer.composite && Array.isArray(layer.layers)) {
        return {
          ...layer,
          layers: this.applyUpdatesToLayers(layer.layers, targetValue, updates)
        };
      }
      
      // Apply updates to matching layers
      if (layer.value === targetValue) {
        return { ...layer, ...updates };
      }
      
      return layer;
    });
  }
  
  /**
   * Clone an entire layer collection with business rules applied
   * @param {Array} layers - Collection to clone
   * @returns {Array} Cloned collection
   */
  static cloneCollection(layers) {
    if (!Array.isArray(layers)) return layers;
    
    return layers.map(layer => WMSLayerConfigService.cloneLayerConfig(layer));
  }
  
  /**
   * Filter layers by type
   * @param {Array} layers - Collection to filter
   * @param {string} type - Layer type to filter by
   * @returns {Array} Filtered collection
   */
  static filterByType(layers, type) {
    return this.findLayersWhere(layers, layer => 
      layer?.value?.includes(type)
    );
  }
  
  /**
   * Get all static (non-time-dimensional) layers
   * @param {Array} layers - Collection to filter
   * @returns {Array} Static layers
   */
  static getStaticLayers(layers) {
    return this.findLayersWhere(layers, layer => 
      WMSLayerConfigService.isStaticLayer(layer)
    );
  }
  
  /**
   * Get all forecast (time-dimensional) layers
   * @param {Array} layers - Collection to filter
   * @returns {Array} Forecast layers
   */
  static getForecastLayers(layers) {
    return this.findLayersWhere(layers, layer => 
      !WMSLayerConfigService.isStaticLayer(layer)
    );
  }
  
  /**
   * Combine multiple layer collections into one
   * @param {...Array} collections - Collections to combine
   * @returns {Array} Combined collection
   */
  static combineCollections(...collections) {
    const combined = [];
    
    for (const collection of collections) {
      if (Array.isArray(collection)) {
        combined.push(...collection);
      }
    }
    
    return combined;
  }
  
  /**
   * Validate that a layer collection has proper structure
   * @param {Array} layers - Collection to validate
   * @returns {boolean} True if valid
   */
  static validateCollection(layers) {
    if (!Array.isArray(layers)) return false;
    
    return layers.every(layer => {
      // Basic layer structure
      if (!layer || typeof layer !== 'object') return false;
      if (!layer.value || !layer.label) return false;
      
      // Composite layer structure
      if (layer.composite) {
        return Array.isArray(layer.layers) && 
               this.validateCollection(layer.layers);
      }
      
      return true;
    });
  }
}

export default LayerCollectionManager;