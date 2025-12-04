/**
 * Marine Visualization System
 * Implements state-of-the-art techniques used by NOAA, ECMWF, and leading marine forecast centers
 */

class WorldClassVisualization {
  // World Meteorological Organization (WMO) standard color scales
  // By making these properties static, they are available on the class itself,
  // resolving the 'this' context issue during module initialization.
  static wmoStandards = {
      significantWaveHeight: {
        // Enhanced Beaufort scale-inspired ranges
        ranges: [
          { min: 0.0, max: 0.1, label: "Calm", color: "#000080", description: "Mirror-like surface" },
          { min: 0.1, max: 0.5, label: "Light Air", color: "#0000FF", description: "Ripples, no foam crests" },
          { min: 0.5, max: 1.0, label: "Light Breeze", color: "#4169E1", description: "Small wavelets" },
          { min: 1.0, max: 1.5, label: "Gentle Breeze", color: "#00BFFF", description: "Large wavelets, scattered foam" },
          { min: 1.5, max: 2.5, label: "Moderate Breeze", color: "#00FFFF", description: "Small waves, frequent foam" },
          { min: 2.5, max: 4.0, label: "Fresh Breeze", color: "#00FF7F", description: "Moderate waves, whitecaps" },
          { min: 4.0, max: 6.0, label: "Strong Breeze", color: "#FFFF00", description: "Large waves, extensive foam" },
          { min: 6.0, max: 9.0, label: "Near Gale", color: "#FFA500", description: "Sea heaps up, foam blown" },
          { min: 9.0, max: 12.0, label: "Gale", color: "#FF4500", description: "High waves, dense foam" },
          { min: 12.0, max: 16.0, label: "Strong Gale", color: "#FF0000", description: "Very high waves, rolling" },
          { min: 16.0, max: 20.0, label: "Storm", color: "#DC143C", description: "Exceptionally high waves" },
          { min: 20.0, max: 30.0, label: "Violent Storm", color: "#8B0000", description: "Phenomenal waves" }
        ]
      }
  };

  // Scientific color palettes optimized for ocean data
  static scientificPalettes = {
      // Perceptual uniform palettes (matplotlib standard)
      viridis: "psu-viridis",     // Best for continuous data
      plasma: "psu-plasma",       // High contrast, good for periods
      inferno: "psu-inferno",     // Dramatic, good for extreme events
      cividis: "psu-viridis",     // Colorblind optimized (fallback to viridis)
      spectral: "spectral",       // Diverging palette for oceanographic data
      
      // ENHANCED: Divergent palettes for maximum visual distinction
      "rd-yl-bu": "rd-yl-bu",     // Red-Yellow-Blue divergent (NOAA standard)
      "div-rd-bu": "div-rd-bu",   // Red-Blue divergent (high contrast)
      "psu-turbo": "psu-turbo",   // Google Turbo (improved rainbow)
      "br-bg": "br-bg",           // Brown-Blue-Green divergent
      "pi-yl-gn": "pi-yl-gn",     // Pink-Yellow-Green divergent
      
      // Sequential palettes for Cook Islands
      "seq-Blues": "seq-Blues",   // Sequential Blues (legacy)
      "x-Sst": "x-Sst",           // X-SST palette (matches inundation styling)
      
      // Oceanographic specialist palettes
      ocean: "psu-jet",           // Traditional oceanographic
      thermal: "psu-plasma",      // Temperature-like data
      haline: "psu-viridis",      // Wave height and salinity-like data
      speed: "psu-plasma",        // Velocity/speed data
      
      // NOAA/NWS operational palettes
      precipitation: "psu-jet",
      temperature: "psu-plasma",
      winds: "spectral",          // Updated to Spectral for wave-related data
      
      // Wave-specific palettes (oceanographic standards)
      waveHeight: "x-Sst",        // UPDATED: X-SST palette for wave height (matches inundation)
      wavePeriod: "spectral",     // ENHANCED: Spectral divergent for superior period visualization
      waveDirection: "spectral"   // Directional data
  };

