import L from 'leaflet';

/**
 * Map Marker Service
 * 
 * Manages temporary markers on the map to provide visual feedback
 * for user interactions, particularly for bottom canvas data source locations.
 * 
 * Features:
 * - Creates temporary markers at click locations
 * - Automatic cleanup when canvas is hidden
 * - Customizable marker appearance
 * - Proper error handling
 */

class MapMarkerService {
  constructor(options = {}) {
    this.currentMarker = null;
    this.mapInstance = null;
    this.debugMode = options.debugMode || false;
    
    // Marker styling options
    this.markerOptions = {
      color: '#ff6b35',
      fillColor: '#ff6b35',
      fillOpacity: 0.7,
      radius: 8,
      weight: 2,
      usePin: true, // default to pin-style marker
      ...options.markerStyle
    };
  }
  
  /**
   * Initialize the service with a map instance
   * @param {L.Map} map - Leaflet map instance
   */
  initialize(map) {
    if (!map) {
      this._logError('Cannot initialize MapMarkerService: map instance is required');
      return;
    }
    
    this.mapInstance = map;
    this._log('MapMarkerService initialized');
  }
  
  /**
   * Add a temporary marker at the specified location
   * @param {Object} latlng - Coordinates {lat: number, lng: number}
   * @param {Object} options - Optional marker customization
   * @returns {boolean} Success status
   */
  addTemporaryMarker(latlng, options = {}, map) {
    // If map instance not set yet but a map is provided, initialize now
    if (!this.mapInstance && map) {
      this.initialize(map);
    }
    if (!this.mapInstance) {
      this._logError('Map instance not initialized');
      return false;
    }
    
    if (!latlng || typeof latlng.lat !== 'number' || typeof latlng.lng !== 'number') {
      this._logError('Invalid coordinates provided:', latlng);
      return false;
    }
    
    // Ensure map is fully ready before adding markers
    this.mapInstance.whenReady(() => {
      try {
        // Remove existing marker first
        this.removeMarker();
        
        // Create new marker
        const markerStyle = { ...this.markerOptions, ...options };

        if (markerStyle.usePin) {
          // Create a pin marker using an inline SVG icon to avoid asset issues
          const svg = encodeURIComponent(`
            <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='36' height='36'>
              <path fill='${markerStyle.fillColor || markerStyle.color}' d='M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z'/>
            </svg>
          `);
          const icon = L.icon({
            iconUrl: `data:image/svg+xml;charset=UTF-8,${svg}`,
            iconSize: [36, 36],
            iconAnchor: [18, 36],
            popupAnchor: [0, -36]
          });
          this.currentMarker = L.marker([latlng.lat, latlng.lng], { icon, title: 'data-source-pin' });
        } else {
          this.currentMarker = L.circleMarker([latlng.lat, latlng.lng], markerStyle);
        }
        
        // Add to map
        this.currentMarker.addTo(this.mapInstance);
        
        // Add a popup for additional context
        const popupContent = `
          <div style="text-align: center;">
            <strong>Data Source Location</strong><br>
            <small>Lat: ${latlng.lat.toFixed(4)}°<br>
            Lng: ${latlng.lng.toFixed(4)}°</small>
          </div>
        `;
        
        this.currentMarker.bindPopup(popupContent, {
          offset: [0, -10],
          closeButton: false,
          autoClose: false,
          closeOnClick: false,
          className: 'data-source-popup'
        });
        
        this._log('Temporary marker added at:', latlng);
        
      } catch (error) {
        this._logError('Failed to add temporary marker:', error);
      }
    });
    
    return true;
  }
  
  /**
   * Remove the current temporary marker
   * @returns {boolean} Success status
   */
  removeMarker() {
    if (!this.currentMarker) {
      return true; // No marker to remove
    }
    
    try {
      if (this.mapInstance && this.currentMarker) {
        // Ensure map is ready before removing
        if (this.mapInstance.whenReady) {
          this.mapInstance.whenReady(() => {
            try {
              this.mapInstance.removeLayer(this.currentMarker);
              this._log('Temporary marker removed');
            } catch (err) {
              this._logError('Failed to remove marker in whenReady:', err);
            }
          });
        } else {
          this.mapInstance.removeLayer(this.currentMarker);
        }
      }
      
      this.currentMarker = null;
      return true;
      
    } catch (error) {
      this._logError('Failed to remove temporary marker:', error);
      this.currentMarker = null; // Reset anyway
      return false;
    }
  }
  
  /**
   * Check if a marker is currently active
   * @returns {boolean} True if marker exists
   */
  hasActiveMarker() {
    return this.currentMarker !== null;
  }
  
  /**
   * Get the current marker's coordinates
   * @returns {Object|null} Coordinates or null if no marker
   */
  getMarkerLocation() {
    if (!this.currentMarker) {
      return null;
    }
    
    try {
      const latlng = this.currentMarker.getLatLng();
      return {
        lat: latlng.lat,
        lng: latlng.lng
      };
    } catch (error) {
      this._logError('Failed to get marker location:', error);
      return null;
    }
  }
  
  /**
   * Update marker style options
   * @param {Object} newOptions - New style options
   */
  updateMarkerStyle(newOptions) {
    this.markerOptions = { ...this.markerOptions, ...newOptions };
    
    // Update current marker if it exists
    if (this.currentMarker) {
      try {
        this.currentMarker.setStyle(this.markerOptions);
        this._log('Marker style updated');
      } catch (error) {
        this._logError('Failed to update marker style:', error);
      }
    }
  }
  
  /**
   * Enable or disable debug logging
   * @param {boolean} enabled - Debug mode status
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }
  
  /**
   * Cleanup - remove marker and reset state
   */
  cleanup() {
    this.removeMarker();
    this.mapInstance = null;
    this._log('MapMarkerService cleaned up');
  }
  
  /**
   * Debug logging
   * @private
   */
  _log(...args) {
    if (this.debugMode) {
      console.log('[MapMarker]', ...args);
    }
  }
  
  /**
   * Error logging (always enabled)
   * @private
   */
  _logError(...args) {
    console.error('[MapMarker]', ...args);
  }
}

export default MapMarkerService;