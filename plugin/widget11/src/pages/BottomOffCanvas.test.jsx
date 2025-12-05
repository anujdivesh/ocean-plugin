/**
 * BottomOffCanvas Component Tests
 * 
 * Tests for BottomOffCanvas component functionality, especially the new wmsUrl parameter
 * These tests verify the bug fix for Nanumanga data not being plotted when zoomed in.
 * 
 * These tests directly invoke fetchLayerTimeseries and verify that it uses the correct
 * WMS URL (island-specific or national) when making fetch requests.
 */

import TuvaluConfig from '../config/TuvaluConfig';

// Mock fetch globally
global.fetch = jest.fn();

// Mock TuvaluConfig
jest.mock('../config/TuvaluConfig', () => ({
  WMS_BASE_URL: 'https://gemthreddshpc.spc.int/thredds/wms/POP/model/country/spc/forecast/hourly/TUV/Tuvalu.nc'
}));

// Mock tabular and timeseries to avoid plotly initialization issues in Jest
// Plotly.js requires window.URL.createObjectURL which is not available in jsdom
jest.mock('./tabular.js', () => {
  return function Tabular() {
    return null;
  };
});

jest.mock('./timeseries.js', () => {
  return function Timeseries() {
    return null;
  };
});

// Import after mocks are set up to ensure mocks take effect
const { fetchLayerTimeseries } = require('./BottomOffCanvas');

