/**
 * Vector Arrow Optimization Service
 * 
 * Implements world-class vector field visualization with:
 * - Magnitude-scaled arrow length and opacity
 * - Zoom-dependent density control
 * - "Fade to calm" styling for low-energy zones
 * 
 * Based on best practices from scientific visualization and GIS systems
 */

import logger from '../utils/logger';

export class VectorArrowOptimizer {
  constructor() {
    // Arrow density thresholds by zoom level
    this.densityConfig = {
      // Zoom: approximate spacing in km
      8: { spacing: 8, description: 'National view - sparse' },
      9: { spacing: 6, description: 'Regional view' },
      10: { spacing: 4, description: 'Multi-island view' },
      11: { spacing: 2, description: 'Island scale - RECOMMENDED' },
      12: { spacing: 1.5, description: 'Near-shore view' },
      13: { spacing: 1, description: 'Coastal detail' },
      14: { spacing: 0.75, description: 'Maximum detail' }
    };

    // Magnitude-based styling (wave speed/energy)
    this.magnitudeThresholds = {
      veryCalm: 0.2,    // < 0.2 m/s - nearly transparent
      calm: 0.5,        // 0.2-0.5 m/s - light arrows
      moderate: 1.0,    // 0.5-1.0 m/s - standard arrows
      energetic: 2.0,   // 1.0-2.0 m/s - emphasized
      veryEnergetic: 3.0 // > 2.0 m/s - maximum emphasis
    };

    // Current configuration
    this.currentConfig = {
      zoomLevel: 10,
      densitySpacing: 4,
      opacityMultiplier: 0.9,
      lengthMultiplier: 1.0
    };
  }

  /**
   * Generate optimized WMS parameters for vector arrows
   * @param {number} zoomLevel - Current map zoom level
   * @param {Object} options - Additional configuration options
   * @returns {Object} WMS parameters for arrow layer
   */
  getOptimizedArrowParams(zoomLevel, options = {}) {
    const {
      baseOpacity = 0.9,
      energyMode = 'dynamic', // 'dynamic' | 'uniform'
      arrowStyle = 'scaled' // 'scaled' | 'uniform'
    } = options;

    // Determine optimal density based on zoom
    const densityConfig = this.getDensityForZoom(zoomLevel);
    
    // Calculate NUMVECTORS based on spacing
    // THREDDS WMS uses NUMVECTORS to control arrow density
    // Higher values = more arrows (we invert spacing to get count)
    const numVectors = this.calculateNumVectors(zoomLevel, densityConfig.spacing);

    // Base parameters for arrow rendering
    const params = {
      // Standard WMS parameters
      style: 'black-arrow', // THREDDS arrow style
      colorscalerange: '',  // Not used for arrows
      
      // Arrow-specific THREDDS parameters
      NUMVECTORS: numVectors,  // Density control
      
      // Rendering quality
      format: 'image/png',
      transparent: true,
      
      // Opacity based on zoom and energy mode
      opacity: this.calculateBaseOpacity(zoomLevel, baseOpacity, energyMode),
      
      // Layer ordering
      zIndex: 2, // Above raster layer
      
      // Metadata for debugging
      _optimizationMetadata: {
        zoomLevel,
        densitySpacing: densityConfig.spacing,
        description: densityConfig.description,
        numVectors,
        energyMode,
        arrowStyle
      }
    };

    // Add magnitude-based styling if supported by server
    if (arrowStyle === 'scaled') {
      // Note: THREDDS WMS may not support all these parameters
      // They're included for servers that do support advanced arrow styling
      params.ARROWSIZE = this.calculateArrowSize(zoomLevel);
      params.ARROWSCALE = 'magnitude'; // Scale by magnitude if supported
    }

    this.currentConfig = {
      zoomLevel,
      densitySpacing: densityConfig.spacing,
      opacityMultiplier: params.opacity,
      lengthMultiplier: params.ARROWSIZE || 1.0
    };

    logger.info('VECTOR_ARROWS', `Optimized for zoom ${zoomLevel}`, {
      numVectors,
      spacing: `${densityConfig.spacing}km`,
      opacity: params.opacity,
      description: densityConfig.description
    });

    return params;
  }

  /**
   * Get density configuration for zoom level
   * @param {number} zoom - Zoom level
   * @returns {Object} Density configuration
   */
  getDensityForZoom(zoom) {
    // Find closest zoom level in config
    const zoomLevels = Object.keys(this.densityConfig).map(Number).sort((a, b) => a - b);
    
    let closestZoom = zoomLevels[0];
    let minDiff = Math.abs(zoom - closestZoom);
    
    for (const level of zoomLevels) {
      const diff = Math.abs(zoom - level);
      if (diff < minDiff) {
        minDiff = diff;
        closestZoom = level;
      }
    }

    return this.densityConfig[closestZoom];
  }

