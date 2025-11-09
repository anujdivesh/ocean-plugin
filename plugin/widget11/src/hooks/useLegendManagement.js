import { useEffect, useRef } from 'react';

/**
 * Hook for managing legend rendering and updates
 * Handles legend image loading, error handling, and DOM manipulation
 */
export const useLegendManagement = ({
  selectedWaveForecast,
  dynamicLayers,
  staticLayers
}) => {
  const legendContainerRef = useRef(null);

  // Legend rendering effect
  useEffect(() => {
    if (!legendContainerRef.current) return;

    const container = legendContainerRef.current;
    container.innerHTML = '';

    // Find layer configuration
    const findLayerConfig = (layers) => {
      if (!Array.isArray(layers)) return null;
      
      for (const layer of layers) {
        if (layer?.value === selectedWaveForecast) {
          if (layer.legendUrl) {
            return layer;
          }

          if (layer?.composite && Array.isArray(layer.layers)) {
            const childWithLegend = layer.layers.find(subLayer => subLayer?.legendUrl);
            if (childWithLegend) {
              return childWithLegend;
            }
          }
        }

        if (layer?.composite && Array.isArray(layer.layers)) {
          const nested = findLayerConfig(layer.layers);
          if (nested) {
            return nested;
          }
        }
      }
      return null;
    };

    const dynamicLayer = findLayerConfig(dynamicLayers);
    const staticLayer = findLayerConfig(staticLayers);
    const layerConfig = dynamicLayer || staticLayer;

    if (layerConfig?.legendUrl) {
      const legendImg = document.createElement('img');
      legendImg.src = layerConfig.legendUrl;
      legendImg.alt = `Legend for ${layerConfig.label || layerConfig.value || 'selected layer'}`;
      legendImg.className = 'forecast-map-legend__image';
      
      // Error handling for legend images
      legendImg.onerror = () => {
        console.warn(`Failed to load legend image: ${layerConfig.legendUrl}`);
        legendImg.style.display = 'none';
        
        // Show fallback text
        const fallback = document.createElement('div');
        fallback.className = 'forecast-map-legend__fallback';
        fallback.textContent = `Legend unavailable for ${layerConfig.label || 'selected layer'}`;
        container.appendChild(fallback);
      };
      
      legendImg.onload = () => {
        console.log(`Legend loaded successfully for ${layerConfig.label}`);
      };
      
      container.appendChild(legendImg);

      if (layerConfig.label) {
        const caption = document.createElement('div');
        caption.className = 'forecast-map-legend__caption';
        caption.textContent = layerConfig.label;
        container.appendChild(caption);
      }
    } else {
      // Show message when no legend is available
      const noLegend = document.createElement('div');
      noLegend.className = 'forecast-map-legend__no-legend';
      noLegend.textContent = 'No legend available';
      container.appendChild(noLegend);
    }

  }, [selectedWaveForecast, dynamicLayers, staticLayers]);

  return {
    legendContainerRef
  };
};
