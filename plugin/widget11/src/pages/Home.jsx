import React, { useEffect, useMemo, useState, useRef } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import addWMSTileLayer from "./addWMSTileLayer";
import BottomOffCanvas from "./BottomOffCanvas";
import { useForecast } from "../hooks/useForecast";
import ForecastApp from "../components/ForecastApp";
import ModernHeader from "../components/ModernHeader";
import WorldClassVisualization from "../utils/WorldClassVisualization";
import LegendCleanup from "../components/LegendCleanup";
import TuvaluConfig from "../config/TuvaluConfig";
import IslandSelector from "../components/IslandSelector";
import IslandComparisonDashboard from "../components/IslandComparisonDashboard";
import InundationControl from "../components/InundationControl";
import useInundationPoints from "../hooks/useInundationPoints";
import logger from "../utils/logger";
import IslandWaveStats from "../utils/IslandWaveStats";
import vectorArrowOptimizer from "../services/VectorArrowOptimizer";
import waveDirectionDataService from "../services/WaveDirectionDataService";
import "../styles/MultiIslandControls.css";

// Initialize world-class visualization system
const worldClassViz = new WorldClassVisualization();

const resolveThreddsUrl = (url) => {
  if (!url) return url;

  // BYPASS PROXY: Always use direct THREDDS URLs for widget11
  // This ensures CORS is handled by the THREDDS server itself
  console.log(`✅ Using direct THREDDS URL (proxy bypassed): ${url}`);
  return url;
};

// Generate THREDDS WMS legend URL with proper parameters
const getTHREDDSLegendUrl = (wmsUrl, layerName, colorscalerange, palette = 'default') => {
  if (!wmsUrl || !layerName) return null;
  const normalizedUrl = resolveThreddsUrl(wmsUrl);

  const params = new URLSearchParams({
    REQUEST: 'GetLegendGraphic',
    LAYER: layerName,
    PALETTE: palette,
    COLORSCALERANGE: colorscalerange,
    WIDTH: '110',
    HEIGHT: '264'
  });

  return `${normalizedUrl}?${params.toString()}`;
};

// World-class legend URL generator (fallback for non-THREDDS sources)
const getWorldClassLegendUrl = (variable, range, unit, options = {}) => {
  return worldClassViz.getWorldClassLegendUrl(
    variable,
    range,
    unit,
    options.palette ?? null,
    options
  );
};

const variableConfigMap = {
  hs: ({ maxHeight, region, options } = {}) => 
    worldClassViz.getAdaptiveWaveHeightConfig(
      maxHeight ?? 4.0,
      region ?? "tropical",
      options
    ),
  tm02: ({ maxPeriod, analysisType, options } = {}) => 
    worldClassViz.getAdaptiveWavePeriodConfig(
      maxPeriod ?? 20.0,
      analysisType ?? "pacificIslands",
      options
    ),
  tpeak: () => ({
    style: "default-scalar/psu-magma",
    // Use full range starting from zero for peak wave period visualization
    colorscalerange: "0,13.68",
    numcolorbands: 200,
    belowmincolor: "transparent",
    abovemaxcolor: "extend"
  }),
  inun: () => ({
    // Use x-Sst (jet) color palette for inundation maps, similar to CK model
    style: "default-scalar/x-Sst",
    colorscalerange: "-0.05,1.63",
    numcolorbands: 220,
    belowmincolor: "transparent",
    abovemaxcolor: "extend"
  }),
  dirm: () => ({ style: "black-arrow", colorscalerange: "" }),
};

// Get adaptive WMS configuration based on variable type and conditions
const getWorldClassConfig = (variable, context = {}) => {
  for (const key in variableConfigMap) {
    if (variable.includes(key)) {
      return variableConfigMap[key](context);
    }
  }
  // Default fallback
  return worldClassViz.getAdaptiveWaveHeightConfig(context?.maxHeight ?? 4.0, "tropical", context?.options);
};

const widgetContainerStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "calc(100dvh - 0px)",
  zIndex: 9999,
};

// Set default map center to Tuvalu - covering all 9 atolls
const southWest = L.latLng(-10.8, 176.0);
const northEast = L.latLng(-5.6, 180.0);
const bounds = L.latLngBounds(southWest, northEast);


