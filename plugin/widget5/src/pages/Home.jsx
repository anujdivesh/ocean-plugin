import React, { useEffect, useMemo } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import addWMSTileLayer from "./addWMSTileLayer";
import BottomOffCanvas from "./BottomOffCanvas";
import BottomBuoyOffCanvas from "./BottomBuoyOffCanvas";
import { useForecast } from "../hooks/useForecast";
import useRiskOverlay from "../hooks/useRiskOverlay";
import ForecastApp from "../components/ForecastApp";
import ModernHeader from "../components/ModernHeader";
import WorldClassVisualization from "../utils/WorldClassVisualization";
import LegendCleanup from "../components/LegendCleanup";
import { INUNDATION_VISUAL_COLOR_SCALE_RANGE } from "../config/layerConfig";

// Initialize world-class visualization system
const worldClassViz = new WorldClassVisualization();
// TEMPORARY: Using ncWMS while THREDDS server is down
const FORECAST_WMS_URL = "https://gemthreddshpc.spc.int/thredds/wms/POP/model/country/spc/forecast/hourly/COK/SWAN_UGRID.nc";
const FORECAST_DATASET = "cook_forecast";

const getResponsiveLegendDimensions = () => {
  const screenWidth = window.innerWidth;
  if (screenWidth <= 480) {
    return { width: '40', height: '200' };
  }
  if (screenWidth <= 768) {
    return { width: '45', height: '240' };
  }
  if (screenWidth <= 1024) {
    return { width: '50', height: '280' };
  }
  return { width: '60', height: '320' };
};



// World-class legend URL generator
const getWorldClassLegendUrl = (variable, range, unit) => {
  return worldClassViz.getWorldClassLegendUrl(variable, range, unit);
};

const getRarotongaInundationLegendUrl = () => {
  const baseUrl = "https://gemthreddshpc.spc.int/thredds/wms/POP/model/country/spc/forecast/hourly/COK/sfincs_map_epsg4326.nc";
  const { width, height } = getResponsiveLegendDimensions();
  const params = new URLSearchParams({
    REQUEST: 'GetLegendGraphic',
    LAYER: 'hmax',
    PALETTE: 'x-Sst',
    COLORBARONLY: 'true',
    WIDTH: width,
    HEIGHT: height,
    COLORSCALERANGE: INUNDATION_VISUAL_COLOR_SCALE_RANGE,
    NUMCOLORBANDS: '250',
    COLORSCALING: 'linear',
    VERTICAL: 'true',
    TRANSPARENT: 'true',
    FORMAT: 'image/png',
    unit: 'm'
  });
  return `${baseUrl}?${params.toString()}`;
};

const variableConfigMap = {
  hs: (maxHeight) => worldClassViz.getAdaptiveWaveHeightConfig(maxHeight, "tropical"),
  tm02: () => worldClassViz.getAdaptiveWavePeriodConfig(20.0, "cookIslands"),
  tpeak: () => ({
    style: "default-scalar/psu-magma",
    // Use full range starting from zero for peak wave period visualization
    colorscalerange: "0,13.68",
    numcolorbands: 200,
    belowmincolor: "transparent",
    abovemaxcolor: "extend"
  }),
  inun: () => ({
    style: "default-scalar/x-Sst",
    colorscalerange: INUNDATION_VISUAL_COLOR_SCALE_RANGE,
    numcolorbands: 250,
    belowmincolor: "transparent",
    abovemaxcolor: "extend",
    colorscaling: "linear"
  }),
  dirm: () => ({ style: "black-arrow", colorscalerange: "" }),
};

// Get adaptive WMS configuration based on variable type and conditions
const getWorldClassConfig = (variable, maxHeight = 6.0) => {
  for (const key in variableConfigMap) {
    if (variable.includes(key)) {
      return variableConfigMap[key](maxHeight);
    }
  }
  // Default fallback
  return worldClassViz.getAdaptiveWaveHeightConfig();
};

const widgetContainerStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "calc(100dvh - 0px)",
  zIndex: 9999,
};

// Set default map center to Rarotonga, Cook Islands - matching model domain exactly
const southWest = L.latLng(-21.7498293078, -160.25042381);
const northEast = L.latLng(-20.7496610545, -159.2500903777);
const bounds = L.latLngBounds(southWest, northEast);



function CookIslandsForecast() {
  // World-class composite layer configuration
  const WAVE_FORECAST_LAYERS = useMemo(() => {
    const worldClassComposite = worldClassViz.getWorldClassCompositeConfig();
    return [
      // 🌊 WORLD-CLASS COMPOSITE LAYER
      worldClassComposite,
      


      {
        label: "Mean Wave Period",
        value: "tm02",
        ...getWorldClassConfig('tm02'),
        id: 4,
        wmsUrl: FORECAST_WMS_URL,
        dataset: FORECAST_DATASET,
        legendUrl: getWorldClassLegendUrl('tm02', '0,20', 's'),
        description: "ENHANCED Divergent Spectral palette - maximum visual distinction for wave period analysis with full spectrum color differentiation"
      },
      {
        label: "Peak Wave Period",
        value: "tpeak", 
        ...getWorldClassConfig('tpeak'),
        id: 5,
        wmsUrl: FORECAST_WMS_URL,
        dataset: FORECAST_DATASET,
        legendUrl: getWorldClassLegendUrl('tpeak', '0,13.68', 's'),
        description: "Enhanced peak period analysis with full range (0-13.68s) using magma color gradation"
      }
    ];
  }, []);

  // Additional forecast layers
  const STATIC_LAYERS = useMemo(() => {
    return [
      {
        label: "Rarotonga Inundation",
        value: "Cook_island_national_sfincs/hmax",
        ...getWorldClassConfig('raro_inun'),
        id: 200,
        wmsUrl: "https://gem-ncwms-hpc.spc.int/ncWMS/wms",
        legendUrl: getRarotongaInundationLegendUrl(),
        description: "SFINCS model maximum water depth",
        style: 'default-scalar/x-Sst',
        version: '1.1.1',
        crs: L.CRS.EPSG4326,
        isStatic: false
      }
    ];
  }, []);
  
  // Combined layers for components that need all layers
  const ALL_LAYERS = useMemo(() => {
    return [...WAVE_FORECAST_LAYERS, ...STATIC_LAYERS];
  }, [WAVE_FORECAST_LAYERS, STATIC_LAYERS]);

  const cookIslandsConfig = useMemo(() => ({
    WAVE_FORECAST_LAYERS,
    STATIC_LAYERS,
    ALL_LAYERS,
    WAVE_BUOYS: [], // No buoys for Cook Islands
    bounds,
    addWMSTileLayer,
  }), [WAVE_FORECAST_LAYERS, STATIC_LAYERS, ALL_LAYERS]);
  
  const {
    showBuoyCanvas, setShowBuoyCanvas,
    showBottomCanvas, setShowBottomCanvas,
    bottomCanvasData, setBottomCanvasData,
    selectedBuoyId,
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
  } = useForecast(cookIslandsConfig);

  // Debug: Track state changes
  useEffect(() => {
    console.log("🎯 BottomCanvas State - show:", showBottomCanvas, "data:", bottomCanvasData);
  }, [showBottomCanvas, bottomCanvasData]);

  useRiskOverlay({
    mapInstance,
    enabled: activeLayers?.riskPoints !== false,
    selectedRiskPointId: bottomCanvasData?.mode === 'risk' ? bottomCanvasData?.point?.id : null,
    setBottomCanvasData,
    setShowBottomCanvas
  });

  return (
    <div style={widgetContainerStyle}>
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
        minIndex={minIndex}

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
      <BottomBuoyOffCanvas
        show={showBuoyCanvas}
        onHide={() => setShowBuoyCanvas(false)}
        buoyId={selectedBuoyId}
      />
    </div>
  );
}

export default CookIslandsForecast;
