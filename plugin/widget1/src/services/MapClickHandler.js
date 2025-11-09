/**
 * Map Click Handler Service
 * 
 * Handles map click interactions with proper separation of concerns:
 * - WMS layer detection and interaction
 * - Feature info requests and data processing
 * - Loading state management
 * - Error handling and fallbacks
 * 
 * INVARIANTS:
 * - Only accesses Leaflet public APIs, never private properties
 * - Loading states are always shown before async operations
 * - Errors are caught and converted to user-friendly messages
 * - Only one feature info request at a time per click
 */

/**
 * Logger abstraction with configurable levels
 * Prevents console statements from drifting and provides control
 */
class MapClickLogger {
  constructor(enabled = true, level = 'info') {
    this.enabled = enabled;
    this.level = level;
    this.levels = { debug: 0, info: 1, warn: 2, error: 3 };
  }

  _shouldLog(level) {
    return this.enabled && this.levels[level] >= this.levels[this.level];
  }

  debug(message, ...args) {
    if (this._shouldLog('debug')) {
      console.debug(`[MapClick] ${message}`, ...args);
    }
  }

  info(message, ...args) {
    if (this._shouldLog('info')) {
      console.info(`[MapClick] ${message}`, ...args);
    }
  }

  warn(message, ...args) {
    if (this._shouldLog('warn')) {
      console.warn(`[MapClick] ${message}`, ...args);
    }
  }

  error(message, ...args) {
    if (this._shouldLog('error')) {
      console.error(`[MapClick] ${message}`, ...args);
    }
  }
}

/**
 * Safe layer detection that avoids private Leaflet properties
 */
export class SafeLayerDetector {
  constructor(logger = new MapClickLogger()) {
    this.logger = logger;
  }

  /**
   * Finds WMS layers with feature info capability using safe public APIs
   * @param {L.Map} map - Leaflet map instance
   * @returns {Array} Array of WMS layers with getFeatureInfo method
   */
  findWMSLayers(map) {
    if (!map || typeof map.eachLayer !== 'function') {
      this.logger.warn('Invalid map instance provided');
      return [];
    }

    const wmsLayers = [];
    
    try {
      // Use public eachLayer API instead of private _layers
      map.eachLayer((layer) => {
        if (this.isWMSLayer(layer)) {
          wmsLayers.push(layer);
          this.logger.debug('Found WMS layer', { layer: layer.constructor.name });
        }
      });
    } catch (error) {
      this.logger.error('Error scanning layers:', error);
      return [];
    }

    this.logger.info(`Found ${wmsLayers.length} WMS layers`);
    return wmsLayers;
  }

  /**
   * Safely checks if a layer is a WMS layer with feature info capability
   * @param {Object} layer - Layer to check
   * @returns {boolean} True if layer supports feature info
   */
  isWMSLayer(layer) {
    return !!(
      layer &&
      typeof layer.getFeatureInfo === 'function' &&
      layer.getFeatureInfo.length > 0 // Has parameters, not just a stub
    );
  }
}

/**
 * Handles WMS coordinate calculations and parameter generation
 */
export class WMSCoordinateCalculator {
  constructor(logger = new MapClickLogger()) {
    this.logger = logger;
  }

  /**
   * Calculates WMS GetFeatureInfo parameters from map click
   * @param {Object} clickEvent - Leaflet click event
   * @param {L.Map} map - Leaflet map instance
   * @returns {Object} WMS parameters object
   */
  calculateWMSParams(clickEvent, map) {
    if (!clickEvent?.latlng || !map) {
      this.logger.error('Invalid click event or map instance');
      return null;
    }

    try {
      const point = map.latLngToContainerPoint(clickEvent.latlng);
      const size = map.getSize();
      const bounds = map.getBounds();

      // Validate calculations
      if (!point || !size || !bounds) {
        this.logger.error('Failed to calculate map parameters');
        return null;
      }

      const params = {
        latlng: clickEvent.latlng,
        bbox: bounds.toBBoxString(),
        x: Math.round(point.x),
        y: Math.round(point.y),
        width: size.x,
        height: size.y,
        timestamp: new Date().toISOString()
      };

      this.logger.debug('Calculated WMS parameters', params);
      return params;
    } catch (error) {
      this.logger.error('Error calculating WMS parameters:', error);
      return null;
    }
  }

