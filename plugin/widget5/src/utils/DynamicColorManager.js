/**
 * Dynamic Color Manager for Marine Forecast Systems
 * Implements Viridis-like palettes with adaptive ranges based on forecast conditions
 */

export class DynamicColorManager {
  constructor() {
    // Viridis color palette points (RGB values) - scientifically accurate stops
    this.viridisColors = [
      { value: 0.0, color: '#440154', rgb: [68, 1, 84] },    // Deep purple
      { value: 0.1, color: '#482878', rgb: [72, 40, 120] },  // Purple-blue
      { value: 0.2, color: '#3E4989', rgb: [62, 73, 137] },  // Blue
      { value: 0.3, color: '#31688E', rgb: [49, 104, 142] }, // Blue-teal
      { value: 0.4, color: '#26828E', rgb: [38, 130, 142] }, // Teal
      { value: 0.5, color: '#1F9E89', rgb: [31, 158, 137] }, // Blue-green
      { value: 0.6, color: '#35B779', rgb: [53, 183, 121] }, // Green
      { value: 0.7, color: '#6CCE59', rgb: [108, 206, 89] }, // Yellow-green
      { value: 0.8, color: '#B4DE2C', rgb: [180, 222, 44] }, // Yellow
      { value: 0.9, color: '#FDE725', rgb: [253, 231, 37] }, // Bright yellow
      { value: 1.0, color: '#FDE725', rgb: [253, 231, 37] }  // Extreme yellow
    ];

    // Wave height thresholds for different sea states
    this.seaStateThresholds = {
      calm: { max: 0.5, description: "Calm seas" },
      slight: { max: 1.25, description: "Slight seas" },
      moderate: { max: 2.5, description: "Moderate seas" },
      rough: { max: 4.0, description: "Rough seas" },
      veryRough: { max: 6.0, description: "Very rough seas" },
      high: { max: 9.0, description: "High seas" },
      veryHigh: { max: 14.0, description: "Very high seas" },
      phenomenal: { max: 20.0, description: "Phenomenal seas" }
    };
  }

  /**
   * Analyze forecast data to determine optimal color range
   * @param {Array} forecastData - Array of wave height values
   * @returns {Object} Optimal range configuration
   */
  analyzeForecastRange(forecastData) {
    if (!forecastData || forecastData.length === 0) {
      return { min: 0, max: 4, range: "0,4", adaptiveStyle: "viridis-default" };
    }

    const values = forecastData.filter(v => v !== null && !isNaN(v));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const p95 = this.percentile(values, 95);
    const p99 = this.percentile(values, 99);

    // Determine optimal range based on data distribution
    let optimalMax;
    let styleVariant;

    if (p99 <= 2.0) {
      // Calm conditions - use fine resolution for small waves
      optimalMax = Math.ceil(p99 * 2) / 2; // Round to nearest 0.5m
      styleVariant = "viridis-calm";
    } else if (p99 <= 6.0) {
      // Normal conditions - standard range
      optimalMax = Math.ceil(p99);
      styleVariant = "viridis-normal";
    } else if (p99 <= 12.0) {
      // Storm conditions - extended range
      optimalMax = Math.ceil(p99 / 2) * 2; // Round to nearest 2m
      styleVariant = "viridis-storm";
    } else {
      // Extreme conditions - maximum range
      optimalMax = Math.ceil(p99 / 5) * 5; // Round to nearest 5m
      styleVariant = "viridis-extreme";
    }

    return {
      min: 0,
      max: optimalMax,
      range: `0,${optimalMax}`,
      adaptiveStyle: styleVariant,
      dataStats: {
        actualMin: min,
        actualMax: max,
        p95: p95,
        p99: p99,
        seaState: this.classifySeaState(p95)
      }
    };
  }

  /**
   * Calculate percentile of an array
   */
  percentile(arr, p) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    
    if (upper >= sorted.length) return sorted[sorted.length - 1];
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Classify sea state based on wave height
   */
  classifySeaState(waveHeight) {
    for (const [state, threshold] of Object.entries(this.seaStateThresholds)) {
      if (waveHeight <= threshold.max) {
        return { state, ...threshold };
      }
    }
    return { state: 'phenomenal', ...this.seaStateThresholds.phenomenal };
  }

