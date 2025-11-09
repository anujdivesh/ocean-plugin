/**
 * Tuvalu Configuration
 * 
 * Tuvalu-specific settings for marine forecast widget
 * Coverage: 9 atolls across Tuvalu
 * Data Source: THREDDS server with Tuvalu.nc + atoll-level datasets
 */

import L from 'leaflet';

// Tuvalu geographic bounds
// Covers from Nanumea (northernmost) to Niulakita (southernmost)
export const TUVALU_BOUNDS = {
  southWest: L.latLng(-10.8, 176.0),
  northEast: L.latLng(-5.6, 180.0),
};

export const bounds = L.latLngBounds(
  TUVALU_BOUNDS.southWest,
  TUVALU_BOUNDS.northEast
);

// Tuvalu's 9 atolls with their approximate coordinates and WMS endpoints
export const TUVALU_ATOLLS = [
  {
    name: 'Nanumea',
    lat: -5.6883,
    lon: 176.1367,
    dataset: 'nanumea_forecast',
    wmsUrl: 'https://gemthreddshpc.spc.int/thredds/wms/POP/model/country/spc/forecast/hourly/TUV/P1_Nanumea.nc'
  },
  {
    name: 'Nanumaga',
    lat: -6.2867,
    lon: 176.3200,
    dataset: 'nanumaga_forecast',
    wmsUrl: 'https://gemthreddshpc.spc.int/thredds/wms/POP/model/country/spc/forecast/hourly/TUV/P2_Nanumanga.nc'
  },
  {
    name: 'Niutao',
    lat: -6.1067,
    lon: 177.3433,
    dataset: 'niutao_forecast',
    wmsUrl: 'https://gemthreddshpc.spc.int/thredds/wms/POP/model/country/spc/forecast/hourly/TUV/P3_Niutao.nc'
  },
  {
    name: 'Nui',
    lat: -7.2400,
    lon: 177.1483,
    dataset: 'nui_forecast',
    wmsUrl: 'https://gemthreddshpc.spc.int/thredds/wms/POP/model/country/spc/forecast/hourly/TUV/P4_Nui.nc'
  },
  {
    name: 'Vaitupu',
    lat: -7.4767,
    lon: 178.6750,
    dataset: 'vaitupu_forecast',
    wmsUrl: 'https://gemthreddshpc.spc.int/thredds/wms/POP/model/country/spc/forecast/hourly/TUV/P5_Vaitupu.nc'
  },
  {
    name: 'Nukufetau',
    lat: -8.0000,
    lon: 178.5000,
    dataset: 'nukufetau_forecast',
    wmsUrl: 'https://gemthreddshpc.spc.int/thredds/wms/POP/model/country/spc/forecast/hourly/TUV/P6_Nukufetau.nc'
  },
  {
    name: 'Funafuti',
    lat: -8.5167,
    lon: 179.1967,
    dataset: 'funafuti_forecast',
    isCapital: true,
    wmsUrl: 'https://gemthreddshpc.spc.int/thredds/wms/POP/model/country/spc/forecast/hourly/TUV/P7_Fongafale.nc'
  },
  {
    name: 'Nukulaelae',
    lat: -9.3817,
    lon: 179.8517,
    dataset: 'nukulaelae_forecast',
    wmsUrl: 'https://gemthreddshpc.spc.int/thredds/wms/POP/model/country/spc/forecast/hourly/TUV/P8_Nukulaelae.nc'
  },
  {
    name: 'Niulakita',
    lat: -10.7833,
    lon: 179.4833,
    dataset: 'niulakita_forecast',
    wmsUrl: 'https://gemthreddshpc.spc.int/thredds/wms/POP/model/country/spc/forecast/hourly/TUV/P9_Niulakita.nc'
  }
];

// WMS Base URLs
// NOTE: Tuvalu data is NOT available on ncWMS server - must use THREDDS
export const WMS_BASE_URL = 'https://gemthreddshpc.spc.int/thredds/wms/POP/model/country/spc/forecast/hourly/TUV/Tuvalu.nc';
export const NCWMS_BASE_URL = 'https://gem-ncwms-hpc.spc.int/ncWMS/wms'; // For reference only

// Tuvalu forecast dataset layers
export const TUVALU_DATASETS = {
  // Main domain dataset
  FULL_DOMAIN: 'tuvalu_forecast',
  
  // Individual atoll datasets
  ATOLLS: TUVALU_ATOLLS.map(atoll => ({
    name: atoll.name,
    dataset: atoll.dataset,
    lat: atoll.lat,
    lon: atoll.lon,
    isCapital: atoll.isCapital || false
  }))
};

// Inundation data endpoint
export const INUNDATION_DATA_URL = 'https://gemthreddshpc.spc.int/thredds/fileServer/POP/model/country/spc/forecast/hourly/TUV/final.json';

// Wave forecast variables
export const WAVE_VARIABLES = {
  SIGNIFICANT_HEIGHT: 'hs',
  MEAN_PERIOD: 'tm02',
  PEAK_PERIOD: 'tpeak',
  DIRECTION: 'dirm'
};

const TuvaluConfig = {
  TUVALU_BOUNDS,
  bounds,
  TUVALU_ATOLLS,
  WMS_BASE_URL,
  TUVALU_DATASETS,
  INUNDATION_DATA_URL,
  WAVE_VARIABLES
};

export default TuvaluConfig;
