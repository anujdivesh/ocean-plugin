/**
 * Robust Legend Error Handler
 * Provides fallback strategies for legend generation failures
 */

class LegendErrorHandler {
  constructor() {
    this.fallbackStrategies = [
      'ncwms-primary',      // gem-ncwms-hpc.spc.int (most reliable)
      'ocean-plotter-safe', // ocean-plotter with safe parameters
      'css-gradient',       // CSS-based gradient fallback
      'static-image'        // Static fallback image
    ];
    
    this.errorCache = new Map();
    this.retryCount = new Map();
    this.maxRetries = 3;
    
    // Known server issues to handle gracefully
    this.knownServerIssues = new Set([
      'gem-ncwms-hpc.spc.int-500-tpeak-psu-plasma'
    ]);
  }

  /**
   * Check if this is a known server issue that should be handled gracefully
   */
  isKnownServerIssue(variable, palette, statusCode = 500) {
    const issueKey = `gem-ncwms-hpc.spc.int-${statusCode}-${variable}-${palette}`;
    return this.knownServerIssues.has(issueKey);
  }

  /**
   * Get legend URL with automatic error handling and fallbacks
   */
  async getLegendUrlWithFallback(variable, range, unit, palette = 'plasma') {
    const cacheKey = `${variable}-${range}-${unit}-${palette}`;
    
    // Check if this combination previously failed
    if (this.errorCache.has(cacheKey)) {
      return this.generateFallbackLegend(variable, range, unit, palette);
    }

    // Try strategies in order
    for (const strategy of this.fallbackStrategies) {
      try {
        const url = this.generateLegendUrl(strategy, variable, range, unit, palette);
        
        // Test if URL is accessible (for critical applications)
        if (strategy === 'ncwms-primary' || strategy === 'ocean-plotter-safe') {
          const isAccessible = await this.testUrlAccessibility(url);
          if (!isAccessible) {
            console.warn(`Legend strategy ${strategy} failed, trying next...`);
            continue;
          }
        }
        
        return {
          url,
          strategy,
          fallback: false
        };
      } catch (error) {
        console.warn(`Legend strategy ${strategy} error:`, error);
        continue;
      }
    }

    // All strategies failed, return CSS fallback
    this.errorCache.set(cacheKey, true);
    return this.generateFallbackLegend(variable, range, unit, palette);
  }

  /**
   * Generate legend URL based on strategy
   */
  generateLegendUrl(strategy, variable, range, unit, palette) {
    switch (strategy) {
      case 'ncwms-primary':
        return this.generateNcWMSUrl(variable, range, unit, palette);
      
      case 'ocean-plotter-safe':
        return this.generateSafeOceanPlotterUrl(variable, range, unit, palette);
      
      case 'css-gradient':
      case 'static-image':
        return null; // Will be handled by React component
      
      default:
        throw new Error(`Unknown strategy: ${strategy}`);
    }
  }

  /**
   * Generate reliable ncWMS URL
   */
  generateNcWMSUrl(variable, range, unit, palette) {
    const layerMapping = {
      'tm02': 'cook_forecast/tm02',
      'tpeak': 'cook_forecast/tpeak', 
      'hs': 'cook_forecast/hs',
      'dirm': 'cook_forecast/dirm'
    };

    // Known problematic combinations that return 500 errors
    const knownProblematic = [
      { layer: 'cook_forecast/tpeak', palette: 'psu-plasma' }
    ];

    const layer = layerMapping[variable] || 'cook_forecast/hs';
    const isProblematic = knownProblematic.some(p => 
      p.layer === layer && p.palette === palette
    );

    // Skip ncWMS for known problematic combinations
    if (isProblematic) {
      console.log(`🌊 Skipping ncWMS for known problematic combination: ${layer} + ${palette}`);
      throw new Error('Known 500 error combination - using fallback');
    }

    const baseUrl = "https://gem-ncwms-hpc.spc.int/ncWMS/wms";
    
    const params = new URLSearchParams({
      REQUEST: 'GetLegendGraphic',
      LAYER: layer,
      PALETTE: palette.startsWith('psu-') ? palette : `psu-${palette}`,
      COLORSCALERANGE: range,
      NUMCOLORBANDS: '256',
      COLORBARONLY: 'true',
      VERTICAL: 'true',
      WIDTH: '70',
      HEIGHT: '300',
      TRANSPARENT: 'true',
      FORMAT: 'image/png'
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Generate safe ocean-plotter URL (minimal parameters to avoid 500 errors)
   */
  generateSafeOceanPlotterUrl(variable, range, unit, palette) {
    const [min, max] = range.split(',').map(parseFloat);
    const baseUrl = "https://ocean-plotter.spc.int/plotter/GetLegendGraphic";
    
    const layerMap = this.getLayerMapId(variable);
    const step = this.getOptimalStep(max - min);
    const safeColor = this.getSafeColorName(palette);
    
    // Minimal parameters to reduce 500 error risk
    const params = new URLSearchParams({
      layer_map: layerMap,
      mode: "standard",  // Avoid "enhanced" mode that causes errors
      min_color: min,
      max_color: max,
      step: step,
      color: safeColor,
      unit: unit
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Test URL accessibility without loading full image
   */
  async testUrlAccessibility(url, timeout = 5000) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        method: 'HEAD', // Only check headers, don't download content
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate CSS-based fallback legend
   */
  generateFallbackLegend(variable, range, unit, palette) {
    return {
      url: null,
      strategy: 'css-gradient',
      fallback: true,
      cssGradient: this.generateCSSGradient(palette, range),
      metadata: {
        variable,
        range,
        unit,
        palette,
        message: 'Using CSS fallback due to server errors'
      }
    };
  }

  /**
   * Generate CSS gradient for fallback
   */
  generateCSSGradient(palette, range) {
    const gradients = {
      'plasma': 'linear-gradient(to top, #0d0887 0%, #7e03a8 25%, #cc4778 50%, #f89441 75%, #f0f921 100%)',
      'viridis': 'linear-gradient(to top, #440154 0%, #404387 25%, #2a788e 50%, #22a884 75%, #7ad151 100%)',
      'inferno': 'linear-gradient(to top, #000004 0%, #420a68 25%, #932667 50%, #dd513a 75%, #fcffa4 100%)',
      'jet': 'linear-gradient(to top, #000080 0%, #0000ff 25%, #00ffff 50%, #ffff00 75%, #ff0000 100%)'
    };

    return gradients[palette] || gradients['plasma'];
  }

  // Helper methods
  getOptimalStep(range) {
    if (range <= 1) return 0.1;
    if (range <= 2) return 0.2;
    if (range <= 5) return 0.5;
    if (range <= 10) return 1.0;
    return 2.0;
  }

  getLayerMapId(variable) {
    const layerMaps = {
      'hs': 40,
      'tm02': 43,
      'tpeak': 43,
      'dirm': 44
    };
    return layerMaps[variable] || 40;
  }

  getSafeColorName(palette) {
    const safeColors = {
      'psu-plasma': 'plasma',
      'plasma': 'plasma',
      'psu-viridis': 'viridis',
      'viridis': 'viridis',
      'spectral': 'jet',
      'default': 'plasma'
    };
    return safeColors[palette] || safeColors['default'];
  }

  /**
   * Clear error cache (for retry mechanisms)
   */
  clearErrorCache() {
    this.errorCache.clear();
    this.retryCount.clear();
  }
}

export default LegendErrorHandler;