  /**
   * Creates a small bounding box around a point for fallback queries
   * @param {L.LatLng} latlng - Center point
   * @param {number} size - Box size in decimal degrees
   * @returns {string} Comma-separated bbox string
   */
  createPointBBox(latlng, size = 0.01) {
    if (!latlng || typeof latlng.lat !== 'number' || typeof latlng.lng !== 'number') {
      this.logger.error('Invalid latlng provided for bbox creation');
      return '0,0,0,0';
    }

    const halfSize = size / 2;
    const bbox = [
      latlng.lng - halfSize,
      latlng.lat - halfSize,
      latlng.lng + halfSize,
      latlng.lat + halfSize
    ].join(',');

    this.logger.debug('Created point bbox', { center: latlng, bbox });
    return bbox;
  }
}

/**
 * Manages loading states and optimistic UI updates
 */
export class FeatureInfoStateManager {
  constructor(logger = new MapClickLogger()) {
    this.logger = logger;
    this.activeRequests = new Set();
  }

  /**
   * Creates loading state data for immediate UI feedback
   * @param {Object} wmsParams - WMS parameters from coordinate calculator
   * @param {string} currentTime - Current time dimension
   * @returns {Object} Loading state data
   */
  createLoadingState(wmsParams, currentTime = '') {
    if (!wmsParams) {
      this.logger.error('Cannot create loading state without WMS parameters');
      return null;
    }

    const loadingData = {
      ...wmsParams,
      timeDimension: currentTime,
      featureInfo: 'Loading...',
      isLoading: true,
      requestId: this.generateRequestId()
    };

    this.logger.info('Created loading state', { requestId: loadingData.requestId });
    return loadingData;
  }

  /**
   * Creates error state data for failed requests
   * @param {Object} loadingData - Original loading data
   * @param {Error} error - Error that occurred
   * @returns {Object} Error state data
   */
  createErrorState(loadingData, error) {
    const errorData = {
      ...loadingData,
      featureInfo: this.formatErrorMessage(error),
      isLoading: false,
      hasError: true,
      error: error.message
    };

    this.logger.error('Created error state', { 
      requestId: loadingData.requestId, 
      error: error.message 
    });
    
    return errorData;
  }

  /**
   * Creates fallback state for when no WMS layers handle the click
   * @param {Object} wmsParams - WMS parameters
   * @param {string} currentTime - Current time dimension
   * @returns {Object} Fallback state data
   */
  createFallbackState(wmsParams, currentTime = '') {
    const fallbackData = {
      ...wmsParams,
      timeDimension: currentTime,
      featureInfo: 'No active WMS layer',
      isLoading: false,
      isFallback: true
    };

    this.logger.info('Created fallback state');
    return fallbackData;
  }

  /**
   * Tracks active requests to prevent duplicates
   * @param {string} requestId - Request identifier
   */
  trackRequest(requestId) {
    this.activeRequests.add(requestId);
    this.logger.debug('Tracking request', { requestId, active: this.activeRequests.size });
  }

  /**
   * Stops tracking a request
   * @param {string} requestId - Request identifier
   */
  untrackRequest(requestId) {
    this.activeRequests.delete(requestId);
    this.logger.debug('Untracked request', { requestId, active: this.activeRequests.size });
  }

  /**
   * Checks if a request is still active (not cancelled)
   * @param {string} requestId - Request identifier
   * @returns {boolean} True if request is active
   */
  isRequestActive(requestId) {
    return this.activeRequests.has(requestId);
  }

  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  formatErrorMessage(error) {
    if (!error) return 'Unknown error occurred';
    
    // Common error patterns and user-friendly messages
    const message = error.message || error.toString();
    
    if (message.includes('timeout')) return 'Request timed out - please try again';
    if (message.includes('network')) return 'Network error - check connection';
    if (message.includes('404')) return 'Data not found for this location';
    if (message.includes('503') || message.includes('502')) return 'Service temporarily unavailable';
    
    return 'Error loading data - please try again';
  }
}

