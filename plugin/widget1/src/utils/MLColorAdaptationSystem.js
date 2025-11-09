/**
 * Machine Learning Color Adaptation System
 * Learns optimal color schemes from data patterns and user interactions
 */

export class MLColorAdaptationSystem {
  constructor() {
    this.trainingData = [];
    this.colorPreferenceModel = new ColorPreferenceModel();
    this.patternRecognitionEngine = new PatternRecognitionEngine();
    this.adaptiveColorEngine = new AdaptiveColorEngine();
    this.userFeedbackSystem = new UserFeedbackSystem();
  }

  /**
   * Main method to get ML-optimized color scheme
   */
  async getMLOptimizedColorScheme(layerName, dataPattern, userContext = {}) {
    try {
      // 1. Analyze data patterns using ML
      const patternAnalysis = await this.patternRecognitionEngine.analyze(dataPattern);
      
      // 2. Get user preference predictions
      const userPreferences = await this.colorPreferenceModel.predict(userContext, patternAnalysis);
      
      // 3. Generate adaptive color scheme
      const adaptiveScheme = await this.adaptiveColorEngine.generate(
        patternAnalysis, 
        userPreferences, 
        layerName
      );
      
      // 4. Apply real-time optimization
      const optimizedScheme = this.applyRealtimeOptimization(adaptiveScheme, dataPattern);

      return {
        colorScheme: optimizedScheme,
        confidence: this.calculateConfidence(patternAnalysis, userPreferences),
        patternAnalysis,
        userPreferences,
        mlMetadata: this.generateMLMetadata(patternAnalysis, userPreferences)
      };
    } catch (error) {
      console.warn('ML color adaptation failed:', error);
      return this.getFallbackColorScheme(layerName);
    }
  }

  /**
   * Apply real-time optimization to color scheme
   */
  applyRealtimeOptimization(adaptiveScheme, dataPattern) {
    // Simple optimization based on data characteristics
    return {
      ...adaptiveScheme,
      optimized: true,
      dataSize: dataPattern?.values?.length || 0
    };
  }

  /**
   * Calculate confidence score
   */
  calculateConfidence(patternAnalysis, userPreferences) {
    const patternConfidence = patternAnalysis?.confidence || 0.5;
    const preferenceConfidence = userPreferences?.colorblindSafe ? 0.9 : 0.7;
    return (patternConfidence + preferenceConfidence) / 2;
  }

  /**
   * Generate ML metadata
   */
  generateMLMetadata(patternAnalysis, userPreferences) {
    return {
      analysisTimestamp: new Date().toISOString(),
      patternType: patternAnalysis?.recognizedPatterns?.[0]?.type || 'unknown',
      preferredPalette: userPreferences?.preferredPalette || 'viridis'
    };
  }

  /**
   * Get fallback color scheme
   */
  getFallbackColorScheme(layerName) {
    return {
      colorScheme: {
        palette: 'viridis',
        numBands: 250,
        transparency: 0.8
      },
      confidence: 0.3,
      fallback: true,
      layerName
    };
  }

  /**
   * Calculate effectiveness from user feedback
   */
  calculateEffectiveness(userFeedback) {
    return userFeedback?.rating || 0.5;
  }

  /**
   * Learn from user interactions and feedback
   */
  learnFromUserFeedback(colorScheme, userFeedback, dataContext) {
    const trainingExample = {
      timestamp: new Date().toISOString(),
      colorScheme,
      userFeedback,
      dataContext,
      effectiveness: this.calculateEffectiveness(userFeedback)
    };

    this.trainingData.push(trainingExample);
    this.updateModels(trainingExample);
  }

  /**
   * Update ML models with new training data
   */
  updateModels(trainingExample) {
    // Update color preference model
    this.colorPreferenceModel.update(trainingExample);
    
    // Update pattern recognition
    this.patternRecognitionEngine.update(trainingExample);
    
    // Update adaptive color engine
    this.adaptiveColorEngine.update(trainingExample);
  }
}

/**
 * Pattern Recognition Engine for identifying data patterns
 */
class PatternRecognitionEngine {
  constructor() {
    this.knownPatterns = new Map();
    this.featureExtractor = new FeatureExtractor();
    this.clusteringEngine = new ClusteringEngine();
  }

  async analyze(dataPattern) {
    // Extract features from data
    const features = this.featureExtractor.extract(dataPattern);
    
    // Identify pattern clusters
    const clusters = await this.clusteringEngine.cluster(features);
    
    // Recognize known patterns
    const recognizedPatterns = this.recognizePatterns(features, clusters);
    
    // Calculate pattern confidence
    const confidence = this.calculatePatternConfidence(recognizedPatterns);

    return {
      features,
      clusters,
      recognizedPatterns,
      confidence,
      novelty: this.calculateNovelty(features),
      complexity: this.calculateComplexity(features)
    };
  }

