/**
 * WMS Layer Configuration Service
 * 
 * Handles layer configuration cloning, state management, and business rules
 * for WMS layers. Separates layer configuration logic from UI state.
 * 
 * Invariants:
 * - Layer configs are immutable once created
 * - Cloning preserves composite layer hierarchies
 * - Wave height layers automatically apply Beaufort scale limits
 * - All range calculations are normalized and validated
 */

import wmsStyleManager, { WMSStylePresets } from '../utils/WMSStyleManager';

// Business constants - centralized for maintainability
const WAVE_HEIGHT_THRESHOLDS = Object.keys(WMSStylePresets.WAVE_HEIGHT.colorMapping)
  .map(Number)
  .sort((a, b) => a - b);

const EPSILON = 1e-6;
const DEFAULT_BEAUFORT_VISUAL_MAX = 4;

// Layer type definitions
const LayerTypes = {
  WAVE_HEIGHT: 'hs',
  WAVE_PERIOD: 'tm02',
  PEAK_PERIOD: 'tpeak',
  WAVE_DIRECTION: 'dirm',
  INUNDATION: 'raro_inun'
};

const LayerUnits = {
  [LayerTypes.WAVE_HEIGHT]: 'm',
  [LayerTypes.WAVE_PERIOD]: 's',
  [LayerTypes.PEAK_PERIOD]: 's',
  [LayerTypes.WAVE_DIRECTION]: '°',
  [LayerTypes.INUNDATION]: 'm'
};

class WMSLayerConfigService {
  /**
   * Deep clone a layer configuration with all business rules applied
   * @param {Object} layer - Layer configuration to clone
   * @returns {Object} Cloned layer with applied business rules
   */
  static cloneLayerConfig(layer) {
    if (!layer) return layer;
    
    // Handle composite layers recursively
    if (layer.composite && Array.isArray(layer.layers)) {
      return {
        ...layer,
        layers: layer.layers.map(subLayer => this.cloneLayerConfig(subLayer))
      };
    }
    
    const cloned = { ...layer };
    
    // Apply layer-specific business rules
    if (this.isWaveHeightLayer(cloned)) {
      this._applyWaveHeightRules(cloned);
    } else {
      this._applyGenericRules(cloned);
    }
    
    return cloned;
  }
  
  /**
   * Apply wave height specific business rules (Beaufort scale, visual limits)
   * @private
   */
  static _applyWaveHeightRules(layer) {
    const initialMax = this.parseRangeMax(layer.colorscalerange);
    const visualMax = this.getBeaufortCeiling(
      initialMax !== null ? Math.min(initialMax, DEFAULT_BEAUFORT_VISUAL_MAX) : DEFAULT_BEAUFORT_VISUAL_MAX
    );
    
    layer.activeBeaufortMax = visualMax;
    layer.colorscalerange = `0,${visualMax}`;
    layer.legendUrl = wmsStyleManager.getEnhancedLegendUrl(
      layer.value,
      layer.colorscalerange,
      this.getLayerUnit(layer.value)
    );
  }
  
  /**
   * Apply generic layer rules
   * @private
   */
  static _applyGenericRules(layer) {
    const initialMax = this.parseRangeMax(layer.colorscalerange);
    if (initialMax !== null) {
      layer.activeBeaufortMax = initialMax;
    }
  }
  
  /**
   * Check if layer is a wave height layer
   */
  static isWaveHeightLayer(layer) {
    return layer?.value?.includes(LayerTypes.WAVE_HEIGHT);
  }
  
  /**
   * Check if layer is a scalar (non-directional) layer
   */
  static isScalarLayer(layer) {
    if (!layer) return false;
    const value = layer.value || layer.layer;
    return typeof value === 'string' && !value.includes(LayerTypes.WAVE_DIRECTION);
  }
  
  /**
   * Check if layer is a static (non-time-dimensional) layer
   */
  static isStaticLayer(layer) {
    return layer?.isStatic === true || layer?.id === 200; // Legacy ID check
  }
  
  /**
   * Get the appropriate unit for a layer
   */
  static getLayerUnit(layerValue) {
    if (!layerValue) return '';
    
    for (const [type, unit] of Object.entries(LayerUnits)) {
      if (layerValue.includes(type)) {
        return unit;
      }
    }
    
    return '';
  }
  
  /**
   * Parse maximum value from color scale range string
   */
  static parseRangeMax(rangeString) {
    if (!rangeString) return null;
    const parts = rangeString.split(',');
    if (parts.length !== 2) return null;
    const max = Number(parts[1]);
    return Number.isFinite(max) ? max : null;
  }
  
  /**
   * Get Beaufort scale ceiling for a given value
   */
  static getBeaufortCeiling(value) {
    if (!Number.isFinite(value)) {
      return WAVE_HEIGHT_THRESHOLDS[WAVE_HEIGHT_THRESHOLDS.length - 1];
    }
    
    const adjusted = Math.max(0, value);
    for (const threshold of WAVE_HEIGHT_THRESHOLDS) {
      if (adjusted <= threshold + EPSILON) {
        return threshold;
      }
    }
    
    return WAVE_HEIGHT_THRESHOLDS[WAVE_HEIGHT_THRESHOLDS.length - 1];
  }
  
  /**
   * Normalize a min/max range ensuring valid numeric values
   */
  static normalizeRange(min, max) {
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return null;
    }
    
    if (min === max) {
      const padding = Math.max(Math.abs(min) * 0.05, 0.1);
      return {
        min: min - padding,
        max: max + padding,
      };
    }
    
    if (min > max) {
      return { min: max, max: min };
    }
    
    return { min, max };
  }
}

export default WMSLayerConfigService;
export { LayerTypes, LayerUnits };