describe('BottomOffCanvas wmsUrl functionality', () => {
  const mockData = {
    bbox: '176.0,-6.5,176.5,-6.0',
    x: 100,
    y: 100,
    height: 256,
    width: 256,
    timeDimension: '2024-01-01T00:00:00Z'
  };

  const mockResponseData = {
    domain: {
      axes: {
        time: { values: ['2024-01-01T00:00:00Z'] }
      }
    },
    ranges: {
      hs: { values: [1.5] },
      Hs: { values: [1.5] }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();
    // Setup default mock response
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponseData
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Test 1: Verify fetchLayerTimeseries uses island-specific wmsUrl when provided
   * This is the core fix for Nanumanga not plotting - island-specific URLs must be used
   */
  test('fetchLayerTimeseries uses provided island-specific wmsUrl parameter', async () => {
    const islandWmsUrl = 'https://gemthreddshpc.spc.int/thredds/wms/POP/model/country/spc/forecast/hourly/TUV/P2_Nanumanga.nc';
    const layer = 'hs';
    
    // Call the actual function with island-specific URL
    await fetchLayerTimeseries(layer, mockData, 'Hs', islandWmsUrl);
    
    // Verify fetch was called
    expect(global.fetch).toHaveBeenCalled();
    
    // Get the URL that was actually fetched
    const fetchedUrl = global.fetch.mock.calls[0][0];
    
    // Critical assertion: The fetched URL must contain the island-specific endpoint
    expect(fetchedUrl).toContain('P2_Nanumanga.nc');
    expect(fetchedUrl).not.toContain('Tuvalu.nc');
    
    // Verify it's a proper GetTimeseries request
    expect(fetchedUrl).toContain('REQUEST=GetTimeseries');
    expect(fetchedUrl).toContain('LAYERS=Hs');
  });

  /**
   * Test 2: Verify fetchLayerTimeseries falls back to TuvaluConfig.WMS_BASE_URL when wmsUrl is null
   * This ensures backward compatibility - null should use national scale
   */
  test('fetchLayerTimeseries falls back to national URL when wmsUrl is null', async () => {
    const layer = 'hs';
    
    // Call the actual function with null wmsUrl
    await fetchLayerTimeseries(layer, mockData, 'Hs', null);
    
    // Verify fetch was called
    expect(global.fetch).toHaveBeenCalled();
    
    // Get the URL that was actually fetched
    const fetchedUrl = global.fetch.mock.calls[0][0];
    
    // Critical assertion: The fetched URL must contain the national endpoint
    expect(fetchedUrl).toContain('Tuvalu.nc');
    expect(fetchedUrl).not.toContain('P2_Nanumanga.nc');
    
    // Verify it's a proper GetTimeseries request
    expect(fetchedUrl).toContain('REQUEST=GetTimeseries');
  });

  /**
   * Test 3: Verify fetchLayerTimeseries falls back to TuvaluConfig.WMS_BASE_URL when wmsUrl is undefined
   * This ensures backward compatibility - undefined should use national scale
   */
  test('fetchLayerTimeseries falls back to national URL when wmsUrl is undefined', async () => {
    const layer = 'hs';
    
    // Call the actual function without wmsUrl parameter (undefined)
    await fetchLayerTimeseries(layer, mockData, 'Hs', undefined);
    
    // Verify fetch was called
    expect(global.fetch).toHaveBeenCalled();
    
    // Get the URL that was actually fetched
    const fetchedUrl = global.fetch.mock.calls[0][0];
    
    // Critical assertion: The fetched URL must contain the national endpoint
    expect(fetchedUrl).toContain('Tuvalu.nc');
    
    // Verify it's a proper GetTimeseries request
    expect(fetchedUrl).toContain('REQUEST=GetTimeseries');
  });

  /**
   * Test 4: Verify different island URLs are used correctly
   * Tests that different island-specific endpoints work as expected
   */
  test('fetchLayerTimeseries correctly uses different island-specific endpoints', async () => {
    const nanumeaUrl = 'https://gemthreddshpc.spc.int/thredds/wms/POP/model/country/spc/forecast/hourly/TUV/P1_Nanumea.nc';
    const funafutiUrl = 'https://gemthreddshpc.spc.int/thredds/wms/POP/model/country/spc/forecast/hourly/TUV/P7_Fongafale.nc';
    
    // Test Nanumea
    await fetchLayerTimeseries('hs', mockData, 'Hs', nanumeaUrl);
    expect(global.fetch.mock.calls[0][0]).toContain('P1_Nanumea.nc');
    
    // Clear and test Funafuti
    global.fetch.mockClear();
    await fetchLayerTimeseries('hs', mockData, 'Hs', funafutiUrl);
    expect(global.fetch.mock.calls[0][0]).toContain('P7_Fongafale.nc');
  });

  /**
   * Test 5: Verify wmsUrl parameter affects actual fetch behavior
   * Regression test - changing wmsUrl should change the fetched URL
   */
  test('changing wmsUrl parameter changes the fetched URL', async () => {
    const islandUrl = 'https://gemthreddshpc.spc.int/thredds/wms/POP/model/country/spc/forecast/hourly/TUV/P2_Nanumanga.nc';
    const nationalUrl = TuvaluConfig.WMS_BASE_URL;
    
    // First call with island URL
    await fetchLayerTimeseries('hs', mockData, 'Hs', islandUrl);
    const firstFetchUrl = global.fetch.mock.calls[0][0];
    
    // Second call with national URL  
    global.fetch.mockClear();
    await fetchLayerTimeseries('hs', mockData, 'Hs', nationalUrl);
    const secondFetchUrl = global.fetch.mock.calls[0][0];
    
    // The URLs should be different
    expect(firstFetchUrl).not.toBe(secondFetchUrl);
    expect(firstFetchUrl).toContain('P2_Nanumanga.nc');
    expect(secondFetchUrl).toContain('Tuvalu.nc');
  });

  /**
   * Test 6: Verify complete URL construction with all parameters
   * Ensures the fix doesn't break other URL parameters
   */
  test('fetchLayerTimeseries constructs complete URL with all parameters', async () => {
    const islandUrl = 'https://gemthreddshpc.spc.int/thredds/wms/POP/model/country/spc/forecast/hourly/TUV/P2_Nanumanga.nc';
    
    await fetchLayerTimeseries('tm02', mockData, 'Tm', islandUrl);
    
    const fetchedUrl = global.fetch.mock.calls[0][0];
    
    // Verify all required parameters are present
    expect(fetchedUrl).toContain('P2_Nanumanga.nc');
    expect(fetchedUrl).toContain('REQUEST=GetTimeseries');
    expect(fetchedUrl).toContain('LAYERS=Tm');
    expect(fetchedUrl).toContain('BBOX=');
    expect(fetchedUrl).toContain('SRS=CRS:84');
    expect(fetchedUrl).toContain('X=100');
    expect(fetchedUrl).toContain('Y=100');
  });

  /**
   * Test 7: Verify function returns null for invalid data
   * Ensures error handling still works correctly
   */
  test('fetchLayerTimeseries returns null for invalid data', async () => {
    const islandUrl = 'https://gemthreddshpc.spc.int/thredds/wms/POP/model/country/spc/forecast/hourly/TUV/P2_Nanumanga.nc';
    const invalidData = { height: 256 }; // Missing required fields
    
    const result = await fetchLayerTimeseries('hs', invalidData, 'Hs', islandUrl);
    
    // Should return null for invalid data
    expect(result).toBeNull();
    
    // Should not attempt to fetch
    expect(global.fetch).not.toHaveBeenCalled();
  });

  /**
   * Test 8: Verify fetch error handling
   * Ensures errors don't break the wmsUrl logic
   */
  test('fetchLayerTimeseries handles fetch errors gracefully', async () => {
    const islandUrl = 'https://gemthreddshpc.spc.int/thredds/wms/POP/model/country/spc/forecast/hourly/TUV/P2_Nanumanga.nc';
    
    // Mock fetch to reject
    global.fetch.mockRejectedValueOnce(new Error('Network error'));
    
    const result = await fetchLayerTimeseries('hs', mockData, 'Hs', islandUrl);
    
    // Should return null on error
    expect(result).toBeNull();
    
    // But should have attempted to fetch with correct URL
    expect(global.fetch).toHaveBeenCalled();
    expect(global.fetch.mock.calls[0][0]).toContain('P2_Nanumanga.nc');
  });
});
