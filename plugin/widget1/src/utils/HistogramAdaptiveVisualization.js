/**
 * Histogram-Based Adaptive Visualization Manager
 * Uses real-time histogram analysis to optimize color distributions
 * and visualization parameters for ocean forecast data
 */

export class HistogramAdaptiveVisualization {
  constructor() {
    this.histogramCache = new Map();
    this.adaptiveStrategies = new AdaptiveStrategies();
    this.colorDistributionOptimizer = new ColorDistributionOptimizer();
  }

  /**
   * Generate adaptive visualization based on histogram analysis
   */
  async generateAdaptiveVisualization(layerName, timeStep, bounds, gridSize = 20) {
    try {
      // 1. Fetch grid data for histogram analysis
      const gridData = await this.fetchGridData(layerName, timeStep, bounds, gridSize);
      
      // 2. Generate histogram with optimal bin sizing
      const histogram = this.generateOptimalHistogram(gridData);
      
      // 3. Analyze distribution characteristics
      const distributionAnalysis = this.analyzeDistribution(histogram, gridData);
      
      // 4. Generate adaptive color mapping
      const adaptiveColorMap = this.generateAdaptiveColorMap(
        histogram, 
        distributionAnalysis, 
        layerName
      );
      
      // 5. Calculate dynamic ranges with histogram-informed boundaries
      const adaptiveRanges = this.calculateHistogramInformedRanges(
        histogram, 
        distributionAnalysis
      );

      return {
        histogram,
        distributionAnalysis,
        adaptiveColorMap,
        adaptiveRanges,
        visualizationStrategy: this.selectVisualizationStrategy(distributionAnalysis),
        metadata: this.generateVisualizationMetadata(histogram, distributionAnalysis)
      };
    } catch (error) {
      console.warn('Histogram adaptive visualization failed:', error);
      return this.getFallbackVisualization(layerName);
    }
  }

