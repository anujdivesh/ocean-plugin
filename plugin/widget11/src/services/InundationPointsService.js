/**
 * InundationPointsService
 * 
 * Handles loading and rendering of inundation forecast points from THREDDS server
 * Features:
 * - Fetches JSON data from SPC THREDDS server
 * - Color-codes points by risk level (low=blue, medium=orange, high=red)
 * - Displays forecast images on point click
 * - Optimized for performance with atoll-based filtering
 */

import L from 'leaflet';

class InundationPointsService {
  // Pattern to extract atoll name from image URL (e.g., "Nanumaga" from "Nanumaga_t_3_forecast.png")
  static ATOLL_NAME_PATTERN = /\/([A-Za-z]+)_t_\d+_forecast\.png/;

  constructor(options = {}) {
    this.debugMode = options.debugMode || false;
    this.mapInstance = null;
    this.pointsLayerGroup = null;
    this.activePopup = null;
    
    // Data source configuration
    // Always use direct URL - CORS is handled by Cloudflare
    const baseUrl = 'https://gemthreddshpc.spc.int/thredds/fileServer/POP/model/country/spc/forecast/hourly/TUV';
    
    this.dataUrl = `${baseUrl}/final.json`;
    this.imageBaseUrl = `${baseUrl}/`;
    
    this.log(`Using data URL: ${this.dataUrl}`);
    this.log(`Using image base URL: ${this.imageBaseUrl}`);
    
    // Risk level thresholds and colors
    this.riskLevels = {
      low: { max: 0.4, color: '#2196F3', label: 'Low Risk' },      // Blue
      medium: { max: 0.8, color: '#FF9800', label: 'Medium Risk' }, // Orange
      high: { max: Infinity, color: '#F44336', label: 'High Risk' } // Red
    };
    
    // Cache for loaded data
    this.cachedData = null;
    this.lastFetchTime = null;
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    
    this.log('InundationPointsService initialized');
  }
  
  /**
   * Extract atoll name from image URL
   * @param {string} url - The image URL (e.g., "http://...Nanumaga_t_3_forecast.png")
   * @returns {string|null} - The atoll name or null if not found
   */
  extractAtollNameFromUrl(url) {
    if (!url) return null;
    const match = url.match(InundationPointsService.ATOLL_NAME_PATTERN);
    return match ? match[1] : null;
  }
  
  /**
   * Initialize service with map instance
   */
  initialize(map) {
    if (!map) {
      console.error('InundationPointsService: Map instance is required');
      return;
    }
    
    this.mapInstance = map;
    
    // Create layer group for inundation points
    if (!this.pointsLayerGroup) {
      this.pointsLayerGroup = L.layerGroup().addTo(map);
    }
    
    this.log('Initialized with map instance');
  }
  
