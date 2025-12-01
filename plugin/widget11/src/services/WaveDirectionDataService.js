/**
 * 🌊 Wave Direction Data Service
 * Fetches wave direction and magnitude data from THREDDS WMS server
 * Converts it to a vector field for particle visualization
 * 
 * @author Ocean Visualization Team
 * @version 1.0.0
 */

import logger from '../utils/logger';

class WaveDirectionDataService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.pendingRequests = new Map();
  }

  /**
   * Fetch wave direction vector field for current map view
   * @param {Object} params - Request parameters
   * @param {string} params.wmsUrl - THREDDS WMS endpoint
   * @param {string} params.layerName - Wave direction layer (e.g., "dirm")
   * @param {Object} params.bounds - Map bounds {north, south, east, west}
   * @param {number} params.width - Grid width in pixels
   * @param {number} params.height - Grid height in pixels
   * @param {string} params.time - ISO timestamp
   * @returns {Promise<Object>} Vector field {u, v, bounds, width, height}
   */
  async fetchVectorField(params) {
    const { wmsUrl, layerName, bounds, width, height, time } = params;
    
    // Create cache key including wmsUrl to handle different endpoints
    const cacheKey = `${wmsUrl}_${layerName}_${bounds.west}_${bounds.south}_${bounds.east}_${bounds.north}_${width}x${height}_${time}`;
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      logger.debug('WAVE_DATA', 'Using cached vector field');
      return cached.data;
    }
    
    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      logger.debug('WAVE_DATA', 'Request already pending, waiting...');
      return this.pendingRequests.get(cacheKey);
    }
    
    // Create new request
    const requestPromise = this._fetchFromWMS(params);
    this.pendingRequests.set(cacheKey, requestPromise);
    
    try {
      const data = await requestPromise;
      
      // Cache result
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      // Clean old cache entries
      this._cleanCache();
      
      return data;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Fetch data from THREDDS WMS using GetFeatureInfo
   * @private
   */
  async _fetchFromWMS(params) {
    const { wmsUrl, layerName, bounds, width, height, time } = params;
    
    logger.info('WAVE_DATA', 'Fetching wave direction field from THREDDS', {
      wmsUrl,
      layer: layerName,
      bounds,
      gridSize: `${width}x${height}`,
      time
    });

    try {
      // For wave direction, we need to sample the field at multiple points
      // Create a grid of sample points (keep it sparse for performance)
      const gridResolution = 10; // 10x10 grid = 100 requests (manageable)
      const vectorField = {
        u: new Float32Array(gridResolution * gridResolution),
        v: new Float32Array(gridResolution * gridResolution),
        bounds,
        width: gridResolution,
        height: gridResolution
      };

      // Sample points across the grid
      const latStep = (bounds.north - bounds.south) / (gridResolution - 1);
      const lonStep = (bounds.east - bounds.west) / (gridResolution - 1);

      const promises = [];
      
      for (let i = 0; i < gridResolution; i++) {
        for (let j = 0; j < gridResolution; j++) {
          const lat = bounds.south + i * latStep;
          const lon = bounds.west + j * lonStep;
          
          promises.push(
            this._getPointData(wmsUrl, layerName, lon, lat, time, bounds, width, height)
              .then(direction => {
                const idx = i * gridResolution + j;
                if (direction !== null && !isNaN(direction)) {
                  // Convert direction (degrees) to U/V components
                  // Direction is "from" direction in meteorological convention
                  // 0° = North, 90° = East, 180° = South, 270° = West
                  // Add 180 to convert "from" to "to" direction (where waves are going)
                  const radians = (direction + 180) * Math.PI / 180;
                  const magnitude = 2.5; // Increased magnitude for visibility
                  
                  // U component: positive = east, negative = west
                  vectorField.u[idx] = Math.sin(radians) * magnitude;
                  // V component: positive = south (screen down), negative = north (screen up)
                  vectorField.v[idx] = Math.cos(radians) * magnitude;
                } else {
                  vectorField.u[idx] = 0;
                  vectorField.v[idx] = 0;
                }
              })
              .catch(() => {
                const idx = i * gridResolution + j;
                vectorField.u[idx] = 0;
                vectorField.v[idx] = 0;
              })
          );
        }
      }

      // Wait for all samples
      await Promise.all(promises);

      const validPoints = vectorField.u.filter(v => v !== 0).length;
      const avgU = vectorField.u.reduce((a, b) => a + b, 0) / vectorField.u.length;
      const avgV = vectorField.v.reduce((a, b) => a + b, 0) / vectorField.v.length;
      const avgDir = Math.atan2(avgU, avgV) * 180 / Math.PI;

      logger.success('WAVE_DATA', `Fetched ${gridResolution}x${gridResolution} wave direction field`, {
        validPoints,
        avgDirection: avgDir.toFixed(1) + '°',
        avgU: avgU.toFixed(2),
        avgV: avgV.toFixed(2)
      });

      return vectorField;
      
    } catch (error) {
      logger.error('WAVE_DATA', `Failed to fetch wave direction field: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get wave direction at a specific point using GetFeatureInfo
   * @private
   */
  async _getPointData(wmsUrl, layerName, lon, lat, time, bounds, width, height) {
    try {
      // Convert lat/lon to pixel coordinates
      const x = Math.floor((lon - bounds.west) / (bounds.east - bounds.west) * width);
      const y = Math.floor((bounds.north - lat) / (bounds.north - bounds.south) * height);

      // Build GetFeatureInfo request
      const params = new URLSearchParams({
        SERVICE: 'WMS',
        VERSION: '1.3.0',
        REQUEST: 'GetFeatureInfo',
        LAYERS: layerName,
        QUERY_LAYERS: layerName,
        INFO_FORMAT: 'text/xml',
        CRS: 'EPSG:4326',
        BBOX: `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`,
        WIDTH: width,
        HEIGHT: height,
        I: x,
        J: y
      });

      if (time) {
        params.set('TIME', time);
      }

      const url = `${wmsUrl}?${params.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        return null;
      }

      const text = await response.text();
      
      // Parse XML response to extract value
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'text/xml');
      const valueElement = xml.querySelector('value');
      
      if (valueElement && valueElement.textContent) {
        const value = parseFloat(valueElement.textContent);
        return isNaN(value) ? null : value;
      }

      return null;
      
    } catch (error) {
      return null;
    }
  }

  /**
   * Clean old cache entries
   * @private
   */
  _cleanCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.cache.clear();
    logger.info('WAVE_DATA', 'Cache cleared');
  }
}

// Export singleton
const waveDirectionDataService = new WaveDirectionDataService();
export default waveDirectionDataService;
