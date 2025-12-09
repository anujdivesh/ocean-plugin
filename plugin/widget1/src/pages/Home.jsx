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

// PERFORMANCE: Use static configuration instead of async data fetching
// This matches Widget5 and Widget11 approach for faster initial load

// Static configuration for Niue wave parameters (no async fetching needed)
const variableConfigMap = {
  hs: (maxHeight) => worldClassViz.getAdaptiveWaveHeightConfig(maxHeight, "tropical"),
  tm02: () => ({
    palette: 'psu-viridis',
    range: '0,12',  // Static range based on Niue climatology
    numcolorbands: 250
  }),
  tpeak: () => ({
    palette: 'psu-viridis',
    range: '0,17.4',  // Static range based on Niue climatology
    numcolorbands: 250
  }),
  dirm: () => ({
    palette: 'black-arrow',
    range: '',
    numcolorbands: 0
  }),
  inundation: () => ({
    style: "default-scalar/x-Sst",
    colorscalerange: "-0.05,9",
    numcolorbands: 250,
    belowmincolor: "transparent",
    abovemaxcolor: "extend"
  })
};

// Niue-specific WMS configuration - using ncWMS server like Cook Islands
const NIUE_WMS_BASE = "https://gem-ncwms-hpc.spc.int/ncWMS/wms";

function Home({ widgetData, validCountries }) {
  // PERFORMANCE FIX: Define layers with useMemo and static legendUrl (like Widget5/11)
  // This eliminates async data fetching that was causing slow initial load
  const WAVE_FORECAST_LAYERS = useMemo(() => [
    {
      label: "Significant Wave Height + Dir",
      value: "composite_hs_dirm",
      composite: true,
      wmsUrl: NIUE_WMS_BASE,
      legendUrl: getWorldClassLegendUrl('hs', '0,4', 'm'),
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
      colorscalerange: "0,12",
      numcolorbands: 250,
      legendUrl: getWorldClassLegendUrl('tm02', '0,12', 's'),
    },
    {
      label: "Peak Wave Period",
      value: "niue_forecast/tpeak",
      wmsUrl: NIUE_WMS_BASE,
      dataset: "niue_forecast",
      style: "default-scalar/x-Sst",
      colorscalerange: "0,17.4",
      numcolorbands: 250,
      legendUrl: getWorldClassLegendUrl('tpeak', '0,17.4', 's'),
    },
    {
      label: "Inundation Depth",
      value: "inundation",
      wmsUrl: "https://gemthreddshpc.spc.int/thredds/wms/POP/model/country/spc/forecast/hourly/NIU/InundationNiue_latest.nc",
      dataset: "niue_inundation",
      style: "default-scalar/x-Sst",
      colorscalerange: "-0.05,9",
      numcolorbands: 250,
      belowmincolor: "transparent",
      abovemaxcolor: "extend",
      legendUrl: getWorldClassLegendUrl('inundation', '-0.05,9', 'm'),
    }
  ], []);
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

  // PERFORMANCE FIX: Use static layer definitions with useMemo (like Widget5/11)
  // Eliminates async data fetching that was causing slow initial load
  const STATIC_LAYERS = useMemo(() => [], []);
  const ALL_LAYERS = useMemo(() => ([...WAVE_FORECAST_LAYERS, ...STATIC_LAYERS]), [WAVE_FORECAST_LAYERS, STATIC_LAYERS]);

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
    }), [WAVE_FORECAST_LAYERS, STATIC_LAYERS, ALL_LAYERS, niueBounds]
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

  // Buoy functionality
  const openBuoyCanvas = (buoyId) => {
    console.log("openBuoyCanvas called with:", buoyId);
    setShowBottomCanvas(false);
    setSelectedBuoyId(buoyId);
    setShowBuoyCanvas(true);
    console.log("State after setting:", { showBuoyCanvas: true, selectedBuoyId: buoyId });
  };

  // Ensure only one canvas is open at a time
  useEffect(() => {
    if (showBottomCanvas) {
      setShowBuoyCanvas(false);
    }
  }, [showBottomCanvas]);

  // Auto-zoom when Inundation layer is selected
  useEffect(() => {
    if (selectedWaveForecast === 'inundation' && mapInstance.current) {
      mapInstance.current.setZoom(15);
    }
  }, [selectedWaveForecast, mapInstance]);

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
