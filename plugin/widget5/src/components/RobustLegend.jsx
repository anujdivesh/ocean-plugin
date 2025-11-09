import React, { useState, useEffect, useMemo } from 'react';
import LegendErrorHandler from '../utils/LegendErrorHandler';

/**
 * Robust Legend Component with Error Handling
 * Automatically handles 500 errors and provides fallbacks
 */
const RobustLegend = ({ 
  variable = "tm02", 
  range = "0,20", 
  unit = "s",
  palette = "plasma",
  className = "",
  style = {},
  showFallbackInfo = true 
}) => {
  const [legendData, setLegendData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  const errorHandler = useMemo(() => new LegendErrorHandler(), []);
  
  useEffect(() => {
    let cancelled = false;
    
    const loadLegend = async () => {
      setIsLoading(true);
      setImageError(false);
      
      try {
        const result = await errorHandler.getLegendUrlWithFallback(
          variable, range, unit, palette
        );
        
        if (!cancelled) {
          setLegendData(result);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Legend generation failed:', error);
        if (!cancelled) {
          // Ultimate fallback
          setLegendData({
            url: null,
            strategy: 'css-gradient',
            fallback: true,
            cssGradient: errorHandler.generateCSSGradient(palette, range),
            metadata: {
              variable,
              range,
              unit,
              palette,
              message: 'All legend generation methods failed'
            }
          });
          setIsLoading(false);
        }
      }
    };

    loadLegend();
    
    return () => {
      cancelled = true;
    };
  }, [variable, range, unit, palette, errorHandler]);

  const handleImageLoad = () => {
    setImageError(false);
  };

  const handleImageError = () => {
    console.warn('Legend image failed to load, using fallback');
    setImageError(true);
  };

  if (isLoading) {
    return (
      <div className={`robust-legend loading ${className}`} style={style}>
        <div style={{
          width: '70px',
          height: '300px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--color-surface, #f8f9fa)',
          border: '1px solid var(--color-border, #e2e8f0)',
          borderRadius: '4px',
          fontSize: '11px',
          color: 'var(--color-text, #666)'
        }}>
          Loading...
        </div>
      </div>
    );
  }

  if (!legendData) {
    return null;
  }

  // Show server-generated image if available and not errored
  if (legendData.url && !imageError) {
    return (
      <div className={`robust-legend ${className}`} style={style}>
        <img
          src={legendData.url}
          alt={`Legend for ${variable}`}
          style={{
            maxWidth: '100%',
            height: 'auto',
            borderRadius: '4px',
            border: '1px solid var(--color-border, #e2e8f0)',
            background: 'var(--color-surface, white)'
          }}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
        
        {/* Strategy indicator */}
        {showFallbackInfo && (
          <div style={{
            fontSize: '8px',
            color: 'var(--color-text-secondary, #666)',
            marginTop: '4px',
            textAlign: 'center'
          }}>
            {legendData.strategy === 'ncwms-primary' ? '🔬 ncWMS' : '📊 Ocean Plotter'}
          </div>
        )}
      </div>
    );
  }

  // Use CSS gradient fallback
  const [min, max] = range.split(',').map(Number);
  
  return (
    <div className={`robust-legend fallback ${className}`} style={style}>
      {/* CSS Gradient Legend */}
      <div style={{
        width: '70px',
        height: '300px',
        background: legendData.cssGradient,
        borderRadius: '4px',
        border: '1px solid var(--color-border, #e2e8f0)',
        position: 'relative',
        boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Value labels */}
        <div style={{
          position: 'absolute',
          right: '-30px',
          top: '0px',
          fontSize: '10px',
          color: 'var(--color-text, #333)',
          fontWeight: '500'
        }}>
          {max}{unit}
        </div>
        <div style={{
          position: 'absolute',
          right: '-30px',
          bottom: '0px',
          fontSize: '10px',
          color: 'var(--color-text, #333)',
          fontWeight: '500'
        }}>
          {min}{unit}
        </div>
        
        {/* Middle value */}
        <div style={{
          position: 'absolute',
          right: '-35px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '9px',
          color: 'var(--color-text-secondary, #666)'
        }}>
          {((min + max) / 2).toFixed(1)}{unit}
        </div>
      </div>
      
      {/* Fallback indicator */}
      {showFallbackInfo && (
        <div style={{
          fontSize: '8px',
          color: 'var(--color-text-secondary, #666)',
          marginTop: '4px',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px'
        }}>
          <span>⚡ CSS Fallback</span>
          {legendData.metadata?.message && (
            <span title={legendData.metadata.message}>ⓘ</span>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Specialized component for Wave Period with error handling
 */
export const WavePeriodLegendRobust = ({ 
  range = "0,20",
  palette = "plasma",
  ...props 
}) => {
  return (
    <RobustLegend
      variable="tm02"
      range={range}
      unit="s"
      palette={palette}
      {...props}
    />
  );
};

export default RobustLegend;