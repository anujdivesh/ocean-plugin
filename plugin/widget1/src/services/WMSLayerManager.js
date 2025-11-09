/**
 * WMS Layer Management Service
 * 
 * Handles WMS layer operations, mutations, and map integration.
 * 
 * INVARIANTS:
 * - Only one WMS layer group per map instance
 * - Static layers never receive time parameters
 * - Layer opacity changes don't trigger full re-render
 * - Composite layers are flattened before rendering
 * - Layer removal always cleans up references
 */

import L from 'leaflet';

/**
 * WMS Layer Manager class for handling map layer operations
 */
export class WMSLayerManager {
  constructor(mapInstance, addWMSTileLayerFn) {
    this.mapInstance = mapInstance;
    this.addWMSTileLayer = addWMSTileLayerFn;
    this.layerGroup = null;
    this.activeLayerRefs = [];
    this.currentLayerConfig = null;
    
    this._initializeLayerGroup();
  }

  /**
   * Initialize the layer group for WMS layers
   * @private
   */
  _initializeLayerGroup() {
    if (this.mapInstance) {
      this.layerGroup = L.layerGroup().addTo(this.mapInstance);
    }
  }

  /**
   * Determines if a layer should receive time parameters
   * @param {Object} layerConfig - Layer configuration
   * @returns {boolean} True if layer is time-dimensional
   */
  isTimeDimensional(layerConfig) {
    return !layerConfig.isStatic && layerConfig.id !== 200;
  }

  /**
   * Flattens composite layers into renderable layer configs
   * @param {Object} layerConfig - Layer configuration (possibly composite)
   * @returns {Array} Array of renderable layer configurations
   */
  flattenLayerConfig(layerConfig) {
    if (!layerConfig) return [];
    
    if (layerConfig.composite && Array.isArray(layerConfig.layers)) {
      return layerConfig.layers.flatMap(subLayer => this.flattenLayerConfig(subLayer));
    }
    
    return [layerConfig];
  }

  /**
   * Creates WMS options for a layer configuration
   * @param {Object} layerConfig - Layer configuration
   * @param {string} timeString - ISO time string for time-dimensional layers
   * @param {number} opacity - Layer opacity (0-1)
   * @returns {Object} WMS options object
   */
  createWMSOptions(layerConfig, timeString, opacity) {
    const baseOptions = {
      layers: layerConfig.value,
      format: "image/png",
      transparent: true,
      opacity: opacity,
      styles: layerConfig.style,
      version: '1.3.0',
      DATASET: layerConfig.dataset || 'niue_forecast',
      crs: L.CRS.EPSG4326,
      pane: 'overlayPane',
      colorscalerange: layerConfig.colorscalerange || "",
      abovemaxcolor: layerConfig.value === 'dirm' ? "transparent" : "extend",
      belowmincolor: "transparent",
      numcolorbands: layerConfig.numcolorbands || "250",
    };

    // Add time parameter only for time-dimensional layers
    if (this.isTimeDimensional(layerConfig) && timeString) {
      baseOptions.time = timeString;
    }

    return baseOptions;
  }

  /**
   * Clears all active WMS layers from the map
   */
  clearLayers() {
    if (this.layerGroup) {
      this.layerGroup.clearLayers();
    }
    
    // Clean up layer references
    this.activeLayerRefs.forEach(layer => {
      if (layer && this.mapInstance && this.mapInstance.hasLayer(layer)) {
        this.mapInstance.removeLayer(layer);
      }
    });
    
    this.activeLayerRefs = [];
    this.currentLayerConfig = null;
  }

  /**
   * Adds a WMS layer to the map
   * @param {Object} layerConfig - Layer configuration
   * @param {string} timeString - ISO time string for time-dimensional layers
   * @param {number} opacity - Layer opacity (0-1)
   * @param {Function} handleShow - Feature info handler
   * @returns {Promise<boolean>} Success status
   */
  async addLayer(layerConfig, timeString, opacity, handleShow) {
    if (!this.mapInstance || !this.layerGroup || !layerConfig) {
      console.warn('WMS Layer Manager: Invalid state for adding layer');
      return false;
    }

    try {
      const flattenedLayers = this.flattenLayerConfig(layerConfig);
      
      for (const config of flattenedLayers) {
        const wmsOptions = this.createWMSOptions(config, timeString, opacity);
        
        const wmsLayer = this.addWMSTileLayer(
          this.mapInstance,
          config.wmsUrl,
          wmsOptions,
          handleShow
        );
        
        if (wmsLayer) {
          this.layerGroup.addLayer(wmsLayer);
          this.activeLayerRefs.push(wmsLayer);
        }
      }
      
      this.currentLayerConfig = layerConfig;
      return true;
    } catch (error) {
      console.error('WMS Layer Manager: Failed to add layer', error);
      return false;
    }
  }

  /**
   * Updates the opacity of all active layers
   * @param {number} newOpacity - New opacity value (0-1)
   */
  updateOpacity(newOpacity) {
    this.activeLayerRefs.forEach(layer => {
      if (layer && layer.setOpacity) {
        layer.setOpacity(newOpacity);
      }
    });
  }

  /**
   * Updates the time parameter for time-dimensional layers
   * @param {string} newTimeString - New ISO time string
   */
  updateTime(newTimeString) {
    if (!this.currentLayerConfig || !this.isTimeDimensional(this.currentLayerConfig)) {
      return; // Skip for static layers
    }

    this.activeLayerRefs.forEach(layer => {
      if (layer && layer.setParams) {
        layer.setParams({ time: newTimeString }, false); // false = no redraw yet
      }
    });

    // Redraw all layers at once
    this.redrawLayers();
  }

  /**
   * Forces a redraw of all active layers
   */
  redrawLayers() {
    this.activeLayerRefs.forEach(layer => {
      if (layer && layer.redraw) {
        layer.redraw();
      }
    });
  }

  /**
   * Gets the current active layer configuration
   * @returns {Object|null} Current layer configuration
   */
  getCurrentLayerConfig() {
    return this.currentLayerConfig;
  }

  /**
   * Gets the number of active layers
   * @returns {number} Number of active layers
   */
  getActiveLayerCount() {
    return this.activeLayerRefs.length;
  }

  /**
   * Checks if the layer manager is ready for operations
   * @returns {boolean} True if ready
   */
  isReady() {
    return !!(this.mapInstance && this.layerGroup && this.addWMSTileLayer);
  }

  /**
   * Cleanup method for disposing the layer manager
   */
  dispose() {
    this.clearLayers();
    
    if (this.layerGroup && this.mapInstance) {
      this.mapInstance.removeLayer(this.layerGroup);
    }
    
    this.layerGroup = null;
    this.mapInstance = null;
    this.addWMSTileLayer = null;
    this.currentLayerConfig = null;
  }
}