  // Advanced styling configurations
  static advancedConfigs = {
      significantWaveHeight: {
        // Multi-threshold configuration for different sea states using X-SST palette
        calm: {
          range: "0,4",      // Updated to 4m max as requested
          palette: "x-Sst",        // UPDATED: X-SST palette (matches inundation)
          bands: 250,
          opacity: 0.7,
          description: "Cook Islands wave conditions"
        },
        moderate: {
          range: "0,4",      // Updated to 4m max as requested
          palette: "x-Sst",        // UPDATED: X-SST palette (matches inundation)
          bands: 250,
          opacity: 0.8,
          description: "Cook Islands wave height - current conditions"
        },
        rough: {
          range: "0,4",      // Updated to 4m max as requested
          palette: "x-Sst",        // UPDATED: X-SST palette (matches inundation)
          bands: 250,
          description: "Cook Islands wave height - full range"
        },
        dangerous: {
          range: "0,15",
          palette: "x-Sst",        // UPDATED: X-SST palette for consistency
          bands: 250,
          description: "Dangerous seas - gale warning"
        },
        extreme: {
          range: "0,25",
          palette: "x-Sst",        // UPDATED: X-SST palette for consistency
          bands: 250,
          description: "Extreme seas - storm warning"
        }
      },
      
      meanWavePeriod: {
        // Professional wave period visualization configurations with enhanced divergent palettes
        lowFrequency: {
          range: "0,20",           // Full range for comprehensive analysis
          palette: "div-Spectral", // ENHANCED: Spectral provides maximum divergence (red-orange-yellow-green-cyan-blue-purple)
          bands: 300,              // Increased resolution for better transitions
          opacity: 0.88,
          description: "Enhanced divergent wave period analysis - maximum visual distinction"
        },
        surfConditions: {
          range: "3,15",           // Focused on typical surf conditions  
          palette: "div-RdYlBu",   // ENHANCED: Red-Yellow-Blue divergent palette for surf analysis
          bands: 250,
          opacity: 0.85,
          description: "High-contrast surf wave period analysis with divergent colors"
        },
        stormAnalysis: {
          range: "5,25",           // Extended range for storm analysis
          palette: "div-RdBu",     // ENHANCED: Red-Blue divergent palette for storm analysis
          bands: 350,
          opacity: 0.92,
          description: "Ultra-high contrast storm wave period analysis - extreme visual differentiation"
        },
        // NEW: Cook Islands optimized configuration
        cookIslands: {
          range: "0,20",           // Cook Islands typical range
          palette: "div-Spectral", // ENHANCED: Spectral divergent palette for maximum contrast
          bands: 280,
          opacity: 0.87,
          description: "Cook Islands wave period - divergent palette optimized for Pacific conditions"
        }
      }
  };

  /**
   * Get adaptive WMS configuration based on current conditions
   */
  getAdaptiveWaveHeightConfig(maxObservedHeight = 4.0, region = "tropical") {
    let config;
    const baseConfigs = this.constructor.advancedConfigs.significantWaveHeight;
    // Select configuration based on sea state
    if (maxObservedHeight <= 1.0) {
      config = baseConfigs.calm;
    } else if (maxObservedHeight <= 4.0) {
      config = baseConfigs.moderate;
    } else if (maxObservedHeight <= 8.0) {
      config = baseConfigs.rough;
    } else if (maxObservedHeight <= 15.0) {
      config = baseConfigs.dangerous;
    } else {
      config = baseConfigs.extreme;
    }

    // Regional adjustments
    if (region === "tropical") {
      // Tropical regions: maintain high-resolution palette
      config = { ...config, bands: 250 };
    } else if (region === "polar") {
      // Polar regions: focus on lower ranges
      config = { ...config, range: `0,${Math.min(parseFloat(config.range.split(',')[1]), 6)}` };
    }

    return {
      style: `default-scalar/${config.palette}`,
      colorscalerange: config.range,
      numcolorbands: config.bands,
      belowmincolor: "transparent",
      abovemaxcolor: "extend",
      opacity: config.opacity || 0.8,
      colorscaling: "linear"
    };
  }

