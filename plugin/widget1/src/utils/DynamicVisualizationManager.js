/**
 * Dynamic Visualization Manager for Ocean Forecast Data
 * Adapts color ranges and styling based on actual data values for each time step
 * Integrates AI-driven analysis and histogram-based optimization
 */

import { WMSStyleManager } from './WMSStyleManager';
import { intelligentVisualizationSystem } from './IntelligentVisualizationSystem';
import { histogramAdaptiveVisualization } from './HistogramAdaptiveVisualization';

export class DynamicVisualizationManager {
  constructor() {
    this.dataCache = new Map();
    this.styleManager = new WMSStyleManager();
    this.adaptiveRanges = {
      // Cook Islands ranges (legacy)
      'cook_forecast/hs': { min: 0, max: 4, unit: 'm' },
      'cook_forecast/tm02': { min: 0, max: 20, unit: 's' },
      'cook_forecast/tpeak': { min: 0, max: 20, unit: 's' },
      'cook_forecast/dirm': { min: 0, max: 360, unit: '°' },
      // Niue ranges (updated based on actual data)
      'niue_forecast/hs': { min: 0, max: 4, unit: 'm' },
      'niue_forecast/tm02': { min: 2.3, max: 8.0, unit: 's' },
      'niue_forecast/tpeak': { min: 0, max: 17.4, unit: 's' },
      'niue_forecast/dirm': { min: 0, max: 360, unit: '°' }
    };
  }

  /**
   * Fetch data statistics for a specific layer and time
   */
  async fetchDataStats(wmsUrl, layerName, time, bounds) {
    const cacheKey = `${layerName}_${time}_${bounds.join(',')}`;
    
    if (this.dataCache.has(cacheKey)) {
      return this.dataCache.get(cacheKey);
    }

    try {
      // Use WMS GetFeatureInfo to sample data points across the region
      const samplePoints = this.generateSampleGrid(bounds, 10); // 10x10 grid
      const promises = samplePoints.map(point => 
        this.fetchPointValue(wmsUrl, layerName, time, point, bounds)
      );

      const values = await Promise.all(promises);
      const validValues = values.filter(v => v !== null && !isNaN(v));

      if (validValues.length === 0) {
        return this.getDefaultRange(layerName);
      }

      const stats = this.calculateStatistics(validValues);
      this.dataCache.set(cacheKey, stats);
      
      // Cache for 5 minutes
      setTimeout(() => this.dataCache.delete(cacheKey), 5 * 60 * 1000);
      
      return stats;
    } catch (error) {
      console.warn('Failed to fetch dynamic data stats:', error);
      return this.getDefaultRange(layerName);
    }
  }

