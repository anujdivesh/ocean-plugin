/**
 * CORS-enabled WMS Layer for Leaflet
 * Handles THREDDS server requests that are blocked by standard CORS policies
 */

import L from 'leaflet';

/**
 * Create a custom WMS layer that can handle CORS-restricted servers
 */
export const createCORSWMSLayer = (url, options = {}) => {
  const CORSWMSLayer = L.TileLayer.WMS.extend({
    
    initialize: function(url, options) {
      L.TileLayer.WMS.prototype.initialize.call(this, url, options);
      
      // Enable CORS for THREDDS servers
      if (url.includes('thredds')) {
        this.options.crossOrigin = 'anonymous';
      }
    },

    createTile: function(coords, done) {
      const tile = document.createElement('img');
      
      // Set up CORS handling - only set if explicitly needed
      // Valid values are: "anonymous", "use-credentials", or empty string
      if (this.options.crossOrigin && typeof this.options.crossOrigin === 'string') {
        const validCorsValues = ['anonymous', 'use-credentials'];
        if (validCorsValues.includes(this.options.crossOrigin.toLowerCase())) {
          tile.crossOrigin = this.options.crossOrigin;
        }
      }

      // Add event listeners
      L.DomEvent.on(tile, 'load', L.Util.bind(this._tileOnLoad, this, done, tile));
      L.DomEvent.on(tile, 'error', L.Util.bind(this._tileOnError, this, done, tile));

      tile.alt = '';
      tile.setAttribute('role', 'presentation');

      // Generate the tile URL
      const tileUrl = this.getTileUrl(coords);
      
      // For THREDDS servers, try to load with CORS headers
      if (this._url.includes('thredds')) {
        this._loadTileWithCORS(tile, tileUrl, done);
      } else {
        tile.src = tileUrl;
      }

      return tile;
    },

    _loadTileWithCORS: function(tile, url, done) {
      console.log(`🌊 Loading THREDDS tile: ${url.substring(url.lastIndexOf('?') + 1, url.lastIndexOf('?') + 30)}...`);
      
      // Enhanced THREDDS compatibility with multiple fallback strategies
      const attemptDirectLoad = (attemptUrl, retryCount = 0) => {
        // For THREDDS servers, clean up time format
        let cleanUrl = attemptUrl;
        if (cleanUrl.includes('time=')) {
          cleanUrl = cleanUrl.replace(/time=([^&]+)/, (match, timeParam) => {
            try {
              const decoded = decodeURIComponent(timeParam);
              // THREDDS prefers simpler time format without milliseconds
              const simpleTime = decoded.replace(/\.\d{3}Z$/, 'Z');
              return `time=${encodeURIComponent(simpleTime)}`;
            } catch (e) {
              return match;
            }
          });
        }
        
        // Set crossOrigin for CORS requests
        tile.crossOrigin = 'anonymous';
        
        // Handle successful load
        const onLoad = () => {
          console.log(`✅ THREDDS tile loaded successfully`);
          done(null, tile);
        };
        
        // Handle errors with fallback strategies
        const onError = (error) => {
          console.warn(`⚠️ THREDDS tile error (attempt ${retryCount + 1}):`, error.type || 'load error');
          
          // Try different time formats or remove time entirely
          if (retryCount === 0 && cleanUrl.includes('time=')) {
            // First retry: remove time parameter entirely for static data
            const noTimeUrl = cleanUrl.replace(/[&?]time=[^&]*&?/g, '').replace(/[&?]$/, '');
            console.log(`🔄 Retrying without time parameter`);
            setTimeout(() => attemptDirectLoad(noTimeUrl, 1), 100);
            return;
          }
          
          if (retryCount === 1) {
            // Second retry: try with current timestamp
            const currentTime = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
            const currentTimeUrl = cleanUrl.includes('time=') 
              ? cleanUrl.replace(/time=[^&]*/, `time=${encodeURIComponent(currentTime)}`)
              : cleanUrl + (cleanUrl.includes('?') ? '&' : '?') + `time=${encodeURIComponent(currentTime)}`;
            console.log(`🔄 Retrying with current time`);
            setTimeout(() => attemptDirectLoad(currentTimeUrl, 2), 200);
            return;
          }
          
          // Final fallback: report error
          console.error(`❌ THREDDS tile failed after ${retryCount + 1} attempts`);
          done(error, tile);
        };
        
        // Set up event listeners
        tile.addEventListener('load', onLoad, { once: true });
        tile.addEventListener('error', onError, { once: true });
        
        // Start the load
        tile.src = cleanUrl;
      };
      
      attemptDirectLoad(url);
    },

    _tileOnLoad: function(done, tile) {
      // Clean up after successful load
      done(null, tile);
    },

    _tileOnError: function(done, tile, e) {
      // Enhanced error logging for debugging
      const url = tile.src || 'unknown';
      console.error(`🌊 Tile load failed: ${url.substring(url.lastIndexOf('/')+1)}`);
      
      // For THREDDS servers, try alternative time formats
      if (url.includes('thredds') && url.includes('time=')) {
        console.warn('⚠️ THREDDS time format may be incorrect. Consider checking time parameter format.');
      }
      
      done(e, tile);
    }
  });

  return new CORSWMSLayer(url, options);
};

export default createCORSWMSLayer;