  /**
   * Calculate NUMVECTORS parameter based on zoom and spacing
   * @param {number} zoom - Zoom level
   * @param {number} spacing - Desired spacing in km
   * @returns {number} NUMVECTORS value
   */
  calculateNumVectors(zoom, spacing) {
    // NUMVECTORS is density per tile or viewport
    // Lower spacing = higher density = more vectors
    
    // Base calculation: invert spacing to get relative density
    // Typical values: 10-50 for sparse, 50-200 for moderate, 200-500 for dense
    
    const baseVectors = 100; // Baseline at zoom 10, 4km spacing
    const spacingFactor = 4 / spacing; // Normalize to 4km baseline
    const zoomFactor = Math.pow(1.3, zoom - 10); // Increase with zoom
    
    const numVectors = Math.round(baseVectors * spacingFactor * zoomFactor);
    
    // Clamp to reasonable range
    return Math.max(10, Math.min(500, numVectors));
  }

  /**
   * Calculate base opacity based on zoom level
   * @param {number} zoom - Zoom level
   * @param {number} baseOpacity - Base opacity value
   * @param {string} energyMode - Energy visualization mode
   * @returns {number} Adjusted opacity
   */
  calculateBaseOpacity(zoom, baseOpacity, energyMode) {
    if (energyMode === 'uniform') {
      return baseOpacity;
    }

    // Reduce opacity at lower zooms to prevent overwhelming the raster
    // At island scale (zoom 11+), use full opacity
    // At national scale (zoom < 10), reduce by 20-30%
    
    if (zoom >= 11) {
      return baseOpacity;
    } else if (zoom >= 10) {
      return baseOpacity * 0.9;
    } else if (zoom >= 9) {
      return baseOpacity * 0.8;
    } else {
      return baseOpacity * 0.7;
    }
  }

  /**
   * Calculate arrow size multiplier based on zoom
   * @param {number} zoom - Zoom level
   * @returns {number} Arrow size multiplier
   */
  calculateArrowSize(zoom) {
    // Smaller arrows at lower zoom (less visual clutter)
    // Larger arrows at higher zoom (better visibility of detail)
    
    if (zoom >= 12) {
      return 1.2; // 20% larger at close zoom
    } else if (zoom >= 11) {
      return 1.0; // Standard size at island scale
    } else if (zoom >= 10) {
      return 0.9; // 10% smaller
    } else {
      return 0.8; // 20% smaller at far zoom
    }
  }

  /**
   * Get CSS filter for magnitude-based fade effect
   * This can be applied client-side as an enhancement
   * @param {number} magnitude - Wave magnitude (m/s or similar)
   * @returns {string} CSS filter string
   */
  getMagnitudeFadeFilter(magnitude) {
    const { veryCalm, calm, moderate, energetic } = this.magnitudeThresholds;

    if (magnitude < veryCalm) {
      // Nearly invisible for very calm conditions
      return 'opacity(0.2)';
    } else if (magnitude < calm) {
      // Faded for calm conditions
      return 'opacity(0.4)';
    } else if (magnitude < moderate) {
      // Semi-transparent for moderate conditions
      return 'opacity(0.7)';
    } else if (magnitude < energetic) {
      // Full opacity for energetic conditions
      return 'opacity(0.9)';
    } else {
      // Enhanced for very energetic conditions (with slight brightness boost)
      return 'opacity(1.0) brightness(1.1)';
    }
  }

  /**
   * Generate arrow color based on magnitude
   * Alternative to pure opacity - uses color intensity
   * @param {number} magnitude - Wave magnitude
   * @returns {string} RGB color string
   */
  getMagnitudeColor(magnitude) {
    const { veryCalm, calm, moderate, energetic, veryEnergetic } = this.magnitudeThresholds;

    if (magnitude < veryCalm) {
      return 'rgb(150, 150, 150)'; // Light gray - very calm
    } else if (magnitude < calm) {
      return 'rgb(100, 100, 100)'; // Medium gray - calm
    } else if (magnitude < moderate) {
      return 'rgb(50, 50, 50)'; // Dark gray - moderate
    } else if (magnitude < energetic) {
      return 'rgb(0, 0, 0)'; // Black - energetic
    } else if (magnitude < veryEnergetic) {
      return 'rgb(139, 0, 0)'; // Dark red - very energetic
    } else {
      return 'rgb(220, 0, 0)'; // Bright red - extreme
    }
  }

  /**
   * Get recommended density description for current config
   * @returns {string} Human-readable description
   */
  getCurrentDensityDescription() {
    return this.densityConfig[this.currentConfig.zoomLevel]?.description 
      || `~${this.currentConfig.densitySpacing}km spacing`;
  }

  /**
   * Get optimization status report
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      ...this.currentConfig,
      description: this.getCurrentDensityDescription(),
      thresholds: this.magnitudeThresholds,
      isOptimized: this.currentConfig.zoomLevel >= 11
    };
  }

  /**
   * Generate user-facing explanation of current settings
   * @returns {string} Explanation text
   */
  getExplanation() {
    const { zoomLevel, densitySpacing } = this.currentConfig;
    const density = this.getDensityForZoom(zoomLevel);
    
    return `Arrow density optimized for zoom level ${zoomLevel}: ${density.description} (${densitySpacing}km spacing). ` +
      `Arrows fade for calm conditions (<0.2 m/s) and emphasize energetic zones (>1.0 m/s).`;
  }
}

// Singleton instance
const vectorArrowOptimizer = new VectorArrowOptimizer();

export default vectorArrowOptimizer;
