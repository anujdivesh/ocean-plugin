import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import './ForecastApp.css';
import '../styles/MapMarker.css';
import useMapInteraction from '../hooks/useMapInteraction';
import { UI_CONFIG } from '../config/UIConfig';
import { MARINE_CONFIG } from '../config/marineVariables';
import { getLayerBounds } from '../config/layerConfig';
import CompassRose from './CompassRose';
import { 
  ControlGroup, 
  VariableButtons, 
  TimeControl, 
  OpacityControl, 
  DataInfo, 
  //StatusBar 
} from './shared/UIComponents';
import { Waves, Wind, Navigation, Activity, Info, Settings, Timer, Triangle,  BadgeInfo , CloudRain, FastForward} from 'lucide-react';
import FancyIcon from './FancyIcon';
import '../styles/fancyIcons.css';

// X-SST gradient for wave height visualization (matches WMS x-Sst palette)
const X_SST_GRADIENT_RGB = [
  [49, 54, 149],
  [69, 117, 180],
  [116, 173, 209],
  [171, 217, 233],
  [224, 243, 248],
  [254, 224, 144],
  [253, 174, 97],
  [244, 109, 67],
  [215, 48, 39]
];

// Spectral divergent palette for mean wave period (div-Spectral from ColorBrewer)
const SPECTRAL_GRADIENT_RGB = [
  [158, 1, 66],      // Dark red
  [213, 62, 79],     // Red
  [244, 109, 67],    // Orange-red
  [253, 174, 97],    // Orange
  [254, 224, 139],   // Yellow-orange
  [255, 255, 191],   // Pale yellow
  [230, 245, 152],   // Yellow-green
  [171, 221, 164],   // Light green
  [102, 194, 165],   // Cyan-green
  [50, 136, 189],    // Blue
  [94, 79, 162]      // Purple
];

// Generate gradient bands for any palette
const generateGradientBands = (paletteRGB, bands = 250) => {
  const colors = [];
  for (let i = 0; i < bands; i++) {
    const normalized = i / (bands - 1);
    const maxIndex = paletteRGB.length - 1;
    const index = normalized * maxIndex;
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.min(Math.ceil(index), maxIndex);
    const fraction = index - lowerIndex;
    
    const lower = paletteRGB[lowerIndex];
    const upper = paletteRGB[upperIndex];
    
    const r = Math.round(lower[0] + (upper[0] - lower[0]) * fraction);
    const g = Math.round(lower[1] + (upper[1] - lower[1]) * fraction);
    const b = Math.round(lower[2] + (upper[2] - lower[2]) * fraction);
    
    colors.push(`rgb(${r}, ${g}, ${b})`);
  }
  return colors;
};

// Generate 250-band gradients
const X_SST_250_BANDS = generateGradientBands(X_SST_GRADIENT_RGB, 250);
const SPECTRAL_250_BANDS = generateGradientBands(SPECTRAL_GRADIENT_RGB, 250);

// Create gradient with explicit percentage stops for better color distribution
const X_SST_GRADIENT = `linear-gradient(to top, ${X_SST_250_BANDS.map((color, i) => 
  `${color} ${(i / (X_SST_250_BANDS.length - 1) * 100).toFixed(2)}%`
).join(', ')})`;

