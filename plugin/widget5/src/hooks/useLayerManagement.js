import { useState, useEffect, useMemo } from 'react';
import LayerCollectionManager from '../services/LayerCollectionManager';

/**
 * Hook for managing layer selection, active layers, and dynamic layer configs
 * Handles layer state without map rendering concerns using proper service abstractions
 */
export const useLayerManagement = (WAVE_FORECAST_LAYERS, STATIC_LAYERS) => {
  const [activeLayers, setActiveLayers] = useState({ 
    waveForecast: true, 
    "stamen-toner": true 
  });
  
  const [selectedWaveForecast, setSelectedWaveForecast] = useState(
    WAVE_FORECAST_LAYERS[0]?.value || ''
  );
  
  // Create dynamic layers from wave forecast layers using proper service
  const [dynamicLayers, setDynamicLayers] = useState(() => 
    LayerCollectionManager.cloneCollection(WAVE_FORECAST_LAYERS)
  );

  // Combined layers for UI components that need all layers
  const allLayers = useMemo(() => {
    return LayerCollectionManager.combineCollections(WAVE_FORECAST_LAYERS, STATIC_LAYERS);
  }, [WAVE_FORECAST_LAYERS, STATIC_LAYERS]);

  // Update dynamic layers when WAVE_FORECAST_LAYERS changes
  useEffect(() => {
    setDynamicLayers(LayerCollectionManager.cloneCollection(WAVE_FORECAST_LAYERS));
  }, [WAVE_FORECAST_LAYERS]);

  // Get current selected layer config using proper service
  const selectedLayerConfig = useMemo(() => {
    return LayerCollectionManager.findLayerByValue(allLayers, selectedWaveForecast);
  }, [allLayers, selectedWaveForecast]);

  // Layer control functions
  const toggleLayer = (layerKey) => {
    setActiveLayers(prev => ({
      ...prev,
      [layerKey]: !prev[layerKey]
    }));
  };

  const setLayerActive = (layerKey, active) => {
    setActiveLayers(prev => ({
      ...prev,
      [layerKey]: active
    }));
  };

  const updateDynamicLayer = (layerValue, updates) => {
    setDynamicLayers(prevLayers => 
      LayerCollectionManager.applyUpdatesToLayers(prevLayers, layerValue, updates)
    );
  };

  // Additional utility functions using services
  const findLayerByValue = (value) => {
    return LayerCollectionManager.findLayerByValue(allLayers, value);
  };

  const getStaticLayers = () => {
    return LayerCollectionManager.getStaticLayers(allLayers);
  };

  const getForecastLayers = () => {
    return LayerCollectionManager.getForecastLayers(allLayers);
  };

  return {
    // Layer states
    activeLayers,
    setActiveLayers,
    selectedWaveForecast,
    setSelectedWaveForecast,
    dynamicLayers,
    setDynamicLayers,
    allLayers,
    selectedLayerConfig,
    
    // Control functions
    toggleLayer,
    setLayerActive,
    updateDynamicLayer,
    
    // Utility functions
    findLayerByValue,
    getStaticLayers,
    getForecastLayers
  };
};