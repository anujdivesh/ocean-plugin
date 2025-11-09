/**
 * Enhanced Table Cell Component with Accessibility and Performance Optimizations
 */
import React, { useMemo } from 'react';
import ArrowSVG from './ArrowSVG.jsx';
import { getColorFunction, isColorDark } from '../utils/colorSchemes.js';
import { formatSmart } from '../utils/marineDataUtils.js';

const TableCell = React.memo(({ 
  value, 
  config, 
  isDarkMode,
  style: baseStyle,
  className 
}) => {
  const { min = 0, max = 5, type = "bu", decimalPlaces = 0, units = '' } = config || {};
  
  // Memoize color calculation for performance
  const cellStyle = useMemo(() => {
    let style = { ...baseStyle };
    
    if (typeof value === "number" && isFinite(value)) {
      const colorFunction = getColorFunction(type);
      const backgroundColor = colorFunction(value, min, max);
      const textColor = isColorDark(backgroundColor) ? "#eeeeee" : "#000";
      
      style = { 
        ...style, 
        backgroundColor, 
        color: textColor,
        // Add subtle transition for smooth interactions
        transition: 'all 0.2s ease'
      };
    }
    
    return style;
  }, [value, min, max, type, baseStyle]);

  // Simplified tooltip - just value and units
  const tooltipContent = useMemo(() => {
    if (!value || typeof value !== "number" || !isFinite(value)) {
      return "No data available";
    }
    
    return `${formatSmart(value, decimalPlaces)}${units}`;
  }, [value, decimalPlaces, units]);

  // Simplified cell content - no descriptions, just values and arrows
  const cellContent = useMemo(() => {
    const isDirection = type === "dir";
    
    if (!value || typeof value !== "number" || !isFinite(value)) {
      return <span aria-label="No data">—</span>;
    }

    if (isDirection) {
      // Direction cells show only arrow (no text label)
      return (
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            lineHeight: 1
          }}
          role="img"
          aria-label={`Direction: ${value}°`}
        >
          <ArrowSVG 
            angle={value + 180} 
            isDarkMode={isDarkMode} 
            size={20}
          />
        </div>
      );
    }

    // All other cells: just show the formatted number
    return (
      <span style={{ fontWeight: 'bold' }}>
        {formatSmart(value, decimalPlaces)}
      </span>
    );
  }, [value, type, isDarkMode, decimalPlaces]);

  return (
    <td 
      style={cellStyle}
      className={className}
      title={tooltipContent}
      role="gridcell"
      tabIndex={0}
      onKeyDown={(e) => {
        // Basic keyboard navigation support
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          // Could trigger detail view or other action
        }
      }}
    >
      {cellContent}
    </td>
  );
});

TableCell.displayName = 'TableCell';

export default TableCell;