  /**
   * Get adaptive mean wave period configuration based on expected conditions
   * ENHANCED with divergent color schemes for superior visual distinction
   */
  getAdaptiveWavePeriodConfig(maxPeriod = 20.0, analysisType = "general") {
    let config;
    const periodConfigs = this.constructor.advancedConfigs.meanWavePeriod;
    
    // Select configuration based on wave period range and analysis type
    if (maxPeriod <= 12.0 || analysisType === "surf") {
      config = periodConfigs.surfConditions;
    } else if (maxPeriod > 20.0 || analysisType === "storm") {
      config = periodConfigs.stormAnalysis;
    } else if (analysisType === "cookIslands") {
      // Use Cook Islands optimized divergent palette
      config = periodConfigs.cookIslands;
    } else {
      // Default to enhanced divergent palette
      config = periodConfigs.lowFrequency;
    }

    return {
      style: `default-scalar/${config.palette}`,
      colorscalerange: config.range,
      numcolorbands: config.bands,
      belowmincolor: "transparent",
      abovemaxcolor: "extend",
      opacity: config.opacity || 0.87,
      // Enhanced styling for better visual impact
      interpolation: "linear",
      smoothing: true
    };
  }

  /**
   * Generate world-class legend URL with robust fallback system
   */
  getWorldClassLegendUrl(variable, range, unit, palette = null) {
    // Smart palette selection based on variable type and server compatibility
    let selectedPalette = palette;
    if (!selectedPalette) {
      if (variable === 'tpeak') {
        selectedPalette = "psu-magma"; // Use magma for tpeak (matches layer configuration)
      } else if (variable === 'tm02') {
        selectedPalette = "spectral"; // Use spectral for mean periods
      } else if (variable === 'hs') {
        selectedPalette = "x-Sst"; // UPDATED: Use X-SST for wave height (matches inundation)
      } else {
        selectedPalette = "plasma"; // Default for other variables
      }
    }
    
    // Primary: Use ncWMS for reliable legend generation
    const primaryUrl = this.generateNcWMSLegendUrl(variable, range, unit, selectedPalette);
    if (primaryUrl) {
      return primaryUrl;
    }
    
    // Fallback: Use simplified ocean-plotter parameters
    return this.generateFallbackLegendUrl(variable, range, unit, selectedPalette);
  }

