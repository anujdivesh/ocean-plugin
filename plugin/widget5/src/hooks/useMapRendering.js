import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { isRasterSourceLayer } from '../config/layerConfig';

const removeExistingLegendControls = () => {
  const legendNodes = document.querySelectorAll('.forecast-map-legend');
  legendNodes.forEach((node) => {
    const controlNode = node.closest('.leaflet-control');
    if (controlNode) {
      controlNode.remove();
    } else {
      node.remove();
    }
  });
};

const toLeafletBounds = (layerConfig, timelineMetadata) => {
  if (timelineMetadata?.lat_min !== undefined && timelineMetadata?.lon_min !== undefined &&
      timelineMetadata?.lat_max !== undefined && timelineMetadata?.lon_max !== undefined) {
    return L.latLngBounds(
      [timelineMetadata.lat_min, timelineMetadata.lon_min],
      [timelineMetadata.lat_max, timelineMetadata.lon_max]
    );
  }

  if (layerConfig?.bounds?.southWest && layerConfig?.bounds?.northEast) {
    return L.latLngBounds(layerConfig.bounds.southWest, layerConfig.bounds.northEast);
  }

  return null;
};

const formatThreddsTime = (timeValue) => {
  if (!timeValue) {
    return timeValue;
  }

  return new Date(timeValue).toISOString().replace(/\.\d{3}Z$/, 'Z');
};

/**
 * Hook for managing Leaflet map rendering and WMS layer visualization
 * Handles map instance, layer addition/removal, and rendering logic
 */
