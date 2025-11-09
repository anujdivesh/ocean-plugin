import { useEffect } from 'react';

/**
 * Legend Cleanup Component
 * Ensures all legends are accurate and removes outdated hardcoded legend elements
 */
const LegendCleanup = ({ selectedWaveForecast, WAVE_FORECAST_LAYERS }) => {
  
  useEffect(() => {
    // Clean up any hardcoded or outdated legend elements
    const cleanupOutdatedLegends = () => {
      // Remove any hardcoded legend elements that might exist
      const outdatedLegends = document.querySelectorAll('.leaflet-control.forecast-map-legend');
      outdatedLegends.forEach(legend => {
        // Check if this is a hardcoded element with outdated psu-plasma palette
        const img = legend.querySelector('img');
        if (img && img.src.includes('PALETTE=psu-plasma') && img.src.includes('cook_forecast%2Ftm02')) {
          console.log('Removing outdated hardcoded legend element:', legend);
          legend.remove();
        }
      });
      
      // Remove any legends with incorrect palette configurations
      const allLegendImages = document.querySelectorAll('.forecast-map-legend__image');
      allLegendImages.forEach(img => {
        if (img.src.includes('cook_forecast%2Ftm02') && img.src.includes('PALETTE=psu-plasma')) {
          console.log('Removing legend with outdated palette:', img.parentElement);
          img.parentElement.remove();
        }
      });
    };

    // Run cleanup immediately
    cleanupOutdatedLegends();
    
    // Run cleanup after a short delay to catch dynamically generated elements
    const timeoutId = setTimeout(cleanupOutdatedLegends, 500);
    
    // Set up observer to clean up any newly added outdated elements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if the added node contains outdated legend elements
              const outdatedElements = node.querySelectorAll ? 
                node.querySelectorAll('.forecast-map-legend img[src*="PALETTE=psu-plasma"][src*="cook_forecast%2Ftm02"]') : 
                [];
              
              outdatedElements.forEach(element => {
                console.log('Removing newly added outdated legend element:', element.closest('.forecast-map-legend'));
                element.closest('.forecast-map-legend')?.remove();
              });
            }
          });
        }
      });
    });
    
    // Start observing the document for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [selectedWaveForecast]);

  // Validate current legend configuration
  useEffect(() => {
    const validateLegendAccuracy = () => {
      const selectedLayer = WAVE_FORECAST_LAYERS.find(l => l.value === selectedWaveForecast);
      
      if (selectedLayer) {
        console.log('📊 Active Layer Configuration:', {
          label: selectedLayer.label,
          value: selectedLayer.value,
          style: selectedLayer.style,
          colorscalerange: selectedLayer.colorscalerange,
          legendUrl: selectedLayer.legendUrl,
          description: selectedLayer.description
        });
        
        // Validate that tm02 is using divergent palette
        if (selectedLayer.value === 'cook_forecast/tm02') {
          if (selectedLayer.style?.includes('div-Spectral')) {
            console.log('✅ Mean Wave Period using correct divergent spectral palette');
          } else if (selectedLayer.style?.includes('psu-plasma')) {
            console.warn('⚠️ Mean Wave Period still using old plasma palette - should use divergent spectral');
          }
        }
      }
    };
    
    validateLegendAccuracy();
  }, [selectedWaveForecast, WAVE_FORECAST_LAYERS]);

  return null; // This is a utility component with no render
};

export default LegendCleanup;