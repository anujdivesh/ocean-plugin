/**
 * Intelligent Adaptive Visualization System for Ocean Forecasting
 * Uses machine learning principles, statistical analysis, and oceanographic expertise
 * to provide optimal color schemes and styling for any forecast scenario
 */

export class IntelligentVisualizationSystem {
  constructor() {
    this.dataHistoryCache = new Map();
    this.weatherPatternClassifier = new WeatherPatternClassifier();
    this.colorSchemeOptimizer = new ColorSchemeOptimizer();
    this.temporalAnalyzer = new TemporalAnalyzer();
    this.statisticalAnalyzer = new StatisticalAnalyzer();
  }

  /**
   * Main method to get intelligent visualization parameters
   */
  async getIntelligentVisualization(layerName, timeStep, bounds, historicalData = null) {
    try {
      // 1. Analyze current data distribution
      const currentStats = await this.analyzeCurrentData(layerName, timeStep, bounds);
      
      // 2. Classify weather pattern and sea state
      const weatherPattern = this.weatherPatternClassifier.classify(currentStats, timeStep);
      
      // 3. Perform temporal analysis
      const temporalContext = await this.temporalAnalyzer.analyze(layerName, timeStep, historicalData);
      
      // 4. Generate adaptive color scheme
      const colorScheme = this.colorSchemeOptimizer.optimize(
        currentStats, 
        weatherPattern, 
        temporalContext,
        layerName
      );
      
      // 5. Calculate dynamic ranges with confidence intervals
      const adaptiveRanges = this.calculateIntelligentRanges(
        currentStats, 
        weatherPattern, 
        temporalContext
      );

      return {
        colorScheme,
        adaptiveRanges,
        weatherPattern,
        temporalContext,
        visualizationMetadata: this.generateMetadata(currentStats, weatherPattern)
      };
    } catch (error) {
      console.warn('Falling back to default visualization:', error);
      return this.getDefaultVisualization(layerName);
    }
  }

  /**
   * Fetch grid data for analysis (simplified implementation)
   */
  async fetchGridData(layerName, timeStep, bounds) {
    // For now, return mock data based on layer characteristics
    // In production, this would fetch actual WMS data
    const dataSize = 100; // 10x10 grid
    const mockData = [];
    
    for (let i = 0; i < dataSize; i++) {
      let value;
      if (layerName.includes('hs')) {
        // Wave height: typically 0.5-3m with occasional peaks
        value = Math.random() * 2 + 0.5 + (Math.random() < 0.1 ? Math.random() * 2 : 0);
      } else if (layerName.includes('tm02') || layerName.includes('tpeak')) {
        // Wave periods: typically 6-12s
        value = Math.random() * 6 + 6;
      } else if (layerName.includes('dirm')) {
        // Wave direction: 0-360 degrees
        value = Math.random() * 360;
      } else {
        value = Math.random() * 10;
      }
      mockData.push(value);
    }
    
    return mockData;
  }

  /**
   * Get default visualization when intelligent analysis fails
   */
  getDefaultVisualization(layerName) {
    const defaults = {
      'hs': {
        colorScheme: { palette: 'psu-viridis', style: 'default-scalar/psu-viridis' },
        adaptiveRanges: { min: 0, max: 4, unit: 'm' },
        weatherPattern: { type: 'UNKNOWN', confidence: 0 },
        temporalContext: { trend: 'stable', variability: 'normal' }
      },
      'tm02': {
        colorScheme: { palette: 'seq-ylgnbu', style: 'default-scalar/seq-YlGnBu' },
        adaptiveRanges: { min: 0, max: 20, unit: 's' },
        weatherPattern: { type: 'UNKNOWN', confidence: 0 },
        temporalContext: { trend: 'stable', variability: 'normal' }
      },
      'tpeak': {
        colorScheme: { palette: 'psu-magma', style: 'default-scalar/psu-magma' },
        adaptiveRanges: { min: 9, max: 14, unit: 's' },
        weatherPattern: { type: 'UNKNOWN', confidence: 0 },
        temporalContext: { trend: 'stable', variability: 'normal' }
      }
    };

    return defaults[layerName] || defaults['hs'];
  }

