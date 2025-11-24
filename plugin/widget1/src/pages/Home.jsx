import React, { useEffect, useMemo, useState, useRef } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import addWMSTileLayer from "./addWMSTileLayer";
import BottomOffCanvas from "./BottomOffCanvas";
import BottomBuoyOffCanvas from "./BottomBuoyOffCanvas";
import { useForecast } from "../hooks/useForecastComposed";
import ForecastApp from "../components/ForecastApp";
import ModernHeader from "../components/ModernHeader";
import WorldClassVisualization from "../utils/WorldClassVisualization";

// Initialize world-class visualization system
const worldClassViz = new WorldClassVisualization();

// World-class legend URL generator
const getWorldClassLegendUrl = (variable, range, unit) => {
  return worldClassViz.getWorldClassLegendUrl(variable, range, unit);
};

// Data-driven range extraction utility
const extractDataRange = async (wmsUrl, dataset, variable) => {
  try {
    // Enhanced data range extraction with WMS GetCapabilities fallback
    
    // First, try to get actual data statistics (if available)
    if (wmsUrl && dataset) {
      try {
        // Attempt GetCapabilities request to extract layer information
        const capabilitiesUrl = `${wmsUrl}?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0`;
        const response = await fetch(capabilitiesUrl);
        
        if (response.ok) {
          const text = await response.text();
          
          // Parse XML to extract dimension information (simplified approach)
          if (text.includes(variable)) {
            // Look for dimension or extent information in the capabilities
            // This is a simplified parser - in production, use proper XML parsing
            const dimensionMatch = text.match(new RegExp(`<Dimension[^>]*name=["']${variable}["'][^>]*>([^<]*)</Dimension>`, 'i'));
            if (dimensionMatch) {
              const dimensionValue = dimensionMatch[1];
              const rangeMatch = dimensionValue.match(/(\d+(?:\.\d+)?)[/,](\d+(?:\.\d+)?)/);
              if (rangeMatch) {
                return {
                  min: parseFloat(rangeMatch[1]),
                  max: parseFloat(rangeMatch[2])
                };
              }
            }
          }
        }
      } catch (fetchError) {
        console.log(`GetCapabilities request failed for ${variable}, using estimates:`, fetchError.message);
      }
    }
    
    // Fallback to climatological estimates based on Niue wave climate
    const estimatedRanges = {
      'tm02': { min: 2.0, max: 12.0 },  // Mean wave period typically 2-12s in Niue waters
      'niue_forecast/tm02': { min: 2.0, max: 12.0 },
      'tpeak': { min: 3.0, max: 18.0 }, // Peak period typically 3-18s
      'niue_forecast/tpeak': { min: 3.0, max: 18.0 },
      'hs': { min: 0.5, max: 6.0 },     // Wave height 0.5-6m
      'niue_forecast/hs': { min: 0.5, max: 6.0 },
      'niue_inundation': { min: -0.05, max: 3.0 }, // Inundation depth (dynamically updated from actual data)
      'inundation': { min: -0.05, max: 3.0 }
    };
    
    return estimatedRanges[variable] || null;
  } catch (error) {
    console.warn(`Could not extract data range for ${variable}:`, error);
    return null;
  }
};

const variableConfigMap = {
  // Support both prefixed and non-prefixed layer names with data-driven ranges
  hs: (maxHeight) => worldClassViz.getAdaptiveWaveHeightConfig(maxHeight, "tropical"),
  'niue_forecast/hs': (maxHeight) => worldClassViz.getAdaptiveWaveHeightConfig(maxHeight, "tropical"),
  tm02: (dataRange) => worldClassViz.getAdaptiveWavePeriodConfig(
    dataRange?.max || 8.0, 
    "niue", 
    dataRange?.min || null, 
    dataRange
  ),
  'niue_forecast/tm02': (dataRange) => worldClassViz.getAdaptiveWavePeriodConfig(
    dataRange?.max || 8.0, 
    "niue", 
    dataRange?.min || null, 
    dataRange
  ),
  tpeak: (dataRange) => {
    const defaultRange = '0,17.4';
    let range = defaultRange;
    
    if (dataRange && dataRange.min !== null && dataRange.max !== null) {
      const dataMin = Math.max(0, dataRange.min - 0.5);
      const dataMax = dataRange.max + 1.0;
      range = `${dataMin.toFixed(1)},${dataMax.toFixed(1)}`;
    }
    
    return {
      palette: 'psu-viridis',
      range: range,
      numcolorbands: 250
    };
  },
  'niue_forecast/tpeak': (dataRange) => {
    const defaultRange = '0,17.4';
    let range = defaultRange;
    
    if (dataRange && dataRange.min !== null && dataRange.max !== null) {
      const dataMin = Math.max(0, dataRange.min - 0.5);
      const dataMax = dataRange.max + 1.0;
      range = `${dataMin.toFixed(1)},${dataMax.toFixed(1)}`;
    }
    
    return {
      palette: 'psu-viridis',
      range: range,
      numcolorbands: 250
    };
  },
  dirm: () => ({
    palette: 'black-arrow',
    range: '',
    numcolorbands: 0
  }),
  'niue_forecast/dirm': () => ({
    palette: 'black-arrow',
    range: '',
    numcolorbands: 0
  })
};