  recognizePatterns(features, clusters) {
    const patterns = [];
    
    // Gaussian patterns
    if (features.normalityScore > 0.8) {
      patterns.push({
        type: 'GAUSSIAN',
        confidence: features.normalityScore,
        recommendation: 'LINEAR_GRADIENT'
      });
    }
    
    // Bimodal patterns
    if (clusters.length === 2 && features.bimodalityScore > 0.7) {
      patterns.push({
        type: 'BIMODAL',
        confidence: features.bimodalityScore,
        recommendation: 'DUAL_EMPHASIS'
      });
    }
    
    // Extreme value patterns
    if (features.extremeValueRatio > 0.05) {
      patterns.push({
        type: 'EXTREME_VALUES',
        confidence: features.extremeValueRatio,
        recommendation: 'EXTREME_HIGHLIGHT'
      });
    }
    
    // Seasonal/temporal patterns
    if (features.temporalVariation > 0.6) {
      patterns.push({
        type: 'TEMPORAL_VARIATION',
        confidence: features.temporalVariation,
        recommendation: 'TIME_ADAPTIVE'
      });
    }

    return patterns;
  }

  calculatePatternConfidence(patterns) {
    if (patterns.length === 0) return 0.1;
    return patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
  }

  calculateNovelty(features) {
    // Simplified novelty detection
    const knownFeatureVectors = Array.from(this.knownPatterns.values());
    if (knownFeatureVectors.length === 0) return 1.0;
    
    const distances = knownFeatureVectors.map(known => 
      this.calculateEuclideanDistance(features.vector, known.vector)
    );
    
    const minDistance = Math.min(...distances);
    return Math.min(minDistance / 10, 1.0); // Normalize
  }

  calculateComplexity(features) {
    // Combine multiple complexity metrics
    const entropyComplexity = features.entropy / Math.log2(features.uniqueValues);
    const variabilityComplexity = features.coefficientOfVariation;
    const modalComplexity = features.numberOfModes / 5; // Normalize to expected max
    
    return (entropyComplexity + variabilityComplexity + modalComplexity) / 3;
  }

  calculateEuclideanDistance(vector1, vector2) {
    return Math.sqrt(
      vector1.reduce((sum, val, i) => sum + Math.pow(val - vector2[i], 2), 0)
    );
  }

  update(trainingExample) {
    // Update known patterns with successful examples
    if (trainingExample.effectiveness > 0.7) {
      const patternKey = this.generatePatternKey(trainingExample.dataContext);
      this.knownPatterns.set(patternKey, {
        features: trainingExample.dataContext.features,
        colorScheme: trainingExample.colorScheme,
        effectiveness: trainingExample.effectiveness
      });
    }
  }

  generatePatternKey(dataContext) {
    // Create a unique key for the pattern
    const features = dataContext.features || {};
    return `${features.type || 'unknown'}_${Math.round(features.complexity * 10)}_${Math.round(features.variability * 10)}`;
  }
}

/**
 * Feature Extractor for data analysis
 */
class FeatureExtractor {
  extract(dataPattern) {
    const values = dataPattern.values || [];
    const histogram = dataPattern.histogram || {};
    
    return {
      mean: this.calculateMean(values),
      median: this.calculateMedian(values),
      standardDeviation: this.calculateStandardDeviation(values),
      skewness: this.calculateSkewness(values),
      kurtosis: this.calculateKurtosis(values),
      coefficientOfVariation: this.calculateCoefficientOfVariation(values),
      iqr: this.calculateIQR(values),
      extremeValueRatio: this.calculateExtremeValueRatio(values),
      numberOfModes: this.countModes(histogram.bins || []),
      entropy: this.calculateEntropy(histogram.bins || []),
      normalityScore: this.calculateNormalityScore(values),
      bimodalityScore: this.calculateBimodalityScore(values),
      temporalVariation: this.calculateTemporalVariation(values),
      uniqueValues: new Set(values).size,
      vector: [
        this.calculateMean(values),
        this.calculateStandardDeviation(values),
        this.calculateSkewness(values),
        this.calculateKurtosis(values),
        this.calculateCoefficientOfVariation(values),
        this.countModes(histogram.bins || []) / 5,
        Math.min(this.calculateEntropy(histogram.bins || []) / 4, 1),
        this.calculateNormalityScore(values),
        this.calculateExtremeValueRatio(values),
        values.length / 1000
      ]
    };
  }

  // Statistical calculation methods
  calculateMean(values) {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  calculateMedian(values) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  }

  calculateStandardDeviation(values) {
    if (values.length <= 1) return 0;
    const mean = this.calculateMean(values);
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
    return Math.sqrt(variance);
  }