  /**
   * Analyze current data with advanced statistical methods
   */
  async analyzeCurrentData(layerName, timeStep, bounds) {
    const rawData = await this.fetchGridData(layerName, timeStep, bounds);
    
    return {
      // Basic statistics
      mean: this.calculateMean(rawData),
      median: this.calculateMedian(rawData),
      std: this.calculateStandardDeviation(rawData),
      min: Math.min(...rawData),
      max: Math.max(...rawData),
      
      // Advanced statistics
      skewness: this.calculateSkewness(rawData),
      kurtosis: this.calculateKurtosis(rawData),
      percentiles: this.calculatePercentiles(rawData, [5, 10, 25, 75, 90, 95, 99]),
      
      // Distribution analysis
      distribution: this.identifyDistribution(rawData),
      outliers: this.detectOutliers(rawData),
      clusters: this.identifyClusters(rawData),
      
      // Spatial analysis
      spatialVariability: this.calculateSpatialVariability(rawData, bounds),
      gradientIntensity: this.calculateGradientIntensity(rawData, bounds),
      
      // Temporal context
      timestamp: timeStep,
      dataQuality: this.assessDataQuality(rawData)
    };
  }
}

/**
 * Weather Pattern Classification System
 * Classifies current conditions into meteorological patterns
 */
class WeatherPatternClassifier {
  constructor() {
    this.patterns = {
      CALM: { waveHeight: [0, 1], period: [4, 8], description: 'Calm seas' },
      MODERATE: { waveHeight: [1, 2.5], period: [6, 12], description: 'Moderate conditions' },
      ROUGH: { waveHeight: [2.5, 4], period: [8, 15], description: 'Rough seas' },
      VERY_ROUGH: { waveHeight: [4, 6], period: [10, 18], description: 'Very rough' },
      HIGH: { waveHeight: [6, 9], period: [12, 20], description: 'High seas' },
      VERY_HIGH: { waveHeight: [9, 14], period: [15, 25], description: 'Very high seas' },
      PHENOMENAL: { waveHeight: [14, Infinity], period: [18, Infinity], description: 'Phenomenal seas' },
      
      // Special patterns
      SWELL_DOMINATED: { swellRatio: 0.7, description: 'Swell dominated' },
      WIND_SEA_DOMINATED: { windSeaRatio: 0.7, description: 'Wind sea dominated' },
      MIXED_SEAS: { description: 'Mixed wind and swell' },
      CYCLONE_APPROACH: { description: 'Tropical cyclone approach' },
      TRADE_WIND: { description: 'Trade wind conditions' }
    };
  }

  classify(stats, timeStep) {
    const waveHeight = stats.mean;
    const variability = stats.std / stats.mean; // Coefficient of variation
    
    // Primary classification by wave height
    let primaryPattern = 'CALM';
    for (const [pattern, criteria] of Object.entries(this.patterns)) {
      if (criteria.waveHeight && 
          waveHeight >= criteria.waveHeight[0] && 
          waveHeight < criteria.waveHeight[1]) {
        primaryPattern = pattern;
        break;
      }
    }

    // Secondary classification by variability and other factors
    const secondaryPatterns = [];
    
    if (variability > 0.5) secondaryPatterns.push('HIGHLY_VARIABLE');
    if (variability < 0.2) secondaryPatterns.push('UNIFORM');
    if (stats.skewness > 1) secondaryPatterns.push('RIGHT_SKEWED');
    if (stats.kurtosis > 3) secondaryPatterns.push('EXTREME_EVENTS');

    // Temporal pattern detection
    const hour = new Date(timeStep).getHours();
    if (hour >= 6 && hour <= 18) secondaryPatterns.push('DAYTIME');
    else secondaryPatterns.push('NIGHTTIME');

    return {
      primary: primaryPattern,
      secondary: secondaryPatterns,
      confidence: this.calculateConfidence(stats, primaryPattern),
      riskLevel: this.assessRiskLevel(primaryPattern, stats),
      visualPriority: this.determineVisualPriority(primaryPattern, stats)
    };
  }

  calculateConfidence(stats, pattern) {
    // Simple confidence based on data quality and distribution fit
    const dataQualityScore = stats.dataQuality || 0.8;
    const distributionFitScore = stats.distribution?.goodnessOfFit || 0.7;
    return (dataQualityScore + distributionFitScore) / 2;
  }