  /**
   * Generate a grid of sample points across the bounds
   */
  generateSampleGrid(bounds, gridSize) {
    const [minLon, minLat, maxLon, maxLat] = bounds;
    const points = [];
    
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const lon = minLon + (maxLon - minLon) * i / (gridSize - 1);
        const lat = minLat + (maxLat - minLat) * j / (gridSize - 1);
        points.push([lon, lat]);
      }
    }
    
    return points;
  }

  /**
   * Fetch a single point value using GetFeatureInfo
   */
  async fetchPointValue(wmsUrl, layerName, time, point, bounds) {
    // const [lon, lat] = point; // These are not used in the request URL construction
    const params = new URLSearchParams({
      service: 'WMS',
      request: 'GetFeatureInfo',
      version: '1.3.0',
      layers: layerName,
      styles: '',
      crs: 'EPSG:4326',
      bbox: bounds.join(','),
      width: '256',
      height: '256',
      format: 'image/png',
      query_layers: layerName,
      info_format: 'text/plain',
      i: '128', // Center of 256x256 tile
      j: '128',
      time: time
    });

    try {
      const response = await fetch(`${wmsUrl}?${params}`);
      const text = await response.text();
      
      // Parse the response to extract numeric value
      const match = text.match(/[-+]?\d*\.?\d+/);
      return match ? parseFloat(match[0]) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Calculate statistics from valid values
   */
  calculateStatistics(values) {
    const sorted = values.sort((a, b) => a - b);
    const len = sorted.length;
    
    return {
      min: sorted[0],
      max: sorted[len - 1],
      mean: values.reduce((a, b) => a + b, 0) / len,
      median: len % 2 === 0 ? 
        (sorted[len/2 - 1] + sorted[len/2]) / 2 : 
        sorted[Math.floor(len/2)],
      p5: sorted[Math.floor(len * 0.05)],
      p95: sorted[Math.floor(len * 0.95)],
      std: this.calculateStandardDeviation(values)
    };
  }

  /**
   * Calculate standard deviation
   */
  calculateStandardDeviation(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Get default range for a layer when data fetching fails
   */
  getDefaultRange(layerName) {
    return this.adaptiveRanges[layerName] || { min: 0, max: 4, unit: 'm' };
  }

  /**
   * Generate adaptive color range based on data statistics
   */
  generateAdaptiveRange(stats, layerName) {
    const layerConfig = this.adaptiveRanges[layerName];
    
    if (layerName.includes('hs')) {
      // For wave height, use 95th percentile as max to avoid outliers
      return {
        min: Math.max(0, stats.min),
        max: Math.min(layerConfig.max, Math.max(stats.p95, stats.mean + 2 * stats.std)),
        unit: layerConfig.unit
      };
    } else if (layerName.includes('tm02') || layerName.includes('tpeak')) {
      // For wave periods, use mean ± 2 standard deviations
      return {
        min: Math.max(0, stats.mean - stats.std),
        max: Math.min(layerConfig.max, stats.mean + 2 * stats.std),
        unit: layerConfig.unit
      };
    } else {
      // Default approach
      return {
        min: stats.p5,
        max: stats.p95,
        unit: layerConfig.unit
      };
    }
  }

  /**
   * Get dynamic WMS parameters for a layer at a specific time
   * Uses AI-driven analysis and histogram optimization
   */
  async getDynamicWMSParams(wmsUrl, layerName, time, bounds) {
    try {
      // Use intelligent visualization system for comprehensive analysis
      const intelligentViz = await intelligentVisualizationSystem.getIntelligentVisualization(
        layerName, time, bounds
      );

      // Use histogram-based adaptive visualization for optimal color distribution
      const histogramViz = await histogramAdaptiveVisualization.generateAdaptiveVisualization(
        layerName, time, bounds
      );

      // Combine insights from both systems
      const combinedAnalysis = this.combineVisualizationAnalysis(intelligentViz, histogramViz, layerName);

      return {
        style: combinedAnalysis.optimalStyle,
        colorscalerange: combinedAnalysis.optimalRange,
        palette: combinedAnalysis.optimalPalette,
        numcolorbands: combinedAnalysis.optimalBands,
        abovemaxcolor: combinedAnalysis.extremeHandling.above,
        belowmincolor: combinedAnalysis.extremeHandling.below,
        transparency: combinedAnalysis.optimalTransparency,
        
        // Advanced metadata for UI display
        intelligentAnalysis: intelligentViz,
        histogramAnalysis: histogramViz,
        combinedAnalysis,
        
        // Legacy support
        stats: combinedAnalysis.statisticalSummary,
        adaptiveRange: combinedAnalysis.adaptiveRange
      };
    } catch (error) {
      console.warn('Advanced visualization analysis failed, using fallback:', error);
      return this.getFallbackWMSParams(layerName);
    }
  }

  /**
   * Combine insights from intelligent and histogram-based analysis
   */
  combineVisualizationAnalysis(intelligentViz, histogramViz, layerName) {
    const weatherPattern = intelligentViz.weatherPattern;
    const distributionAnalysis = histogramViz.distributionAnalysis;
    const histogramColorMap = histogramViz.adaptiveColorMap;

    // Select optimal palette based on combined analysis
    let optimalPalette = 'psu-viridis'; // Safe default
    
    if (weatherPattern.riskLevel >= 5) {
      // High risk conditions - use warning colors
      optimalPalette = 'psu-inferno';
    } else if (distributionAnalysis.extremeEventsProbability > 0.1) {
      // Extreme events present - use high contrast
      // Note: tpeak layer doesn't support psu-plasma, use psu-magma instead
      optimalPalette = layerName.includes('tpeak') ? 'psu-magma' : 'psu-plasma';
    } else if (histogramColorMap.type === 'HISTOGRAM_EQUALIZATION') {
      // High entropy data - use perceptually uniform
      optimalPalette = 'psu-viridis';
    } else if (distributionAnalysis.modes.length > 2) {
      // Multi-modal - use distinctive colors
      optimalPalette = 'psu-cividis';
    }

    // Calculate optimal ranges
    const histogramRange = histogramViz.adaptiveRanges;
    const intelligentRange = intelligentViz.adaptiveRanges;
    
    const optimalRange = `${Math.min(histogramRange.min, intelligentRange.min).toFixed(2)},${Math.max(histogramRange.max, intelligentRange.max).toFixed(2)}`;

    // Determine optimal color bands
    let optimalBands = histogramColorMap.numColorBands || 250;
    if (weatherPattern.visualPriority.includes('SAFETY_CRITICAL')) {
      optimalBands = Math.max(optimalBands, 400); // More bands for critical conditions
    }

    // Extreme value handling
    const extremeHandling = {
      above: weatherPattern.riskLevel >= 4 ? 'extend' : 'transparent',
      below: 'transparent'
    };

    return {
      optimalStyle: `default-scalar/${optimalPalette}`,
      optimalRange,
      optimalPalette,
      optimalBands,
      optimalTransparency: intelligentViz.colorScheme.transparency || 0.85,
      extremeHandling,
      
      // Detailed analysis for UI
      weatherPattern,
      distributionAnalysis,
      visualizationStrategy: histogramViz.visualizationStrategy,
      
      // Statistical summary
      statisticalSummary: {
        mean: distributionAnalysis.dominantRange ? 
          (distributionAnalysis.dominantRange.start + distributionAnalysis.dominantRange.end) / 2 : 
          intelligentViz.adaptiveRanges.min,
        range: [intelligentViz.adaptiveRanges.min, intelligentViz.adaptiveRanges.max],
        variability: distributionAnalysis.variabilityScore,
        extremeProbability: distributionAnalysis.extremeEventsProbability
      },
      
      adaptiveRange: {
        min: histogramRange.min,
        max: histogramRange.max,
        optimal: distributionAnalysis.dominantRange,
        confidence: weatherPattern.confidence
      }
    };
  }

  /**
   * Fallback WMS parameters when advanced analysis fails
   */
  getFallbackWMSParams(layerName) {
    const defaultConfig = this.adaptiveRanges[layerName] || { min: 0, max: 4, unit: 'm' };
    
    return {
      style: 'default-scalar/psu-viridis',
      colorscalerange: `${defaultConfig.min},${defaultConfig.max}`,
      palette: 'psu-viridis',
      numcolorbands: 250,
      abovemaxcolor: 'extend',
      belowmincolor: 'transparent',
      transparency: 0.8,
      
      stats: { min: defaultConfig.min, max: defaultConfig.max },
      adaptiveRange: defaultConfig
    };
  }

  /**
   * Generate dynamic legend URL
   */
  generateDynamicLegend(layerName, adaptiveRange, palette = 'psu-viridis') {
    const baseUrl = 'https://ocean-plotter.spc.int/plotter/GetLegendGraphic';
    const params = new URLSearchParams({
      layer_map: layerName.includes('hs') ? '40' : '43',
      mode: 'standard',
      min_color: adaptiveRange.min.toFixed(2),
      max_color: adaptiveRange.max.toFixed(2),
      step: ((adaptiveRange.max - adaptiveRange.min) / 10).toFixed(2),
      color: palette.replace('psu-', ''),
      unit: adaptiveRange.unit
    });

    return `${baseUrl}?${params}`;
  }

  /**
   * Create dynamic layer configuration
   */
  async createDynamicLayerConfig(baseLayer, time, bounds) {
    if (!baseLayer.wmsUrl || !baseLayer.value) {
      return baseLayer;
    }

    const dynamicParams = await this.getDynamicWMSParams(
      baseLayer.wmsUrl,
      baseLayer.value,
      time,
      bounds
    );

    return {
      ...baseLayer,
      style: dynamicParams.style,
      colorscalerange: dynamicParams.colorscalerange,
      numcolorbands: dynamicParams.numcolorbands,
      abovemaxcolor: dynamicParams.abovemaxcolor,
      belowmincolor: dynamicParams.belowmincolor,
      legendUrl: this.generateDynamicLegend(
        baseLayer.value,
        dynamicParams.adaptiveRange,
        dynamicParams.palette
      ),
      dynamicStats: dynamicParams.stats,
      adaptiveRange: dynamicParams.adaptiveRange
    };
  }

  /**
   * Update visualization for time change
   */
  async updateVisualizationForTime(layers, currentTime, bounds) {
    const updatedLayers = await Promise.all(
      layers.map(layer => {
        if (layer.composite) {
          return Promise.all(
            layer.layers.map(subLayer => 
              this.createDynamicLayerConfig(subLayer, currentTime, bounds)
            )
          ).then(updatedSubLayers => ({
            ...layer,
            layers: updatedSubLayers
          }));
        } else {
          return this.createDynamicLayerConfig(layer, currentTime, bounds);
        }
      })
    );

    return updatedLayers;
  }
}

export const dynamicVisualizationManager = new DynamicVisualizationManager();