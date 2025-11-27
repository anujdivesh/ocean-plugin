/**
 * Custom hook for handling map interactions
 * 
 * Orchestrates MapInteractionService and BottomCanvasManager
 * to provide clean map click handling with proper separation of concerns.
 * 
 * Enhanced for Cook Islands dashboard:
 * - Shows popup instead of bottom canvas for inundation layer when zoomed in
 */

import { useEffect, useCallback, useRef } from 'react';
import L from 'leaflet';
import MapInteractionService from '../services/MapInteractionService';
import BottomCanvasManager from '../services/BottomCanvasManager';
import MapMarkerService from '../services/MapMarkerService';
import { isInundationLayer, INUNDATION_POPUP_ZOOM_THRESHOLD } from '../config/layerConfig';

/**
 * Create popup content for inundation layer
 * @param {string} value - The inundation depth value
 * @returns {string} HTML content for the popup
 */
const createInundationPopupContent = (value) => {
  const hasValidValue = value !== 'No Data' && value !== 'Loading...' && value !== 'Error fetching data';
  const unit = hasValidValue ? ' m' : '';
  
  return `
    <div class="inundation-popup">
      <div class="inundation-popup-title">Inundation Depth</div>
      <div class="inundation-popup-value">${value}${unit}</div>
    </div>
  `;
};

/**
 * Create error popup content for inundation layer
 * @returns {string} HTML content for the error popup
 */
const createInundationErrorPopupContent = () => {
  return `
    <div class="inundation-popup">
      <div class="inundation-popup-title">Inundation Depth</div>
      <div class="inundation-popup-value inundation-popup-error">Error loading data</div>
    </div>
  `;
};

export const useMapInteraction = ({
  mapInstance,
  currentSliderDate,
  setBottomCanvasData,
  setShowBottomCanvas,
  selectedWaveForecast = '',
  debugMode = false
}) => {
  // Create stable service instances using useRef
  const servicesRef = useRef(null);
  
  if (!servicesRef.current) {
    servicesRef.current = {
      mapInteractionService: new MapInteractionService({ debugMode }),
      canvasManager: new BottomCanvasManager(setBottomCanvasData, setShowBottomCanvas),
      markerService: new MapMarkerService({ debugMode })
    };
  }
  
  // Update debug mode when it changes
  useEffect(() => {
    servicesRef.current.mapInteractionService.setDebugMode(debugMode);
    servicesRef.current.markerService.setDebugMode(debugMode);
  }, [debugMode]);

  // Update canvas manager when dependencies change
  useEffect(() => {
    servicesRef.current.canvasManager = new BottomCanvasManager(setBottomCanvasData, setShowBottomCanvas);
  }, [setBottomCanvasData, setShowBottomCanvas]);
  
  // Clean map click handler
  const handleMapClick = useCallback(async (clickEvent) => {
    const map = mapInstance?.current;
    if (!map) return;
    
    // Check if inundation layer is active and we're zoomed in
    const isInundation = isInundationLayer(selectedWaveForecast);
    const currentZoom = map.getZoom();
    const shouldShowPopup = isInundation && currentZoom >= INUNDATION_POPUP_ZOOM_THRESHOLD;
    
    try {
      // Add temporary marker at click location (but not for inundation popup mode)
      if (clickEvent.latlng && !shouldShowPopup) {
        // Ensure marker service is initialized with the map before use
        if (!servicesRef.current.markerService.mapInstance) {
          servicesRef.current.markerService.initialize(map);
        }
        servicesRef.current.markerService.addTemporaryMarker(
          clickEvent.latlng,
          { usePin: true },
          map
        );
      }
      
      const result = await servicesRef.current.mapInteractionService.handleMapClick(
        clickEvent, 
        map, 
        currentSliderDate
      );
      
      // For inundation layer when zoomed in, show popup instead of bottom canvas
      if (shouldShowPopup) {
        const value = result.data?.featureInfo || result.featureInfo || 'No Data';
        const latlng = clickEvent.latlng;
        
        L.popup()
          .setLatLng(latlng)
          .setContent(createInundationPopupContent(value))
          .openOn(map);
        
        console.log('🌊 Showing inundation popup:', value, 'at zoom:', currentZoom);
        return;
      }
      
      // Handle loading state for WMS interactions (normal behavior)
      if (result.loadingData) {
        await servicesRef.current.canvasManager.handleAsyncData(
          result.loadingData,
          Promise.resolve(result.data)
        );
      } else {
        // Direct result (fallback case)
        servicesRef.current.canvasManager.showSuccessState(result);
      }
      
    } catch (error) {
      console.error('Map interaction failed:', error);
      
      // For inundation layer errors when zoomed in, still show popup
      if (shouldShowPopup) {
        L.popup()
          .setLatLng(clickEvent.latlng)
          .setContent(createInundationErrorPopupContent())
          .openOn(map);
        return;
      }
      
      servicesRef.current.canvasManager.showErrorState({
        featureInfo: "Map interaction failed",
        error: error.message,
        status: "error"
      });
    }
  }, [mapInstance, currentSliderDate, selectedWaveForecast]);
  
  // Initialize services when map is available
  useEffect(() => {
    const map = mapInstance?.current;
    if (!map) return;
    
    // Initialize marker service with map instance
    servicesRef.current.markerService.initialize(map);
    
    return () => {
      servicesRef.current.markerService.cleanup();
    };
  }, [mapInstance]);

  // Set up map click listener
  useEffect(() => {
    const map = mapInstance?.current;
    if (!map) return;
    
    map.on('click', handleMapClick);
    
    return () => {
      map.off('click', handleMapClick);
    };
  }, [mapInstance, handleMapClick]);
  
  // Return control functions if needed
  return {
    hideCanvas: () => {
      servicesRef.current.canvasManager.hide();
      servicesRef.current.markerService.removeMarker();
    },
    setDebugMode: (enabled) => {
      servicesRef.current.mapInteractionService.setDebugMode(enabled);
      servicesRef.current.markerService.setDebugMode(enabled);
    },
    removeMarker: () => servicesRef.current.markerService.removeMarker()
  };
};

export default useMapInteraction;