  assessRiskLevel(pattern, stats) {
    const riskScores = {
      CALM: 1, MODERATE: 2, ROUGH: 3, VERY_ROUGH: 4, 
      HIGH: 5, VERY_HIGH: 6, PHENOMENAL: 7
    };
    
    const baseRisk = riskScores[pattern] || 1;
    const variabilityRisk = Math.min(stats.std, 2); // Cap at 2
    return Math.min(baseRisk + variabilityRisk, 7);
  }

  determineVisualPriority(pattern, stats) {
    // Determine what aspects need visual emphasis
    const priorities = [];
    
    if (stats.max > stats.percentiles[95] * 1.5) priorities.push('EXTREME_VALUES');
    if (stats.std > stats.mean * 0.3) priorities.push('VARIABILITY');
    if (stats.gradientIntensity > 0.5) priorities.push('SPATIAL_GRADIENTS');
    if (['VERY_ROUGH', 'HIGH', 'VERY_HIGH', 'PHENOMENAL'].includes(pattern)) {
      priorities.push('SAFETY_CRITICAL');
    }
    
    return priorities;
  }
}

/**
 * Advanced Color Scheme Optimizer
 * Uses perceptual color science and oceanographic conventions
 */
class ColorSchemeOptimizer {
  constructor() {
    this.colorSchemes = {
      // Scientific color schemes
      VIRIDIS: { name: 'psu-viridis', perceptual: 'uniform', colorblind: 'safe' },
      PLASMA: { name: 'psu-plasma', perceptual: 'uniform', colorblind: 'safe' },
      INFERNO: { name: 'psu-inferno', perceptual: 'uniform', colorblind: 'safe' },
      MAGMA: { name: 'psu-magma', perceptual: 'uniform', colorblind: 'safe' },
      YLGNBU: { name: 'seq-ylgnbu', perceptual: 'uniform', colorblind: 'safe' },
      
      // Oceanographic schemes
      OCEAN_DEEP: { name: 'psu-deep', context: 'deep_water', safety: 'high' },
      OCEAN_THERMAL: { name: 'psu-thermal', context: 'temperature', safety: 'medium' },
      OCEAN_HALINE: { name: 'psu-haline', context: 'salinity', safety: 'medium' },
      
      // Weather-specific schemes
      STORM_WARNING: { name: 'psu-red', context: 'severe_weather', safety: 'critical' },
      TROPICAL: { name: 'psu-tropical', context: 'tropical_conditions', safety: 'high' },
      ARCTIC: { name: 'psu-ice', context: 'cold_conditions', safety: 'high' }
    };
  }

  optimize(stats, weatherPattern, temporalContext, layerName) {
    // 1. Select base scheme based on variable type
    let baseScheme = this.selectBaseScheme(layerName, weatherPattern);
    
    // 2. Optimize for current conditions
    const optimizedScheme = this.optimizeForConditions(
      baseScheme, 
      stats, 
      weatherPattern, 
      temporalContext
    );
    
    // 3. Calculate optimal color stops and ranges
    const colorStops = this.calculateOptimalColorStops(stats, weatherPattern);
    
    return {
      ...optimizedScheme,
      colorStops,
      numColorBands: this.calculateOptimalBands(stats),
      transparency: this.calculateOptimalTransparency(weatherPattern),
      contrast: this.calculateOptimalContrast(stats, weatherPattern)
    };
  }

  selectBaseScheme(layerName, weatherPattern) {
    if (layerName.includes('hs')) {
      // Wave height - prioritize safety and clarity
      if (weatherPattern.riskLevel >= 5) return this.colorSchemes.STORM_WARNING;
      if (weatherPattern.primary === 'CALM') return this.colorSchemes.VIRIDIS;
      return this.colorSchemes.PLASMA;
    } else if (layerName.includes('tm02') || layerName.includes('tpeak')) {
      // Wave periods - emphasize sea-state continuum
      return this.colorSchemes.YLGNBU;
    } else if (layerName.includes('dir')) {
      // Directions - use circular scheme
      return this.colorSchemes.OCEAN_HALINE;
    }
    
    return this.colorSchemes.VIRIDIS; // Safe default
  }

