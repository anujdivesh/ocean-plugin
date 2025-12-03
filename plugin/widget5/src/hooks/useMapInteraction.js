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
import { isInundationLayer, INUNDATION_POPUP_ZOOM_THRESHOLD, getLayerBounds } from '../config/layerConfig';

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
    
    // If inundation layer is active but not zoomed in enough, zoom to layer center
    if (isInundation && currentZoom < INUNDATION_POPUP_ZOOM_THRESHOLD) {
      const layerBounds = getLayerBounds(selectedWaveForecast);
      if (layerBounds) {
        console.log('🔍 Zooming to inundation layer at zoom level', INUNDATION_POPUP_ZOOM_THRESHOLD);
        // Calculate center of bounds
        const centerLat = (layerBounds.southWest[0] + layerBounds.northEast[0]) / 2;
        const centerLng = (layerBounds.southWest[1] + layerBounds.northEast[1]) / 2;
        // Zoom directly to the threshold level at the center
        map.setView([centerLat, centerLng], INUNDATION_POPUP_ZOOM_THRESHOLD, {
          animate: true,
          duration: 0.5
        });
      } else {
        // Fallback to click location if bounds not available
        console.log('🔍 Zooming to inundation click location at zoom', INUNDATION_POPUP_ZOOM_THRESHOLD);
        map.setView(clickEvent.latlng, INUNDATION_POPUP_ZOOM_THRESHOLD, {
          animate: true,
          duration: 0.5
        });
      }
      return; // Exit early, the zoom will trigger another click if needed
    }
    
    try {
      // For inundation layer when zoomed in, show popup instead of bottom canvas
      // Handle this BEFORE calling handleMapClick to prevent canvas from showing
      if (shouldShowPopup) {
        // Immediately hide any open canvas before making the request
        servicesRef.current.canvasManager.hide();
        
        // Don't show marker for popup mode
        // Pass autoShow: false to prevent canvas from showing during loading
        const result = await servicesRef.current.mapInteractionService.handleMapClick(
          clickEvent, 
          map, 
          currentSliderDate,
          { autoShow: false } // Prevent canvas from showing
        );
        
        let value = result.data?.featureInfo || result.featureInfo || 'No Data';
        const latlng = clickEvent.latlng;
        
        // Only show fallback message if truly no data (not a numeric value or message with instructions)
        if (value === 'No Data' || value.includes('Click on colored areas')) {
          const lat = latlng.lat.toFixed(5);
          const lng = latlng.lng.toFixed(5);
          value = `No data at (${lat}, ${lng}). Click on colored inundation areas.`;
        }
        
        // Make sure bottom canvas is hidden
        servicesRef.current.canvasManager.hide();
        
        // Create popup with specific class for styling
        L.popup({ className: 'inundation-leaflet-popup' })
          .setLatLng(latlng)
          .setContent(createInundationPopupContent(value))
          .openOn(map);
        
        console.log('🌊 Showing inundation popup:', value, 'at zoom:', currentZoom);
        return; // Exit early - don't show canvas
      }
      
      // Normal flow for non-inundation or low zoom: show bottom canvas
      // Add temporary marker at click location
      if (clickEvent.latlng) {
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
        // Hide bottom canvas if it was previously open to avoid stale data lingering
        servicesRef.current.canvasManager.hide();
        
        L.popup({ className: 'inundation-leaflet-popup' })
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