// Niue-specific WMS configuration - using ncWMS server like Cook Islands
const NIUE_WMS_BASE = "https://gem-ncwms-hpc.spc.int/ncWMS/wms";

// Niue Wave Forecast Layers
const WAVE_FORECAST_LAYERS = [
  {
    label: "Significant Wave Height + Dir",
    value: "composite_hs_dirm",
    composite: true,
    wmsUrl: NIUE_WMS_BASE,
    layers: [
      {
        value: "niue_forecast/hs",
        style: "default-scalar/x-Sst",
        colorscalerange: "0,4",
        wmsUrl: NIUE_WMS_BASE,
        dataset: "niue_forecast",
        numcolorbands: 250,
        zIndex: 1,
      },
      {
        value: "dirm", // THREDDS layer name (without dataset prefix)
        style: "black-arrow",
        colorscalerange: "",
        wmsUrl: "https://gemthreddshpc.spc.int/thredds/wms/POP/model/country/spc/forecast/hourly/NIU/ForecastNiue_latest.nc",
        zIndex: 2,
        opacity: 0.9,
      }
    ]
  },
  {
    label: "Mean Wave Period",
    value: "niue_forecast/tm02",
    wmsUrl: NIUE_WMS_BASE,
    dataset: "niue_forecast",
    style: "default-scalar/x-Sst",
    colorscalerange: "0,20",
    numcolorbands: 250,
  },
  {
    label: "Peak Wave Period",
    value: "niue_forecast/tpeak",
    wmsUrl: NIUE_WMS_BASE,
    dataset: "niue_forecast",
    style: "default-scalar/x-Sst",
    colorscalerange: "0,17.4",
    numcolorbands: 250,
  },
  {
    label: "Inundation Depth",
    value: "inundation",
    wmsUrl: "https://gemthreddshpc.spc.int/thredds/wms/POP/model/country/spc/forecast/hourly/NIU/InundationNiue_latest.nc",
    dataset: "niue_inundation",
    style: "default-scalar/seq-Blues",
    colorscalerange: "", // Will be fetched dynamically from WMS GetCapabilities
    numcolorbands: 50,
    belowmincolor: "transparent",
    abovemaxcolor: "extend",
  }
];

