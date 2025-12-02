/**
 * Map Interaction Service
 * 
 * Handles map click interactions with clean separation of concerns:
 * - WMS layer detection and interaction
 * - Feature info data fetching
 * - Coordinate transformations
 * - Error handling and fallbacks
 * 
 * Invariants:
 * - Never accesses private Leaflet APIs (like map._layers)
 * - All operations are side-effect free (return data, don't mutate)
 * - Proper error handling with fallback data
 * - Logging is centralized and configurable
 */

class MapInteractionService {
  constructor(options = {}) {
    this.debugMode = options.debugMode || false;
    this.fallbackBboxSize = options.fallbackBboxSize || 0.01; // ~1km at equator
  }
  
  /**
   * Handle map click event and return interaction data
   * @param {Object} clickEvent - Leaflet click event
   * @param {L.Map} map - Leaflet map instance
   * @param {Date} currentTime - Current time for WMS requests
   * @returns {Promise<Object>} Interaction data
   */
  async handleMapClick(clickEvent, map, currentTime, options = {}) {
    this._log('Map clicked at:', clickEvent.latlng);
    
    const coordinateData = this._extractCoordinateData(clickEvent, map, currentTime);
    
    // Try WMS layer interaction first
    const wmsResult = await this._tryWMSInteraction(clickEvent, map, coordinateData, options);
    if (wmsResult.handled) {
      return wmsResult.data;
    }
    
    // Fallback to general map interaction
    return this._createFallbackData(coordinateData);
  }
  
  /**
   * Extract coordinate and viewport data from click event
   * @private
   */
  _extractCoordinateData(clickEvent, map, currentTime) {
    const point = map.latLngToContainerPoint(clickEvent.latlng);
    const size = map.getSize();
    const bounds = map.getBounds();
    
    return {
      latlng: clickEvent.latlng,
      point: {
        x: Math.round(point.x),
        y: Math.round(point.y)
      },
      viewport: {
        width: size.x,
        height: size.y
      },
      bbox: bounds.toBBoxString(),
      timeDimension: currentTime?.toISOString() || ""
    };
  }
  
  /**
   * Try to interact with WMS layers
   * @private
   */
  async _tryWMSInteraction(clickEvent, map, coordinateData, options = {}) {
    const wmsLayers = this._findWMSLayers(map);
    
    if (wmsLayers.length === 0) {
      this._log('No WMS layers found for interaction');
      return { handled: false };
    }
    
    // Use the first WMS layer that can handle the interaction
    const activeLayer = wmsLayers[0];
    this._log('WMS layer found, handling click with:', activeLayer);
    
    try {
      // Create loading state data
      const loadingData = {
        ...coordinateData,
        featureInfo: "Loading...",
        layerType: "wms",
        status: "loading"
      };
      
      // Get actual feature info, passing through options
      const featureData = await activeLayer.getFeatureInfo(clickEvent.latlng, options);
      
      return {
        handled: true,
        data: {
          ...coordinateData,
          ...featureData,
          layerType: "wms",
          status: "success"
        },
        loadingData
      };
      
    } catch (error) {
      this._logError('Error getting WMS feature info:', error);
      
      return {
        handled: true,
        data: {
          ...coordinateData,
          featureInfo: "Error loading WMS data",
          layerType: "wms",
          status: "error",
          error: error.message
        }
      };
    }
  }
  
  /**
   * Find WMS layers using public Leaflet APIs only
   * @private
   */
  _findWMSLayers(map) {
    const wmsLayers = [];
    
    // Use proper Leaflet API to iterate layers
    map.eachLayer((layer) => {
      if (layer && layer.getFeatureInfo && typeof layer.getFeatureInfo === 'function') {
        wmsLayers.push(layer);
      }
    });
    
    this._log(`Found ${wmsLayers.length} WMS layers`);
    return wmsLayers;
  }
  
  /**
   * Create fallback interaction data when no WMS layer handles the click
   * @private
   */
  _createFallbackData(coordinateData) {
    this._log('Creating fallback interaction data');
    
    // Create a small bbox around the clicked point
    const bboxSize = this.fallbackBboxSize;
    const fallbackBbox = [
      coordinateData.latlng.lng - bboxSize/2,
      coordinateData.latlng.lat - bboxSize/2,
      coordinateData.latlng.lng + bboxSize/2,
      coordinateData.latlng.lat + bboxSize/2
    ].join(',');
    
    return {
      ...coordinateData,
      bbox: fallbackBbox,
      featureInfo: "No active WMS layer",
      layerType: "fallback",
      status: "fallback"
    };
  }
  
  /**
   * Centralized logging
   * @private
   */
  _log(...args) {
    if (this.debugMode) {
      console.log('[MapInteraction]', ...args);
    }
  }
  
  /**
   * Centralized error logging
   * @private
   */
  _logError(...args) {
    console.error('[MapInteraction]', ...args);
  }
  
  /**
   * Enable or disable debug logging
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }
}

export default MapInteractionService;