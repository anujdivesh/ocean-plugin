import { useMemo } from 'react';
import './ForecastApp.css';
import '../styles/MapMarker.css';
import useMapInteraction from '../hooks/useMapInteraction';
import { UI_CONFIG } from '../config/UIConfig';
import { MARINE_CONFIG } from '../config/marineVariables';
import CompassRose from './CompassRose';
import { 
  ControlGroup, 
  VariableButtons, 
  TimeControl, 
  OpacityControl, 
  DataInfo, 
  //StatusBar 
} from './shared/UIComponents';
import wmsStyleManager from '../utils/WMSStyleManager';
import { Waves, Wind, Navigation, Activity, Info, Settings, Timer, Triangle,  BadgeInfo , CloudRain, FastForward} from 'lucide-react';
import FancyIcon from './FancyIcon';
import '../styles/fancyIcons.css';

const EPSILON = 1e-6;

// Rainbow wave height color palette (Blue → Cyan → Green → Yellow → Orange → Red)
const WAVE_HEIGHT_GRADIENT_RGB = [
  [0, 0, 143],      // Dark blue (0.0m)
  [0, 0, 255],      // Blue
  [0, 255, 255],    // Cyan (1.0m)
  [0, 255, 0],      // Green (2.0m)
  [255, 255, 0],    // Yellow (3.0m)
  [255, 127, 0],    // Orange
  [255, 0, 0]       // Red (4.0m+)
];

// Helper to interpolate wave height colors
const interpolateWaveHeight = (normalized) => {
  const t = Math.max(0, Math.min(1, normalized));
  const maxIndex = WAVE_HEIGHT_GRADIENT_RGB.length - 1;
  const index = t * maxIndex;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.min(Math.ceil(index), maxIndex);
  const fraction = index - lowerIndex;
  
  const lower = WAVE_HEIGHT_GRADIENT_RGB[lowerIndex];
  const upper = WAVE_HEIGHT_GRADIENT_RGB[upperIndex];
  
  const r = Math.round(lower[0] + (upper[0] - lower[0]) * fraction);
  const g = Math.round(lower[1] + (upper[1] - lower[1]) * fraction);
  const b = Math.round(lower[2] + (upper[2] - lower[2]) * fraction);
  
  return `rgb(${r}, ${g}, ${b})`;
};


const MEAN_PERIOD_METADATA = [
  { min: 0, max: 6, label: 'Wind Waves', value: '0–6 s', description: 'Locally generated wind waves with short periods', color: '#D53E4F' },
  { min: 6, max: 10, label: 'Young Swell', value: '6–10 s', description: 'Developing swell with moderate periods', color: '#FDAE61' },
  { min: 10, max: 14, label: 'Mature Swell', value: '10–14 s', description: 'Well-developed swell waves', color: '#ABDDA4' },
  { min: 14, max: 18, label: 'Long Swell', value: '14–18 s', description: 'Long-period swell from distant sources', color: '#66C2A5' },
  { min: 18, max: 20, label: 'Ultra-Long Swell', value: '18–20 s', description: 'Extreme long-period waves', color: '#5E4FA2' }
];

const PEAK_PERIOD_METADATA = [
  { min: 9, max: 10, label: 'Short Peak', value: '9–10 s', description: 'Short-period spectral peaks', color: '#46039F' },
  { min: 10, max: 11.5, label: 'Moderate Peak', value: '10–11.5 s', description: 'Moderate-period spectral concentration', color: '#7201A8' },
  { min: 11.5, max: 13, label: 'Long Peak', value: '11.5–13 s', description: 'Long-period dominant waves', color: '#CC4778' },
  { min: 13, max: 14, label: 'Extended Peak', value: '13–14 s', description: 'Extended long-period peaks', color: '#F0F921' }
];