  /**
   * Fetch grid data for analysis
   */
  async fetchGridData(layerName, timeStep, bounds, gridSize) {
    const [minLon, minLat, maxLon, maxLat] = bounds;
    const gridData = [];
    
    // Create sampling grid
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const lon = minLon + (maxLon - minLon) * i / (gridSize - 1);
        const lat = minLat + (maxLat - minLat) * j / (gridSize - 1);
        
        try {
          const value = await this.fetchPointValue(layerName, timeStep, [lon, lat], bounds);
          if (value !== null && !isNaN(value) && isFinite(value)) {
            gridData.push({ 
              value, 
              coordinates: [lon, lat],
              gridPosition: [i, j]
            });
          }
        } catch (error) {
          // Skip failed points
          continue;
        }
      }
    }
    
    return gridData;
  }

  /**
   * Generate optimal histogram with dynamic binning
   */
  generateOptimalHistogram(gridData) {
    const values = gridData.map(d => d.value);
    
    if (values.length === 0) {
      return { bins: [], binCount: 0, range: [0, 1] };
    }

    // Calculate optimal number of bins using Freedman-Diaconis rule
    const q75 = this.calculatePercentile(values, 75);
    const q25 = this.calculatePercentile(values, 25);
    const iqr = q75 - q25;
    const binWidth = 2 * iqr / Math.pow(values.length, 1/3);
    const optimalBins = Math.max(10, Math.min(100, Math.ceil((Math.max(...values) - Math.min(...values)) / binWidth)));

    // Create histogram
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const actualBinWidth = range / optimalBins;

    const bins = Array(optimalBins).fill(0).map((_, i) => ({
      start: min + i * actualBinWidth,
      end: min + (i + 1) * actualBinWidth,
      count: 0,
      density: 0,
      values: []
    }));

    // Populate bins
    values.forEach(value => {
      let binIndex = Math.floor((value - min) / actualBinWidth);
      binIndex = Math.min(binIndex, optimalBins - 1); // Handle edge case
      bins[binIndex].count++;
      bins[binIndex].values.push(value);
    });

    // Calculate densities
    bins.forEach(bin => {
      bin.density = bin.count / values.length;
    });

    return {
      bins,
      binCount: optimalBins,
      range: [min, max],
      totalValues: values.length,
      binWidth: actualBinWidth
    };
  }

  /**
   * Analyze distribution characteristics from histogram
   */
  analyzeDistribution(histogram, gridData) {
    const values = gridData.map(d => d.value);
    const bins = histogram.bins;
    
    // Find modes (peaks in histogram)
    const modes = this.findModes(bins);
    
    // Calculate entropy (measure of distribution spread)
    const entropy = this.calculateEntropy(bins);
    
    // Detect distribution shape
    const shape = this.detectDistributionShape(bins, values);
    
    // Calculate spatial clustering
    const spatialClusters = this.analyzeSpatialClustering(gridData);
    
    // Detect gaps and clusters in data
    const dataGaps = this.detectDataGaps(bins);
    const dataClusters = this.detectDataClusters(bins);

    return {
      modes,
      entropy,
      shape,
      spatialClusters,
      dataGaps,
      dataClusters,
      dominantRange: this.findDominantRange(bins),
      outlierRange: this.findOutlierRange(bins, values),
      dataConcentration: this.calculateDataConcentration(bins),
      variabilityScore: this.calculateVariabilityScore(values),
      extremeEventsProbability: this.calculateExtremeEventsProbability(bins, values)
    };
  }

  /**
   * Generate adaptive color mapping based on histogram
   */
  generateAdaptiveColorMap(histogram, distributionAnalysis, layerName) {
    const strategy = this.selectColorMappingStrategy(distributionAnalysis, layerName);
    
    switch (strategy) {
      case 'HISTOGRAM_EQUALIZATION':
        return this.generateHistogramEqualizedColorMap(histogram);
      
      case 'PERCENTILE_BASED':
        return this.generatePercentileBasedColorMap(histogram, distributionAnalysis);
      
      case 'MODE_ENHANCED':
        return this.generateModeEnhancedColorMap(histogram, distributionAnalysis);
      
      case 'EXTREME_FOCUSED':
        return this.generateExtremeFocusedColorMap(histogram, distributionAnalysis);
      
      case 'CLUSTER_OPTIMIZED':
        return this.generateClusterOptimizedColorMap(histogram, distributionAnalysis);
      
      default:
        return this.generateBalancedColorMap(histogram, distributionAnalysis);
    }
  }

  /**
   * Histogram equalization for uniform color distribution
   */
  generateHistogramEqualizedColorMap(histogram) {
    const bins = histogram.bins;
    const totalValues = histogram.totalValues;
    
    // Calculate cumulative distribution
    let cumulative = 0;
    const colorStops = bins.map(bin => {
      cumulative += bin.count;
      const cumulativePercent = cumulative / totalValues;
      
      return {
        value: bin.end,
        position: cumulativePercent,
        density: bin.density,
        strategy: 'histogram_equalized'
      };
    });

    return {
      type: 'HISTOGRAM_EQUALIZATION',
      colorStops,
      palette: 'psu-viridis',
      numColorBands: 300,
      description: 'Equal visual weight for all data ranges'
    };
  }

  /**
   * Percentile-based color mapping
   */
  generatePercentileBasedColorMap(histogram, distributionAnalysis) {
    const allValues = histogram.bins.flatMap(bin => bin.values);
    const percentiles = [5, 10, 25, 50, 75, 90, 95, 99];
    
    const colorStops = percentiles.map(p => ({
      value: this.calculatePercentile(allValues, p),
      position: p / 100,
      percentile: p,
      strategy: 'percentile_based'
    }));

    return {
      type: 'PERCENTILE_BASED',
      colorStops,
      palette: this.selectOptimalPalette(distributionAnalysis),
      numColorBands: 250,
      description: 'Statistically balanced color distribution'
    };
  }

  /**
   * Mode-enhanced color mapping (emphasizes peaks)
   */
  generateModeEnhancedColorMap(histogram, distributionAnalysis) {
    const modes = distributionAnalysis.modes;
    const colorStops = [];
    
    // Add extra color resolution around modes
    modes.forEach((mode, index) => {
      const modeValue = (mode.start + mode.end) / 2;
      const modeRange = mode.end - mode.start;
      
      // Add color stops around each mode
      colorStops.push(
        { value: modeValue - modeRange, position: index * 0.3, emphasis: 'mode_approach' },
        { value: modeValue, position: index * 0.3 + 0.15, emphasis: 'mode_peak' },
        { value: modeValue + modeRange, position: index * 0.3 + 0.3, emphasis: 'mode_departure' }
      );
    });

    return {
      type: 'MODE_ENHANCED',
      colorStops,
      palette: 'psu-plasma',
      numColorBands: 350,
      description: 'Enhanced visualization of data peaks'
    };
  }

  /**
   * Extreme-focused color mapping (highlights outliers)
   */
  generateExtremeFocusedColorMap(histogram, distributionAnalysis) {
    const outlierRange = distributionAnalysis.outlierRange;
    const dominantRange = distributionAnalysis.dominantRange;
    
    const colorStops = [
      // Focus on lower extremes
      { value: histogram.range[0], position: 0.0, focus: 'minimum' },
      { value: outlierRange.lower, position: 0.1, focus: 'lower_outliers' },
      
      // Compress normal range
      { value: dominantRange.start, position: 0.2, focus: 'normal_start' },
      { value: dominantRange.end, position: 0.8, focus: 'normal_end' },
      
      // Focus on upper extremes
      { value: outlierRange.upper, position: 0.9, focus: 'upper_outliers' },
      { value: histogram.range[1], position: 1.0, focus: 'maximum' }
    ];

    return {
      type: 'EXTREME_FOCUSED',
      colorStops,
      palette: 'psu-inferno',
      numColorBands: 400,
      description: 'Highlights extreme values and outliers'
    };
  }

  /**
   * Select visualization strategy based on distribution analysis
   */
  selectVisualizationStrategy(distributionAnalysis) {
    const { entropy, modes, extremeEventsProbability, variabilityScore } = distributionAnalysis;
    
    if (extremeEventsProbability > 0.1) {
      return {
        strategy: 'SAFETY_CRITICAL',
        emphasis: 'extreme_values',
        colorMapping: 'EXTREME_FOCUSED',
        contrastBoost: 1.4,
        transparency: 0.95
      };
    } else if (modes.length > 2) {
      return {
        strategy: 'MULTI_MODAL',
        emphasis: 'peaks_and_valleys',
        colorMapping: 'MODE_ENHANCED',
        contrastBoost: 1.2,
        transparency: 0.85
      };
    } else if (entropy > 0.8) {
      return {
        strategy: 'HIGH_ENTROPY',
        emphasis: 'uniform_distribution',
        colorMapping: 'HISTOGRAM_EQUALIZATION',
        contrastBoost: 1.0,
        transparency: 0.8
      };
    } else if (variabilityScore < 0.3) {
      return {
        strategy: 'LOW_VARIABILITY',
        emphasis: 'subtle_differences',
        colorMapping: 'PERCENTILE_BASED',
        contrastBoost: 1.3,
        transparency: 0.75
      };
    } else {
      return {
        strategy: 'BALANCED',
        emphasis: 'general_purpose',
        colorMapping: 'PERCENTILE_BASED',
        contrastBoost: 1.1,
        transparency: 0.8
      };
    }
  }

  // Utility methods for histogram analysis
  findModes(bins) {
    const modes = [];
    for (let i = 1; i < bins.length - 1; i++) {
      if (bins[i].density > bins[i-1].density && bins[i].density > bins[i+1].density) {
        if (bins[i].density > 0.05) { // Only significant peaks
          modes.push({
            ...bins[i],
            peakIndex: i,
            prominence: bins[i].density
          });
        }
      }
    }
    return modes.sort((a, b) => b.prominence - a.prominence);
  }

  calculateEntropy(bins) {
    return bins.reduce((entropy, bin) => {
      if (bin.density > 0) {
        entropy -= bin.density * Math.log2(bin.density);
      }
      return entropy;
    }, 0);
  }

  detectDistributionShape(bins, values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const median = this.calculatePercentile(values, 50);
    const skewness = this.calculateSkewness(values, mean);
    
    if (Math.abs(skewness) < 0.5) return 'normal';
    if (skewness > 1.5) return 'right_skewed';
    if (skewness < -1.5) return 'left_skewed';
    if (mean < median) return 'left_tailed';
    if (mean > median) return 'right_tailed';
    return 'irregular';
  }

  calculatePercentile(values, percentile) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  calculateSkewness(values, mean) {
    const n = values.length;
    const std = Math.sqrt(values.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / n);
    return values.reduce((sum, x) => sum + Math.pow((x - mean) / std, 3), 0) / n;
  }

  findDominantRange(bins) {
    // Find the range containing 80% of the data
    const totalCount = bins.reduce((sum, bin) => sum + bin.count, 0);
    const targetCount = totalCount * 0.8;
    
    let cumulativeCount = 0;
    let startIndex = 0;
    let endIndex = bins.length - 1;
    
    // Find the most compact range containing 80% of data
    for (let start = 0; start < bins.length; start++) {
      cumulativeCount = 0;
      for (let end = start; end < bins.length; end++) {
        cumulativeCount += bins[end].count;
        if (cumulativeCount >= targetCount) {
          const currentRange = bins[end].end - bins[start].start;
          const bestRange = bins[endIndex].end - bins[startIndex].start;
          if (currentRange < bestRange) {
            startIndex = start;
            endIndex = end;
          }
          break;
        }
      }
    }
    
    return {
      start: bins[startIndex].start,
      end: bins[endIndex].end,
      coverage: 0.8
    };
  }

  // Additional utility methods would be implemented here...
  findOutlierRange(bins, values) {
    const q1 = this.calculatePercentile(values, 25);
    const q3 = this.calculatePercentile(values, 75);
    const iqr = q3 - q1;
    
    return {
      lower: q1 - 1.5 * iqr,
      upper: q3 + 1.5 * iqr
    };
  }

  async fetchPointValue(layerName, timeStep, point, bounds) {
    // This would implement the actual WMS GetFeatureInfo request
    // For now, return mock data
    return Math.random() * 4; // Mock wave height
  }

  selectOptimalPalette(distributionAnalysis) {
    if (distributionAnalysis.extremeEventsProbability > 0.1) return 'psu-inferno';
    if (distributionAnalysis.modes.length > 2) return 'psu-plasma';
    return 'psu-viridis';
  }

  // Mock implementations for remaining methods
  analyzeSpatialClustering() { return { clusters: 0 }; }
  detectDataGaps() { return []; }
  detectDataClusters() { return []; }
  calculateDataConcentration() { return 0.5; }
  calculateVariabilityScore(values) { 
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / values.length);
    return std / mean;
  }
  calculateExtremeEventsProbability(bins, values) {
    const outliers = this.findOutlierRange(bins, values);
    const extremeCount = values.filter(v => v < outliers.lower || v > outliers.upper).length;
    return extremeCount / values.length;
  }

  selectColorMappingStrategy(distributionAnalysis, layerName) {
    if (distributionAnalysis.extremeEventsProbability > 0.1) return 'EXTREME_FOCUSED';
    if (distributionAnalysis.modes.length > 2) return 'MODE_ENHANCED';
    if (distributionAnalysis.entropy > 0.8) return 'HISTOGRAM_EQUALIZATION';
    return 'PERCENTILE_BASED';
  }

  generateBalancedColorMap(histogram, distributionAnalysis) {
    return this.generatePercentileBasedColorMap(histogram, distributionAnalysis);
  }

  generateClusterOptimizedColorMap(histogram, distributionAnalysis) {
    return this.generatePercentileBasedColorMap(histogram, distributionAnalysis);
  }

  calculateHistogramInformedRanges(histogram, distributionAnalysis) {
    return {
      min: histogram.range[0],
      max: histogram.range[1],
      optimal: distributionAnalysis.dominantRange
    };
  }

  generateVisualizationMetadata(histogram, distributionAnalysis) {
    return {
      analysisTimestamp: new Date().toISOString(),
      dataPoints: histogram.totalValues,
      distributionType: distributionAnalysis.shape,
      recommendedStrategy: distributionAnalysis.strategy
    };
  }

  getFallbackVisualization(layerName) {
    return {
      adaptiveColorMap: {
        type: 'FALLBACK',
        palette: 'psu-viridis',
        numColorBands: 250
      },
      adaptiveRanges: { min: 0, max: 4 }
    };
  }
}

// Additional supporting classes would be implemented here...
class AdaptiveStrategies {}
class ColorDistributionOptimizer {}

export const histogramAdaptiveVisualization = new HistogramAdaptiveVisualization();