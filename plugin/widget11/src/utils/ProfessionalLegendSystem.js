/**
 * Professional Legend System - Wave Height Configuration
 * Replaces dual legend approach with unified, adaptive system
 */

class ProfessionalLegendSystem {
  constructor() {
    this.baseUrl = "https://gem-ncwms-hpc.spc.int/ncWMS/wms";
    this.fallbackUrl = "https://ocean-plotter.spc.int/plotter/GetLegendGraphic";
  }

  /**
   * Generate professional wave height legend with adaptive parameters
   */
  getWaveHeightLegendConfig(actualRange = "0.17,1.66", conditions = "normal") {
    const [min, max] = actualRange.split(',').map(Number);
    
    // Calculate optimal parameters based on actual data
    const range = max - min;
    const optimalStep = this.getOptimalStep(range);
    const optimalBands = this.getOptimalBands(range, conditions);
    const palette = this.getOptimalPalette("wave_height", conditions);

    return {
      // Primary ncWMS legend (preferred)
      primary: {
        url: this.generateNcWMSLegend("cook_forecast/hs", {
          palette: palette,
          colorscalerange: actualRange,
          numcolorbands: optimalBands,
          vertical: true,
          colorbaronly: true,
          width: this.getResponsiveWidth(),
          height: this.getResponsiveHeight()
        }),
        type: "server-generated",
        quality: "high"
      },
      
      // Fallback ocean-plotter legend
      fallback: {
        url: this.generateFallbackLegend("wave_height", {
          min_color: min,
          max_color: max,
          step: optimalStep,
          color: palette.replace('psu-', ''),
          unit: 'm',
          mode: 'professional',
          quality: 'high',
          bands: optimalBands
        }),
        type: "legacy-compatible"
      },

      // CSS gradient (for styling consistency)
      css: this.generateCSSGradient(palette, actualRange),
      
      // Metadata
      metadata: {
        range: actualRange,
        palette: palette,
        bands: optimalBands,
        step: optimalStep,
        variable: "Significant Wave Height",
        unit: "m",
        conditions: conditions
      }
    };
  }

  /**
   * Generate optimized ncWMS legend URL
   */
  generateNcWMSLegend(layer, params) {
    const urlParams = new URLSearchParams({
      REQUEST: 'GetLegendGraphic',
      LAYER: layer,
      PALETTE: params.palette,
      COLORSCALERANGE: params.colorscalerange,
      NUMCOLORBANDS: params.numcolorbands,
      COLORBARONLY: params.colorbaronly || 'true',
      VERTICAL: params.vertical || 'true',
      WIDTH: params.width,
      HEIGHT: params.height,
      TRANSPARENT: 'true',
      FORMAT: 'image/png'
    });

    return `${this.baseUrl}?${urlParams.toString()}`;
  }

  /**
   * Generate fallback legend for compatibility
   */
  generateFallbackLegend(variable, params) {
    const layerMap = this.getLayerMapId(variable);
    const urlParams = new URLSearchParams({
      layer_map: layerMap,
      mode: params.mode || 'professional',
      min_color: params.min_color,
      max_color: params.max_color,
      step: params.step,
      color: params.color,
      unit: params.unit,
      quality: params.quality || 'high',
      bands: params.bands || 256,
      precision: 1,
      show_units: 'true',
      background: 'transparent'
    });

    return `${this.fallbackUrl}?${urlParams.toString()}`;
  }

  /**
   * Generate CSS gradient for consistent styling
   */
  generateCSSGradient(palette, range) {
    // Use CSS custom properties for dynamic gradients
    const gradientStops = this.getPaletteStops(palette, range);
    
    return {
      background: `linear-gradient(to top, ${gradientStops.join(', ')})`,
      cssVariables: {
        '--legend-gradient': `linear-gradient(to top, ${gradientStops.join(', ')})`,
        '--legend-min': range.split(',')[0],
        '--legend-max': range.split(',')[1]
      }
    };
  }

  /**
   * Get optimal color steps based on data range
   */
  getOptimalStep(range) {
    if (range <= 1) return 0.1;      // Fine detail for small ranges
    if (range <= 2) return 0.2;      // Your current setting
    if (range <= 5) return 0.5;      // Medium ranges
    if (range <= 10) return 1.0;     // Larger ranges
    return 2.0;                      // Very large ranges
  }

  /**
   * Get optimal color bands based on range and conditions
   */
  getOptimalBands(range, conditions) {
    const base = conditions === "storm" ? 300 : 256;
    
    // Adjust based on range
    if (range <= 1) return Math.min(base * 1.5, 400);  // More detail for small ranges
    if (range <= 3) return base;                        // Standard detail
    return Math.max(base * 0.75, 128);                  // Less detail for large ranges
  }

  /**
   * Get optimal palette for conditions
   */
  getOptimalPalette(variable, conditions) {
    const palettes = {
      wave_height: {
        normal: "psu-viridis",      // Perceptually uniform
        storm: "psu-inferno",       // High contrast for extremes
        calm: "psu-viridis"         // Consistent for low energy
      }
    };

    return palettes[variable]?.[conditions] || "psu-viridis";
  }

  /**
   * Get responsive dimensions
   */
  getResponsiveWidth() {
    const width = window.innerWidth;
    if (width <= 480) return '40';
    if (width <= 768) return '50';
    if (width <= 1024) return '60';
    return '70';
  }

  getResponsiveHeight() {
    const width = window.innerWidth;
    if (width <= 480) return '200';
    if (width <= 768) return '240';
    if (width <= 1024) return '280';
    return '320';
  }

  /**
   * Get layer map ID for legacy compatibility
   */
  getLayerMapId(variable) {
    const layerMaps = {
      'wave_height': 40,
      'wave_period': 43,
      'wave_direction': 44
    };
    return layerMaps[variable] || 40;
  }

  /**
   * Generate palette color stops for CSS
   */
  getPaletteStops(palette, range) {
    // Simplified viridis stops for CSS (much more efficient than 100 stops)
    const viridisStops = [
      'rgb(68, 1, 84)',      // 0% - Dark purple
      'rgb(70, 50, 126)',    // 20% - Purple
      'rgb(54, 92, 141)',    // 40% - Blue-purple
      'rgb(32, 144, 140)',   // 60% - Teal
      'rgb(94, 201, 97)',    // 80% - Green
      'rgb(253, 231, 36)'    // 100% - Yellow
    ];

    return viridisStops.map((color, index) => 
      `${color} ${(index / (viridisStops.length - 1) * 100).toFixed(1)}%`
    );
  }
}

export default ProfessionalLegendSystem;