export const useMapRendering = ({
  activeLayers,
  selectedWaveForecast,
  selectedLayerConfig,
  dynamicLayers,
  staticLayers,
  currentSliderDateStr,
  sliderIndex,
  getRasterFrame,
  isBuffering,
  capTime,
  wmsOpacity,
  addWMSTileLayer,
  handleShow,
  bounds
}) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const wmsLayerGroup = useRef(null);
  const wmsLayerRefs = useRef([]);
  const rasterOverlayRef = useRef(null);
  const rasterDisplayedFrameRef = useRef(null);
  const rasterDisplayedFrameKeyRef = useRef(null);
  const layerRefs = useRef({});
  const legendControlRef = useRef(null);
  const capTimeMetadata = capTime?.metadata;

  // Initialize map with base layers
  useEffect(() => {
    if (mapRef.current && !mapInstance.current) {
      const map = L.map(mapRef.current, { attributionControl: false });
      if (bounds) {
        map.fitBounds(bounds);
      }
      mapInstance.current = map;

      // Add base layers
      const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { 
        attribution: '&copy; OpenStreetMap' 
      });
      const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { 
        attribution: '© Esri' 
      });
      
      // Set satellite as the default layer
      satelliteLayer.addTo(map);
      layerRefs.current.satellite = satelliteLayer;
      
      // Create WMS layer group
      wmsLayerGroup.current = L.layerGroup().addTo(map);

      // Add layer controls - positioned at top-left to make room for compass at top-right
      const baseMaps = { "OpenStreetMap": osmLayer, "Satellite": satelliteLayer };
      const overlayMaps = { "Wave Forecast": wmsLayerGroup.current };
      L.control.layers(baseMaps, overlayMaps, { position: 'topleft' }).addTo(map);

      // Add controls
      if (map.zoomControl) {
        map.zoomControl.setPosition('topleft');
      }
      L.control.scale({ position: 'bottomleft', metric: true, imperial: false }).addTo(map);
    }
    
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [bounds]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    let selectedLayer = dynamicLayers.find(l => l.value === selectedWaveForecast);
    if (!selectedLayer) {
      selectedLayer = staticLayers.find(l => l.value === selectedWaveForecast);
    }

    if (legendControlRef.current) {
      map.removeControl(legendControlRef.current);
      legendControlRef.current = null;
    }

    removeExistingLegendControls();

    return () => {
      removeExistingLegendControls();
    };
  }, [selectedWaveForecast, dynamicLayers, staticLayers]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    if (!selectedLayerConfig || !isRasterSourceLayer(selectedLayerConfig)) {
      if (rasterOverlayRef.current) {
        map.removeLayer(rasterOverlayRef.current);
        rasterOverlayRef.current = null;
      }
      rasterDisplayedFrameRef.current = null;
      rasterDisplayedFrameKeyRef.current = null;
      return;
    }

    if (!activeLayers.waveForecast) {
      if (rasterOverlayRef.current) {
        map.removeLayer(rasterOverlayRef.current);
        rasterOverlayRef.current = null;
      }
      rasterDisplayedFrameRef.current = null;
      rasterDisplayedFrameKeyRef.current = null;
      return;
    }

    const preloadedFrame = getRasterFrame?.(sliderIndex);
    const renderFrame = preloadedFrame || rasterDisplayedFrameRef.current;
    const overlayBounds = toLeafletBounds(selectedLayerConfig, capTimeMetadata);

    if (!overlayBounds) {
      console.warn('Missing raster overlay bounds for layer:', selectedLayerConfig.value);
      return;
    }

    if (!renderFrame) {
      return;
    }

    if (rasterOverlayRef.current) {
      rasterOverlayRef.current.setBounds(overlayBounds);
      rasterOverlayRef.current.setOpacity(wmsOpacity);

      if (rasterDisplayedFrameKeyRef.current !== renderFrame.cacheKey) {
        rasterOverlayRef.current.setUrl(renderFrame.url);
        rasterDisplayedFrameRef.current = renderFrame;
        rasterDisplayedFrameKeyRef.current = renderFrame.cacheKey;
      }
      return;
    }

    rasterOverlayRef.current = L.imageOverlay(renderFrame.image, overlayBounds, {
      opacity: wmsOpacity,
      interactive: false,
      crossOrigin: true
    }).addTo(map);
    rasterDisplayedFrameRef.current = renderFrame;
    rasterDisplayedFrameKeyRef.current = renderFrame.cacheKey;
  }, [
    activeLayers.waveForecast,
    selectedLayerConfig,
    sliderIndex,
    getRasterFrame,
    isBuffering,
    capTimeMetadata,
    wmsOpacity
  ]);

  // A+ WMS layer rendering with diff-based updates and layer caching
  useEffect(() => {
    if (!mapInstance.current || !wmsLayerGroup.current) return;
    if (!activeLayers.waveForecast) return;

    // Find selected layer - check dynamic layers first, then static layers
    let selectedLayer = dynamicLayers.find(l => l.value === selectedWaveForecast);
    if (!selectedLayer) {
      selectedLayer = staticLayers.find(l => l.value === selectedWaveForecast);
    }
    if (!selectedLayer) return;

    if (isRasterSourceLayer(selectedLayer)) {
      wmsLayerGroup.current.clearLayers();
      wmsLayerRefs.current.forEach(layer => {
        if (layer && mapInstance.current.hasLayer(layer)) {
          mapInstance.current.removeLayer(layer);
        }
      });
      wmsLayerRefs.current = [];
      return;
    }

    // Performance optimization: Clear and rebuild layers efficiently
    // TODO: Implement layer diffing in future iteration for even better performance
    wmsLayerGroup.current.clearLayers();
    wmsLayerRefs.current.forEach(layer => {
      if (layer && mapInstance.current.hasLayer(layer)) {
        mapInstance.current.removeLayer(layer);
      }
    });
    wmsLayerRefs.current = [];

    // Determine if layer is time-dimensionless
    const isTimeDimensionless = selectedLayer.isStatic === true;
    
    // Prepare layers to add - handle composite layers (which already include direction overlay)
    const layersToAdd = selectedLayer.composite ? selectedLayer.layers : [selectedLayer];

    layersToAdd.forEach(layerConfig => {
      const commonOptions = {
        layers: layerConfig.value,
        format: "image/png",
        transparent: true,
        opacity: wmsOpacity,
        styles: layerConfig.style,
        version: layerConfig.version || '1.3.0',
        crs: layerConfig.crs || L.CRS.EPSG4326,
        pane: 'overlayPane',
      };
      
      // Add DATASET parameter only for ncWMS servers, not THREDDS
      // BUT only if the layer value doesn't already include the dataset prefix
      const isThreddsServer = layerConfig.wmsUrl && (layerConfig.wmsUrl.includes('thredds') || layerConfig.wmsUrl.includes('/api/thredds/'));
      const layerHasDatasetPrefix = layerConfig.value && layerConfig.value.includes('/');
      
      if (!isThreddsServer && !layerHasDatasetPrefix) {
        commonOptions.DATASET = layerConfig.dataset || 'cook_forecast';
      }

      // Only add time parameter for time-dimensional layers
      if (!isTimeDimensionless && currentSliderDateStr) {
        // Special handling for wave direction layer - often works better without time parameter
        const isWaveDirectionLayer = layerConfig.value === 'dirm';
        
        if (isWaveDirectionLayer) {
          // Skip time parameter for wave direction - let it use latest available data
          console.log('🌊 Skipping time parameter for wave direction layer');
        } else if (isThreddsServer) {
          commonOptions.time = formatThreddsTime(currentSliderDateStr);
        } else {
          commonOptions.time = currentSliderDateStr;
        }
      }

      // Special handling for wave direction in composite layers (now uses THREDDS)
      const isWaveDirectionLayer = layerConfig.value === 'dirm';
      
      // Add WMS layer to map
      const wmsLayer = addWMSTileLayer(
        mapInstance.current,
        layerConfig.wmsUrl,
        {
          ...commonOptions,
          colorscalerange: layerConfig.colorscalerange || "",
          abovemaxcolor: isWaveDirectionLayer ? "transparent" : "extend",
          belowmincolor: "transparent",
          numcolorbands: layerConfig.numcolorbands || "250",
          colorscaling: layerConfig.colorscaling,
          // Use layer-specific opacity if defined, otherwise use global opacity
          opacity: layerConfig.opacity || wmsOpacity,
        },
        handleShow
      );
      
      wmsLayerGroup.current.addLayer(wmsLayer);
      wmsLayerRefs.current.push(wmsLayer);
    });

  }, [
    activeLayers.waveForecast, 
    selectedWaveForecast, 
    handleShow, 
    currentSliderDateStr, 
    wmsOpacity, 
    dynamicLayers,
    staticLayers,
    addWMSTileLayer
  ]);

  // ✅ NEW: Efficiently update TIME parameter without recreating layers
  useEffect(() => {
    if (selectedLayerConfig && isRasterSourceLayer(selectedLayerConfig)) {
      return;
    }

    if (!wmsLayerRefs.current.length || !currentSliderDateStr) return;

    console.log(`🕒 Updating TIME parameter for ${wmsLayerRefs.current.length} layers to: ${currentSliderDateStr}`);

    wmsLayerRefs.current.forEach(layer => {
      if (layer && layer.setParams && layer.wmsParams) {
        // Check if this layer should have time dimension
        const layerName = layer.wmsParams.layers || '';
        const isDirectionLayer = layerName.includes('dirm');
        
        // Skip time update only for direction layers
        if (!isDirectionLayer) {
          // Format time for THREDDS if needed
          const isThredds = layer._url && layer._url.includes('thredds');
          const timeValue = isThredds
            ? formatThreddsTime(currentSliderDateStr)
            : currentSliderDateStr;
          
          // Update time parameter without full redraw
          layer.setParams({ time: timeValue }, false);
          console.log(`   ✅ Updated TIME for layer: ${layerName}`);
        } else {
          console.log(`   ⏭️  Skipped TIME for direction layer: ${layerName}`);
        }
      }
    });

    // Single redraw for all layers after updating params
    wmsLayerRefs.current.forEach(layer => {
      if (layer && layer.redraw) {
        layer.redraw();
      }
    });

  }, [currentSliderDateStr, selectedLayerConfig]);

  // ✅ NEW: Update opacity for all active layers when opacity changes
  useEffect(() => {
    if (selectedLayerConfig && isRasterSourceLayer(selectedLayerConfig)) {
      if (rasterOverlayRef.current) {
        rasterOverlayRef.current.setOpacity(wmsOpacity);
      }
      return;
    }

    if (!wmsLayerRefs.current.length) return;

    console.log(`🎨 Updating opacity for ${wmsLayerRefs.current.length} layers to: ${wmsOpacity}`);

    wmsLayerRefs.current.forEach(layer => {
      if (layer && layer.setOpacity) {
        layer.setOpacity(wmsOpacity);
        const layerName = layer.wmsParams?.layers || 'unknown';
        console.log(`   ✅ Updated opacity for layer: ${layerName}`);
      }
    });

  }, [wmsOpacity, selectedLayerConfig]);

  return {
    mapRef,
    mapInstance,
    wmsLayerGroup: wmsLayerGroup.current,
    wmsLayerRefs: wmsLayerRefs.current
  };
};
