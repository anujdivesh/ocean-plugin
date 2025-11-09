import React from 'react';
import { useLegendState } from '../../hooks/useLegendState';
import LegendGradientBar from './LegendGradientBar';
import LegendDescriptions from './LegendDescriptions';
import styles from './CompactLegend.module.css';

const CompactLegend = ({ 
  layer, 
  className = '', 
  title = 'Legend',
  showDescriptions = true 
}) => {
  // Debug logging
  console.log('🎯 CompactLegend props:', { layer, title, isExpanded: 'checking...' });
  
  const {
    isExpanded,
    isAnimating,
    toggleExpanded,
    keyboardHandler
  } = useLegendState();

  // Don't render if no layer data
  if (!layer) {
    return null;
  }

  const getLayerIcon = (layerName = '') => {
    const name = layerName.toLowerCase();
    if (name.includes('wave')) return '🌊';
    if (name.includes('current')) return '➡️';
    if (name.includes('wind')) return '💨';
    if (name.includes('temp')) return '🌡️';
    if (name.includes('salt')) return '🧂';
    if (name.includes('inundation')) return '🏖️';
    return '📊';
  };

  const formatTitle = (layerTitle) => {
    if (!layerTitle) return title;
    
    // Clean up title for display
    return layerTitle
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/Hs/g, 'Wave Height')
      .replace(/Tm/g, 'Wave Period')
      .replace(/Dir/g, 'Direction');
  };

  return (
    <div 
      className={`${styles.legendContainer} ${className}`}
      role="region"
      aria-label="Map Legend"
    >
      {/* Always visible header */}
      <div
        className={styles.legendHeader}
        onClick={toggleExpanded}
        onKeyDown={keyboardHandler}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls="legend-content"
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} legend details`}
      >
        <h3 className={styles.legendTitle}>
          <span className={styles.legendIcon}>
            {getLayerIcon(layer.name || layer.title)}
          </span>
          {formatTitle(layer.title || layer.name)}
        </h3>
        
        <span 
          className={`${styles.expandIcon} ${isExpanded ? styles.expanded : ''}`}
          aria-hidden="true"
        >
          ▼
        </span>
      </div>

      {/* Collapsible content */}
      <div
        id="legend-content"
        className={`
          ${styles.legendContent} 
          ${isExpanded ? styles.expanded : styles.collapsed}
          ${isAnimating ? styles.animating : ''}
        `}
        aria-hidden={!isExpanded}
      >
        <div className={styles.gradientContainer}>
          {/* Display actual WMS legend graphic */}
          {layer.legendUrl && (
            <img 
              src={layer.legendUrl}
              alt={`Legend for ${formatTitle(layer.title || layer.name)}`}
              className={styles.legendImage}
              onError={(e) => {
                console.warn('Legend image failed to load:', layer.legendUrl);
                e.target.style.display = 'none';
              }}
            />
          )}
          
          {/* Fallback to CSS gradient if no legend URL */}
          {!layer.legendUrl && <LegendGradientBar layer={layer} />}
          
          {showDescriptions && isExpanded && (
            <LegendDescriptions layer={layer} />
          )}
        </div>
      </div>
    </div>
  );
};

export default CompactLegend;