function Home({ widgetData, validCountries }) {
  // Buoy state management
  const [showBuoyCanvas, setShowBuoyCanvas] = useState(false);
  const [selectedBuoyId, setSelectedBuoyId] = useState(null);
  const buoyMarkersRef = useRef([]);

  // Initialize Leaflet marker icons
  useEffect(() => {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
      iconUrl: require("leaflet/dist/images/marker-icon.png"),
      shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
    });
  }, []);

  // Define map bounds around Niue (approximate domain)
  const niueBounds = useMemo(() => {
    const southWest = L.latLng(-19.5, -170.5);
    const northEast = L.latLng(-18.5, -169.3);
    return L.latLngBounds(southWest, northEast);
  }, []);

  // Layer legend URLs with data-driven ranges
  const [layerLegendUrls, setLayerLegendUrls] = useState({});

  useEffect(() => {
    const generateLegendUrls = async () => {
      const urls = {};
      
      for (const layer of WAVE_FORECAST_LAYERS) {
        if (layer.composite && layer.layers) {
          for (const subLayer of layer.layers) {
            // Extract data range for period layers
            const dataRange = await extractDataRange(subLayer.wmsUrl || layer.wmsUrl, subLayer.dataset, subLayer.value);
            const config = variableConfigMap[subLayer.value]?.(dataRange) || {};
            urls[subLayer.value] = getWorldClassLegendUrl(
              subLayer.value,
              config.range || config.colorscalerange || subLayer.colorscalerange,
              subLayer.value === 'hs' ? 'm' : 's'
            );
          }
        } else {
          // Extract data range for period layers
          const dataRange = await extractDataRange(layer.wmsUrl, layer.dataset, layer.value);
          const config = variableConfigMap[layer.value]?.(dataRange) || {};
          urls[layer.value] = getWorldClassLegendUrl(
            layer.value,
            config.range || config.colorscalerange || layer.colorscalerange,
            layer.value === 'hs' ? 'm' : 's'
          );
        }
      }
      
      setLayerLegendUrls(urls);
    };

    generateLegendUrls();
  }, []);

  // Enhanced layer configurations with data-driven ranges
  const [enhancedLayers, setEnhancedLayers] = useState(WAVE_FORECAST_LAYERS);

  useEffect(() => {
    const enhanceLayersWithDataRanges = async () => {
      const enhanced = [];
      
      for (const layer of WAVE_FORECAST_LAYERS) {
        if (layer.composite && layer.layers) {
          const enhancedSubLayers = [];
          for (const subLayer of layer.layers) {
            // Only enhance wave period layers with data-driven ranges
            if (subLayer.value.includes('tm02') || subLayer.value.includes('tpeak')) {
              const dataRange = await extractDataRange(subLayer.wmsUrl || layer.wmsUrl, subLayer.dataset, subLayer.value);
              if (dataRange) {
                const config = variableConfigMap[subLayer.value]?.(dataRange) || {};
                enhancedSubLayers.push({
                  ...subLayer,
                  colorscalerange: config.colorscalerange || config.range || subLayer.colorscalerange
                });
              } else {
                enhancedSubLayers.push(subLayer);
              }
            } else {
              enhancedSubLayers.push(subLayer);
            }
          }
          enhanced.push({
            ...layer,
            layers: enhancedSubLayers
          });
        } else {
          // Only enhance wave period layers with data-driven ranges
          if (layer.value.includes('tm02') || layer.value.includes('tpeak')) {
            const dataRange = await extractDataRange(layer.wmsUrl, layer.dataset, layer.value);
            if (dataRange) {
              const config = variableConfigMap[layer.value]?.(dataRange) || {};
              enhanced.push({
                ...layer,
                colorscalerange: config.colorscalerange || config.range || layer.colorscalerange
              });
            } else {
              enhanced.push(layer);
            }
          } else {
            enhanced.push(layer);
          }
        }
      }
      
      setEnhancedLayers(enhanced);
    };

    enhanceLayersWithDataRanges();
  }, []);

  // Build ALL_LAYERS and STATIC_LAYERS (none for Niue currently)
  const STATIC_LAYERS = useMemo(() => [], []);
  const ALL_LAYERS = useMemo(() => ([...enhancedLayers, ...STATIC_LAYERS]), [enhancedLayers, STATIC_LAYERS]);

  // Compose forecast state using shared hooks
  // Buoy functionality
  const openBuoyCanvas = (buoyId) => {
    console.log("openBuoyCanvas called with:", buoyId);
    setSelectedBuoyId(buoyId);
    setShowBuoyCanvas(true);
    console.log("State after setting:", { showBuoyCanvas: true, selectedBuoyId: buoyId });
  };

  const config = useMemo(
    () => ({
      WAVE_FORECAST_LAYERS,
      STATIC_LAYERS,
      ALL_LAYERS,
      WAVE_BUOYS: [
        {
          id: "SPOT-31153C",
          lon: -169.9024667,
          lat: -18.9747,
        },
        {
          id: "SPOT-31071C",
          lon: -169.98535,
          lat: -19.0662333,
        },
        {
          id: "SPOT-31091C",
          lon: -169.9315,
          lat: -19.05455,
        },
      ],
      bounds: niueBounds,
      addWMSTileLayer,
      openBuoyCanvas,
    }), [STATIC_LAYERS, ALL_LAYERS, niueBounds]
  );

  const {
    // Layers
    activeLayers, setActiveLayers,
    selectedWaveForecast, setSelectedWaveForecast,
    // Time & Animation
    capTime,
    sliderIndex, setSliderIndex,
    totalSteps,
    isPlaying, setIsPlaying,
    currentSliderDate,
    currentSliderDateStr,
    minIndex,
    // Map
    mapRef, mapInstance,
    // Opacity
    wmsOpacity, setWmsOpacity,
    // Dynamic layers
    dynamicLayers,
    isUpdatingVisualization,
    // Bottom canvases
    showBottomCanvas, setShowBottomCanvas,
    bottomCanvasData, setBottomCanvasData,
  } = useForecast(config);

  // Buoy marker icons
  const blueIcon = new L.Icon({
    iconUrl: require("leaflet/dist/images/marker-icon.png"),
    shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  const greenIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.5,0C5.6,0,0,5.6,0,12.5c0,12.5,12.5,28.5,12.5,28.5s12.5-16,12.5-28.5C25,5.6,19.4,0,12.5,0z" fill="#22c55e"/>
        <circle cx="12.5" cy="12.5" r="5" fill="white"/>
      </svg>
    `),
    shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  // Buoy markers management (when topographic layer is active)
  useEffect(() => {
    if (!mapInstance?.current) return;

    // Remove existing markers
    buoyMarkersRef.current.forEach(marker => marker.remove());
    buoyMarkersRef.current = [];
    
    // Only show buoy markers when topographic layer is visible
    if (!activeLayers["stamen-toner"]) return;
    
    console.log("Creating buoy markers...");

    const WAVE_BUOYS = config.WAVE_BUOYS || [];
    buoyMarkersRef.current = WAVE_BUOYS.map(buoy => {
      let marker;
      if (buoy.id === "SPOT-31091C"){
        marker = L.marker([buoy.lat, buoy.lon], {
          title: buoy.id,
          icon: greenIcon,
          zIndexOffset: 1000,
        }).addTo(mapInstance.current);
      } else{
        marker = L.marker([buoy.lat, buoy.lon], {
          title: buoy.id,
          icon: blueIcon,
          zIndexOffset: 1000,
        }).addTo(mapInstance.current);
      }
      marker.bindPopup(`<b>${buoy.id}</b><br>Lat: ${buoy.lat}<br>Lon: ${buoy.lon}`);
      marker.on("click", (e) => {
        console.log("Buoy marker clicked:", buoy.id);
        e.originalEvent.stopPropagation();
        openBuoyCanvas(buoy.id);
      });
      console.log("Created marker for buoy:", buoy.id);
      return marker;
    });
    return () => {
      buoyMarkersRef.current.forEach(marker => marker.remove());
      buoyMarkersRef.current = [];
    };
    // eslint-disable-next-line
  }, [activeLayers["stamen-toner"], mapInstance.current, config.WAVE_BUOYS]);

  return (
    <>
      <ModernHeader />
      <ForecastApp
        WAVE_FORECAST_LAYERS={dynamicLayers}
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
        currentSliderDateStr={currentSliderDateStr}
        minIndex={minIndex}

        // Extras retained from earlier wiring (safe if unused)
        layerLegendUrls={layerLegendUrls}
        BottomOffCanvas={BottomOffCanvas}
        BottomBuoyOffCanvas={BottomBuoyOffCanvas}
        getWorldClassLegendUrl={getWorldClassLegendUrl}
        variableConfigMap={variableConfigMap}
        wmsBaseUrl={NIUE_WMS_BASE}
        widgetData={widgetData}
        validCountries={validCountries}
      />

      {/* Bottom Canvas for displaying forecast data on map clicks */}
      <BottomOffCanvas
        show={showBottomCanvas}
        onHide={() => {
          setShowBottomCanvas(false);
          // Remove any active markers when canvas is hidden
          if (mapInstance?.current) {
            mapInstance.current.eachLayer((layer) => {
              if (layer.options && (layer.options.color === '#ff6b35' || layer.options.title === 'data-source-pin')) {
                mapInstance.current.removeLayer(layer);
              }
            });
          }
        }}
        data={bottomCanvasData}
      />

      {/* Buoy Canvas for displaying buoy data when markers are clicked */}
      <BottomBuoyOffCanvas
        show={showBuoyCanvas}
        onHide={() => setShowBuoyCanvas(false)}
        buoyId={selectedBuoyId}
      />
    </>
  );
}

export default Home;