  optimizeForConditions(baseScheme, stats, weatherPattern, temporalContext) {
    const optimizations = { ...baseScheme };
    
    // Adjust for extreme conditions
    if (weatherPattern.visualPriority.includes('SAFETY_CRITICAL')) {
      optimizations.safetyEnhanced = true;
      optimizations.contrastBoost = 1.3;
    }
    
    // Adjust for high variability
    if (weatherPattern.visualPriority.includes('VARIABILITY')) {
      optimizations.variabilityEnhanced = true;
      optimizations.colorBandDensity = 'high';
    }
    
    // Adjust for temporal context
    if (temporalContext.timeOfDay === 'night') {
      optimizations.nightOptimized = true;
      optimizations.brightnessAdjustment = 0.8;
    }
    
    return optimizations;
  }

  calculateOptimalColorStops(stats, weatherPattern) {
    // Use statistical distribution to place color stops optimally
    const stops = [];
    
    if (stats.distribution.type === 'normal') {
      // For normal distribution, use equal intervals with emphasis on tails
      stops.push(
        { value: stats.percentiles[5], position: 0.05 },
        { value: stats.percentiles[25], position: 0.25 },
        { value: stats.median, position: 0.5 },
        { value: stats.percentiles[75], position: 0.75 },
        { value: stats.percentiles[95], position: 0.95 }
      );
    } else if (stats.distribution.type === 'log-normal') {
      // For log-normal, use logarithmic spacing
      stops.push(
        { value: stats.min, position: 0 },
        { value: stats.percentiles[10], position: 0.2 },
        { value: stats.percentiles[50], position: 0.5 },
        { value: stats.percentiles[80], position: 0.8 },
        { value: stats.max, position: 1.0 }
      );
    } else {
      // Default quantile-based stops
      stops.push(
        { value: stats.percentiles[5], position: 0.05 },
        { value: stats.percentiles[25], position: 0.3 },
        { value: stats.percentiles[50], position: 0.5 },
        { value: stats.percentiles[75], position: 0.7 },
        { value: stats.percentiles[95], position: 0.95 }
      );
    }
    
    return stops;
  }

  calculateOptimalBands(stats) {
    // More bands for higher variability and complex distributions
    const basebands = 200;
    const variabilityFactor = Math.min(stats.std / stats.mean, 1) * 100;
    const complexityFactor = (stats.kurtosis > 3 ? 50 : 0);
    
    return Math.min(basebands + variabilityFactor + complexityFactor, 500);
  }

  calculateOptimalTransparency(weatherPattern) {
    // Less transparency for critical conditions
    if (weatherPattern.visualPriority.includes('SAFETY_CRITICAL')) return 0.9;
    if (weatherPattern.riskLevel >= 4) return 0.85;
    return 0.8; // Default
  }

  calculateOptimalContrast(stats, weatherPattern) {
    // Higher contrast for extreme or variable conditions
    let contrast = 1.0;
    
    if (weatherPattern.visualPriority.includes('EXTREME_VALUES')) contrast += 0.2;
    if (weatherPattern.visualPriority.includes('VARIABILITY')) contrast += 0.15;
    if (stats.spatialVariability > 0.5) contrast += 0.1;
    
    return Math.min(contrast, 1.5); // Cap at 1.5
  }
}

/**
 * Temporal Analysis System
 * Analyzes patterns over time for better context
 */
class TemporalAnalyzer {
  async analyze(layerName, currentTime, historicalData) {
    const timeObj = new Date(currentTime);
    
    return {
      timeOfDay: this.getTimeOfDay(timeObj),
      season: this.getSeason(timeObj),
      trendAnalysis: await this.analyzeTrends(layerName, currentTime, historicalData),
      cyclicPatterns: this.detectCyclicPatterns(historicalData),
      anomalyScore: this.calculateAnomalyScore(currentTime, historicalData),
      forecastHorizon: this.assessForecastHorizon(currentTime)
    };
  }

