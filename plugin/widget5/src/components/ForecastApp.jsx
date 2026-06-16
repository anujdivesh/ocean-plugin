import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './ForecastApp.css';
import '../styles/MapMarker.css';
import useMapInteraction from '../hooks/useMapInteraction';
import { UI_CONFIG } from '../config/UIConfig';
import { MARINE_CONFIG } from '../config/marineVariables';
import { getLayerBounds, isRasterSourceLayer } from '../config/layerConfig';
import { ISLAND_ZOOM_TARGETS, findIslandZoomTarget } from '../config/islandConfig';
import CompassRose from './CompassRose';
import { 
  ControlGroup, 
  VariableButtons, 
  TimeControl, 
  OpacityControl, 
  IslandZoomControl,
  DataInfo, 
  //StatusBar 
} from './shared/UIComponents';
import { Waves, Wind, Navigation, Activity, Info, Settings, Timer, Triangle, BadgeInfo, CloudRain, FastForward, MapPin, SlidersHorizontal } from 'lucide-react';
import FancyIcon from './FancyIcon';
import '../styles/fancyIcons.css';
import InundationThresholdEditor from './InundationThresholdEditor';
import { X_SST_GRADIENT, buildInundationLegendBands, parseLegendColorRange } from '../domain/inundation/legendBands';

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

