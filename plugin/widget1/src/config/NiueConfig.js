/**
 * Niue Configuration - Marine Forecast Settings
 * 
 * Centralized configuration for Niue's marine forecast system
 * including colors, coordinates, and regional settings.
 */

export const NIUE_CONFIG = {
  // Geographic information
  name: 'Niue',
  code: 'NIU',
  timezone: 'Pacific/Niue',
  coordinates: [-19.0544, -169.8672], // [lat, lng]
  
  // Map bounds for Niue waters
  bounds: {
    southwest: [-19.2, -169.9],
    northeast: [-18.8, -169.6]
  },
  
  // Color palette - Deep Pacific marine theme
  colors: {
    primary: '#06b6d4',      // Cyan-500 - Deep Pacific blue
    secondary: '#0ea5e9',    // Sky-500 - Lighter ocean blue
    accent: '#f97316',       // Orange-500 - Coral/sunset accent
    background: '#f8fafc',   // Slate-50 - Light background
    surface: '#ffffff',      // Pure white for cards
    text: {
      primary: '#0f172a',    // Slate-900 - Dark text
      secondary: '#64748b',  // Slate-500 - Muted text
      inverse: '#ffffff'     // White text for dark backgrounds
    },
    marine: {
      deepBlue: '#1e40af',   // Blue-800 - Deep ocean
      waveBlue: '#06b6d4',   // Cyan-500 - Wave colors
      shallowBlue: '#7dd3fc', // Sky-300 - Shallow water
      coral: '#fb7185',      // Rose-400 - Coral reef
      sand: '#fbbf24'        // Amber-400 - Sandy bottom
    }
  },
  
  // Typography
  fonts: {
    display: '"Inter", system-ui, sans-serif',
    body: '"Inter", system-ui, sans-serif',
    mono: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace'
  },
  
  // Marine data sources
  dataSources: {
    wms: {
      primary: 'https://gemthreddshpc.spc.int/thredds/wms/POP/model/country/spc/forecast/hourly/NIU/ForecastNiue_latest.nc',
      backup: 'https://ocean-wms.spc.int/ncWMS2/wms'
    },
    buoys: [
      {
        id: 'SPOT-31153C',
        name: 'Niue North',
        coordinates: [-18.9747, -169.9024667]
      },
      {
        id: 'SPOT-31071C', 
        name: 'Niue Central',
        coordinates: [-19.0662333, -169.98535]
      },
      {
        id: 'SPOT-31091C',
        name: 'Niue South', 
        coordinates: [-19.05455, -169.9315]
      }
    ]
  },
  
  // Regional settings
  locale: {
    language: 'en-NU', // English (Niue)
    currency: 'NZD',   // New Zealand Dollar
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h'
  },
  
  // Marine forecast parameters
  forecast: {
    defaultLayers: ['composite_hs_dirm', 'hs', 'tm02', 'tpeak', 'dirm'],
    updateInterval: 600000, // 10 minutes in milliseconds
    maxHistoryDays: 7,
    forecastHours: 72
  },
  
  // UI preferences
  ui: {
    defaultTheme: 'marine',
    compactMode: false,
    showHeader: true,
    showCompass: true,
    defaultPanelWidth: 400,
    mobileBreakpoint: 768
  }
};

export default NIUE_CONFIG;