// Dynamic inundation metadata generator - adapts to actual data range
const generateInundationMetadata = (maxValue) => {
  const categories = [
    { threshold: 0, label: 'Dry Ground', description: 'No surface water present', color: '#f7fbff' },
    { threshold: 0.15, label: 'Minor Ponding', description: 'Shallow nuisance water on low-lying surfaces', color: '#deebf7' },
    { threshold: 0.4, label: 'Shallow Flooding', description: 'Curb-deep flooding across roads and properties', color: '#c6dbef' },
    { threshold: 0.8, label: 'Significant Flooding', description: 'Knee-to-waist depth inundation impacting structures', color: '#6baed6' },
    { threshold: 1.2, label: 'Deep Flooding', description: 'Substantial inundation with unsafe currents', color: '#3182bd' },
    { threshold: 1.6, label: 'Extreme Flooding', description: 'Life-threatening inundation requiring evacuation', color: '#08519c' }
  ];
  
  const metadata = [];
  let prevThreshold = -0.05; // Start from dry ground
  
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    const nextThreshold = i < categories.length - 1 ? categories[i + 1].threshold : maxValue;
    
    // Only add category if it's within the data range
    if (prevThreshold < maxValue) {
      const max = Math.min(nextThreshold, maxValue);
      const valueStr = i === 0 
        ? `≤ ${cat.threshold.toFixed(2)} m`
        : max >= maxValue && i === categories.length - 1
        ? `≥ ${cat.threshold.toFixed(2)} m`
        : `${cat.threshold.toFixed(2)}–${max.toFixed(2)} m`;
      
      metadata.push({
        min: prevThreshold,
        max: max,
        label: cat.label,
        value: valueStr,
        description: cat.description,
        color: cat.color
      });
      
      prevThreshold = nextThreshold;
      
      // Stop if we've reached the max value
      if (max >= maxValue) break;
    }
  }
  
  return metadata;
};

const DIRECTION_METADATA = [
  { value: 'N (↑)', label: 'North', description: 'Flowing toward the north', color: 'rgba(255, 255, 255, 0.3)' },
  { value: 'NE (↗)', label: 'Northeast', description: 'Flowing toward the northeast', color: 'rgba(255, 255, 255, 0.3)' },
  { value: 'E (→)', label: 'East', description: 'Flowing toward the east', color: 'rgba(255, 255, 255, 0.3)' },
  { value: 'SE (↘)', label: 'Southeast', description: 'Flowing toward the southeast', color: 'rgba(255, 255, 255, 0.3)' },
  { value: 'S (↓)', label: 'South', description: 'Flowing toward the south', color: 'rgba(255, 255, 255, 0.3)' },
  { value: 'SW (↙)', label: 'Southwest', description: 'Flowing toward the southwest', color: 'rgba(255, 255, 255, 0.3)' },
  { value: 'W (←)', label: 'West', description: 'Flowing toward the west', color: 'rgba(255, 255, 255, 0.3)' },
  { value: 'NW (↖)', label: 'Northwest', description: 'Flowing toward the northwest', color: 'rgba(255, 255, 255, 0.3)' }
];