const SPECTRAL_GRADIENT = `linear-gradient(to top, ${SPECTRAL_250_BANDS.map((color, i) => 
  `${color} ${(i / (SPECTRAL_250_BANDS.length - 1) * 100).toFixed(2)}%`
).join(', ')})`;

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
  minIndex
}) => {
  const lastZoomedLayerRef = useRef(null);
  const selectedLayer = useMemo(() => {
    return ALL_LAYERS.find(l => l.value === selectedWaveForecast) || null;
  }, [ALL_LAYERS, selectedWaveForecast]);

  const zoomToLayerBounds = useCallback((layerValue, { force = false } = {}) => {
    if (!layerValue || !mapInstance?.current) {
      return;
    }
    const layerBounds = getLayerBounds(layerValue);
    if (!layerBounds) {
      return;
    }
    if (!force && lastZoomedLayerRef.current === layerValue) {
      return;
    }

    const map = mapInstance.current;
    // Check if this is a static inundation layer that requires higher zoom level
    const layer = ALL_LAYERS.find(l => l.value === layerValue);
    const isInundation = layer?.isStatic || false;
    
    map.fitBounds(
      [
        layerBounds.southWest,
        layerBounds.northEast
      ],
      {
        padding: [20, 20],
        maxZoom: isInundation ? 17 : 14, // Higher zoom for inundation layers (increased from 16 to 17)
        animate: true
      }
    );
    lastZoomedLayerRef.current = layerValue;
    console.log('🏝️ Zoomed to layer bounds for:', layerValue, isInundation ? '(Inundation - higher zoom)' : '');
  }, [mapInstance, ALL_LAYERS]);

  useEffect(() => {
    zoomToLayerBounds(selectedWaveForecast);
  }, [selectedWaveForecast, zoomToLayerBounds]);

  // Dynamic marine legend configuration - RESPONDS TO ACTUAL DATA
  const getLegendConfig = (variable, layerData) => {
    const varLower = variable.toLowerCase();
    
    // Parse dynamic ranges from layer data
    const colorRange = layerData ? parseColorRange(layerData.colorscalerange) : null;
    const dynamicMax = layerData?.activeBeaufortMax;
    
    if (varLower.includes('hs')) {
      // DYNAMIC DATA RANGE - Updates with actual wave height data
      // Using X-SST gradient to match WMS layer (default-scalar/x-Sst palette)
      const minVal = colorRange?.min ?? 0;
      const maxVal = Number.isFinite(dynamicMax) ? dynamicMax : (colorRange?.max ?? 4);
      const tickCount = 5;
      const ticks = Array.from({length: tickCount}, (_, i) => 
        Number((minVal + (maxVal - minVal) * i / (tickCount - 1)).toFixed(1))
      );
      
      return {
        // X-SST gradient - matches the WMS palette used by the wave height layer
        gradient: X_SST_GRADIENT,
        min: minVal,
        max: maxVal,
        units: 'm',
        ticks: ticks
      };
    }
    
    if (varLower.includes('tm02')) {
      // DYNAMIC DATA RANGE - Updates with actual mean period data
      // Using Spectral divergent palette to match WMS layer (div-Spectral)
      const minVal = colorRange?.min ?? 0;
      const maxVal = colorRange?.max ?? 20;
      const ticks = [minVal, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal].map(v => Number(v.toFixed(1)));
      
      return {
        gradient: SPECTRAL_GRADIENT,
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
    
    if (varLower.includes('inun') || varLower.includes('h_max')) {
      // DYNAMIC DATA RANGE - Updates with actual inundation data
      const minVal = colorRange?.min ?? -0.05;
      const maxVal = colorRange?.max ?? 1.63;
      const ticks = [minVal, 0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal].map(v => Number(v.toFixed(2)));
      
      return {
        gradient: X_SST_GRADIENT,
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

  // Unused - commented out to fix build
  // eslint-disable-next-line no-unused-vars, react-hooks/exhaustive-deps
  const metadataRanges = useMemo(() => {
    return []; // Simplified - this is not currently used in widget5
  }, []);
  
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
  
  // Unused - commented out to fix build
  // eslint-disable-next-line no-unused-vars
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
    zoomToLayerBounds(layerValue, { force: true });
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
  // Enhanced: passes selectedWaveForecast to show popup for inundation layer
  useMapInteraction({
    mapInstance,
    currentSliderDate,
    setBottomCanvasData,
    setShowBottomCanvas,
    selectedWaveForecast, // Pass to enable popup for inundation layer
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
            disabled={selectedLayer?.isStatic || false}
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
