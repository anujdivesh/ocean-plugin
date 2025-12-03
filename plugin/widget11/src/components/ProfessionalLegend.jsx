import React, { useState, useEffect, useMemo } from 'react';
import ProfessionalLegendSystem from '../utils/ProfessionalLegendSystem';

/**
 * Professional Legend Component
 * Replaces dual legend approach with unified, adaptive system
 */
const ProfessionalLegend = ({ 
  range = "0,4", 
  conditions = "normal",
  className = "",
  style = {},
  showMetadata = false 
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const legendSystem = useMemo(() => new ProfessionalLegendSystem(), []);
  
  const legendConfig = useMemo(() => {
    return legendSystem.getWaveHeightLegendConfig(range, conditions);
  }, [legendSystem, range, conditions]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  useEffect(() => {
    // Apply CSS variables for gradient consistency
    if (legendConfig.css.cssVariables) {
      const root = document.documentElement;
      Object.entries(legendConfig.css.cssVariables).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
    }
  }, [legendConfig]);

  return (
    <div className={`professional-legend ${className}`} style={{
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      ...style
    }}>
      
      {/* Primary Server-Generated Legend */}
      <div className="legend-primary" style={{ position: 'relative' }}>
        <img
          src={legendConfig.primary.url}
          alt={`Legend for ${legendConfig.metadata.variable}`}
          className="legend-image"
          style={{
            maxWidth: '100%',
            height: 'auto',
            display: imageError ? 'none' : 'block',
            transition: 'opacity 0.3s ease',
            opacity: imageLoaded ? 1 : 0.7
          }}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
        
        {/* Loading State */}
        {!imageLoaded && !imageError && (
          <div className="legend-loading" style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(var(--color-surface-rgb, 255, 255, 255), 0.8)',
            fontSize: '12px',
            color: 'var(--color-text, #333)'
          }}>
            Loading legend...
          </div>
        )}
      </div>

      {/* Fallback CSS Gradient (shown on image error) */}
      {imageError && (
        <div className="legend-fallback" style={{
          width: legendSystem.getResponsiveWidth() + 'px',
          height: legendSystem.getResponsiveHeight() + 'px',
          ...legendConfig.css,
          border: '1px solid var(--color-border, #e2e8f0)',
          borderRadius: '4px',
          position: 'relative'
        }}>
          {/* Value labels for fallback */}
          <div style={{
            position: 'absolute',
            right: '-35px',
            top: '0px',
            fontSize: '10px',
            color: 'var(--color-text, #333)',
            fontWeight: '500'
          }}>
            {legendConfig.metadata.range.split(',')[1]}{legendConfig.metadata.unit}
          </div>
          <div style={{
            position: 'absolute',
            right: '-35px',
            bottom: '0px',
            fontSize: '10px',
            color: 'var(--color-text, #333)',
            fontWeight: '500'
          }}>
            {legendConfig.metadata.range.split(',')[0]}{legendConfig.metadata.unit}
          </div>
        </div>
      )}

      {/* Professional Metadata (optional) */}
      {showMetadata && (
        <div className="legend-metadata" style={{
          marginTop: '8px',
          fontSize: '10px',
          color: 'var(--color-text-secondary, #666)',
          textAlign: 'center',
          lineHeight: '1.3'
        }}>
          <div><strong>{legendConfig.metadata.variable}</strong></div>
          <div>Range: {legendConfig.metadata.range} {legendConfig.metadata.unit}</div>
          <div>Palette: {legendConfig.metadata.palette.replace('psu-', '').charAt(0).toUpperCase() + legendConfig.metadata.palette.replace('psu-', '').slice(1)}</div>
          <div>Resolution: {legendConfig.metadata.bands} bands</div>
        </div>
      )}

      {/* Quality indicator */}
      <div className="legend-quality" style={{
        position: 'absolute',
        top: '2px',
        right: '2px',
        fontSize: '8px',
        color: 'var(--color-text-secondary, #666)',
        backgroundColor: 'rgba(var(--color-surface-rgb, 255, 255, 255), 0.8)',
        padding: '1px 3px',
        borderRadius: '2px',
        opacity: imageLoaded ? 1 : 0,
        transition: 'opacity 0.3s ease'
      }}>
        {legendConfig.primary.quality.toUpperCase()}
      </div>
    </div>
  );
};

/**
 * Enhanced Wave Height Legend - Specific implementation
 */
export const WaveHeightLegend = ({ 
  range = "0,4", 
  conditions = "normal",
  showMetadata = false,
  ...props 
}) => {
  return (
    <ProfessionalLegend
      variable="wave_height"
      range={range}
      conditions={conditions}
      showMetadata={showMetadata}
      {...props}
    />
  );
};

/**
 * Legacy compatibility wrapper
 */
export const ForecastMapLegend = ({ 
  legendUrl, 
  range = "0,4",
  conditions = "normal",
  className = "forecast-map-legend__image",
  ...props 
}) => {
  // If legacy legendUrl is provided, determine if we should upgrade
  const shouldUpgrade = !legendUrl || legendUrl.includes('ocean-plotter.spc.int');
  
  if (shouldUpgrade) {
    return (
      <WaveHeightLegend
        range={range}
        conditions={conditions}
        className={className}
        {...props}
      />
    );
  }
  
  // Fallback to original implementation
  return (
    <img 
      src={legendUrl} 
      alt="Legend" 
      className={className}
      {...props} 
    />
  );
};

export default ProfessionalLegend;