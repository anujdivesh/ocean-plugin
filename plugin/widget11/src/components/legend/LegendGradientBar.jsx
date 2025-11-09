import React from 'react';
import styles from './CompactLegend.module.css';

const LegendGradientBar = ({ layer }) => {
  // Extract min/max values from layer
  const getValueRange = (layer) => {
    if (layer.min !== undefined && layer.max !== undefined) {
      return { min: layer.min, max: layer.max };
    }
    
    // Default ranges based on layer type
    const layerName = (layer.name || layer.title || '').toLowerCase();
    
    if (layerName.includes('hs') || layerName.includes('wave_height')) {
      return { min: 0, max: 6, unit: 'm' };
    }
    if (layerName.includes('tm') || layerName.includes('period')) {
      return { min: 2, max: 16, unit: 's' };
    }
    if (layerName.includes('wind')) {
      return { min: 0, max: 25, unit: 'm/s' };
    }
    if (layerName.includes('current')) {
      return { min: 0, max: 1.5, unit: 'm/s' };
    }
    if (layerName.includes('temp')) {
      return { min: 20, max: 32, unit: '°C' };
    }
    if (layerName.includes('salt')) {
      return { min: 34, max: 36, unit: 'psu' };
    }
    if (layerName.includes('inundation')) {
      return { min: 0, max: 5, unit: 'm' };
    }
    
    return { min: 0, max: 100, unit: '' };
  };

  // Generate gradient colors based on layer type
  const getGradientColors = (layerName = '') => {
    const name = layerName.toLowerCase();
    
    if (name.includes('wave') || name.includes('hs')) {
      return [
        '#1e40af', // Deep blue (calm)
        '#3b82f6', // Blue
        '#06b6d4', // Cyan
        '#10b981', // Emerald
        '#84cc16', // Lime
        '#eab308', // Yellow
        '#f59e0b', // Orange
        '#ef4444', // Red
        '#dc2626'  // Dark red (extreme)
      ];
    }
    
    if (name.includes('period') || name.includes('tm')) {
      return [
        '#312e81', // Deep purple (short period)
        '#4c1d95',
        '#7c3aed',
        '#a855f7',
        '#c084fc',
        '#e879f9',
        '#f0abfc',
        '#fde68a'  // Light yellow (long period)
      ];
    }
    
    if (name.includes('wind') || name.includes('current')) {
      return [
        '#0f172a', // Almost black (calm)
        '#1e293b',
        '#334155',
        '#475569',
        '#64748b',
        '#94a3b8',
        '#cbd5e1',
        '#f1f5f9'  // Light (strong)
      ];
    }
    
    if (name.includes('temp')) {
      return [
        '#1e3a8a', // Cold blue
        '#3b82f6',
        '#06b6d4',
        '#10b981',
        '#84cc16',
        '#eab308',
        '#f59e0b',
        '#ef4444'  // Hot red
      ];
    }
    
    if (name.includes('inundation')) {
      return [
        '#ecfeff', // Very light cyan (no inundation)
        '#a7f3d0',
        '#6ee7b7',
        '#34d399',
        '#10b981',
        '#059669',
        '#047857',
        '#065f46'  // Dark green (high inundation)
      ];
    }
    
    // Default gradient
    return [
      '#1e40af',
      '#3b82f6',
      '#06b6d4',
      '#10b981',
      '#84cc16',
      '#eab308',
      '#f59e0b',
      '#ef4444',
      '#dc2626'
    ];
  };

  const { min, max, unit } = getValueRange(layer);
  const colors = getGradientColors(layer.name || layer.title);
  const gradientString = `linear-gradient(to right, ${colors.join(', ')})`;

  const formatValue = (value) => {
    const formatted = typeof value === 'number' ? value.toFixed(1) : value;
    return unit ? `${formatted}${unit}` : formatted;
  };



  return (
    <>
      <div 
        className={styles.gradientBar}
        style={{ background: gradientString }}
        role="img"
        aria-label={`Color scale from ${formatValue(min)} to ${formatValue(max)}`}
      />
      
      <div className={styles.valueLabels}>
        <span className={styles.valueLabel}>
          {formatValue(min)}
        </span>
        <span className={styles.valueLabel}>
          {formatValue((min + max) / 2)}
        </span>
        <span className={styles.valueLabel}>
          {formatValue(max)}
        </span>
      </div>
    </>
  );
};

export default LegendGradientBar;