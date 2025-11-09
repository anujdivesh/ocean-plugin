/**
 * Accessible Arrow SVG Component for Direction Display
 */
import React from 'react';

const ArrowSVG = ({ 
  angle, 
  isDarkMode, 
  size = 22, 
  compassDirection = '',
  ariaLabel 
}) => {
  const fillColor = isDarkMode ? "#f1f5f9" : "#000";
  const strokeColor = isDarkMode ? "#64748b" : "#666";
  
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox={`0 0 ${size} ${size}`}
      style={{
        display: 'inline-block',
        transform: `rotate(${angle}deg)`,
        filter: isDarkMode ? 'invert(1)' : 'none'
      }}
      role="img"
      aria-label={ariaLabel || `Direction: ${angle}° ${compassDirection}`}
    >
      <polygon
        points={`${size/2},2 ${size*0.73},${size*0.82} ${size/2},${size*0.64} ${size*0.27},${size*0.82}`}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="1"
      />
    </svg>
  );
};

export default React.memo(ArrowSVG);