/**
 * Marine Legend Component
 * Displays professional oceanographic legends with proper scientific formatting
 */

/* eslint-disable no-unused-vars */
import React from 'react';
import './WorldClassLegend.css';
import wmsStyleManager, { WMSStylePresets } from '../utils/WMSStyleManager';

const EPSILON = 1e-6;
const selectTickValues = (values, limit = 5) => {
  if (!values || values.length === 0) {
    return [];
  }

  const uniqueSorted = Array.from(new Set(values)).sort((a, b) => a - b);
  if (uniqueSorted.length <= limit) {
    return uniqueSorted;
  }

  const result = [];
  const lastIndex = uniqueSorted.length - 1;
  const segments = Math.max(limit - 1, 1);

  for (let i = 0; i < limit; i++) {
    const targetIndex = Math.round((lastIndex / segments) * i);
    const value = uniqueSorted[targetIndex];
    if (result[result.length - 1] !== value) {
      result.push(value);
    }
  }

  if (result[result.length - 1] !== uniqueSorted[lastIndex]) {
    result[result.length - 1] = uniqueSorted[lastIndex];
  }

  return result;
};
// Helper function for timestamp formatting
const formatTimestamp = (date) => {
  return date.toLocaleString('en-NZ', { 
    timeZone: 'Pacific/Rarotonga',
    hour12: false 
  });
};