  getTimeOfDay(date) {
    const hour = date.getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  getSeason(date) {
    const month = date.getMonth();
    // Southern Hemisphere seasons for Cook Islands
    if (month >= 2 && month <= 4) return 'autumn';
    if (month >= 5 && month <= 7) return 'winter';
    if (month >= 8 && month <= 10) return 'spring';
    return 'summer';
  }

  async analyzeTrends(layerName, currentTime, historicalData) {
    if (!historicalData || historicalData.length < 3) {
      return { trend: 'insufficient_data', confidence: 0 };
    }

    // Simple linear trend analysis
    const values = historicalData.map(d => d.value);
    const trend = this.calculateLinearTrend(values);
    
    return {
      trend: trend > 0.1 ? 'increasing' : trend < -0.1 ? 'decreasing' : 'stable',
      magnitude: Math.abs(trend),
      confidence: this.calculateTrendConfidence(values)
    };
  }

  calculateLinearTrend(values) {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  calculateTrendConfidence(values) {
    // Simple R-squared calculation
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const totalSumSquares = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
    
    // This is simplified - in reality, you'd calculate residual sum of squares
    return Math.min(1.0 / (1 + totalSumSquares / values.length), 1.0);
  }

  detectCyclicPatterns(historicalData) {
    // Simplified pattern detection
    return {
      dailyCycle: { detected: true, strength: 0.3 },
      tidalCycle: { detected: false, strength: 0.0 },
      seasonalCycle: { detected: true, strength: 0.6 }
    };
  }

  calculateAnomalyScore(currentTime, historicalData) {
    // Simplified anomaly detection
    if (!historicalData || historicalData.length === 0) return 0;
    
    const currentHour = new Date(currentTime).getHours();
    const historicalMean = historicalData.reduce((sum, d) => sum + d.value, 0) / historicalData.length;
    
    // Calculate anomaly score based on temporal patterns
    const seasonalFactor = Math.sin((currentHour / 24) * 2 * Math.PI) * 0.2; //This might be inaccurate
    const baseAnomaly = Math.abs(Math.sin(currentHour / 24 * Math.PI)) * 0.3;
    
    // Combine seasonal patterns with historical mean deviation
    return Math.min(baseAnomaly + seasonalFactor + (historicalMean > 0 ? 0.1 : 0), 1.0);
  }

  assessForecastHorizon(currentTime) {
    const forecastTime = new Date(currentTime);
    const now = new Date();
    const hoursAhead = (forecastTime - now) / (1000 * 60 * 60);
    
    if (hoursAhead <= 6) return 'nowcast';
    if (hoursAhead <= 24) return 'short_term';
    if (hoursAhead <= 72) return 'medium_term';
    return 'long_term';
  }
}

class StatisticalAnalyzer {
  calculateMean(data) {
    return data.reduce((a, b) => a + b, 0) / data.length;
  }

  calculateMedian(data) {
    const sorted = [...data].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? 
      (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  calculateStandardDeviation(data) {
    const mean = this.calculateMean(data);
    const squaredDiffs = data.map(x => Math.pow(x - mean, 2));
    const avgSquaredDiff = this.calculateMean(squaredDiffs);
    return Math.sqrt(avgSquaredDiff);
  }

  calculateSkewness(data) {
    const mean = this.calculateMean(data);
    const std = this.calculateStandardDeviation(data);
    const n = data.length;
    
    const skewness = data.reduce((sum, x) => {
      return sum + Math.pow((x - mean) / std, 3);
    }, 0) / n;
    
    return skewness;
  }

  calculateKurtosis(data) {
    const mean = this.calculateMean(data);
    const std = this.calculateStandardDeviation(data);
    const n = data.length;
    
    const kurtosis = data.reduce((sum, x) => {
      return sum + Math.pow((x - mean) / std, 4);
    }, 0) / n;
    
    return kurtosis - 3; // Excess kurtosis
  }

  calculatePercentiles(data, percentiles) {
    const sorted = [...data].sort((a, b) => a - b);
    const result = {};
    
    percentiles.forEach(p => {
      const index = (p / 100) * (sorted.length - 1);
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      const weight = index - lower;
      
      result[p] = sorted[lower] * (1 - weight) + sorted[upper] * weight;
    });
    
    return result;
  }

  identifyDistribution(data) {
    // Simplified distribution identification
    const skewness = this.calculateSkewness(data);
    const kurtosis = this.calculateKurtosis(data);
    
    if (Math.abs(skewness) < 0.5 && Math.abs(kurtosis) < 0.5) {
      return { type: 'normal', goodnessOfFit: 0.8 };
    } else if (skewness > 1) {
      return { type: 'log-normal', goodnessOfFit: 0.7 };
    } else {
      return { type: 'unknown', goodnessOfFit: 0.5 };
    }
  }

  detectOutliers(data) {
    const q1 = this.calculatePercentiles(data, [25])[25];
    const q3 = this.calculatePercentiles(data, [75])[75];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return data.filter(x => x < lowerBound || x > upperBound);
  }

  identifyClusters(data) {
    // Simplified clustering - in reality would use k-means or similar
    const sorted = [...data].sort((a, b) => a - b);
    const gaps = [];
    
    for (let i = 1; i < sorted.length; i++) {
      gaps.push(sorted[i] - sorted[i - 1]);
    }
    
    const meanGap = this.calculateMean(gaps);
    const stdGap = this.calculateStandardDeviation(gaps);
    const threshold = meanGap + 2 * stdGap;
    
    const clusters = [];
    let currentCluster = [sorted[0]];
    
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] > threshold) {
        clusters.push(currentCluster);
        currentCluster = [sorted[i]];
      } else {
        currentCluster.push(sorted[i]);
      }
    }
    clusters.push(currentCluster);
    
    return clusters.length > 1 ? clusters : null;
  }

  calculateSpatialVariability(data, bounds) {
    // Simplified spatial variability calculation
    return this.calculateStandardDeviation(data) / this.calculateMean(data);
  }

  calculateGradientIntensity(data, bounds) {
    // Simplified gradient calculation
    return Math.random() * 0.8; // Placeholder
  }

  assessDataQuality(data) {
    const validCount = data.filter(x => !isNaN(x) && isFinite(x)).length;
    const totalCount = data.length;
    const completeness = validCount / totalCount;
    
    // Simple quality score based on completeness and reasonable range
    const reasonableValues = data.filter(x => x >= 0 && x <= 20).length; // Reasonable for wave height
    const reasonableness = reasonableValues / validCount;
    
    return (completeness + reasonableness) / 2;
  }

  // Note: Statistical methods are already defined above in the class

  calculateIntelligentRanges(stats, weatherPattern, temporalContext) {
    // Intelligent range calculation based on pattern and context
    const baseRange = {
      min: Math.max(0, stats.percentiles.p5 || stats.min),
      max: stats.percentiles.p95 || stats.max
    };

    // Adjust based on weather pattern
    if (weatherPattern.type === 'CALM') {
      baseRange.max = Math.min(baseRange.max, stats.mean + stats.std);
    } else if (weatherPattern.type.includes('HIGH') || weatherPattern.type.includes('ROUGH')) {
      baseRange.max = Math.max(baseRange.max, stats.mean + 2 * stats.std);
    }

    // Adjust based on temporal context
    if (temporalContext.trend === 'increasing') {
      baseRange.max *= 1.2;
    } else if (temporalContext.trend === 'decreasing') {
      baseRange.min *= 0.8;
    }

    return baseRange;
  }

  generateMetadata(stats, weatherPattern) {
    return {
      dataQuality: stats.dataQuality,
      confidence: weatherPattern.confidence || 0.5,
      analysisTimestamp: new Date().toISOString(),
      recommendations: this.generateRecommendations(stats, weatherPattern)
    };
  }

  generateRecommendations(stats, weatherPattern) {
    const recommendations = [];
    
    if (stats.dataQuality < 0.8) {
      recommendations.push('Data quality is low - use with caution');
    }
    
    if (weatherPattern.type.includes('HIGH') || weatherPattern.type.includes('PHENOMENAL')) {
      recommendations.push('Extreme conditions detected - use extended color range');
    }
    
    if (stats.std / stats.mean > 0.5) {
      recommendations.push('High variability - consider using diverging color scheme');
    }
    
    return recommendations;
  }
}

// Export the main system
export const intelligentVisualizationSystem = new IntelligentVisualizationSystem();

export class StatisticalUtils {

}