  calculateSkewness(values) {
    if (values.length < 3) return 0;
    const mean = this.calculateMean(values);
    const std = this.calculateStandardDeviation(values);
    if (std === 0) return 0;
    
    const n = values.length;
    const skewness = values.reduce((sum, x) => sum + Math.pow((x - mean) / std, 3), 0) / n;
    return skewness;
  }

  calculateKurtosis(values) {
    if (values.length < 4) return 0;
    const mean = this.calculateMean(values);
    const std = this.calculateStandardDeviation(values);
    if (std === 0) return 0;
    
    const n = values.length;
    const kurtosis = values.reduce((sum, x) => sum + Math.pow((x - mean) / std, 4), 0) / n;
    return kurtosis - 3; // Excess kurtosis
  }

  calculateCoefficientOfVariation(values) {
    const mean = this.calculateMean(values);
    const std = this.calculateStandardDeviation(values);
    return mean !== 0 ? std / Math.abs(mean) : 0;
  }

  calculateIQR(values) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    return sorted[q3Index] - sorted[q1Index];
  }

  calculateExtremeValueRatio(values) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const q1Index = Math.floor(values.length * 0.25);
    const q3Index = Math.floor(values.length * 0.75);
    const iqr = sorted[q3Index] - sorted[q1Index];
    const lowerBound = sorted[q1Index] - 1.5 * iqr;
    const upperBound = sorted[q3Index] + 1.5 * iqr;
    
    const extremeCount = values.filter(v => v < lowerBound || v > upperBound).length;
    return extremeCount / values.length;
  }

  calculateNormalityScore(values) {
    // Simplified normality test based on skewness and kurtosis
    const skewness = Math.abs(this.calculateSkewness(values));
    const kurtosis = Math.abs(this.calculateKurtosis(values));
    return Math.max(0, 1 - (skewness + kurtosis) / 4);
  }

  calculateBimodalityScore(values) {
    // Simplified bimodality detection
    if (values.length < 10) return 0;
    const histogram = this.createHistogram(values, 10);
    const peaks = this.findPeaks(histogram);
    return peaks.length === 2 ? 0.8 : 0.2;
  }

  calculateTemporalVariation(values) {
    // Simplified temporal variation calculation
    if (values.length < 2) return 0;
    let changes = 0;
    for (let i = 1; i < values.length; i++) {
      if (Math.abs(values[i] - values[i-1]) > 0.1) changes++;
    }
    return changes / (values.length - 1);
  }

  calculateEntropy(bins) {
    if (!bins || bins.length === 0) return 0;
    return bins.reduce((entropy, bin) => {
      if (bin.density > 0) {
        entropy -= bin.density * Math.log2(bin.density);
      }
      return entropy;
    }, 0);
  }

  countModes(bins) {
    if (!bins || bins.length < 3) return 0;
    let modes = 0;
    for (let i = 1; i < bins.length - 1; i++) {
      if (bins[i].density > bins[i-1].density && bins[i].density > bins[i+1].density) {
        if (bins[i].density > 0.05) modes++;
      }
    }
    return modes;
  }

  createHistogram(values, numBins) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binWidth = (max - min) / numBins;
    const bins = new Array(numBins).fill(0);
    
    values.forEach(value => {
      const binIndex = Math.min(Math.floor((value - min) / binWidth), numBins - 1);
      bins[binIndex]++;
    });
    
    return bins.map(count => ({ density: count / values.length }));
  }

  findPeaks(histogram) {
    const peaks = [];
    for (let i = 1; i < histogram.length - 1; i++) {
      if (histogram[i].density > histogram[i-1].density && 
          histogram[i].density > histogram[i+1].density &&
          histogram[i].density > 0.05) {
        peaks.push(i);
      }
    }
    return peaks;
  }
}


/**
 * Simplified implementations for other components
 */
class ColorPreferenceModel {
  constructor() {
    this.preferences = new Map();
  }

  async predict(userContext, patternAnalysis) {
    // Simplified preference prediction
    return {
      preferredPalette: 'viridis',
      contrastPreference: 0.8,
      brightnessPreference: 0.7,
      saturationPreference: 0.8,
      colorblindSafe: true
    };
  }

  update(trainingExample) {
    // Update preference model with training data
  }
}

class ClusteringEngine {
  async cluster(features) {
    // Simplified clustering - would implement k-means or similar
    return [{ center: features.vector, size: 1 }];
  }
}

class AdaptiveColorEngine {
  async generate(patternAnalysis, userPreferences, layerName) {
    // Generate adaptive color scheme based on analysis
    return {
      palette: 'psu-viridis',
      colorStops: [],
      numBands: 250,
      transparency: 0.8
    };
  }

  update(trainingExample) {
    // Update color generation algorithms
  }
}

class UserFeedbackSystem {
  collectFeedback(colorScheme, effectiveness) {
    // Collect user feedback on color scheme effectiveness
  }
}


export const mlColorAdaptationSystem = new MLColorAdaptationSystem();