const WorldClassLegend = ({ 
  selectedLayer, 
  opacity = 0.8,
  showDescription = true,
  compactMode = false 
}) => {
  const collapsed = false;
  const setCollapsed = () => {}; // No-op function
  const legendSize = 'normal';
  const setLegendSize = () => {}; // No-op function
  const legendBodyId = React.useMemo(() => `legend-body-${Math.random().toString(36).substr(2, 9)}`, []);
  
  if (!selectedLayer) return null;


  const legendClassName = [
    'world-class-legend',
    legendSize === 'compact' ? 'compact' : '',
    legendSize === 'micro' ? 'micro' : '',
    collapsed ? 'collapsed' : ''
  ].filter(Boolean).join(' ');

  const getLegendInfo = (layer) => {
    const variable = layer.value || '';
    
    if (variable.includes('hs')) {
      const activeThreshold = Number.isFinite(layer.activeBeaufortMax) ? layer.activeBeaufortMax : null;
      const colorStops = Object.entries(WMSStylePresets.WAVE_HEIGHT.colorMapping)
        .map(([value, color]) => ({ value: Number(value), color }))
        .sort((a, b) => a.value - b.value);

      const paletteCeiling = colorStops[colorStops.length - 1]?.value ?? 0;
      const maxValue = activeThreshold === null
        ? paletteCeiling
        : Math.min(activeThreshold, paletteCeiling);

      const stopsAtOrBelow = colorStops.filter(stop => stop.value <= maxValue + EPSILON);
      const gradientStopsSource = [...stopsAtOrBelow];
      const lastStop = gradientStopsSource[gradientStopsSource.length - 1];

      if (!lastStop || Math.abs(lastStop.value - maxValue) > EPSILON) {
        const fallbackColor = lastStop ? lastStop.color : (colorStops[0]?.color || '#ffffff');
        gradientStopsSource.push({ value: maxValue, color: fallbackColor });
      }

      if (gradientStopsSource[0] && gradientStopsSource[0].value > 0) {
        gradientStopsSource.unshift({ value: 0, color: gradientStopsSource[0].color });
      }

      const gradientMinValue = gradientStopsSource[0]?.value ?? 0;
      const effectiveRange = Math.max(maxValue - gradientMinValue, EPSILON);
      const normalizeRatio = (value) => {
        if (!Number.isFinite(value)) {
          return 1;
        }
        return Math.max(0, Math.min(1, (value - gradientMinValue) / effectiveRange));
      };
      const gradientStops = wmsStyleManager.getGradientStops(
        WMSStylePresets.WAVE_HEIGHT.colorMapping,
        gradientMinValue,
        maxValue,
        { preserveFullScale: true }
      );

      const ranges = [];
      let previousValue = 0;
      const rangeStops = gradientStopsSource.length > 0 ? gradientStopsSource : colorStops;
      const tickCandidates = new Set([gradientMinValue]);

      rangeStops.forEach(stop => {
        const upperBound = Math.min(stop.value, maxValue);
        if (upperBound <= previousValue + EPSILON) {
          previousValue = upperBound;
          return;
        }

        const label = wmsStyleManager.getWaveHeightLabel(upperBound);
        const description = wmsStyleManager.getWaveHeightDescription(previousValue, upperBound, { 
          dataMax: maxValue,
          location: variable?.includes('cook') ? 'Cook Islands' : 'Global'
        });
        const rangeMidpoint = previousValue + (upperBound - previousValue) / 2;
        const referenceValue = Number.isFinite(rangeMidpoint) ? rangeMidpoint : upperBound;
        const rangeColor = wmsStyleManager.samplePaletteColor(
          WMSStylePresets.WAVE_HEIGHT.colorMapping,
          normalizeRatio(referenceValue)
        );

        ranges.push({
          min: previousValue,
          max: upperBound,
          color: rangeColor,
          label,
          value: wmsStyleManager.formatWaveHeightRange(previousValue, upperBound),
          description,
          tooltip: description,
          isTerminal: Math.abs(upperBound - maxValue) < EPSILON
        });

        tickCandidates.add(upperBound);
        previousValue = upperBound;
      });

      if (ranges.length === 0) {
        const fallbackDescription = wmsStyleManager.getWaveHeightDescription(0, maxValue, { 
          dataMax: maxValue,
          location: variable?.includes('cook') ? 'Cook Islands' : 'Global'
        });
        const fallbackColor = wmsStyleManager.samplePaletteColor(
          WMSStylePresets.WAVE_HEIGHT.colorMapping,
          normalizeRatio(maxValue)
        );
        ranges.push({
          min: 0,
          max: maxValue,
          color: fallbackColor,
          label: wmsStyleManager.getWaveHeightLabel(maxValue),
          value: wmsStyleManager.formatWaveHeightRange(0, maxValue),
          description: fallbackDescription,
          tooltip: fallbackDescription,
          isTerminal: true
        });
        tickCandidates.add(maxValue);
      }

      tickCandidates.add(maxValue);

      if (maxValue >= 14 - EPSILON) {
        const extremeColor = wmsStyleManager.samplePaletteColor(
          WMSStylePresets.WAVE_HEIGHT.colorMapping,
          normalizeRatio(14)
        );
        const description = wmsStyleManager.getWaveHeightDescription(14, Infinity, { 
          dataMax: maxValue,
          location: variable?.includes('cook') ? 'Cook Islands' : 'Global'
        });
        ranges.push({
          min: 14,
          max: Infinity,
          color: extremeColor,
          label: wmsStyleManager.getWaveHeightLabel(Infinity),
          value: wmsStyleManager.formatWaveHeightRange(14, Infinity),
          description,
          tooltip: description,
          isTerminal: true
        });
      }

      const filteredTicks = Array.from(tickCandidates)
        .filter(value => value >= gradientMinValue - EPSILON && value <= maxValue + EPSILON);
      const scaleTicks = selectTickValues(filteredTicks);

      return {
        title: "Significant Wave Height",
        subtitle: activeThreshold === null
          ? "Wave state categories (x-Sst jet palette)"
          : `x-Sst ramp active up to ${wmsStyleManager.formatWaveHeightValue(maxValue)} m`,
        unit: "meters (m)",
        palette: "x-Sst (jet-style SST palette)",
        displayType: 'gradient',
        gradientStops,
        minValue: gradientMinValue,
        minValueLabel: wmsStyleManager.formatWaveHeightValue(gradientMinValue),
        maxValue,
        maxValueLabel: wmsStyleManager.formatWaveHeightValue(maxValue),
        unitSymbol: 'm',
        valueFormatter: (value) => wmsStyleManager.formatWaveHeightValue(value),
        scaleTicks,
        ranges
      };
    }
    
    if (variable.includes('tm02')) {
      // ENHANCED: Dynamic divergent spectral gradient for mean wave period
      const minValue = 0;
      const maxValue = 20;
      const paletteType = layer.style?.includes('div-Spectral') ? 'spectral' : 'ylgnbu';
      
      // Generate dynamic gradient based on actual palette
      const generateSpectralGradient = (steps = 100) => {
        const gradientStops = [];
        for (let i = 0; i < steps; i++) {
          const t = i / (steps - 1);
          let color;
          
          if (paletteType === 'spectral') {
            // Divergent Spectral palette: Red → Orange → Yellow → Green → Cyan → Blue → Purple
            if (t < 0.167) {
              // Red to Orange
              const localT = t / 0.167;
              color = interpolateColor('#9E0142', '#D53E4F', localT);
            } else if (t < 0.333) {
              // Orange to Yellow
              const localT = (t - 0.167) / 0.166;
              color = interpolateColor('#D53E4F', '#FDAE61', localT);
            } else if (t < 0.5) {
              // Yellow to Light Green
              const localT = (t - 0.333) / 0.167;
              color = interpolateColor('#FDAE61', '#E6F598', localT);
            } else if (t < 0.667) {
              // Light Green to Green
              const localT = (t - 0.5) / 0.167;
              color = interpolateColor('#E6F598', '#ABDDA4', localT);
            } else if (t < 0.833) {
              // Green to Cyan
              const localT = (t - 0.667) / 0.166;
              color = interpolateColor('#ABDDA4', '#66C2A5', localT);
            } else {
              // Cyan to Blue to Purple
              const localT = (t - 0.833) / 0.167;
              color = interpolateColor('#66C2A5', '#5E4FA2', localT);
            }
          } else {
            // Fallback to YlGnBu
            color = interpolateYlGnBu(t);
          }
          
          const percent = (t * 100).toFixed(2);
          gradientStops.push(`${color} ${percent}%`);
        }
        return gradientStops;
      };
      
      // Color interpolation helper
      const interpolateColor = (color1, color2, t) => {
        const hex2rgb = (hex) => {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return [r, g, b];
        };
        
        const [r1, g1, b1] = hex2rgb(color1);
        const [r2, g2, b2] = hex2rgb(color2);
        
        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);
        
        return `rgb(${r}, ${g}, ${b})`;
      };
      
      // YlGnBu interpolation fallback
      const interpolateYlGnBu = (t) => {
        const stops = [
          [1, 15, 88],      // Dark blue
          [37, 52, 148],    // Blue  
          [65, 182, 196],   // Cyan
          [199, 233, 180],  // Light green
          [255, 255, 204]   // Light yellow
        ];
        
        const scaledT = t * (stops.length - 1);
        const index = Math.floor(scaledT);
        const localT = scaledT - index;
        
        if (index >= stops.length - 1) {
          const [r, g, b] = stops[stops.length - 1];
          return `rgb(${r}, ${g}, ${b})`;
        }
        
        const [r1, g1, b1] = stops[index];
        const [r2, g2, b2] = stops[index + 1];
        
        const r = Math.round(r1 + (r2 - r1) * localT);
        const g = Math.round(g1 + (g2 - g1) * localT);
        const b = Math.round(b1 + (b2 - b1) * localT);
        
        return `rgb(${r}, ${g}, ${b})`;
      };
      
      const gradientStops = generateSpectralGradient(100);
      const scaleTicks = [0, 5, 10, 15, 20];
      
      // Dynamic ranges based on wave period science
      const ranges = [
        { 
          min: 0, max: 6, 
          color: paletteType === 'spectral' ? '#D53E4F' : '#08306b',
          label: "Wind Waves", 
          value: "0-6s",
          description: "Locally generated wind waves with short periods",
          tooltip: "High frequency waves generated by local wind"
        },
        { 
          min: 6, max: 10, 
          color: paletteType === 'spectral' ? '#FDAE61' : '#2879b9',
          label: "Young Swell", 
          value: "6-10s",
          description: "Developing swell with moderate periods",
          tooltip: "Transitional waves between wind sea and mature swell"
        },
        { 
          min: 10, max: 14, 
          color: paletteType === 'spectral' ? '#ABDDA4' : '#41b6c4',
          label: "Mature Swell", 
          value: "10-14s",
          description: "Well-developed swell waves",
          tooltip: "Organized wave systems with good energy propagation"
        },
        { 
          min: 14, max: 18, 
          color: paletteType === 'spectral' ? '#66C2A5' : '#7fcdbb',
          label: "Long Swell", 
          value: "14-18s",
          description: "Long-period swell from distant sources",
          tooltip: "Deep water waves with excellent propagation"
        },
        { 
          min: 18, max: 20, 
          color: paletteType === 'spectral' ? '#5E4FA2' : '#fefebd',
          label: "Ultra-Long Swell", 
          value: "18-20s",
          description: "Extreme long-period waves",
          tooltip: "Exceptional wave periods from major storm systems"
        }
      ];
      
      return {
        title: "Mean Wave Period",
        subtitle: paletteType === 'spectral' 
          ? "ENHANCED Divergent Spectral - Maximum Visual Distinction"
          : "Sea State Continuum (YlGnBu)",
        unit: "seconds (s)",
        palette: paletteType === 'spectral' 
          ? "Divergent Spectral (div-Spectral)"
          : "Sequential YlGnBu",
        displayType: 'gradient',
        gradientStops,
        minValue,
        minValueLabel: `${minValue}s`,
        maxValue,
        maxValueLabel: `${maxValue}s`,
        unitSymbol: 's',
        valueFormatter: (value) => `${value.toFixed(1)}s`,
        scaleTicks,
        ranges
      };
    }
    
    if (variable.includes('tpeak')) {
      // ENHANCED: Dynamic plasma gradient for peak wave period
      const minValue = 9;  // Optimized range from actual data
      const maxValue = 14;
      
      // Color interpolation helper for plasma
      const interpolateColor = (color1, color2, t) => {
        const hex2rgb = (hex) => {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return [r, g, b];
        };
        
        const [r1, g1, b1] = hex2rgb(color1);
        const [r2, g2, b2] = hex2rgb(color2);
        
        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);
        
        return `rgb(${r}, ${g}, ${b})`;
      };

      // Generate dynamic plasma gradient
      const generatePlasmaGradient = (steps = 100) => {
        const gradientStops = [];
        for (let i = 0; i < steps; i++) {
          const t = i / (steps - 1);
          
          // Plasma color palette interpolation
          let color;
          if (t < 0.2) {
            color = interpolateColor('#0D0887', '#46039F', t / 0.2);
          } else if (t < 0.4) {
            color = interpolateColor('#46039F', '#7201A8', (t - 0.2) / 0.2);
          } else if (t < 0.6) {
            color = interpolateColor('#7201A8', '#CC4778', (t - 0.4) / 0.2);
          } else if (t < 0.8) {
            color = interpolateColor('#CC4778', '#F89540', (t - 0.6) / 0.2);
          } else {
            color = interpolateColor('#F89540', '#F0F921', (t - 0.8) / 0.2);
          }
          
          const percent = (t * 100).toFixed(2);
          gradientStops.push(`${color} ${percent}%`);
        }
        return gradientStops;
      };
      
      const gradientStops = generatePlasmaGradient(100);
      const scaleTicks = [9, 10, 11, 12, 13, 14];
      
      // Dynamic ranges based on peak period characteristics
      const ranges = [
        { 
          min: 9, max: 10, 
          color: '#46039F',
          label: "Short Peak", 
          value: "9-10s",
          description: "Short-period spectral peaks",
          tooltip: "Dominant wave energy at short periods"
        },
        { 
          min: 10, max: 11.5, 
          color: '#7201A8',
          label: "Moderate Peak", 
          value: "10-11.5s",
          description: "Moderate-period spectral concentration",
          tooltip: "Balanced energy distribution"
        },
        { 
          min: 11.5, max: 13, 
          color: '#CC4778',
          label: "Long Peak", 
          value: "11.5-13s",
          description: "Long-period dominant waves",
          tooltip: "Well-organized swell systems"
        },
        { 
          min: 13, max: 14, 
          color: '#F0F921',
          label: "Extended Peak", 
          value: "13-14s",
          description: "Extended long-period peaks",
          tooltip: "Exceptional spectral peak periods"
        }
      ];
      
      return {
        title: "Peak Wave Period",
        subtitle: "Spectral Peak Analysis (Enhanced Plasma)",
        unit: "seconds (s)",
        palette: "Plasma (High Contrast, Optimized 9-14s)",
        displayType: 'gradient',
        gradientStops,
        minValue,
        minValueLabel: `${minValue}s`,
        maxValue,
        maxValueLabel: `${maxValue}s`,
        unitSymbol: 's',
        valueFormatter: (value) => `${value.toFixed(1)}s`,
        scaleTicks,
        ranges
      };
    }

    if (variable.includes('inun')) {
      const minValue = 0;
      const maxValue = 1.6;
      const gradientPalette = [
        '#f7fbff',
        '#deebf7',
        '#c6dbef',
        '#9ecae1',
        '#6baed6',
        '#3182bd',
        '#08519c'
      ];

      const gradientStops = gradientPalette.map((color, index) => {
        const percent = (index / (gradientPalette.length - 1)) * 100;
        return `${color} ${percent.toFixed(2)}%`;
      });

      const scaleTicks = [0, 0.25, 0.5, 1.0, 1.5];
      const rangeDefinitions = [
        {
          min: -0.05,
          max: 0.0,
          color: '#f7fbff',
          label: 'Dry Ground',
          value: '≤ 0.0 m',
          description: 'No surface water present',
          tooltip: 'Ground level or negative anomaly'
        },
        {
          min: 0.0,
          max: 0.15,
          color: '#deebf7',
          label: 'Minor Ponding',
          value: '0 – 0.15 m',
          description: 'Shallow nuisance water on low-lying surfaces',
          tooltip: 'Localized ponding in depressions and drains'
        },
        {
          min: 0.15,
          max: 0.4,
          color: '#c6dbef',
          label: 'Shallow Flooding',
          value: '0.15 – 0.40 m',
          description: 'Curb-deep flooding across roads and properties',
          tooltip: 'Wading depth water covering roads/vegetation'
        },
        {
          min: 0.4,
          max: 0.8,
          color: '#6baed6',
          label: 'Significant Flooding',
          value: '0.40 – 0.80 m',
          description: 'Knee-to-waist depth inundation impacting structures',
          tooltip: 'Flowing water entering ground floors and garages'
        },
        {
          min: 0.8,
          max: 1.2,
          color: '#3182bd',
          label: 'Deep Flooding',
          value: '0.80 – 1.20 m',
          description: 'Substantial inundation with unsafe currents',
          tooltip: 'Rapid flow and debris hazards likely'
        },
        {
          min: 1.2,
          max: maxValue,
          color: '#08519c',
          label: 'Extreme Flooding',
          value: '≥ 1.20 m',
          description: 'Life-threatening inundation requiring evacuation',
          tooltip: 'High-depth flooding possibly exceeding 1.6 m'
        }
      ];

      return {
        title: 'Rarotonga Inundation Depth',
        subtitle: 'Modelled water depth above ground level',
        unit: 'meters (m)',
        palette: 'Sequential Blues (Flood Depth)',
        displayType: 'gradient',
        gradientStops,
        minValue,
        minValueLabel: `${minValue.toFixed(2)} m`,
        maxValue,
        maxValueLabel: `${maxValue.toFixed(2)} m`,
        unitSymbol: 'm',
        valueFormatter: (value) => `${value.toFixed(2)}`,
        scaleTicks,
        ranges: rangeDefinitions
      };
    }
    
    if (variable.includes('dirm')) {
      const legend = {
        title: "Mean Wave Direction",
        subtitle: "Vector Arrows",
        unit: "degrees (°)",
        ranges: [
          { value: "N", label: "North", arrow: "↑" },
          { value: "NE", label: "Northeast", arrow: "↗" },
          { value: "E", label: "East", arrow: "→" },
          { value: "SE", label: "Southeast", arrow: "↘" },
          { value: "S", label: "South", arrow: "↓" },
          { value: "SW", label: "Southwest", arrow: "↙" },
          { value: "W", label: "West", arrow: "←" },
          { value: "NW", label: "Northwest", arrow: "↖" }
        ],
        palette: "Vector Arrows (Black)"
      };
      return legend;
    }
    
    return null;
  };

  const legendInfo = getLegendInfo(selectedLayer);
  if (!legendInfo) return null;

  const formatLegendValue = legendInfo.valueFormatter || ((value) => {
    if (!Number.isFinite(value)) {
      return '';
    }
    return value.toString();
  });
  const unitSuffix = legendInfo.unitSymbol ? ` ${legendInfo.unitSymbol}` : '';
  const fallbackScaleTicks = legendInfo.minValue != null && legendInfo.maxValue != null
    ? [legendInfo.minValue, legendInfo.maxValue]
    : [];
  const gradientScaleTicks = legendInfo.scaleTicks && legendInfo.scaleTicks.length > 0
    ? legendInfo.scaleTicks
    : fallbackScaleTicks;
  const gradientAriaLabel = legendInfo.displayType === 'gradient'
    ? (gradientScaleTicks.length >= 2
      ? `Color ramp representing ${legendInfo.title} from ${formatLegendValue(gradientScaleTicks[0])}${unitSuffix} to ${formatLegendValue(gradientScaleTicks[gradientScaleTicks.length - 1])}${unitSuffix}`
      : `Color ramp representing ${legendInfo.title}`)
    : undefined;

  return (
    <div className={legendClassName}>
      <div className="legend-header">
        <div className="legend-header__top">
          <h3 className="legend-title">{legendInfo.title}</h3>
          <div className="legend-controls">
            <button
              type="button"
              className="legend-size-toggle"
              onClick={() => {
                const sizes = ['normal', 'compact', 'micro'];
                const currentIndex = sizes.indexOf(legendSize);
                const nextIndex = (currentIndex + 1) % sizes.length;
                setLegendSize(sizes[nextIndex]);
              }}
              title={`Current size: ${legendSize}. Click to cycle through sizes.`}
            >
              📏 {legendSize === 'normal' ? 'L' : legendSize === 'compact' ? 'M' : 'S'}
            </button>
            <button
              type="button"
              className="legend-toggle"
              onClick={() => setCollapsed(prev => !prev)}
              aria-expanded={!collapsed}
              aria-controls={legendBodyId}
              title={collapsed ? 'Expand legend' : 'Collapse legend'}
            >
              {collapsed ? 'Show' : 'Hide'}
            </button>
          </div>
        </div>
        {!collapsed && (
          <>
            <p className="legend-subtitle">{legendInfo.subtitle}</p>
            <div className="legend-meta">
              <span className="legend-unit">Unit: {legendInfo.unit}</span>
              <span className="legend-palette">Palette: {legendInfo.palette}</span>
              <span className="legend-opacity">Opacity: {Math.round(opacity * 100)}%</span>
            </div>
          </>
        )}
      </div>

      {!collapsed && (
        <div id={legendBodyId} className="legend-content">
          {legendInfo.displayType === 'gradient' ? (
          <div className="legend-gradient-wrapper">
            {legendInfo.subtitle && (
              <div className="legend-gradient__title">{legendInfo.subtitle}</div>
            )}
            <div
              className="legend-gradient"
              role="img"
              aria-label={gradientAriaLabel}
            >
              <div
                className="legend-gradient__bar"
                style={{ backgroundImage: `linear-gradient(to top, ${legendInfo.gradientStops.join(', ')})` }}
              />
              {gradientScaleTicks.length > 0 && (
                <div className="legend-gradient__ticks" aria-hidden="true">
                  {gradientScaleTicks.map((tickValue, index) => {
                    const minVal = gradientScaleTicks[0];
                    const maxVal = gradientScaleTicks[gradientScaleTicks.length - 1];
                    let position;
                    
                    if (maxVal !== minVal && Number.isFinite(tickValue) && Number.isFinite(minVal) && Number.isFinite(maxVal)) {
                      position = ((tickValue - minVal) / (maxVal - minVal)) * 100;
                    } else if (gradientScaleTicks.length > 1) {
                      position = index * (100 / (gradientScaleTicks.length - 1));
                    } else {
                      position = 50;
                    }
                    
                    position = Math.max(0, Math.min(100, position));
                    
                    return (
                      <div
                        key={`legend-tick-mark-${index}-${tickValue}`}
                        className="legend-gradient__tick-mark"
                        style={{ 
                          position: 'absolute',
                          top: `${100 - position}%`,
                          transform: 'translateY(-50%)'
                        }}
                      />
                    );
                  })}
                </div>
              )}
              {gradientScaleTicks.length > 0 && (
                <div className="legend-gradient__scale" aria-hidden="true">
                  {gradientScaleTicks.map((tickValue, index) => {
                    const formattedTick = formatLegendValue(tickValue);
                    if (formattedTick === '') {
                      return null;
                    }
                    
                    // Calculate position based on value for non-uniform intervals
                    const minVal = gradientScaleTicks[0];
                    const maxVal = gradientScaleTicks[gradientScaleTicks.length - 1];
                    let position;
                    
                    if (maxVal !== minVal && Number.isFinite(tickValue) && Number.isFinite(minVal) && Number.isFinite(maxVal)) {
                      position = ((tickValue - minVal) / (maxVal - minVal)) * 100;
                    } else if (gradientScaleTicks.length > 1) {
                      position = index * (100 / (gradientScaleTicks.length - 1));
                    } else {
                      position = 50; // Center single tick
                    }
                    
                    // Clamp position to prevent overflow
                    position = Math.max(0, Math.min(100, position));
                    
                    return (
                      <span 
                        key={`legend-gradient-tick-${index}-${tickValue}`}
                        className="legend-gradient__tick"
                        style={{ 
                          position: 'absolute',
                          top: `${100 - position}%`,
                          transform: 'translateY(-50%)',
                          left: '100%',
                          marginLeft: '0.5rem'
                        }}
                        title={`${formattedTick}${unitSuffix}`}
                      >
                        {formattedTick}
                        {unitSuffix}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Legend ranges hidden - showing only gradient bar with numbers */}
            <div className="legend-ranges" style={{ display: 'none' }}>
              {legendInfo.ranges.map((range, index) => (
                <div
                  key={index}
                  className="legend-range"
                  title={range.tooltip || range.description || range.label}
                >
                  <span
                    className="legend-range__color"
                    style={{ backgroundColor: range.color }}
                  />
                  <div className="legend-range__text">
                    <span className="legend-range__value">{range.value}</span>
                    <span className="legend-range__label">{range.label}</span>
                    {showDescription && range.description && (
                      <span className="legend-range__description">{range.description}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          ) : (
            // Discrete legend items hidden - showing only gradient bar with numbers
            <div style={{ display: 'none' }}>
              {legendInfo.ranges.map((range, index) => (
                <div
                  key={index}
                  className={`legend-item${range.isActive === false ? ' legend-item--inactive' : ''}`}
                  title={range.description || range.label}
                >
                  <div 
                    className="legend-color-box"
                    style={{ backgroundColor: range.color }}
                  >
                    {range.arrow && <span className="legend-arrow">{range.arrow}</span>}
                  </div>
                  <div className="legend-text">
                    <span className="legend-value">{range.value}</span>
                    <span className="legend-label">{range.label}</span>
                    {range.description && showDescription && (
                      <span className="legend-description">{range.description}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!collapsed && (
        <div className="legend-footer">
          <p className="legend-source">
            🌊 Cook Islands Marine Forecast • 
            📊 World Meteorological Organization Standards • 
            🎨 Perceptually Uniform Color Science
          </p>
          <p className="legend-timestamp">
            Updated: {formatTimestamp(new Date())} CKIT
          </p>
        </div>
      )}
    </div>
  );
};

export default WorldClassLegend;
/* eslint-enable no-unused-vars */