  /**
   * Generate reliable ncWMS legend URL (preferred method)
   */
  generateNcWMSLegendUrl(variable, range, unit, palette) {
    // Map variable to layer name
    const layerMapping = {
      'tm02': 'cook_forecast/tm02',
      'tpeak': 'cook_forecast/tpeak', 
      'hs': 'cook_forecast/hs',
      'dirm': 'cook_forecast/dirm',
      'raro_inun': 'raro_inun/Band1'
    };

    const fallbackLayer = variable.includes('/') ? variable : `cook_forecast/${variable}`;
    const layer = layerMapping[variable] || layerMapping[variable.split('/')[0]] || fallbackLayer;
    const baseUrl = "https://gem-ncwms-hpc.spc.int/ncWMS/wms";
    
    // Get responsive dimensions
    const screenWidth = window.innerWidth || 1024;
    const width = screenWidth <= 480 ? '50' : screenWidth <= 768 ? '60' : '70';
    const height = screenWidth <= 480 ? '220' : screenWidth <= 768 ? '260' : '300';
    
    // Use consistent palette configuration for tpeak
    let safePalette = palette;
    if (variable === 'tpeak' && palette === 'psu-magma') {
      safePalette = 'psu-magma'; // Keep magma for tpeak (consistent with layer config)
      console.log('🌊 Using magma palette for tpeak:', safePalette);
    }
    
    const correctPalette = this.constructor.scientificPalettes[safePalette] || safePalette;
    const requiresHighResolution = correctPalette === 'x-Sst';
    const targetBandCount = requiresHighResolution ? '250' : '256';
    // Create legend URL with error handling for WMS server limitations
    const params = new URLSearchParams({
      REQUEST: 'GetLegendGraphic',
      LAYER: layer,
      PALETTE: correctPalette
    });
    
    // Only add additional parameters if they're likely to be supported
    if (range && range !== '') {
      params.append('COLORSCALERANGE', range);
    }
    
    // Use minimal parameters for server compatibility
    if (variable === 'tpeak' || correctPalette.startsWith('div-') || correctPalette.startsWith('seq-')) {
      // For tpeak and divergent/sequential palettes, use minimal parameters only
      params.append('WIDTH', width);
      params.append('HEIGHT', height);
      params.append('FORMAT', 'image/png');
      if (requiresHighResolution) {
        params.append('NUMCOLORBANDS', targetBandCount);
        params.append('COLORSCALING', 'linear');
      }
    } else {
      // For other PSU palettes, use full parameters
      params.append('NUMCOLORBANDS', targetBandCount);
      params.append('COLORBARONLY', 'true');
      params.append('VERTICAL', 'true');
      params.append('WIDTH', width);
      params.append('HEIGHT', height);
      params.append('TRANSPARENT', 'true');
      params.append('FORMAT', 'image/png');
      if (requiresHighResolution) {
        params.append('COLORSCALING', 'linear');
      }
    }

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Generate simplified fallback legend URL (for compatibility)
   */
  generateFallbackLegendUrl(variable, range, unit, palette) {
    const [min, max] = range.split(',').map(parseFloat);
    const baseUrl = "https://ocean-plotter.spc.int/plotter/GetLegendGraphic";
    
    // Use consistent palette configuration for tpeak
    let safePalette = palette;
    if (variable === 'tpeak' && palette === 'psu-magma') {
      safePalette = 'psu-magma'; // Keep magma for tpeak (consistent with layer config)
    }
    
    // Use simplified, stable parameters to avoid 500 errors
    const params = new URLSearchParams({
      layer_map: this.getLayerMapId(variable),
      mode: "standard", // Use stable standard mode
      min_color: min,
      max_color: max,
      step: this.getOptimalStep(min, max),
      color: this.getSafeColorName(safePalette),
      unit: unit
    });

    if (safePalette === 'x-Sst') {
      params.append('bands', '250');
      params.append('scaling', 'linear');
    }

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Get safe color name for fallback system
   * ENHANCED with divergent palette support
   */
  getSafeColorName(palette) {
    const safeColors = {
      // Standard palettes
      'psu-plasma': 'plasma',
      'plasma': 'plasma',
      'psu-viridis': 'viridis', 
      'viridis': 'viridis',
      'psu-inferno': 'inferno',
      'inferno': 'inferno',
      
      // Sequential palettes for Cook Islands
      'seq-Blues': 'blues',        // Sequential Blues (legacy)
      'x-Sst': 'sst',              // X-SST palette (matches inundation)
      
      // ENHANCED: Divergent palettes for superior wave period visualization
      'div-Spectral': 'spectral',   // Full divergent spectrum
      'div-RdYlBu': 'rdylbu',      // Red-Yellow-Blue
      'div-RdBu': 'rdbu',          // Red-Blue divergent
      'div-BrBG': 'brbg',          // Brown-Blue-Green
      'div-PiYG': 'piyg',          // Pink-Yellow-Green
      'div-PuOr': 'puor',          // Purple-Orange
      
      // Fallbacks for compatibility
      'jet': 'jet',
      'default': 'spectral'         // Default to spectral globally (unchanged)
    };
    
    return safeColors[palette] || safeColors['default'];
  }

  /**
   * Get optimal step size for legend based on range
   */
  getOptimalStep(min, max) {
    const range = max - min;
    if (range <= 2) return 0.2;
    if (range <= 5) return 0.5;
    if (range <= 10) return 1;
    if (range <= 20) return 2;
    return 5;
  }

  /**
   * Get precision for different variables
   */
  getPrecision(variable) {
    if (variable.includes('hs')) return 1; // Wave height: 1 decimal
    if (variable.includes('tm') || variable.includes('tpeak')) return 1; // Periods: 1 decimal
    return 2; // Default: 2 decimals
  }

  /**
   * Get layer map ID for legend generation
   */
  getLayerMapId(variable) {
    const layerMaps = {
      'hs': 40,        // Significant wave height
      'tm02': 43,      // Mean wave period
      'tpeak': 43,     // Peak wave period
      'dirm': 44,      // Wave direction
      'default': 40
    };

    for (const [key, id] of Object.entries(layerMaps)) {
      if (variable.includes(key)) return id;
    }
    return layerMaps.default;
  }

  /**
   * Generate enhanced composite layer configuration
   */
  getWorldClassCompositeConfig() {
    return {
      label: "Significant Wave Height + Direction",
      value: "world_class_composite_hs_dirm",
      id: 999,
      composite: true,
      description: "Professional-grade wave analysis combining height and direction",
      layers: [
        {
          value: "cook_forecast/hs",
          ...this.getAdaptiveWaveHeightConfig(6.0, "tropical"),
          wmsUrl: "https://gem-ncwms-hpc.spc.int/ncWMS/wms",
          id: 1001,
          legendUrl: this.getWorldClassLegendUrl("hs", "0,4", "m", "x-Sst"),
          zIndex: 1,
          // Add additional config needed for capabilities
          style: "default-scalar/x-Sst",
          colorscalerange: "0.17,1.66",
          numcolorbands: 250,
          dataset: "cook_forecast",
          colorscaling: "linear"
        },
        {
          value: "dirm", // THREDDS layer name (without dataset prefix)
          style: "black-arrow",
          colorscalerange: "",
          wmsUrl: "https://gemthreddshpc.spc.int/thredds/wms/POP/model/country/spc/forecast/hourly/COK/Rarotonga_UGRID.nc",
          id: 1002,
          zIndex: 2,
          opacity: 0.9,
          // THREDDS-specific config (no dataset parameter needed)
          description: "Wave direction arrows from THREDDS server (direct access with CORS layer)"
        }
      ]
    };
  }

  /**
   * Get real-time adaptive styling based on forecast data
   */
  getRealTimeAdaptiveConfig(forecastData) {
    if (!forecastData || !forecastData.maxWaveHeight) {
      return this.getAdaptiveWaveHeightConfig(); // Default
    }

    const maxHeight = forecastData.maxWaveHeight;
    
    // Dynamically adjust color range based on actual forecast
    let optimalMax;
    if (maxHeight <= 2) {
      optimalMax = 3;   // Calm conditions
    } else if (maxHeight <= 6) {
      optimalMax = Math.ceil(maxHeight * 1.2); // Add 20% buffer
    } else {
      optimalMax = Math.ceil(maxHeight * 1.1); // Add 10% buffer for extreme events
    }

    const config = this.getAdaptiveWaveHeightConfig(maxHeight, "tropical");
    config.colorscalerange = `0,${optimalMax}`;
    
    return config;
  }

  /**
   * Generate accessibility-enhanced styling
   */
  getAccessibilityConfig(colorBlindType = null) {
    const config = this.getAdaptiveWaveHeightConfig();
    
    switch (colorBlindType) {
      case 'deuteranopia':
      case 'protanopia':
        // Use spectral palette - good contrast and colorblind accessible
        config.style = "default-scalar/spectral"; // Updated to Spectral
        break;
      case 'tritanopia':
        // Use plasma palette
        config.style = "default-scalar/psu-plasma";
        break;
      default:
        // Use default spectral - universally accessible for oceanographic data
        config.style = "default-scalar/spectral"; // Updated to Spectral
        break;
    }
    
    return config;
  }
}

export default WorldClassVisualization;
