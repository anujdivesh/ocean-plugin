import { useWMSCapabilities } from './useWMSCapabilities';
import { useTimeAnimation } from './useTimeAnimation';
import { useUIState } from './useUIState';
import { useLayerManagement } from './useLayerManagement';
import { useMapRendering } from './useMapRendering';
import { useLegendManagement } from './useLegendManagement';
import { useMapInteraction } from './useMapInteraction';

/**
 * Main forecast hook that composes specialized hooks
 * This is a thin orchestrator that delegates to focused, testable hooks
 */
export const useForecast = (config) => {
  const { WAVE_FORECAST_LAYERS, STATIC_LAYERS, addWMSTileLayer, bounds } = config;

  // 1. Layer Management (selection, active layers, dynamic configs)
  const layerManagement = useLayerManagement(WAVE_FORECAST_LAYERS, STATIC_LAYERS);
  const {
    activeLayers,
    setActiveLayers,
    selectedWaveForecast,
    setSelectedWaveForecast,
    dynamicLayers,
    allLayers,
    selectedLayerConfig
  } = layerManagement;

  // 2. WMS Capabilities (time dimensions, metadata)
  const capTime = useWMSCapabilities(selectedWaveForecast, allLayers);

  // 3. Time Animation (slider, playback controls)
  const timeAnimation = useTimeAnimation(capTime);
  const {
    sliderIndex,
    setSliderIndex,
    isPlaying,
    setIsPlaying,
    totalSteps,
    currentSliderDate,
    currentSliderDateStr,
    minIndex
  } = timeAnimation;

  // 4. UI State (canvas visibility, drag state, responsive layout)
  const uiState = useUIState();
  const {
    showBuoyCanvas,
    setShowBuoyCanvas,
    showBottomCanvas,
    setShowBottomCanvas,
    bottomCanvasData,
    setBottomCanvasData,
    selectedBuoyId,
    wmsOpacity,
    setWmsOpacity,
    isUpdatingVisualization,
    openBottomCanvas
  } = uiState;

  // 5. Map Rendering (Leaflet integration, WMS layer rendering)
  const mapRendering = useMapRendering({
    activeLayers,
    selectedWaveForecast,
    dynamicLayers,
    staticLayers: STATIC_LAYERS,
    currentSliderDateStr,
    wmsOpacity,
    addWMSTileLayer,
    handleShow: openBottomCanvas,
    bounds
  });
  const { mapRef, mapInstance } = mapRendering;

  // 6. Legend Management (legend rendering, image loading)
  const legendManagement = useLegendManagement({
    selectedWaveForecast,
    dynamicLayers,
    staticLayers: STATIC_LAYERS
  });

  // 7. Map Interaction (click handling, feature info)
  useMapInteraction({
    mapInstance,
    currentSliderDate,
    setBottomCanvasData,
    setShowBottomCanvas,
    debugMode: false
  });

  // Return the composed API (same interface as before)
  return {
    // UI State
    showBuoyCanvas,
    setShowBuoyCanvas,
    showBottomCanvas,
    setShowBottomCanvas,
    bottomCanvasData,
    setBottomCanvasData,
    selectedBuoyId,
    
    // Layer Management
    activeLayers,
    setActiveLayers,
    selectedWaveForecast,
    setSelectedWaveForecast,
    
    // Time & Animation
    capTime,
    sliderIndex,
    setSliderIndex,
    totalSteps,
    isPlaying,
    setIsPlaying,
    currentSliderDate,
    minIndex,
    
    // Map & Rendering
    mapRef,
    mapInstance,
    wmsOpacity,
    setWmsOpacity,
    dynamicLayers,
    isUpdatingVisualization,
    
    // Legend
    ...legendManagement,
    
    // Additional computed values
    currentSliderDateStr,
    selectedLayerConfig,
    
    // Spread additional control functions
    ...timeAnimation,
    ...uiState,
    ...layerManagement
  };
};