/**
 * Main map click handler that orchestrates all components
 */
export class MapClickHandler {
  constructor(options = {}) {
    const { 
      logger = new MapClickLogger(),
      enableLogging = true,
      logLevel = 'info'
    } = options;

    this.logger = enableLogging ? logger : new MapClickLogger(false, logLevel);
    this.layerDetector = new SafeLayerDetector(this.logger);
    this.coordinateCalculator = new WMSCoordinateCalculator(this.logger);
    this.stateManager = new FeatureInfoStateManager(this.logger);
  }

  /**
   * Handles a map click event with proper separation of concerns
   * @param {Object} clickEvent - Leaflet click event
   * @param {L.Map} map - Leaflet map instance
   * @param {Object} callbacks - UI callback functions
   * @param {string} currentTime - Current time dimension
   * @returns {Promise<void>}
   */
  async handleMapClick(clickEvent, map, callbacks, currentTime = '') {
    const { setBottomCanvasData } = callbacks;
    
    if (!clickEvent?.latlng || !map || !setBottomCanvasData) {
      this.logger.error('Invalid parameters provided to handleMapClick');
      return;
    }

    this.logger.info('Processing map click', { 
      lat: clickEvent.latlng.lat, 
      lng: clickEvent.latlng.lng 
    });

    // Calculate WMS parameters once
    const wmsParams = this.coordinateCalculator.calculateWMSParams(clickEvent, map);
    if (!wmsParams) {
      this.logger.error('Failed to calculate WMS parameters');
      return;
    }

    // Find WMS layers safely
    const wmsLayers = this.layerDetector.findWMSLayers(map);
    
    if (wmsLayers.length > 0) {
      await this.handleWMSClick(wmsLayers[0], wmsParams, callbacks, currentTime);
    } else {
      this.handleFallbackClick(wmsParams, callbacks, currentTime);
    }
  }

  /**
   * Handles click on WMS layer with loading state and error handling
   * @private
   */
  async handleWMSClick(wmsLayer, wmsParams, callbacks, currentTime) {
    const { setBottomCanvasData, setShowBottomCanvas } = callbacks;
    
    // Show loading state immediately
    const loadingData = this.stateManager.createLoadingState(wmsParams, currentTime);
    if (!loadingData) return;

    this.stateManager.trackRequest(loadingData.requestId);
    setBottomCanvasData(loadingData);
    setShowBottomCanvas(true);
    
    this.logger.info('Showing loading state for WMS request', { 
      requestId: loadingData.requestId 
    });

    try {
      // Make the actual feature info request
      const featureData = await wmsLayer.getFeatureInfo(wmsParams.latlng);
      
      // Check if request is still active (not cancelled by another click)
      if (!this.stateManager.isRequestActive(loadingData.requestId)) {
        this.logger.info('Request cancelled, ignoring response', { 
          requestId: loadingData.requestId 
        });
        return;
      }

      // Update with actual data
      const successData = {
        ...loadingData,
        ...featureData,
        isLoading: false,
        hasError: false
      };

      setBottomCanvasData(successData);
      this.logger.info('Updated with feature info data', { 
        requestId: loadingData.requestId 
      });

    } catch (error) {
      this.logger.error('Feature info request failed:', error);
      
      if (this.stateManager.isRequestActive(loadingData.requestId)) {
        const errorData = this.stateManager.createErrorState(loadingData, error);
        setBottomCanvasData(errorData);
      }
    } finally {
      this.stateManager.untrackRequest(loadingData.requestId);
    }
  }

  /**
   * Handles fallback click when no WMS layers are available
   * @private
   */
  handleFallbackClick(wmsParams, callbacks, currentTime) {
    const { setBottomCanvasData, setShowBottomCanvas } = callbacks;
    
    this.logger.info('No WMS layers found, using fallback');
    
    const fallbackData = this.stateManager.createFallbackState(wmsParams, currentTime);
    setBottomCanvasData(fallbackData);
    setShowBottomCanvas(true);
  }

  /**
   * Cleanup method for disposing the handler
   */
  dispose() {
    // Clear any active requests
    this.stateManager.activeRequests.clear();
    this.logger.info('Map click handler disposed');
  }
}