  /**
   * Fetch inundation data from THREDDS server
   */
  async fetchInundationData() {
    // Check cache first
    const now = Date.now();
    if (this.cachedData && this.lastFetchTime && (now - this.lastFetchTime < this.cacheExpiry)) {
      this.log('Using cached inundation data');
      return this.cachedData;
    }
    
    try {
      this.log(`Fetching inundation data from: ${this.dataUrl}`);
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      try {
        const response = await fetch(this.dataUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          mode: 'cors', // Explicitly set CORS mode
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
      
        if (!response.ok) {
          // Provide specific error messages based on status code
          let errorMessage;
          switch (response.status) {
            case 502:
              errorMessage = 'THREDDS server is currently unavailable (502 Bad Gateway). Please try again later.';
              break;
            case 503:
              errorMessage = 'THREDDS server is temporarily unavailable (503 Service Unavailable). Please try again later.';
              break;
            case 504:
              errorMessage = 'Server timeout (504 Gateway Timeout). The server is taking too long to respond.';
              break;
            case 404:
              errorMessage = 'Data not found (404). The inundation data endpoint may have changed.';
              break;
            case 403:
              errorMessage = 'Access denied (403). You do not have permission to access this data.';
              break;
            default:
              errorMessage = `Server error (HTTP ${response.status}: ${response.statusText})`;
          }
          throw new Error(errorMessage);
        }
      
        const jsonData = await response.json();
        
        // Handle different JSON structures
        let data;
        if (jsonData.flood_risk_data && Array.isArray(jsonData.flood_risk_data)) {
          // New structure: { metadata: {...}, flood_risk_data: [...] }
          data = jsonData.flood_risk_data;
          this.log(`Metadata: ${JSON.stringify(jsonData.metadata)}`);
        } else if (Array.isArray(jsonData)) {
          // Old structure: directly an array
          data = jsonData;
        } else {
          throw new Error('Unexpected JSON structure: ' + JSON.stringify(Object.keys(jsonData)));
        }
        
        // Validate data
        if (!data || data.length === 0) {
          throw new Error('No inundation points found in data');
        }
        
        // Cache the data
        this.cachedData = data;
        this.lastFetchTime = now;
        
        this.log(`✅ Successfully fetched ${data.length} inundation points`);
        return data;
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        // Handle abort/timeout
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timeout: Server took too long to respond (15s limit).');
        }
        throw fetchError;
      }
      
    } catch (error) {
      console.error('❌ Failed to fetch inundation data:', error);
      console.error('   URL:', this.dataUrl);
      console.error('   Error details:', error.message);
      
      // Provide more helpful error messages
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Network error: Unable to reach THREDDS server. Check your internet connection.');
      } else if (error.message.includes('CORS')) {
        throw new Error('CORS error: Server does not allow cross-origin requests.');
      } else if (error.message.includes('HTTP') || error.message.includes('Server error') || error.message.includes('timeout')) {
        throw error; // Already has a good message
      }
      
      throw error;
    }
  }
  
  /**
   * Determine risk level based on inundation value or text
   */
  getRiskLevel(inundationValue) {
    // Handle text-based risk levels from API
    if (typeof inundationValue === 'string') {
      const riskText = inundationValue.toLowerCase();
      if (riskText.includes('low')) {
        return this.riskLevels.low;
      } else if (riskText.includes('medium') || riskText.includes('moderate')) {
        return this.riskLevels.medium;
      } else if (riskText.includes('high') || riskText.includes('severe') || riskText.includes('extreme')) {
        return this.riskLevels.high;
      }
      return this.riskLevels.low; // Default to low if unknown
    }
    
    // Handle numeric values
    if (typeof inundationValue !== 'number') {
      return this.riskLevels.low;
    }
    
    if (inundationValue <= this.riskLevels.low.max) {
      return this.riskLevels.low;
    } else if (inundationValue <= this.riskLevels.medium.max) {
      return this.riskLevels.medium;
    } else {
      return this.riskLevels.high;
    }
  }
  
  /**
   * Create custom icon for inundation point
   */
  createPointIcon(riskLevel) {
    const color = riskLevel.color;
    
    // Create SVG icon with circle marker
    const svgIcon = `
      <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="8" fill="${color}" stroke="white" stroke-width="2" opacity="0.8"/>
        <circle cx="12" cy="12" r="4" fill="${color}" opacity="1"/>
      </svg>
    `;
    
    return L.divIcon({
      className: 'inundation-point-icon',
      html: svgIcon,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12]
    });
  }
  
  /**
   * Extract image filename from primary_image_url
   */
  getImageFilename(primaryImageUrl) {
    if (!primaryImageUrl) return null;
    
    // Extract filename from URL like "http://192.168.0.207:8080/ds_tv/Figures/Nanumaga_t_2_forecast.png"
    const parts = primaryImageUrl.split('/');
    return parts[parts.length - 1];
  }
  
  /**
   * Create popup content for inundation point
   */
  createPopupContent(point) {
    const filename = this.getImageFilename(point.primary_image_url);
    const imageUrl = filename ? `${this.imageBaseUrl}${filename}` : null;
    
    // Determine risk level from either text or numeric value
    const hazardLevel = point.coastal_inundation_hazard_level || point.hazard_level || point.risk_level;
    const inundationValue = point.max_inundation || point.inundation;
    const riskLevel = this.getRiskLevel(hazardLevel || inundationValue || 0);
    
    // Determine location name - avoid showing "Point" when no index/name available
    // Extract atoll name from image URL if available
    let locationName = point.station_name || point.location || point.name 
      || this.extractAtollNameFromUrl(point.primary_image_url);
    // Fallback to "Inundation Point" instead of "Point " + empty index
    if (!locationName) {
      locationName = 'Inundation Point';
    }
    
    let content = `
      <div class="inundation-popup">
        <h3 style="margin: 0 0 10px 0; color: ${riskLevel.color};">${locationName}</h3>
        <div style="margin-bottom: 8px;">
          <strong>Risk Level:</strong> 
          <span style="color: ${riskLevel.color}; font-weight: bold;">${hazardLevel || riskLevel.label}</span>
        </div>
    `;
    
    // Show numeric inundation if available
    if (inundationValue !== undefined && typeof inundationValue === 'number') {
      content += `
        <div style="margin-bottom: 8px;">
          <strong>Max Inundation:</strong> ${inundationValue.toFixed(2)} m
        </div>
      `;
    }
    
    // Show coordinates
    if (point.latitude !== undefined && point.longitude !== undefined) {
      content += `
        <div style="margin-bottom: 8px; font-size: 12px; color: #666;">
          <strong>Location:</strong> ${point.latitude.toFixed(4)}°, ${point.longitude.toFixed(4)}°
        </div>
      `;
    }
    
    if (point.forecast_time || point.time) {
      content += `
        <div style="margin-bottom: 8px;">
          <strong>Forecast Time:</strong> ${point.forecast_time || point.time}
        </div>
      `;
    }
    
    if (imageUrl) {
      // Make image bigger for easier viewing (increased from 400px to 600px max-width)
      content += `
        <div style="margin-top: 12px;">
          <img src="${imageUrl}" 
               alt="Inundation Forecast" 
               style="width: 100%; max-width: 600px; height: auto; border-radius: 4px; cursor: pointer;"
               onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
          />
          <div style="display: none; padding: 10px; background: #ffebee; border-radius: 4px; color: #c62828;">
            Image not available
          </div>
        </div>
      `;
    }
    
    content += `</div>`;
    
    return content;
  }
  
  /**
   * Create popup content for multiple points at the same location
   */
  createMultiPointPopupContent(points) {
    const firstPoint = points[0];
    // Determine location name - extract from image URL if not available directly
    let locationName = firstPoint.station_name || firstPoint.location || firstPoint.name
      || this.extractAtollNameFromUrl(firstPoint.primary_image_url);
    if (!locationName) {
      locationName = 'Inundation Points';
    }
    
    let content = `
      <div class="inundation-popup">
        <h3 style="margin: 0 0 10px 0; color: #1976D2;">${locationName}</h3>
        <div style="margin-bottom: 12px; padding: 8px; background: #E3F2FD; border-radius: 4px;">
          <strong>${points.length} forecast points at this location</strong>
        </div>
    `;
    
    points.forEach((point, index) => {
      const hazardLevel = point.coastal_inundation_hazard_level || point.hazard_level || point.risk_level;
      const inundationValue = point.max_inundation || point.inundation;
      const riskLevel = this.getRiskLevel(hazardLevel || inundationValue || 0);
      const filename = this.getImageFilename(point.primary_image_url);
      
      content += `
        <div style="margin-bottom: 12px; padding: 10px; background: #f5f5f5; border-radius: 4px; border-left: 4px solid ${riskLevel.color};">
          <div style="margin-bottom: 6px;">
            <strong>Forecast ${index + 1}:</strong> 
            <span style="color: ${riskLevel.color}; font-weight: bold;">${hazardLevel || riskLevel.label}</span>
          </div>
      `;
      
      if (inundationValue !== undefined && typeof inundationValue === 'number') {
        content += `
          <div style="margin-bottom: 4px; font-size: 13px;">
            <strong>Max Inundation:</strong> ${inundationValue.toFixed(2)} m
          </div>
        `;
      }
      
      if (filename) {
        const imageUrl = `${this.imageBaseUrl}${filename}`;
        content += `
          <div style="margin-top: 8px;">
            <a href="${imageUrl}" target="_blank" style="color: #1976D2; text-decoration: none; font-size: 12px;">
              📊 View Forecast Image
            </a>
          </div>
        `;
      }
      
      content += `</div>`;
    });
    
    content += `</div>`;
    
    return content;
  }
  
  /**
   * Add inundation points to map
   */
  async loadAndDisplayPoints(options = {}) {
    if (!this.mapInstance) {
      const errorMsg = 'Map instance not initialized. Please wait for the map to load.';
      console.error('InundationPointsService:', errorMsg);
      this.log('Current map state:', this.mapInstance);
      throw new Error(errorMsg);
    }
    
    // Verify map is actually ready
    if (!this.mapInstance._loaded) {
      const errorMsg = 'Map is still loading. Please try again in a moment.';
      console.warn('InundationPointsService:', errorMsg);
      throw new Error(errorMsg);
    }
    
    try {
      // Clear existing points
      if (this.pointsLayerGroup) {
        this.pointsLayerGroup.clearLayers();
      }
      
      // Fetch data
      const data = await this.fetchInundationData();
      
      if (!Array.isArray(data)) {
        console.error('Invalid data format - expected array');
        return;
      }
      
      // Filter by atoll if specified
      let filteredData = data;
      if (options.atoll) {
        filteredData = data.filter(point => {
          // Try multiple fields for location/atoll info
          const location = (point.location || point.atoll || point.station_name || '').toLowerCase();
          
          // Also check image URL which contains atoll name like "Nanumaga_t_3_forecast.png"
          let imageAtoll = '';
          if (point.primary_image_url) {
            // eslint-disable-next-line no-useless-escape
            const match = point.primary_image_url.match(/\/([^\/]+)_t_\d+_forecast\.png/);
            if (match) {
              imageAtoll = match[1].toLowerCase();
            }
          }
          
          const searchAtoll = options.atoll.toLowerCase();
          return location.includes(searchAtoll) || imageAtoll === searchAtoll;
        });
        this.log(`Filtered to ${filteredData.length} points for atoll: ${options.atoll}`);
      }
      
      // Filter by risk level if specified
      if (options.riskFilter && options.riskFilter !== 'all') {
        const beforeCount = filteredData.length;
        
        if (options.riskFilter === 'low-only') {
          filteredData = filteredData.filter(point => {
            const level = (point.coastal_inundation_hazard_level || '').toLowerCase();
            return level.includes('low');
          });
          this.log(`Filtered to ${filteredData.length} low risk points (from ${beforeCount})`);
          
        } else if (options.riskFilter === 'moderate-only') {
          filteredData = filteredData.filter(point => {
            const level = (point.coastal_inundation_hazard_level || '').toLowerCase();
            return level.includes('moderate') || level.includes('medium');
          });
          this.log(`Filtered to ${filteredData.length} moderate risk points (from ${beforeCount})`);
          
        } else if (options.riskFilter === 'high-only') {
          filteredData = filteredData.filter(point => {
            const level = (point.coastal_inundation_hazard_level || '').toLowerCase();
            return level.includes('high') || level.includes('severe') || level.includes('extreme');
          });
          this.log(`Filtered to ${filteredData.length} high risk points (from ${beforeCount})`);
        }
      }
      
      // Group points by coordinates to avoid multiple overlapping markers
      const pointsByCoords = {};
      filteredData.forEach(point => {
        if (!point.latitude || !point.longitude) {
          this.log('Skipping point without coordinates:', point);
          return;
        }
        
        const lat = parseFloat(point.latitude);
        const lng = parseFloat(point.longitude);
        
        if (isNaN(lat) || isNaN(lng)) {
          this.log('Invalid coordinates:', point);
          return;
        }
        
        // Round coordinates to 6 decimal places to group nearby points
        const coordKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
        
        if (!pointsByCoords[coordKey]) {
          pointsByCoords[coordKey] = {
            lat,
            lng,
            points: []
          };
        }
        
        pointsByCoords[coordKey].points.push(point);
      });
      
      // Add markers for each unique coordinate
      let pointsAdded = 0;
      Object.values(pointsByCoords).forEach(coordGroup => {
        const { lat, lng, points } = coordGroup;
        
        // Use the highest risk level among all points at this location
        let highestRiskLevel = this.riskLevels.low;
        points.forEach(point => {
          const hazardLevel = point.coastal_inundation_hazard_level || point.hazard_level || point.risk_level;
          const inundationValue = point.max_inundation || point.inundation || 0;
          const riskLevel = this.getRiskLevel(hazardLevel || inundationValue);
          
          // Compare risk levels (high > medium > low)
          if (riskLevel.label === 'High Risk') {
            highestRiskLevel = riskLevel;
          } else if (riskLevel.label === 'Medium Risk' && highestRiskLevel.label !== 'High Risk') {
            highestRiskLevel = riskLevel;
          }
        });
        
        // Create marker with the highest risk level
        const firstPoint = points[0];
        // Extract location name from image URL if not available directly
        let locationName = firstPoint.station_name || firstPoint.location || firstPoint.name
          || this.extractAtollNameFromUrl(firstPoint.primary_image_url);
        if (!locationName) {
          locationName = 'Inundation Point';
        }
        
        const marker = L.marker([lat, lng], {
          icon: this.createPointIcon(highestRiskLevel),
          title: points.length > 1 ? `${locationName} (${points.length} points)` : locationName,
          riseOnHover: true
        });
        
        // Create popup with all points at this location
        const popupContent = points.length > 1 
          ? this.createMultiPointPopupContent(points)
          : this.createPopupContent(firstPoint);
          
        // Increased maxWidth to 650 to accommodate larger images
        marker.bindPopup(popupContent, {
          maxWidth: 650,
          className: 'inundation-popup-container'
        });
        
        // Add to layer group
        marker.addTo(this.pointsLayerGroup);
        pointsAdded++;
      });
      
      this.log(`Added ${pointsAdded} markers for ${filteredData.length} inundation points (${Object.keys(pointsByCoords).length} unique locations)`);
      
      // Calculate risk level statistics from ALL data (before filtering)
      const riskStats = {
        lowRisk: 0,
        moderateRisk: 0,
        highRisk: 0
      };
      
      data.forEach(point => {
        const level = (point.coastal_inundation_hazard_level || '').toLowerCase();
        if (level.includes('low')) {
          riskStats.lowRisk++;
        } else if (level.includes('moderate') || level.includes('medium')) {
          riskStats.moderateRisk++;
        } else if (level.includes('high') || level.includes('severe') || level.includes('extreme')) {
          riskStats.highRisk++;
        }
      });
      
      return {
        total: data.length,
        displayed: filteredData.length,
        markers: pointsAdded,
        filtered: filteredData.length,
        ...riskStats
      };
      
    } catch (error) {
      console.error('Failed to load inundation points:', error);
      throw error;
    }
  }
  
  /**
   * Clear all inundation points from map
   */
  clearPoints() {
    if (this.pointsLayerGroup) {
      this.pointsLayerGroup.clearLayers();
      this.log('Cleared all inundation points');
    }
  }
  
  /**
   * Show/hide inundation points layer
   */
  setVisible(visible) {
    if (!this.mapInstance) {
      this.log('Map not initialized, cannot toggle visibility');
      return;
    }
    
    if (!this.pointsLayerGroup) {
      this.log('Points layer group not initialized');
      return;
    }
    
    if (visible) {
      if (!this.mapInstance.hasLayer(this.pointsLayerGroup)) {
        this.pointsLayerGroup.addTo(this.mapInstance);
      }
    } else {
      if (this.mapInstance.hasLayer(this.pointsLayerGroup)) {
        this.mapInstance.removeLayer(this.pointsLayerGroup);
      }
    }
    
    this.log(`Inundation points ${visible ? 'shown' : 'hidden'}`);
  }
  
  /**
   * Get statistics about loaded points
   */
  getStats() {
    if (!this.cachedData || !Array.isArray(this.cachedData)) {
      return { total: 0, byRiskLevel: {} };
    }
    
    const stats = {
      total: this.cachedData.length,
      byRiskLevel: {
        low: 0,
        medium: 0,
        high: 0
      }
    };
    
    this.cachedData.forEach(point => {
      const hazardLevel = point.coastal_inundation_hazard_level || point.hazard_level || point.risk_level;
      const inundationValue = point.max_inundation || point.inundation || 0;
      const riskLevel = this.getRiskLevel(hazardLevel || inundationValue);
      
      if (riskLevel === this.riskLevels.low) stats.byRiskLevel.low++;
      else if (riskLevel === this.riskLevels.medium) stats.byRiskLevel.medium++;
      else if (riskLevel === this.riskLevels.high) stats.byRiskLevel.high++;
    });
    
    return stats;
  }
  
  /**
   * Cleanup resources
   */
  cleanup() {
    this.clearPoints();
    if (this.pointsLayerGroup && this.mapInstance) {
      this.mapInstance.removeLayer(this.pointsLayerGroup);
    }
    this.pointsLayerGroup = null;
    this.mapInstance = null;
    this.cachedData = null;
    this.log('Cleaned up InundationPointsService');
  }
  
  /**
   * Enable/disable debug logging
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }
  
  /**
   * Debug logging helper
   */
  log(...args) {
    if (this.debugMode) {
      console.log('[InundationPointsService]', ...args);
    }
  }
}

export default InundationPointsService;
