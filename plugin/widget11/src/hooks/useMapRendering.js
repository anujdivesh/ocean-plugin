import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { getIslandWaveDisplayStats, calculateAdaptiveColorScale } from '../utils/IslandWaveStats';
/**
 * Hook for managing Leaflet map rendering and WMS layer visualization
 * Handles map instance, layer addition/removal, and rendering logic
 */
export const useMapRendering = ({
  activeLayers,
  selectedWaveForecast,
  dynamicLayers,
  staticLayers,
  currentSliderDateStr,
  sliderIndex,
  totalSteps,
  wmsOpacity,
  addWMSTileLayer,
  handleShow,
  bounds,
  selectedIsland
}) => {
  const [adaptiveColorScaleRange, setAdaptiveColorScaleRange] = useState(null);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const wmsLayerGroup = useRef(null);
  const wmsLayerRefs = useRef([]);
  const layerRefs = useRef({});

  useEffect(() => {
    const calculateRange = async () => {
      if (selectedIsland && selectedWaveForecast && currentSliderDateStr) {
        const stats = await getIslandWaveDisplayStats(selectedIsland, currentSliderDateStr);
        if (stats && stats.wavePeriod) {
          const colorScale = calculateAdaptiveColorScale(stats.wavePeriod, selectedWaveForecast);
          setAdaptiveColorScaleRange(colorScale);
        }
      }
    };

    calculateRange();
  }, [selectedIsland, selectedWaveForecast, currentSliderDateStr]);

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

    // Determine if layer is time-dimensionless
    const isTimeDimensionless = selectedLayer.isStatic || selectedLayer.id === 200;
    
    // CRITICAL: Don't render time-dimensional layers if time data isn't ready yet
    if (!isTimeDimensionless && !currentSliderDateStr) {
      console.log('⏳ Waiting for time data before rendering WMS layers...');
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
    
    // Prepare layers to add - handle composite layers (which already include direction overlay)
    const layersToAdd = selectedLayer.composite ? selectedLayer.layers : [selectedLayer];

    layersToAdd.forEach(layerConfig => {
      const commonOptions = {
        layers: layerConfig.value,
        format: "image/png",
        transparent: true,
        opacity: wmsOpacity,
        styles: layerConfig.style,
        version: '1.3.0',
        crs: L.CRS.EPSG4326,
        pane: 'overlayPane',
      };
      
      // Add DATASET parameter only for ncWMS servers, not THREDDS
      // BUT only if the layer value doesn't already include the dataset prefix
      const isThreddsServer = layerConfig.wmsUrl && (layerConfig.wmsUrl.includes('thredds') || layerConfig.wmsUrl.includes('/api/thredds/'));
      const layerHasDatasetPrefix = layerConfig.value && layerConfig.value.includes('/');
      
      // Only add DATASET for ncWMS servers, not for THREDDS
      if (!isThreddsServer && !layerHasDatasetPrefix && layerConfig.dataset) {
        commonOptions.DATASET = layerConfig.dataset;
      }

      // Only add time parameter for time-dimensional layers
      if (!isTimeDimensionless && currentSliderDateStr) {
        if (isThreddsServer) {
          // Format for THREDDS: Remove milliseconds and use simpler format
          const threddsTime = new Date(currentSliderDateStr).toISOString().replace(/\.\d{3}Z$/, 'Z');
          console.log(`🕐 WMS TIME parameter for ${layerConfig.value}: ${threddsTime}`);
          commonOptions.time = threddsTime;
        } else {
          commonOptions.time = currentSliderDateStr;
        }
      }

      // Special handling for wave direction in composite layers (now uses THREDDS)
      const isWaveDirectionLayer = layerConfig.value === 'dirm' || layerConfig.value === 'Dir';
      
      // Add WMS layer to map
      const wmsLayer = addWMSTileLayer(
        mapInstance.current,
        layerConfig.wmsUrl,
        {
          ...commonOptions,
          colorscalerange: adaptiveColorScaleRange ? `${adaptiveColorScaleRange.min},${adaptiveColorScaleRange.max}` : layerConfig.colorscalerange || "",
          abovemaxcolor: isWaveDirectionLayer ? "transparent" : "extend",
          belowmincolor: "transparent",
          numcolorbands: layerConfig.numcolorbands || "250",
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
    addWMSTileLayer,
    adaptiveColorScaleRange
  ]);

  // ✅ NEW: Efficiently update TIME parameter without recreating layers
  useEffect(() => {
    if (!wmsLayerRefs.current.length || !currentSliderDateStr) return;

    console.log(`🕒 Updating TIME parameter for ${wmsLayerRefs.current.length} layers to: ${currentSliderDateStr}`);
    console.log(`   Current slider index: ${sliderIndex}, Total steps: ${totalSteps}`);

    wmsLayerRefs.current.forEach(layer => {
      if (layer && layer.setParams && layer.wmsParams) {
        // Check if this layer should have time dimension
        const layerName = layer.wmsParams.layers || '';
        const isInundationLayer = layerName.includes('raro_inun'); // Static layer, no time dimension
        
        // Skip time update for static/time-dimensionless layers
        if (!isInundationLayer) {
          // Format time for THREDDS if needed
          const isThredds = layer._url && layer._url.includes('thredds');
          const timeValue = isThredds 
            ? new Date(currentSliderDateStr).toISOString().replace(/\.\d{3}Z$/, 'Z')
            : currentSliderDateStr;
          
          // Update time parameter without full redraw
          layer.setParams({ time: timeValue }, false);
          console.log(`   ✅ Updated TIME for layer: ${layerName}`);
        } else {
          console.log(`   ⏭️  Skipped TIME for static/direction layer: ${layerName}`);
        }
      }
    });

    // Single redraw for all layers after updating params
    wmsLayerRefs.current.forEach(layer => {
      if (layer && layer.redraw) {
        layer.redraw();
      }
    });

  }, [currentSliderDateStr, sliderIndex, totalSteps]);

  // ✅ NEW: Update opacity for all active layers when opacity changes
  useEffect(() => {
    if (!wmsLayerRefs.current.length) return;

    console.log(`🎨 Updating opacity for ${wmsLayerRefs.current.length} layers to: ${wmsOpacity}`);

    wmsLayerRefs.current.forEach(layer => {
      if (layer && layer.setOpacity) {
        layer.setOpacity(wmsOpacity);
        const layerName = layer.wmsParams?.layers || 'unknown';
        console.log(`   ✅ Updated opacity for layer: ${layerName}`);
      }
    });

  }, [wmsOpacity]);

  return {
    mapRef,
    mapInstance,
    wmsLayerGroup: wmsLayerGroup.current,
    wmsLayerRefs: wmsLayerRefs.current
  };
};
