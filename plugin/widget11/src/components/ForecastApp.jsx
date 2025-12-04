import React, { useMemo, useState } from 'react';
import './ForecastApp.css';
import '../styles/MapMarker.css';
import '../styles/InundationPoints.css';
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
import wmsStyleManager, { WMSStylePresets } from '../utils/WMSStyleManager';
import { Waves, Wind, Navigation, Activity, Info, Settings, Timer, Triangle,  BadgeInfo , CloudRain, FastForward, X } from 'lucide-react';
import FancyIcon from './FancyIcon';
import '../styles/fancyIcons.css';

const EPSILON = 1e-6;

/**
 * Determines the appropriate icon for a layer based on its properties
 * Matches the icons used in the variable buttons for consistency
 * @param {Object} layer - The layer object
 * @returns {Object} Icon component and color
 */
const getLayerIcon = (layer) => {
  if (!layer) return { icon: Waves, color: '#00bcd4' };
  
  const layerName = layer.value?.toLowerCase() || '';
  const layerLabel = layer.label?.toLowerCase() || '';
  
  // Inundation layers
  if (layerName.includes('inun') || layerLabel.includes('inundation')) {
    return { icon: CloudRain, color: '#2196f3' }; // Blue (matches button)
  }
  
  // Wave height layers
  if (layerName.includes('hs') || layerLabel.includes('wave height')) {
    return { icon: Waves, color: '#00bcd4' }; // Cyan (matches button)
  }
  
  // Mean wave period (tm02)
  if (layerName.includes('tm02') || (layerLabel.includes('mean') && layerLabel.includes('period'))) {
    return { icon: Timer, color: '#ff9800' }; // Orange (matches button)
  }
  
  // Peak wave period (tpeak)
  if (layerName.includes('tpeak') || (layerLabel.includes('peak') && layerLabel.includes('period'))) {
    return { icon: Triangle, color: '#4caf50' }; // Green (matches button)
  }
  
  // Wave direction layers
  if (layerName.includes('dirm') || layerLabel.includes('direction')) {
    return { icon: Navigation, color: '#9c27b0' }; // Purple (matches button)
  }
  
  // Wind layers
  if (layerName.includes('wind') || layerLabel.includes('wind')) {
    return { icon: Wind, color: '#795548' }; // Brown (matches button)
  }
  
  // Default to activity icon
  return { icon: Activity, color: '#607d8b' }; // Grey for unknown
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

const INUNDATION_METADATA = [
  { min: -0.05, max: 0, label: 'Dry Ground', value: '≤ 0.0 m', description: 'No surface water present', color: '#f7fbff' },
  { min: 0, max: 0.15, label: 'Minor Ponding', value: '0–0.15 m', description: 'Shallow nuisance water on low-lying surfaces', color: '#deebf7' },
  { min: 0.15, max: 0.4, label: 'Shallow Flooding', value: '0.15–0.40 m', description: 'Curb-deep flooding across roads and properties', color: '#c6dbef' },
  { min: 0.4, max: 0.8, label: 'Significant Flooding', value: '0.40–0.80 m', description: 'Knee-to-waist depth inundation impacting structures', color: '#6baed6' },
  { min: 0.8, max: 1.2, label: 'Deep Flooding', value: '0.80–1.20 m', description: 'Substantial inundation with unsafe currents', color: '#3182bd' },
  { min: 1.2, max: 1.6, label: 'Extreme Flooding', value: '≥ 1.20 m', description: 'Life-threatening inundation requiring evacuation', color: '#08519c' }
];

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
  activeLayers,
  setActiveLayers,
  mapRef,
  mapInstance,
  setBottomCanvasData,
  setShowBottomCanvas,
  isUpdatingVisualization,
  currentSliderDateStr,
  minIndex,
  islandSelector
}) => {
  const [metadataVisible, setMetadataVisible] = useState(false); // Metadata panel state
  const [detailedMetadataVisible, setDetailedMetadataVisible] = useState(false); // Detailed metadata state
  
  const selectedLayer = useMemo(() => {
    return ALL_LAYERS.find(l => l.value === selectedWaveForecast) || null;
  }, [ALL_LAYERS, selectedWaveForecast]);

  // Dynamic marine legend configuration - RESPONDS TO ACTUAL DATA
  const getLegendConfig = (variable, layerData) => {
    const varLower = variable.toLowerCase();
    
    // Parse dynamic ranges from layer data
    const colorRange = layerData ? parseColorRange(layerData.colorscalerange) : null;
    const dynamicMax = layerData?.activeBeaufortMax;
    
    if (varLower.includes('hs')) {
      // DYNAMIC DATA RANGE - Updates with actual wave height data
      const minVal = colorRange?.min ?? 0;
      const maxVal = Number.isFinite(dynamicMax) ? dynamicMax : (colorRange?.max ?? 4);
      const tickCount = 5;
      const ticks = Array.from({length: tickCount}, (_, i) => 
        Number((minVal + (maxVal - minVal) * i / (tickCount - 1)).toFixed(1))
      );
      
      const paletteGradient = wmsStyleManager.buildCssGradientFromMapping(
        WMSStylePresets.WAVE_HEIGHT.colorMapping,
        minVal,
        maxVal,
        'to top',
        { preserveFullScale: true }
      ) || 'linear-gradient(to top, rgb(0, 0, 143), rgb(0, 0, 255), rgb(0, 255, 255), rgb(0, 255, 0), rgb(255, 255, 0), rgb(255, 127, 0), rgb(255, 0, 0))';

      return {
        gradient: paletteGradient,
        min: minVal,
        max: maxVal,
        units: 'm',
        ticks: ticks
      };
    }
    
    if (varLower.includes('tm02') || varLower.includes('tm') || (varLower.includes('mean') && varLower.includes('period'))) {
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
    
    if (varLower.includes('tpeak') || varLower.includes('tp') || (varLower.includes('peak') && varLower.includes('period'))) {
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
      // DYNAMIC DATA RANGE - Updates with actual inundation data
      const minVal = colorRange?.min ?? -0.05;
      const maxVal = colorRange?.max ?? 1.63;
      const ticks = [minVal, 0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal].map(v => Number(v.toFixed(2)));
      
      return {
        gradient: 'linear-gradient(to top, rgb(247, 251, 255), rgb(222, 235, 247), rgb(198, 219, 239), rgb(158, 202, 225), rgb(107, 174, 214), rgb(66, 146, 198), rgb(33, 113, 181), rgb(8, 81, 156), rgb(8, 48, 107))',
        min: minVal,
        max: maxVal,
        units: 'm',
        ticks: ticks.slice(0, 5) // Limit to 5 ticks
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

  const metadataRanges = useMemo(() => {
    if (!selectedLegendLayer) {
      return [];
    }

    const variable = selectedLegendLayer.value?.toLowerCase() || '';

    if (variable.includes('hs') || variable.includes('wave_height')) {
      // Parse actual WMS data range
      const colorRange = parseColorRange(selectedLegendLayer.colorscalerange);
      const dataMin = Number.isFinite(colorRange?.min) ? Math.max(0, colorRange.min) : 0;
      const dataMax = Number.isFinite(colorRange?.max) ? colorRange.max : 4;
      
      const effectiveMax = Number.isFinite(selectedLegendLayer.activeBeaufortMax)
        ? selectedLegendLayer.activeBeaufortMax
        : dataMax;
      
      const paletteMapping = WMSStylePresets.WAVE_HEIGHT.colorMapping;
      const paletteStops = wmsStyleManager.getColorStops(paletteMapping);
      if (!paletteStops.length) {
        return [];
      }
      
      const ranges = [];
      let previous = Math.min(dataMin, paletteStops[0].value);
      const maxPaletteValue = paletteStops[paletteStops.length - 1].value;
      
      const appendRange = (start, end, colorValueOverride) => {
        if (end <= start + EPSILON) {
          return;
        }
        const effectiveEnd = Number.isFinite(end) ? end : Infinity;
        const colorSampleValue = Number.isFinite(colorValueOverride)
          ? colorValueOverride
          : Number.isFinite(end) ? end : maxPaletteValue;
        
        ranges.push({
          min: start,
          max: end,
          label: wmsStyleManager.getWaveHeightLabel(effectiveEnd),
          value: wmsStyleManager.formatWaveHeightRange(start, end),
          description: wmsStyleManager.getWaveHeightDescription(start, effectiveEnd, { 
            dataMax: Math.max(effectiveMax, maxPaletteValue),
            location: selectedLegendLayer.value?.includes('cook') ? 'Cook Islands' : 'Global'
          }),
          color: wmsStyleManager.getColorForValue(paletteMapping, colorSampleValue)
        });
      };
      
      paletteStops.forEach(stop => {
        const upper = stop.value;
        appendRange(previous, upper);
        previous = Math.max(previous, upper);
      });
      
      appendRange(previous, Infinity, maxPaletteValue);
      
      return ranges;
    }

    if (
      variable.includes('tm02') ||
      variable.includes('tm') ||
      (variable.includes('mean') && variable.includes('period'))
    ) {
      return MEAN_PERIOD_METADATA.map(range => ({ ...range }));
    }

    if (
      variable.includes('tpeak') ||
      variable.includes('tp') ||
      (variable.includes('peak') && variable.includes('period'))
    ) {
      return PEAK_PERIOD_METADATA.map(range => ({ ...range }));
    }

    if (variable.includes('inun') || variable.includes('flood')) {
      return INUNDATION_METADATA.map(range => ({ ...range }));
    }

    if (variable.includes('dirm') || variable.includes('direction')) {
      return DIRECTION_METADATA.map(range => ({ ...range }));
    }

    return [];
  }, [selectedLegendLayer]);
  
  // Consolidated professional marine metadata (eliminates redundancy)
  const getLayerMetadata = (layer) => {
    if (!layer) return { 
      provider: 'THREDDS Data Server', 
      model: 'Generic Model',
      resolution: '1km Grid', 
      schedule: 'Hourly', 
      units: 'm',
      confidence: 'Medium',
      validTime: '48h Forecast',
      wmoCode: 'Standard',
      coverage: 'Regional'
    };
    
    const variable = layer.value?.toLowerCase() || '';
    const currentTime = new Date();
    const validUntil = new Date(currentTime.getTime() + (48 * 60 * 60 * 1000));
    const validTime = `${currentTime.toISOString().slice(11, 16)}Z–${validUntil.toISOString().slice(11, 16)}Z`;
    
    if (variable.includes('hs') || variable.includes('wave_height')) {
      return {
        provider: 'Pacific Community (SPC)',
        model: 'SCHISM + WaveWatch III',
        resolution: 'Unstructured Mesh (~500m)',
        schedule: '4x Daily (00/06/12/18 UTC)',
        units: 'm (Significant Wave Height)',
        confidence: 'High',
        validTime: validTime,
        wmoCode: 'WMO-SeaState',
        coverage: 'Cook Islands',
        period: 'Height Only - See Wave Period Layer',
        direction: 'Composite Layer Available'
      };
    }
    
    if (variable.includes('tm02') || variable.includes('tpeak') || variable.includes('period')) {
      return {
        provider: 'Pacific Community (SPC)',
        model: 'WaveWatch III Global',
        resolution: '1km Structured Grid',
        schedule: '4x Daily (00/06/12/18 UTC)',
        units: 's (Wave Period)',
        confidence: 'High',
        validTime: validTime,
        wmoCode: 'WMO-WavePeriod',
        coverage: 'Cook Islands',
        height: 'See Wave Height Layer',
        steepness: 'Auto-calculated from H/T²'
      };
    }
    
    if (variable.includes('dirm') || variable.includes('direction')) {
      return {
        provider: 'Pacific Community (SPC)',
        model: 'WaveWatch III Directional',
        resolution: '1km Vector Field',
        schedule: '4x Daily (00/06/12/18 UTC)',
        units: '° (Degrees from North)',
        confidence: 'Medium',
        validTime: validTime,
        wmoCode: 'WMO-WaveDirection',
        coverage: 'Cook Islands',
        convention: 'Meteorological (Coming From)',
        precision: '±15° Directional Sectors'
      };
    }
    
    if (variable.includes('inundation') || variable.includes('flooding')) {
      return {
        provider: 'Pacific Community (SPC)',
        model: 'Coastal Inundation Model',
        resolution: '100m High-Resolution',
        schedule: 'Real-time + 6h Forecast',
        units: 'm (Above MSL)',
        confidence: 'Medium',
        validTime: 'Nowcast + 6h',
        wmoCode: 'WMO-CoastalInundation',
        coverage: 'Rarotonga Coastline',
        components: 'Tide + Storm Surge + Wave Setup',
        datum: 'Mean Sea Level (MSL)'
      };
    }
    
    return { 
      provider: 'THREDDS Data Server', 
      model: 'Generic Model',
      resolution: '1km Grid', 
      schedule: 'Hourly Updates', 
      units: 'm',
      confidence: 'Medium',
      validTime: validTime,
      wmoCode: 'Standard',
      coverage: 'Regional'
    };
  };
  
  const layerMetadata = getLayerMetadata(selectedLayer);

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
          
          {/* Inundation Points Control is now rendered in Home.jsx for inline layout with IslandSelector */}
          
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
                              key={`tick-${tick}`} 
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

        </div>

        <div className="controls-panel">
          <div className="forecast-controls">
        {islandSelector && (
          <ControlGroup
            icon={<FancyIcon icon={Activity} animationType="shimmer" color="#00bcd4" />}
            title="Location"
            ariaLabel="Island selection"
          >
            {islandSelector}
          </ControlGroup>
        )}
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
        </ControlGroup>

        <ControlGroup
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
            model={UI_CONFIG.DATA_SOURCE.model}
            resolution={UI_CONFIG.DATA_SOURCE.resolution}
            updateFrequency={UI_CONFIG.DATA_SOURCE.updateFrequency}
            coverage={UI_CONFIG.DATA_SOURCE.coverage}
          />
        </ControlGroup>
          </div>
        </div>

        
      </div>
    </div>
  );
};

export default ForecastApp;