function TuvaluForecast() {
  
  // Multi-island state
  const [selectedIsland, setSelectedIsland] = useState(null);
  const [comparisonIslands, setComparisonIslands] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [persistIslandSelection, setPersistIslandSelection] = useState(false);
  
  const [minZoomForIslandScale] = useState(11); // Switch to island-scale at zoom 11+
  const [currentZoom, setCurrentZoom] = useState(10);
  
  // Island-specific wave statistics and adaptive color scales
  const [islandWaveStats, setIslandWaveStats] = useState(null);
  const [adaptiveColorScales, setAdaptiveColorScales] = useState(null);
  const [autoDetectedIsland, setAutoDetectedIsland] = useState(null); // Auto-detect island at high zoom
  
  // 🌊 Wave Particle Flow Field (Windy-style visualization)
  const [showParticles, setShowParticles] = useState(true); // Enable by default to see it immediately
  const particleLayerRef = useRef(null);

  // World-class composite layer configuration for Tuvalu
  // NOTE: Dynamically switches between national-scale and island-specific data
  // Applies adaptive color scales when island statistics are available
  // Auto-detects island at zoom >= 11, or uses manually selected island
  const WAVE_FORECAST_LAYERS = useMemo(() => {
    // Priority: manual selection > auto-detection > national scale
    const activeIsland = selectedIsland || autoDetectedIsland;
    const baseWmsUrl = activeIsland?.wmsUrl || TuvaluConfig.WMS_BASE_URL;
    const wmsUrl = resolveThreddsUrl(baseWmsUrl);
    const isIslandScale = !!activeIsland;
    const labelPrefix = isIslandScale ? `${activeIsland.name}` : "Tuvalu";
    const selectionMode = selectedIsland ? 'manual' : (autoDetectedIsland ? 'auto' : 'national');
    
    // IMPROVED: Use more realistic color scale ranges for Tuvalu
    // Tuvalu typically sees wave heights of 0.5-3.0m, not 0-6m
    const hsConfig = getWorldClassConfig('hs', {
      maxHeight: adaptiveColorScales?.hs?.max ?? (isIslandScale ? 3.0 : 3.5),
      region: 'tropical',
      options: {
        maxCeiling: isIslandScale ? 6 : 8,
        minimumRangeStart: 0
      }
    });

    if (adaptiveColorScales?.hs) {
      const min = Math.max(0, adaptiveColorScales.hs.min);
      const max = Math.max(min + 0.1, adaptiveColorScales.hs.max);
      hsConfig.colorscalerange = `${min.toFixed(2)},${max.toFixed(2)}`;
    }

    const tmConfig = getWorldClassConfig('tm02', {
      maxPeriod: adaptiveColorScales?.tm02?.max ?? (isIslandScale ? 12 : 15),
      analysisType: isIslandScale ? 'pacificIslands' : 'lowFrequency',
      options: {
        minPeriod: 0,
        maxCeiling: isIslandScale ? 18 : 20
      }
    });

    if (adaptiveColorScales?.tm02) {
      const min = Math.max(0, adaptiveColorScales.tm02.min);
      const max = Math.max(min + 0.1, adaptiveColorScales.tm02.max);
      tmConfig.colorscalerange = `${min.toFixed(2)},${max.toFixed(2)}`;
    }

    const hsRange = hsConfig.colorscalerange;
    const tmRange = tmConfig.colorscalerange;
    
    // DIAGNOSTIC: Log WMS parameters being sent to server
    console.log('🗺️ WMS LAYER CONFIG:', {
      island: labelPrefix,
      mode: selectionMode,
      wmsFile: wmsUrl.split('/').pop(),
      hsRange,
      tmRange,
      hasAdaptiveScales: !!adaptiveColorScales,
      adaptiveValues: adaptiveColorScales
    });
    
    const hsLegendUrl = getTHREDDSLegendUrl(wmsUrl, 'Hs', hsRange, hsConfig.style)
      || getWorldClassLegendUrl('hs', hsRange, 'm', { wmsUrl, layerId: 'Hs', palette: hsConfig.style });
    const tmLegendUrl = getTHREDDSLegendUrl(wmsUrl, 'Tm', tmRange, tmConfig.style)
      || getWorldClassLegendUrl('tm02', tmRange, 's', { wmsUrl, layerId: 'Tm', palette: tmConfig.style });
    const tpeakConfig = getWorldClassConfig('tpeak');
    const tpLegendUrl = getTHREDDSLegendUrl(wmsUrl, 'Tp', '0,13.68', tpeakConfig.style)
      || getWorldClassLegendUrl('tpeak', '0,13.68', 's', { wmsUrl, layerId: 'Tp', palette: tpeakConfig.style });
    
    logger.info('LAYERS', `Building WMS layers for ${labelPrefix}`, {
      isIslandScale,
      selectionMode,
      wmsUrl: baseWmsUrl.split('/').pop(), // Just show filename
      hasAdaptiveScales: !!adaptiveColorScales,
      hsRange,
      tmRange
    });
    
    // THREDDS uses different layer names: Hs, Tp, Tm, Dir
    const mainDomainLayers = [
      // 🌊 Significant Wave Height + Direction Composite
      {
        label: `${labelPrefix} Wave Height + Direction`,
        value: "tuvalu_composite_hs_dir",
        id: 1,
        composite: true,
        description: `Significant wave height with direction arrows for ${labelPrefix}`,
        layers: [
          {
            value: "Hs", // THREDDS layer name for significant wave height
            label: `${labelPrefix} Significant Wave Height`,
            ...hsConfig,
            wmsUrl: wmsUrl,
            id: 1001,
            legendUrl: hsLegendUrl,
            zIndex: 1,
            // Respect configured bands; remove auto-bump at island scale
            // numcolorbands: isIslandScale ? Math.max(hsConfig.numcolorbands || 200, 240) : hsConfig.numcolorbands,
            numcolorbands: hsConfig.numcolorbands,
            belowmincolor: "transparent",
            abovemaxcolor: "extend",
            opacity: hsConfig.opacity ?? 0.85
          },
          {
            value: "Dir", // THREDDS layer name for wave direction
            label: `${labelPrefix} Wave Direction`,
            description: `Optimized vector arrows showing wave direction for ${labelPrefix}`,
            wmsUrl: wmsUrl,
            id: 1002,
            zIndex: 2,
            // Apply vector arrow optimization based on zoom level
            ...vectorArrowOptimizer.getOptimizedArrowParams(currentZoom, {
              baseOpacity: 0.9,
              energyMode: 'dynamic', // Fade arrows in calm areas
              arrowStyle: 'scaled'   // Scale arrows by magnitude
            }),
            // Override with fixed values that THREDDS actually supports
            style: "black-arrow",
            colorscalerange: "",
            // Log optimization for debugging
            _debug: currentZoom >= 11 
              ? `✅ Island scale: ${vectorArrowOptimizer.getCurrentDensityDescription()}`
              : `⚠️ National scale: reduced density for ${labelPrefix}`
          }
        ]
      },
      {
        label: `${labelPrefix} Mean Wave Period`,
        value: "Tm", // THREDDS layer name for mean period
        ...tmConfig,
        id: 4,
        wmsUrl: wmsUrl,
        legendUrl: tmLegendUrl,
        // Respect configured bands; remove auto-bump at island scale
        // numcolorbands: isIslandScale ? Math.max(tmConfig.numcolorbands || 200, 240) : tmConfig.numcolorbands,
        numcolorbands: tmConfig.numcolorbands,
        belowmincolor: "transparent",
        abovemaxcolor: "extend",
        opacity: tmConfig.opacity ?? 0.85,
        description: `Mean wave period for ${labelPrefix}`
      },
      {
        label: `${labelPrefix} Peak Wave Period`,
        value: "Tp", // THREDDS layer name for peak period
        ...tpeakConfig,
        id: 5,
        wmsUrl: wmsUrl,
        legendUrl: tpLegendUrl,
        description: `Peak wave period for ${labelPrefix}`
      }
    ];
    
    return mainDomainLayers;
  }, [selectedIsland, autoDetectedIsland, adaptiveColorScales, currentZoom]); // Added currentZoom dependency

  // No static inundation layers for Tuvalu (will use dynamic markers instead)
  const STATIC_LAYERS = useMemo(() => {
    return [];
  }, []);
  
  // Combined layers for components that need all layers
  const ALL_LAYERS = useMemo(() => {
    return [...WAVE_FORECAST_LAYERS, ...STATIC_LAYERS];
  }, [WAVE_FORECAST_LAYERS, STATIC_LAYERS]);

  const tuvaluConfig = useMemo(() => ({
    WAVE_FORECAST_LAYERS,
    STATIC_LAYERS,
    ALL_LAYERS,
    WAVE_BUOYS: [], // No buoys for Tuvalu
    bounds,
    addWMSTileLayer,
  }), [WAVE_FORECAST_LAYERS, STATIC_LAYERS, ALL_LAYERS]);
  
  const {
    showBottomCanvas, setShowBottomCanvas,
    bottomCanvasData, setBottomCanvasData,
    activeLayers, setActiveLayers,
    selectedWaveForecast, setSelectedWaveForecast,
    capTime,
    sliderIndex, setSliderIndex,
    isPlaying, setIsPlaying,
    wmsOpacity, setWmsOpacity,
    dynamicLayers,
    isUpdatingVisualization,
    mapRef,
    totalSteps,
    currentSliderDate,
    mapInstance,
    minIndex,
  } = useForecast(tuvaluConfig);

  // Initialize inundation points service in Home.jsx for inline layout.
  // Set debugMode based on environment: enabled in development, disabled in production.
  const inundationPoints = useInundationPoints(mapInstance, {
    debugMode: process.env.NODE_ENV === 'development',
    defaultVisible: false
  });

  // Debug: Track state changes
  useEffect(() => {
    logger.debug('HOME', 'BottomCanvas state changed', {
      show: showBottomCanvas,
      hasData: !!bottomCanvasData
    });
  }, [showBottomCanvas, bottomCanvasData]);

  // Handle island selection - now handles both whole domain (isWholeDomain=true) and specific islands
  const handleIslandChange = (island) => {
    if (island?.isWholeDomain) {
      // Tuvalu whole domain selected - clear selected island to use national scale
      logger.info('ISLAND', 'Tuvalu whole domain selected');
      setSelectedIsland(null);
      setAutoDetectedIsland(null); // Clear auto-detection to ensure national-scale layers are used
      
      // Zoom to whole Tuvalu bounds
      const map = mapInstance?.current;
      if (map && typeof map.fitBounds === 'function') {
        try {
          map.fitBounds(bounds);
        } catch (error) {
          logger.error('MAP', 'Failed to fit bounds for Tuvalu', { error });
        }
      }
      return;
    }
    
    logger.island(island.name, 'Island selected');
    setSelectedIsland(island);
    
    // Optionally zoom to island - check if mapInstance is a valid Leaflet map
    const map = mapInstance?.current;
    if (map && typeof map.setView === 'function') {
      try {
        map.setView([island.lat, island.lon], 10);
      } catch (error) {
        logger.error('MAP', 'Failed to set view for island', { island: island.name, error });
      }
    } else {
      logger.debug('MAP', 'Map instance not ready for setView', { 
        hasMapInstance: !!map,
        mapInstanceType: typeof map
      });
    }
  };

  // Query island-specific wave statistics when island is selected
  // Now using island-specific WMS endpoints (P1_Nanumea.nc, P2_Nanumanga.nc, etc.)
  // Works with both manual selection and auto-detection
  useEffect(() => {
    const queryIslandStats = async () => {
      // Use manual selection if available, otherwise auto-detected island
      const activeIsland = selectedIsland || autoDetectedIsland;
      
      if (!activeIsland) {
        setIslandWaveStats(null);
        setAdaptiveColorScales(null);
        return;
      }

      const selectionMode = selectedIsland ? 'manual' : 'auto';
      logger.info('ISLAND_STATS', `Querying wave statistics for ${activeIsland.name} (${selectionMode})`, {
        island: activeIsland.name,
        hasWmsUrl: !!activeIsland.wmsUrl,
        time: currentSliderDate ? currentSliderDate.toISOString() : 'no time'
      });

      try {
        const stats = await IslandWaveStats.getIslandWaveDisplayStats(
          activeIsland,
          currentSliderDate
        );

        if (stats) {
          setIslandWaveStats(stats);
          
          // Calculate adaptive color scales from island-specific statistics
          const colorScales = {};
          if (stats.waveHeight) {
            // Add 10% buffer for better visualization
            const hsRange = stats.waveHeight.max - stats.waveHeight.min;
            const hsMin = Math.max(0, stats.waveHeight.min - hsRange * 0.1);
            const hsMax = stats.waveHeight.max + hsRange * 0.1;
            colorScales.hs = { min: hsMin, max: hsMax };
          }
          if (stats.wavePeriod) {
            const tmRange = stats.wavePeriod.max - stats.wavePeriod.min;
            const tmMin = Math.max(0, stats.wavePeriod.min - tmRange * 0.1);
            const tmMax = stats.wavePeriod.max + tmRange * 0.1;
            colorScales.tm02 = { min: tmMin, max: tmMax };
          }
          
          setAdaptiveColorScales(colorScales);
          
          // DIAGNOSTIC: Log the exact adaptive scales being applied
          console.log('🎨 ADAPTIVE COLOR SCALES CALCULATED:', {
            island: activeIsland.name,
            waveHeight: stats.waveHeight,
            adaptiveHsRange: colorScales.hs ? `${colorScales.hs.min.toFixed(3)}-${colorScales.hs.max.toFixed(3)}m` : 'none',
            wavePeriod: stats.wavePeriod,
            adaptiveTmRange: colorScales.tm02 ? `${colorScales.tm02.min.toFixed(3)}-${colorScales.tm02.max.toFixed(3)}s` : 'none',
            variationHs: stats.waveHeight ? (stats.waveHeight.max - stats.waveHeight.min).toFixed(3) : 'N/A',
            variationTm: stats.wavePeriod ? (stats.wavePeriod.max - stats.wavePeriod.min).toFixed(3) : 'N/A'
          });
          
          logger.info('ISLAND_STATS', `Wave statistics loaded for ${activeIsland.name}`, {
            hasWaveHeight: !!stats.waveHeight,
            hasWavePeriod: !!stats.wavePeriod,
            colorScales
          });
        } else {
          setIslandWaveStats(null);
          setAdaptiveColorScales(null);
          logger.warn('ISLAND_STATS', `No wave statistics available for ${activeIsland.name}`);
        }
      } catch (error) {
        logger.error('ISLAND_STATS', `Failed to query island stats: ${error.message}`);
        setIslandWaveStats(null);
        setAdaptiveColorScales(null);
      }
    };

    queryIslandStats();
  }, [selectedIsland, autoDetectedIsland, currentSliderDate]);

  // Handle comparison mode
  const handleComparisonChange = (islands) => {
    logger.info('COMPARISON', `Comparison updated: ${islands.length} islands`, islands);
    setComparisonIslands(islands);
    setShowComparison(islands.length > 0);
  };

  // Track current zoom level
  useEffect(() => {
    const map = mapInstance?.current;
    if (!map) return;

    const handleZoomEnd = () => {
      const zoom = map.getZoom();
      setCurrentZoom(zoom);
      
      // Add zoom-based CSS classes to map container for arrow styling
      const container = map.getContainer();
      if (container) {
        // Remove existing zoom classes
        container.classList.remove('zoom-low', 'zoom-medium', 'zoom-high');
        
        // Add appropriate class based on zoom level
        if (zoom < 10) {
          container.classList.add('zoom-low'); // National scale
        } else if (zoom < 12) {
          container.classList.add('zoom-medium'); // Island scale
        } else {
          container.classList.add('zoom-high'); // Coastal detail
        }
        
        logger.debug('ARROW_ANIMATION', `Zoom class updated for arrow styling`, {
          zoom,
          class: zoom < 10 ? 'zoom-low' : zoom < 12 ? 'zoom-medium' : 'zoom-high'
        });
      }
    };

    map.on('zoomend', handleZoomEnd);
    setCurrentZoom(map.getZoom()); // Set initial zoom
    handleZoomEnd(); // Apply initial class

    return () => {
      map.off('zoomend', handleZoomEnd);
    };
  }, [mapInstance]);

  // 🌊 Fetch real wave direction data and update particle field
  useEffect(() => {
    const map = mapInstance?.current;
    if (!map || !showParticles || !particleLayerRef.current) return;

    // Don't fetch if currently showing inundation (dirm not active)
    const isDirmActive = selectedWaveForecast === 'tuvalu_composite_hs_dir';

    if (!isDirmActive) {
      logger.debug('WAVE_DATA', 'Wave direction layer not active, using default flow');
      return;
    }

    let isMounted = true;

    const fetchWaveData = async () => {
      try {
        const bounds = map.getBounds();
        const size = map.getSize();
        
        // Get active island or national WMS URL
        const activeIsland = selectedIsland || autoDetectedIsland;
        const baseWmsUrl = activeIsland?.wmsUrl || TuvaluConfig.WMS_BASE_URL;
        const wmsUrl = resolveThreddsUrl(baseWmsUrl);
        
        // Find the wave direction layer
        const compositeLayer = WAVE_FORECAST_LAYERS.find(l => l.value === 'tuvalu_composite_hs_dir');
        if (!compositeLayer) return;

        const dirLayer = compositeLayer.layers.find(l => l.value === 'Dir');
        if (!dirLayer) return;

        logger.info('WAVE_DATA', 'Fetching wave direction field for particles', {
          layer: dirLayer.value,
          time: currentSliderDate?.toISOString()
        });

        const vectorField = await waveDirectionDataService.fetchVectorField({
          wmsUrl,
          layerName: dirLayer.value,
          bounds: {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest()
          },
          width: size.x,
          height: size.y,
          time: currentSliderDate?.toISOString()
        });

        if (isMounted && particleLayerRef.current) {
          particleLayerRef.current.setVectorField(vectorField);
          logger.info('WAVE_DATA', 'Wave direction field updated for particles', {
            gridSize: `${vectorField.width}x${vectorField.height}`,
            wmsUrl: baseWmsUrl
          });
        }

      } catch (error) {
        logger.error('WAVE_DATA', `Failed to fetch wave direction: ${error.message}`);
      }
    };

    // Initial fetch
    fetchWaveData();

    // Re-fetch when map moves or time changes
    const handleMoveEnd = () => {
      fetchWaveData();
    };

    map.on('moveend', handleMoveEnd);

    return () => {
      isMounted = false;
      map.off('moveend', handleMoveEnd);
    };
  }, [mapInstance, showParticles, selectedWaveForecast, currentSliderDate, selectedIsland, autoDetectedIsland, WAVE_FORECAST_LAYERS]);



  // Auto-detect nearest island when zoomed in (zoom >= 11)
  // Switch to national scale when zoomed out (zoom < 11)
  // ALSO clear manual selection if user zooms out below threshold
  useEffect(() => {
    const map = mapInstance?.current;
    if (!map) return;

    // If zoomed out below island threshold, clear both auto and manual selection
    if (currentZoom < minZoomForIslandScale) {
      if (autoDetectedIsland) {
        logger.info('AUTO_ISLAND', 'Zoom level below threshold, reverting to national scale', {
          zoom: currentZoom,
          threshold: minZoomForIslandScale
        });
        setAutoDetectedIsland(null);
      }
      // Clear manual selection unless persistence is enabled
      if (selectedIsland && !persistIslandSelection) {
        logger.info('AUTO_ISLAND', 'Clearing manual island selection due to zoom out', {
          zoom: currentZoom,
          threshold: minZoomForIslandScale,
          previousIsland: selectedIsland.name
        });
        setSelectedIsland(null);
      } else if (selectedIsland && persistIslandSelection) {
        logger.debug('AUTO_ISLAND', 'Retaining manual island selection due to lock', {
          island: selectedIsland.name,
          zoom: currentZoom
        });
      }
      
      return;
    }

    // Only auto-detect if user hasn't manually selected an island
    if (selectedIsland) {
      logger.info('AUTO_ISLAND', 'Manual island selection active, skipping auto-detection');
      return;
    }

    // Get map center and find nearest island
    const center = map.getCenter();
    let nearestIsland = null;
    let minDistance = Infinity;
    
    TuvaluConfig.TUVALU_ATOLLS.forEach(island => {
      const distance = Math.sqrt(
        Math.pow(island.lat - center.lat, 2) + 
        Math.pow(island.lon - center.lng, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestIsland = island;
      }
    });
    
    // Only auto-select if island is within ~50km (roughly 0.5 degrees)
    if (nearestIsland && minDistance < 0.5) {
      logger.info('AUTO_ISLAND', `Auto-detected island: ${nearestIsland.name}`, {
        zoom: currentZoom,
        distance: minDistance.toFixed(4),
        center: { lat: center.lat.toFixed(4), lng: center.lng.toFixed(4) }
      });
      setAutoDetectedIsland(nearestIsland);
    } else {
      setAutoDetectedIsland(null);
    }
  }, [currentZoom, mapInstance, selectedIsland, minZoomForIslandScale, autoDetectedIsland, persistIslandSelection]);

  return (
    <div style={widgetContainerStyle}>
      <ModernHeader />
      
      {/* World-Class Inundation Control Panel (Island Selector moved into controls panel) */}
      <div className="multi-island-controls-panel">
        <InundationControl
          loadPoints={inundationPoints.loadPoints}
          isVisible={inundationPoints.isVisible}
          onToggle={inundationPoints.toggleVisibility}
          stats={inundationPoints.stats}
          isLoading={inundationPoints.isLoading}
          error={inundationPoints.error}
          position="inline"
        />
      </div>

      {/* Island Wave Statistics Panel */}
      {selectedIsland && islandWaveStats && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 'var(--z-sidebar, 10)',  /* Use sidebar z-index to avoid blocking map overlays */
          backgroundColor: 'var(--color-surface)',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          padding: '16px',
          maxWidth: '320px',
          border: '1px solid var(--color-border)'
        }}>
          <div style={{ marginBottom: '12px' }}>
            <h6 style={{ margin: '0 0 8px 0', color: 'var(--color-text-primary)' }}>
              🌊 {selectedIsland.name} Wave Data
            </h6>
            {adaptiveColorScales && (
              <p style={{ 
                margin: '4px 0', 
                fontSize: '0.75em', 
                color: 'var(--color-success)',
                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                padding: '4px 8px',
                borderRadius: '4px'
              }}>
                ✓ Adaptive color scale active
              </p>
            )}
          </div>
          
          <div style={{ 
            backgroundColor: 'var(--color-background)', 
            borderRadius: '4px', 
            padding: '12px'
          }}>
            {islandWaveStats.waveHeight && (
              <>
                <p style={{ margin: '8px 0 4px 0', fontWeight: 'bold', fontSize: '0.85em' }}>
                  Wave Height (Hs)
                </p>
                <p style={{ margin: '4px 0', fontSize: '0.9em' }}>
                  <strong>Min:</strong> {islandWaveStats.waveHeight.min} m
                </p>
                <p style={{ margin: '4px 0', fontSize: '0.9em' }}>
                  <strong>Max:</strong> {islandWaveStats.waveHeight.max} m
                </p>
                <p style={{ margin: '4px 0', fontSize: '0.9em' }}>
                  <strong>Mean:</strong> {islandWaveStats.waveHeight.mean} m
                </p>
              </>
            )}
            
            {islandWaveStats.wavePeriod && (
              <>
                <hr style={{ margin: '8px 0', borderColor: 'var(--color-border)' }} />
                <p style={{ margin: '8px 0 4px 0', fontWeight: 'bold', fontSize: '0.85em' }}>
                  Wave Period (Tm02)
                </p>
                <p style={{ margin: '4px 0', fontSize: '0.9em' }}>
                  <strong>Min:</strong> {islandWaveStats.wavePeriod.min} s
                </p>
                <p style={{ margin: '4px 0', fontSize: '0.9em' }}>
                  <strong>Max:</strong> {islandWaveStats.wavePeriod.max} s
                </p>
                <p style={{ margin: '4px 0', fontSize: '0.9em' }}>
                  <strong>Mean:</strong> {islandWaveStats.wavePeriod.mean} s
                </p>
              </>
            )}
            
            <p style={{ 
              margin: '8px 0 0 0', 
              fontSize: '0.75em', 
              color: 'var(--color-text-secondary)',
              fontStyle: 'italic'
            }}>
              Sampled from {islandWaveStats.waveHeight?.samples || 0} points
            </p>
          </div>
        </div>
      )}

      {/* Island Selected But Stats Not Available */}
      {selectedIsland && !islandWaveStats && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 'var(--z-sidebar, 10)',  /* Use sidebar z-index to avoid blocking map overlays */
          backgroundColor: 'var(--color-surface)',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          padding: '16px',
          maxWidth: '320px',
          border: '1px solid var(--color-warning)'
        }}>
          <div style={{ marginBottom: '8px' }}>
            <h6 style={{ margin: '0 0 8px 0', color: 'var(--color-text-primary)' }}>
              ℹ️ {selectedIsland.name}
            </h6>
          </div>
          
          <div style={{ 
            backgroundColor: 'rgba(255, 193, 7, 0.1)', 
            borderRadius: '4px', 
            padding: '12px',
            border: '1px solid rgba(255, 193, 7, 0.3)'
          }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '0.85em', color: 'var(--color-text-primary)' }}>
              <strong>Adaptive color scales unavailable</strong>
            </p>
            <p style={{ margin: '0 0 8px 0', fontSize: '0.8em', color: 'var(--color-text-secondary)' }}>
              The THREDDS server does not support GetFeatureInfo queries needed for island-specific wave statistics.
            </p>
            <p style={{ margin: '0', fontSize: '0.8em', color: 'var(--color-text-secondary)' }}>
              Displaying regional forecast data at island location.
            </p>
          </div>
        </div>
      )}
      
      {/* Multi-Island Comparison Dashboard */}
      {showComparison && (
        <div style={{
          position: 'absolute',
          top: '140px', /* Align with multi-island controls vertical offset */
          right: '20px',
          zIndex: 'var(--z-sidebar, 10)',  /* Use sidebar z-index to avoid blocking map overlays */
          maxWidth: '800px',
          maxHeight: 'calc(100vh - 100px)',
          overflow: 'auto'
        }}>
          <IslandComparisonDashboard 
            comparisonIslands={comparisonIslands}
          />
        </div>
      )}
      
      <ForecastApp
        WAVE_FORECAST_LAYERS={dynamicLayers}
        particleControls={{
          showParticles,
          onToggleParticles: () => setShowParticles(prev => !prev),
          particleLayer: particleLayerRef.current
        }}

        ALL_LAYERS={ALL_LAYERS}
        selectedWaveForecast={selectedWaveForecast}
        setSelectedWaveForecast={setSelectedWaveForecast}
        opacity={wmsOpacity}
        setOpacity={setWmsOpacity}
        sliderIndex={sliderIndex}
        setSliderIndex={setSliderIndex}
        totalSteps={totalSteps}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        currentSliderDate={currentSliderDate}
        capTime={capTime}
        activeLayers={activeLayers}
        setActiveLayers={setActiveLayers}
        mapRef={mapRef}
        mapInstance={mapInstance}
        setBottomCanvasData={setBottomCanvasData}
        setShowBottomCanvas={setShowBottomCanvas}
        isUpdatingVisualization={isUpdatingVisualization}
        minIndex={minIndex}
        islandSelector={(
          <IslandSelector 
            onIslandChange={handleIslandChange}
            onComparisonChange={handleComparisonChange}
            currentIsland={selectedIsland?.name}
            persistIslandSelection={persistIslandSelection}
            onPersistToggle={setPersistIslandSelection}
            variant="compact"
          />
        )}

      />

      <LegendCleanup 
        selectedWaveForecast={selectedWaveForecast}
        WAVE_FORECAST_LAYERS={ALL_LAYERS}
      />
      
      <BottomOffCanvas
        show={showBottomCanvas}
        onHide={() => {
          setShowBottomCanvas(false);
          // Remove any active markers when canvas is hidden
          if (mapInstance?.current) {
            mapInstance.current.eachLayer((layer) => {
              const isCircleMarker = layer instanceof L.CircleMarker && layer.options?.color === '#ff6b35';
              const isPinMarker = layer instanceof L.Marker && layer.options?.title === 'data-source-pin';
              if (isCircleMarker || isPinMarker) {
                mapInstance.current.removeLayer(layer);
              }
            });
          }
        }}
        data={bottomCanvasData}
      />
    </div>
  );
}

export default TuvaluForecast;