const ForecastApp = ({ 
  WAVE_FORECAST_LAYERS,
  ALL_LAYERS,
  selectedWaveForecast,
  setSelectedWaveForecast,
  opacity,
  setOpacity,
  sliderIndex,
  setSliderIndex,
  totalSteps,
  isPlaying,
  setIsPlaying,
  currentSliderDate,
  capTime,
  setActiveLayers,
  mapRef,
  mapInstance,
  setBottomCanvasData,
  setShowBottomCanvas,
  minIndex
}) => {
  // Dynamic marine legend configuration - RESPONDS TO ACTUAL DATA
  const getLegendConfig = (variable, layerData) => {
    const varLower = variable.toLowerCase();
    
    // Parse dynamic ranges from layer data
    const colorRange = layerData ? parseColorRange(layerData.colorscalerange) : null;
    const dynamicMax = layerData?.activeBeaufortMax;
    
    if (varLower.includes('hs')) {
      // DYNAMIC DATA RANGE - Updates with actual wave height data (Rainbow palette)
      const minVal = colorRange?.min ?? 0;
      const maxVal = Number.isFinite(dynamicMax) ? dynamicMax : (colorRange?.max ?? 4);
      const tickCount = 5;
      const ticks = Array.from({length: tickCount}, (_, i) => 
        Number((minVal + (maxVal - minVal) * i / (tickCount - 1)).toFixed(1))
      );
      
      // Generate smooth rainbow gradient using interpolation
      const valueSpan = Math.max(maxVal - minVal, 0);
      const gradientStopCount = Math.max(2, Math.min(128, Math.ceil(Math.max(valueSpan, 1) * 32)));
      
      const waveHeightGradient = [];
      for (let i = 0; i < gradientStopCount; i++) {
        const normalized = i / (gradientStopCount - 1);
        waveHeightGradient.push(interpolateWaveHeight(normalized));
      }
      
      const denominator = Math.max(waveHeightGradient.length - 1, 1);
      const gradientStops = waveHeightGradient.map((color, index) => {
        const percent = (index / denominator) * 100;
        return `${color} ${percent.toFixed(2)}%`;
      });
      
      const gradient = `linear-gradient(to top, ${gradientStops.join(', ')})`;
      
      return {
        gradient,
        min: minVal,
        max: maxVal,
        units: 'm',
        ticks: ticks
      };
    }
    
    if (varLower.includes('tm02')) {
      // DYNAMIC DATA RANGE - Updates with actual mean period data
      const minVal = colorRange?.min ?? 0;
      const maxVal = colorRange?.max ?? 20;
      const ticks = [minVal, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal].map(v => Number(v.toFixed(1)));
      
      return {
        gradient: 'linear-gradient(to top, rgb(0, 0, 255), rgb(0, 255, 255), rgb(0, 255, 0), rgb(255, 255, 0), rgb(255, 0, 0))',
        min: minVal,
        max: maxVal,
        units: 's',
        ticks: ticks
      };
    }
    
    if (varLower.includes('tpeak')) {
      // DYNAMIC DATA RANGE - Updates with actual peak period data
      const minVal = colorRange?.min ?? 10.0;
      const maxVal = colorRange?.max ?? 13.7;
      const range = maxVal - minVal;
      const ticks = Array.from({length: 5}, (_, i) => 
        Number((minVal + range * i / 4).toFixed(1))
      );
      
      return {
        gradient: 'linear-gradient(to top, rgb(0, 0, 4), rgb(40, 11, 84), rgb(101, 21, 110), rgb(159, 42, 99), rgb(212, 72, 66), rgb(245, 125, 32), rgb(252, 194, 84), rgb(252, 253, 191))',
        min: minVal,
        max: maxVal,
        units: 's',
        ticks: ticks
      };
    }
    
    if (varLower.includes('inun')) {
      // TRULY DYNAMIC DATA RANGE - Updates with actual inundation data (Rainbow palette like wave height)
      if (!colorRange) {
        console.warn('No color range data available for inundation layer, using default');
        // Use default range to allow rendering while data loads
        const minVal = 0;
        const maxVal = 9.0;
        const ticks = [0, 2.25, 4.5, 6.75, 9];
        
        // Generate smooth rainbow gradient using interpolation (same as wave height)
        const valueSpan = Math.max(maxVal - minVal, 0);
        const gradientStopCount = Math.max(2, Math.min(128, Math.ceil(Math.max(valueSpan, 1) * 32)));
        
        const inundationGradient = [];
        for (let i = 0; i < gradientStopCount; i++) {
          const normalized = i / (gradientStopCount - 1);
          inundationGradient.push(interpolateWaveHeight(normalized));
        }
        
        const denominator = Math.max(inundationGradient.length - 1, 1);
        const gradientStops = inundationGradient.map((color, index) => {
          const percent = (index / denominator) * 100;
          return `${color} ${percent.toFixed(2)}%`;
        });
        
        const gradient = `linear-gradient(to top, ${gradientStops.join(', ')})`;
        
        return {
          gradient,
          min: minVal,
          max: maxVal,
          units: 'm',
          ticks: ticks
        };
      }
      const minVal = colorRange.min;
      const maxVal = colorRange.max;
      const ticks = [0, 2.25, 4.5, 6.75, 9];
      
      // Generate smooth rainbow gradient using interpolation (same as wave height)
      const valueSpan = Math.max(maxVal - minVal, 0);
      const gradientStopCount = Math.max(2, Math.min(128, Math.ceil(Math.max(valueSpan, 1) * 32)));
      
      const inundationGradient = [];
      for (let i = 0; i < gradientStopCount; i++) {
        const normalized = i / (gradientStopCount - 1);
        inundationGradient.push(interpolateWaveHeight(normalized));
      }
      
      const denominator = Math.max(inundationGradient.length - 1, 1);
      const gradientStops = inundationGradient.map((color, index) => {
        const percent = (index / denominator) * 100;
        return `${color} ${percent.toFixed(2)}%`;
      });
      
      const gradient = `linear-gradient(to top, ${gradientStops.join(', ')})`;
      
      return {
        gradient,
        min: minVal,
        max: maxVal,
        units: 'm',
        ticks: ticks
      };
    }
    
    if (varLower.includes('dirm')) {
      // Wave direction - Static compass (doesn't change with data)
      return {
        gradient: 'conic-gradient(from 0deg, transparent)',
        min: 0,
        max: 360,
        units: '°',
        ticks: [0, 90, 180, 270, 360]
      };
    }
    
    return null;
  };

  const selectedLegendLayer = useMemo(() => {
    if (!selectedWaveForecast) return null;

    const findLayerByValue = (layers, value) => {
      if (!Array.isArray(layers)) return null;
      for (const layer of layers) {
        if (layer?.value === value) {
          return layer;
        }
        if (layer?.composite && Array.isArray(layer.layers)) {
          const match = findLayerByValue(layer.layers, value);
          if (match) return match;
        }
      }
      return null;
    };

    const dynamicMatch = findLayerByValue(WAVE_FORECAST_LAYERS, selectedWaveForecast);
    const baseLayer = dynamicMatch || findLayerByValue(ALL_LAYERS, selectedWaveForecast);
    if (!baseLayer) {
      return null;
    }

    if (!baseLayer.composite) {
      return baseLayer;
    }

    const PRIORITY_VARIABLES = ['hs', 'wave_height', 'tm02', 'tpeak', 'period', 'inun', 'flood'];
    const { layers } = baseLayer;
    if (!Array.isArray(layers)) {
      return baseLayer;
    }

    const directMatch = layers.find(subLayer => subLayer?.value === selectedWaveForecast);
    if (directMatch) {
      return directMatch;
    }

    for (const key of PRIORITY_VARIABLES) {
      const match = layers.find(subLayer => subLayer?.value?.toLowerCase().includes(key));
      if (match) {
        return match;
      }
    }

    return layers[0] || baseLayer;
  }, [ALL_LAYERS, WAVE_FORECAST_LAYERS, selectedWaveForecast]);

  const parseColorRange = (rangeString) => {
    if (!rangeString) return null;
    const parts = rangeString.split(',');
    if (parts.length !== 2) return null;
    const min = Number(parts[0]);
    const max = Number(parts[1]);
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return null;
    }
    return { min, max };
  };

  // eslint-disable-next-line no-unused-vars
  const metadataRanges = useMemo(() => {
    if (!selectedLegendLayer) {
      return [];
    }

    const variable = selectedLegendLayer.value?.toLowerCase() || '';

    if (variable.includes('hs') || variable.includes('wave_height')) {
      // Parse actual WMS data range
      const colorRange = parseColorRange(selectedLegendLayer.colorscalerange);
      const dataMin = colorRange?.min ?? 0.17; // Niue minimum
      const dataMax = colorRange?.max ?? 1.66; // Niue maximum
      
      const effectiveMax = Number.isFinite(selectedLegendLayer.activeBeaufortMax)
        ? selectedLegendLayer.activeBeaufortMax
        : dataMax;
      
      // Generate actual Viridis colors based on real data range
      const generateViridisColor = (value, min, max) => {
        const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
        // Viridis color interpolation (accurate to WMS server)
        if (normalized <= 0.25) {
          const t = normalized / 0.25;
          return `rgb(${Math.round(68 + (59-68)*t)}, ${Math.round(1 + (82-1)*t)}, ${Math.round(84 + (139-84)*t)})`;
        } else if (normalized <= 0.5) {
          const t = (normalized - 0.25) / 0.25;
          return `rgb(${Math.round(59 + (31-59)*t)}, ${Math.round(82 + (158-82)*t)}, ${Math.round(139 + (137-139)*t)})`;
        } else if (normalized <= 0.75) {
          const t = (normalized - 0.5) / 0.25;
          return `rgb(${Math.round(31 + (176-31)*t)}, ${Math.round(158 + (202-158)*t)}, ${Math.round(137 + (99-137)*t)})`;
        } else {
          const t = (normalized - 0.75) / 0.25;
          return `rgb(${Math.round(176 + (253-176)*t)}, ${Math.round(202 + (231-202)*t)}, ${Math.round(99 + (37-99)*t)})`;
        }
      };
      
      // Create appropriate number of color stops based on data range
      const numStops = Math.max(2, Math.min(5, Math.ceil(effectiveMax * 2))); // Adaptive number of stops
      const colorStops = [];
      
      for (let i = 0; i < numStops; i++) {
        const value = dataMin + (effectiveMax - dataMin) * (i / (numStops - 1));
        colorStops.push({
          value: value,
          color: generateViridisColor(value, dataMin, effectiveMax)
        });
      }

      const ranges = [];
      let previous = 0;

      for (const stop of colorStops) {
        if (!Number.isFinite(stop.value)) {
          continue;
        }
        const upper = Math.min(stop.value, effectiveMax);
        if (upper <= previous + EPSILON) {
          continue;
        }

        ranges.push({
          min: previous,
          max: upper,
          label: wmsStyleManager.getWaveHeightLabel(upper),
          value: `${wmsStyleManager.formatWaveHeightValue(previous)}–${wmsStyleManager.formatWaveHeightValue(upper)} m`,
          description: wmsStyleManager.getWaveHeightDescription(previous, upper, { 
            dataMax: effectiveMax,
            location: 'Niue'
          }),
          color: stop.color
        });

        previous = upper;

        if (stop.value >= effectiveMax - EPSILON) {
          break;
        }
      }

      if (effectiveMax > previous + EPSILON) {
        const lastColor = colorStops[colorStops.length - 1]?.color || '#ffffff';
        ranges.push({
          min: previous,
          max: effectiveMax,
          label: wmsStyleManager.getWaveHeightLabel(effectiveMax),
          value: `${wmsStyleManager.formatWaveHeightValue(previous)}–${wmsStyleManager.formatWaveHeightValue(effectiveMax)} m`,
          description: wmsStyleManager.getWaveHeightDescription(previous, effectiveMax, { 
            dataMax: effectiveMax,
            location: 'Niue'
          }),
          color: lastColor
        });
      }

      return ranges;
    }

    if (variable.includes('tm02')) {
      return MEAN_PERIOD_METADATA.map(range => ({ ...range }));
    }

    if (variable.includes('tpeak')) {
      return PEAK_PERIOD_METADATA.map(range => ({ ...range }));
    }

    if (variable.includes('inun') || variable.includes('flood')) {
      // Parse actual WMS data range for dynamic metadata
      const colorRange = parseColorRange(selectedLegendLayer.colorscalerange);
      const maxVal = colorRange?.max ?? 3.0; // Default to 3m if no data available
      return generateInundationMetadata(maxVal);
    }

    if (variable.includes('dirm') || variable.includes('direction')) {
      return DIRECTION_METADATA.map(range => ({ ...range }));
    }

    return [];
  }, [selectedLegendLayer]);

  // Function to get fancy icons for different variable types
  const getVariableIcon = (layer) => {
    const value = layer.value?.toLowerCase() || '';
    const label = layer.label?.toLowerCase() || '';
    
    if (value.includes('hs') || label.includes('wave height')) {
      return <FancyIcon icon={Waves} animationType="wave" size={14} color="#00bcd4" style={{ marginRight: '8px' }} />;
    }
    if (value.includes('tm02') || (label.includes('mean') && label.includes('period'))) {
      return <FancyIcon icon={Timer} animationType="pulse" size={14} color="#ff9800" style={{ marginRight: '8px' }} />;
    }
    if (value.includes('tpeak') || (label.includes('peak') && label.includes('period'))) {
      return <FancyIcon icon={Triangle} animationType="bounce" size={14} color="#4caf50" style={{ marginRight: '8px' }} />;
    }
    if (value.includes('dirm') || label.includes('direction')) {
      return <FancyIcon icon={Navigation} animationType="spin" size={14} color="#9c27b0" style={{ marginRight: '8px' }} />;
    }
    if (value.includes('inun') || label.includes('inundation')) {
      return <FancyIcon icon={CloudRain} animationType="shimmer" size={14} color="#2196f3" style={{ marginRight: '8px' }} />;
    }
    if (value.includes('wind') || label.includes('wind')) {
      return <FancyIcon icon={Wind} animationType="wave" size={14} color="#795548" style={{ marginRight: '8px' }} />;
    }
    
    // Default icon for unknown variables
    return <FancyIcon icon={Activity} animationType="pulse" size={14} color="#607d8b" style={{ marginRight: '8px' }} />;
  };

  // Effect to handle initial composite layer selection.


  const handleVariableChange = (layerValue) => {
    // Check if this is a placeholder layer
    const selectedLayer = ALL_LAYERS.find(l => l.value === layerValue);
    if (selectedLayer?.isPlaceholder) {
      alert(selectedLayer.placeholderMessage || 'This data is not currently available.');
      return; // Don't change the selection for placeholder layers
    }
    
    setSelectedWaveForecast(layerValue);
    setActiveLayers(prev => ({ ...prev, waveForecast: true }));
  };

  const handlePlayToggle = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSliderChange = (value) => {
    setSliderIndex(parseInt(value));
  };

  const formatDateTime = (date) => {
    if (!date) return 'Loading...';
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  // Clean map interaction using service-based architecture
  useMapInteraction({
    mapInstance,
    currentSliderDate,
    setBottomCanvasData,
    setShowBottomCanvas,
    debugMode: true // Enable debug logging
  });

  return (
    <div className="forecast-app">
      <div className="main-container">
        <div className="map-section">
          <div ref={mapRef} id="map" className="forecast-map"></div>
          
          {/* Enhanced Professional Compass Rose */}
          <CompassRose 
            position="top-right" 
            size={90} 
            responsive={true}
            mapRotation={0} 
          />
          
          {selectedLegendLayer && (
            <div className="marine-legend">
              {(() => {
                const legendConfig = getLegendConfig(selectedLegendLayer.value, selectedLegendLayer);
                if (!legendConfig) return null;
                
                return (
                  <>
                    <div className="marine-legend-title">{selectedLegendLayer.label}</div>
                    <div className="marine-legend-content">
                      <div 
                        className="marine-legend-gradient"
                        style={{ background: legendConfig.gradient }}
                      />
                      <div className="marine-legend-scale">
                        {legendConfig.ticks.slice().reverse().map((tick, index) => {
                          // Calculate position for each tick - evenly distribute from top (0%) to bottom (100%)
                          const position = (index / (legendConfig.ticks.length - 1)) * 100;
                          return (
                            <div 
                              key={`legend-tick-${index}-${tick}`} 
                              className="marine-legend-tick"
                              style={{
                                top: `${position}%`,
                                transform: 'translateY(-50%)', // Center the tick on its position
                                left: '0px'
                              }}
                            >
                              {tick}{legendConfig.units}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
          
          {/* Metadata Panel - Bottom Left */}
          {/* <button
            type="button"
            className="metadata-toggle"
            onClick={() => setMetadataVisible(prev => !prev)}
            title={metadataVisible ? "Hide Range Info" : "Show Range Info"}
            aria-label={metadataVisible ? "Hide Range Info" : "Show Range Info"}
          >
            <FancyIcon 
              icon={BadgeInfo} 
              animationType="pulse" 
              size={16} 
              color="#00bcd4" 
            />
            {metadataVisible ? " Hide" : " Info"}
          </button> */}
          
          {/* {metadataVisible && selectedLayer && metadataRanges.length > 0 && (
            <div className="range-metadata-panel">
              <h4>
                <FancyIcon 
                  icon={getLayerIcon(selectedLayer).icon} 
                  animationType="wave" 
                  size={18} 
                  color={getLayerIcon(selectedLayer).color} 
                />
                {selectedLayer.label || 'Wave Data'}
                <span className="wmo-code">({layerMetadata.wmoCode})</span>
              </h4>
              
              {metadataRanges.map((range, index) => (
                <div
                  key={`${range.label}-${index}`}
                  className="range-item"
                >
                  <div className="range-item-left">
                    <div
                      className="range-color"
                      style={{ backgroundColor: range.color || 'rgba(255, 255, 255, 0.2)' }}
                    ></div>
                    <div className="range-content">
                      <span className="range-label">{range.label}</span>
                      <span className="range-description">{range.description}</span>
                    </div>
                  </div>
                  <span className="range-value">{range.value}</span>
                </div>
              ))}
              
              {/* Essential Info Summary *_/}
              <div className="metadata-section">
                <div className="metadata-summary">
                  <div className="metadata-item">
                    <span className="metadata-label">Source:</span>
                    <span className="metadata-value">{layerMetadata.provider}</span>
                  </div>
                  <div className="metadata-item">
                    <span className="metadata-label">Coverage:</span>
                    <span className="metadata-value">{layerMetadata.coverage}</span>
                  </div>
                  <div className="metadata-item">
                    <span className="metadata-label">Units:</span>
                    <span className="metadata-value">{layerMetadata.units}</span>
                  </div>
                </div>
                
                <button 
                  className="metadata-details-toggle"
                  onClick={() => setDetailedMetadataVisible(prev => !prev)}
                  title={detailedMetadataVisible ? "Hide Technical Details" : "Show Technical Details"}
                  aria-label={detailedMetadataVisible ? "Hide Technical Details" : "Show Technical Details"}
                >
                  <FancyIcon 
                    icon={Settings} 
                    animationType="spin" 
                    size={14} 
                    color="#9c27b0" 
                  />
                  {detailedMetadataVisible ? " Less" : " Details"}
                </button>
                
                {detailedMetadataVisible && (
                  <div className="metadata-details">
                    <div className="metadata-item">
                      <span className="metadata-label">Model:</span>
                      <span className="metadata-value">{layerMetadata.model}</span>
                    </div>
                    <div className="metadata-item">
                      <span className="metadata-label">Resolution:</span>
                      <span className="metadata-value">{layerMetadata.resolution}</span>
                    </div>
                    <div className="metadata-item">
                      <span className="metadata-label">Schedule:</span>
                      <span className="metadata-value">{layerMetadata.schedule}</span>
                    </div>
                    <div className="metadata-item">
                      <span className="metadata-label">Valid Time:</span>
                      <span className="metadata-value">{layerMetadata.validTime}</span>
                    </div>
                    <div className="metadata-item">
                      <span className="metadata-label">WMO Standard:</span>
                      <span className="metadata-value">
                        {layerMetadata.wmoCode}
                        <span className={`confidence-indicator confidence-${layerMetadata.confidence.toLowerCase()}`}></span>
                      </span>
                    </div>
                    {layerMetadata.period && (
                      <div className="metadata-item">
                        <span className="metadata-label">Wave Period:</span>
                        <span className="metadata-value">{layerMetadata.period}</span>
                      </div>
                    )}
                    {layerMetadata.direction && (
                      <div className="metadata-item">
                        <span className="metadata-label">Direction:</span>
                        <span className="metadata-value">{layerMetadata.direction}</span>
                      </div>
                    )}
                    {layerMetadata.components && (
                      <div className="metadata-item">
                        <span className="metadata-label">Components:</span>
                        <span className="metadata-value">{layerMetadata.components}</span>
                      </div>
                    )}
                    {layerMetadata.datum && (
                      <div className="metadata-item">
                        <span className="metadata-label">Datum:</span>
                        <span className="metadata-value">{layerMetadata.datum}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )} */}
        </div>

        <div className="controls-panel">
          <div className="forecast-controls">
            <ControlGroup
              icon={<FancyIcon icon={Activity} animationType="shimmer" color="#00bcd4" />}
              title={UI_CONFIG.SECTIONS.FORECAST_VARIABLES.title}
              ariaLabel={UI_CONFIG.SECTIONS.FORECAST_VARIABLES.ariaLabel}
            >
              <VariableButtons
                layers={ALL_LAYERS}
                selectedValue={selectedWaveForecast}
                onVariableChange={handleVariableChange}
                labelMap={UI_CONFIG.VARIABLE_LABELS}
                ariaLabel={UI_CONFIG.ARIA_LABELS.variableButton}
                getVariableIcon={getVariableIcon}
              />
            </ControlGroup>

            <ControlGroup
              icon={<FancyIcon icon={FastForward} animationType="bounce" color="#ff9800" />}
              title={UI_CONFIG.SECTIONS.FORECAST_TIME.title}
              ariaLabel={UI_CONFIG.SECTIONS.FORECAST_TIME.ariaLabel}
            >
              <TimeControl
                sliderIndex={sliderIndex}
                totalSteps={totalSteps}
                currentSliderDate={currentSliderDate}
                isPlaying={isPlaying}
                capTime={capTime}
                onSliderChange={handleSliderChange}
                onPlayToggle={handlePlayToggle}
                formatDateTime={formatDateTime}
                stepHours={capTime.stepHours || 1}
                playIcon={<FancyIcon icon={Navigation} animationType="bounce" size={16} color="#4caf50" />}
                pauseIcon={<FancyIcon icon={Activity} animationType="pulse" size={16} color="#ff5722" />}
                minIndex={minIndex}
              />
              
              {/* ✅ Warm-up Period Notice */}
              {MARINE_CONFIG.SHOW_WARMUP_NOTICE && capTime.warmupSkipped && (
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  background: 'rgba(33, 150, 243, 0.1)',
                  border: '1px solid rgba(33, 150, 243, 0.3)',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  color: '#90caf9',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <FancyIcon icon={BadgeInfo} animationType="pulse" size={16} color="#2196f3" />
                  <span>
                    Showing reliable forecast data (excluding {capTime.warmupDays}-day model initialization)
                  </span>
                </div>
              )}
            </ControlGroup>            <ControlGroup
              icon={<FancyIcon icon={Settings} animationType="spin" color="#9c27b0" />}
              title={UI_CONFIG.SECTIONS.DISPLAY_OPTIONS.title}
              ariaLabel={UI_CONFIG.SECTIONS.DISPLAY_OPTIONS.ariaLabel}
            >
              <OpacityControl
                opacity={opacity}
                onOpacityChange={setOpacity}
                formatPercent={UI_CONFIG.FORMATS.opacityPercent}
                ariaLabel={UI_CONFIG.ARIA_LABELS.overlayOpacity}
              />
            </ControlGroup>

            <ControlGroup
              icon={<FancyIcon icon={Info} animationType="pulse" color="#2196f3" />}
              title={UI_CONFIG.SECTIONS.DATA_INFO.title}
              ariaLabel={UI_CONFIG.SECTIONS.DATA_INFO.ariaLabel}
            >
              <DataInfo
                source={UI_CONFIG.DATA_SOURCE.source}
                /*model={UI_CONFIG.DATA_SOURCE.model}*/
                /*resolution={UI_CONFIG.DATA_SOURCE.resolution}*/
                updateFrequency={UI_CONFIG.DATA_SOURCE.updateFrequency}
                /*coverage={UI_CONFIG.DATA_SOURCE.coverage}*/
              />
            </ControlGroup>
          </div>
        </div>        
      </div>
    </div>
  );
};

export default ForecastApp;