  /**
   * Generate ncWMS style configuration for wave height
   */
  getWaveHeightStyle(range = "0,4", variant = "viridis-normal") {
    // eslint-disable-next-line no-unused-vars
    const [min, max] = range.split(',').map(Number);
    
    const styleConfigs = {
      "viridis-calm": {
        style: "default-scalar/psu-viridis", // Viridis - perfect for calm conditions
        numcolorbands: 400,
        belowmincolor: "transparent",
        abovemaxcolor: "extend",
        colorscalerange: range
      },
      "viridis-normal": {
        style: "default-scalar/psu-viridis", // Viridis - standard scientific palette
        numcolorbands: 300,
        belowmincolor: "transparent", 
        abovemaxcolor: "extend",
        colorscalerange: range
      },
      "viridis-storm": {
        style: "default-scalar/psu-plasma", // Plasma - good for dynamic conditions
        numcolorbands: 250,
        belowmincolor: "transparent",
        abovemaxcolor: "#ff0000",
        colorscalerange: range
      },
      "viridis-extreme": {
        style: "default-scalar/psu-inferno", // Inferno - perfect for extreme conditions
        numcolorbands: 200,
        belowmincolor: "transparent",
        abovemaxcolor: "#ff0000",
        colorscalerange: range
      }
    };

    return styleConfigs[variant] || styleConfigs["viridis-normal"];
  }

  /**
   * Generate legend URL with dynamic range
   */
  getDynamicLegendUrl(variable, range, unit, variant = "viridis-normal") {
    const [min, max] = range.split(',').map(Number);
    const step = max <= 2 ? 0.25 : max <= 6 ? 0.5 : max <= 12 ? 1 : 2;
    
    const colorMaps = {
      "viridis-calm": "44",
      "viridis-normal": "40", // Corresponds to Viridis
      "viridis-storm": "41",  // Corresponds to Plasma
      "viridis-extreme": "42" // Corresponds to Inferno
    };
    
    const layerMap = colorMaps[variant] || "40";
    
    return `https://ocean-plotter.spc.int/plotter/GetLegendGraphic?layer_map=${layerMap}&mode=standard&min_color=${min}&max_color=${max}&step=${step}&color=viridis&unit=${unit}`;
  }

  /**
   * Get color palette for data visualization
   */
  getViridisColorArray(steps = 256) {
    const colors = [];
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const color = this.interpolateViridis(t);
      colors.push(color);
    }
    return colors;
  }

  /**
   * Generate a Viridis gradient slice between two normalized stops
   * @param {number} startRatio - Start position in the palette (0-1)
   * @param {number} endRatio - End position in the palette (0-1)
   * @param {number} steps - Number of gradient samples
   * @returns {string[]} Array of CSS rgb() color values
   */
  getViridisGradientSlice(startRatio, endRatio, steps = 64) {
    const clampedStart = Math.max(0, Math.min(1, startRatio));
    const clampedEnd = Math.max(0, Math.min(1, endRatio));

    if (Math.abs(clampedEnd - clampedStart) < 1e-6) {
      const color = this.interpolateViridis(clampedEnd);
      return [color, color];
    }

    const count = Math.max(steps, 2);
    const colors = [];

    for (let i = 0; i < count; i++) {
      const t = clampedStart + ((clampedEnd - clampedStart) * (i / (count - 1)));
      colors.push(this.interpolateViridis(t));
    }

    return colors;
  }

  /**
   * Interpolate color in Viridis palette
   */
  interpolateViridis(t) {
    // Clamp t to [0, 1]
    t = Math.max(0, Math.min(1, t));
    
    // Find the two colors to interpolate between
    let lower = 0;
    let upper = this.viridisColors.length - 1;
    
    for (let i = 0; i < this.viridisColors.length - 1; i++) {
      if (t >= this.viridisColors[i].value && t <= this.viridisColors[i + 1].value) {
        lower = i;
        upper = i + 1;
        break;
      }
    }
    
    const lowerColor = this.viridisColors[lower];
    const upperColor = this.viridisColors[upper];
    
    // Calculate interpolation factor
    const factor = (t - lowerColor.value) / (upperColor.value - lowerColor.value);
    
    // Interpolate RGB values
    const r = Math.round(lowerColor.rgb[0] + (upperColor.rgb[0] - lowerColor.rgb[0]) * factor);
    const g = Math.round(lowerColor.rgb[1] + (upperColor.rgb[1] - lowerColor.rgb[1]) * factor);
    const b = Math.round(lowerColor.rgb[2] + (upperColor.rgb[2] - lowerColor.rgb[2]) * factor);
    
    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Generate adaptive WMS layer configuration
   */
  generateAdaptiveWMSConfig(forecastData, baseConfig) {
    const analysis = this.analyzeForecastRange(forecastData);
    const styleConfig = this.getWaveHeightStyle(analysis.range, analysis.adaptiveStyle);
    
    return {
      ...baseConfig,
      ...styleConfig,
      legendUrl: this.getDynamicLegendUrl('hs', analysis.range, 'm', analysis.adaptiveStyle),
      adaptiveMetadata: {
        ...analysis,
        timestamp: new Date().toISOString(),
        paletteName: "Viridis-Adaptive"
      }
    };
  }
}

export default DynamicColorManager;