const SPECTRAL_250_BANDS = generateGradientBands(SPECTRAL_GRADIENT_RGB, 250);

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
  minIndex,
  isBuffering,
  inundationThresholds,
}) => {
  const lastZoomedLayerRef = useRef(null);
  const [selectedIslandId, setSelectedIslandId] = useState(ISLAND_ZOOM_TARGETS[0]?.id || '');
  const [showThresholdEditor, setShowThresholdEditor] = useState(false);
  const [timeDisplayZone, setTimeDisplayZone] = useState('Pacific/Rarotonga');
  const selectedLayer = useMemo(() => {
    return ALL_LAYERS.find(l => l.value === selectedWaveForecast) || null;
  }, [ALL_LAYERS, selectedWaveForecast]);
  const isRasterInundation = isRasterSourceLayer(selectedLayer);

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

  const zoomToIsland = useCallback((islandId = selectedIslandId) => {
    const island = findIslandZoomTarget(islandId);
    const map = mapInstance?.current;
    if (!island || !map) {
      return;
    }

    setActiveLayers(prev => ({ ...prev, riskPoints: true }));
    map.fitBounds(
      [
        island.bounds.southWest,
        island.bounds.northEast
      ],
      {
        padding: [42, 42],
        maxZoom: 12,
        animate: true
      }
    );
  }, [mapInstance, selectedIslandId, setActiveLayers]);

  const zoomToRarotonga = useCallback(() => {
    const map = mapInstance?.current;
    const rarotonga = findIslandZoomTarget('rarotonga');
    if (!map || !rarotonga) {
      return;
    }

    map.fitBounds(
      [
        rarotonga.bounds.southWest,
        rarotonga.bounds.northEast
      ],
      {
        padding: [20, 20],
        maxZoom: 17,
        animate: true
      }
    );
  }, [mapInstance]);

  useEffect(() => {
    zoomToLayerBounds(selectedWaveForecast);
  }, [selectedWaveForecast, zoomToLayerBounds]);

  // Dynamic marine legend configuration - RESPONDS TO ACTUAL DATA
  const getLegendConfig = (variable, layerData) => {
    const varLower = variable.toLowerCase();
    
    // Parse dynamic ranges from layer data
    const colorRange = layerData ? parseLegendColorRange(layerData.colorscalerange) : null;
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
    
    if (varLower.includes('inun') || varLower.includes('hmax') || varLower.includes('h_max')) {
      // Use the memoized bands — computed with lastValidCategories as an explicit dep.
      return {
        units: 'm',
        ...inundationLegendBands,
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

  const inundationLegendBands = useMemo(() => {
    return buildInundationLegendBands({
      categories: inundationThresholds.lastValidCategories,
      minVisibleDepth: inundationThresholds.minVisibleDepth,
      colorscalerange: selectedLegendLayer?.colorscalerange,
      rasterMinDepth: selectedLegendLayer?.rasterMinDepth,
      rasterMaxDepth: selectedLegendLayer?.rasterMaxDepth,
    });
  }, [inundationThresholds.lastValidCategories, inundationThresholds.minVisibleDepth, selectedLegendLayer]);

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

    const nextLayer = ALL_LAYERS.find((layer) => layer.value === layerValue);
    if (isRasterSourceLayer(nextLayer)) {
      zoomToRarotonga();
      return;
    }

    zoomToLayerBounds(layerValue, { force: true });
  };

  const handlePlayToggle = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSliderChange = (value) => {
    setSliderIndex(parseInt(value));
  };

  const handlePreviousTimestamp = () => {
    setSliderIndex(prev => Math.max(prev - 1, minIndex));
  };

  const handleNextTimestamp = () => {
    setSliderIndex(prev => Math.min(prev + 1, totalSteps));
  };

  const formatDateTime = (date) => {
    if (!date) return 'Loading...';
    const timeZoneLabel = timeDisplayZone === 'UTC' ? 'UTC' : 'CKT';
    const formattedDate = new Intl.DateTimeFormat('en-GB', {
      timeZone: timeDisplayZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);

    return `${formattedDate} ${timeZoneLabel}`;
  };

  // Clean map interaction using service-based architecture
  // Enhanced: passes selectedWaveForecast to show popup for inundation layer
  useMapInteraction({
    mapInstance,
    currentSliderDate,
    sliderIndex,
    setBottomCanvasData,
    setShowBottomCanvas,
    selectedWaveForecast,
    selectedLayerConfig: selectedLayer,
    inundationCategories: inundationThresholds.lastValidCategories,
    debugMode: true
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
                const range = legendConfig.max - legendConfig.min;
                const toPos = (val) => range > 0 ? ((legendConfig.max - val) / range) * 100 : 0;

                return (
                  <>
                    <div className="marine-legend-title">{selectedLegendLayer.label}</div>
                    <div className="marine-legend-content">

                      {/* Gradient bar — with threshold boundary hairlines overlaid when available */}
                      <div className="marine-legend-gradient-wrap">
                        <div
                          className="marine-legend-gradient"
                          style={{ background: legendConfig.gradient }}
                        />
                        {legendConfig.gradientMarkers?.map((cat) => (
                          <div
                            key={`marker-${cat.id}`}
                            className="marine-legend-band-marker"
                            style={{
                              top: `${toPos(cat.thresholdM)}%`,
                              borderTopColor: cat.color,
                            }}
                            title={`${cat.thresholdM.toFixed(2)} m — ${cat.label}`}
                          />
                        ))}
                      </div>

                      {/* Tick scale */}
                      <div className="marine-legend-scale">
                        {legendConfig.ticks.map((tick) => {
                          const band = legendConfig.tickBands?.[tick];
                          return (
                            <div
                              key={`tick-${tick}`}
                              className={`marine-legend-tick${band ? ' marine-legend-tick--labeled' : ''}`}
                              style={{ top: `${toPos(tick)}%`, transform: 'translateY(-50%)', left: '0px' }}
                            >
                              {/* Colored swatch — always visible when a band matches this tick */}
                              {band && (
                                <span
                                  className="marine-legend-tick__swatch"
                                  style={{ background: band.color }}
                                />
                              )}
                              <span className="marine-legend-tick__value">{tick}{legendConfig.units}</span>

                              {/* Full label + description tooltip on hover */}
                              {band && (
                                <span className="marine-legend-tick__severity">
                                  <strong>{band.label}</strong>
                                  {band.description && (
                                    <em>{band.description}</em>
                                  )}
                                </span>
                              )}
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
          icon={<FancyIcon icon={SlidersHorizontal} animationType="pulse" color="#90caf9" />}
          title="Inundation Thresholds"
          ariaLabel="Inundation threshold configuration"
        >
          <div className="inundation-threshold-trigger">
            <button
              type="button"
              className={`inundation-threshold-trigger__btn${inundationThresholds.isDirty ? ' inundation-threshold-trigger__btn--dirty' : ''}`}
              onClick={() => setShowThresholdEditor(true)}
              title="Customise depth bands and severity labels"
            >
              <SlidersHorizontal size={14} />
              Edit Thresholds
              {inundationThresholds.isDirty && (
                <span className="inundation-threshold-trigger__badge" title="Unsaved changes">●</span>
              )}
            </button>
            <span className="inundation-threshold-trigger__count">
              {`${inundationThresholds.categories.length} bands`}
            </span>
          </div>
          <div className="inundation-threshold-trigger__hint">
            Refine depth bands and severity descriptions as observed event data comes in. Changes apply live to the map popup and legend.
          </div>
        </ControlGroup>

        <ControlGroup
          icon={<FancyIcon icon={MapPin} animationType="pulse" color="#4caf50" />}
          title={UI_CONFIG.SECTIONS.ISLAND_NAVIGATION.title}
          ariaLabel={UI_CONFIG.SECTIONS.ISLAND_NAVIGATION.ariaLabel}
        >
          <IslandZoomControl
            islands={ISLAND_ZOOM_TARGETS}
            selectedIsland={selectedIslandId}
            onIslandChange={setSelectedIslandId}
            onZoomToIsland={() => zoomToIsland()}
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
            onPrevious={handlePreviousTimestamp}
            onNext={handleNextTimestamp}
            formatDateTime={formatDateTime}
            formatTime={formatDateTime}
            timeDisplayZone={timeDisplayZone}
            onTimeDisplayZoneChange={setTimeDisplayZone}
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

          {isRasterInundation && isBuffering && (
            <div style={{
              marginTop: '0.75rem',
              padding: '0.5rem 0.75rem',
              background: 'rgba(14, 165, 233, 0.12)',
              border: '1px solid rgba(14, 165, 233, 0.28)',
              borderRadius: '6px',
              fontSize: '0.85rem',
              color: '#7dd3fc',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <FancyIcon icon={CloudRain} animationType="pulse" size={16} color="#38bdf8" />
              <span>Buffering inundation frames near the current time.</span>
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

      <InundationThresholdEditor
        isOpen={showThresholdEditor}
        onClose={() => setShowThresholdEditor(false)}
        categories={inundationThresholds.categories}
        paletteId={inundationThresholds.paletteId}
        minVisibleDepth={inundationThresholds.minVisibleDepth}
        validationErrors={inundationThresholds.validationErrors}
        isDirty={inundationThresholds.isDirty}
        savedAt={inundationThresholds.savedAt}
        saveError={inundationThresholds.saveError}
        canUndo={inundationThresholds.canUndo}
        canRedo={inundationThresholds.canRedo}
        updateRow={inundationThresholds.updateRow}
        addRow={inundationThresholds.addRow}
        removeRow={inundationThresholds.removeRow}
        moveRow={inundationThresholds.moveRow}
        updateMinVisibleDepth={inundationThresholds.updateMinVisibleDepth}
        undo={inundationThresholds.undo}
        redo={inundationThresholds.redo}
        applyPalette={inundationThresholds.applyPalette}
        save={inundationThresholds.save}
        resetToDefaults={inundationThresholds.resetToDefaults}
        exportJson={inundationThresholds.exportJson}
        importJson={inundationThresholds.importJson}
      />
    </div>
  );
};

export default ForecastApp;
