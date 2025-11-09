/**
 * Island Wave Statistics Utility
 * 
 * Handles dynamic color scale adjustment and wave statistics
 * for island-specific data visualization
 */

import TuvaluConfig from '../config/TuvaluConfig';
import logger from './logger';

const DEG_TO_RAD = Math.PI / 180;
const KM_PER_DEGREE_LAT = 111;
const MIN_COSINE_COEFFICIENT = 0.2;
const DEFAULT_GRID_SIZE = 5;
const CACHE_CAPACITY = 50;
const MAX_CONCURRENT_POINT_REQUESTS = 5;
const REQUEST_TIMEOUT_MS = 5000;
const MIN_POINT_BUFFER_KM = 0.5;
const MAX_POINT_BUFFER_KM = 5;
const statsCache = new Map();
const inFlightRequests = new Map();

const clampLatitude = (lat) => Math.max(-90, Math.min(90, lat));

const clampLongitude = (lon) => {
  if (!Number.isFinite(lon)) {
    return 0;
  }
  return Math.max(-180, Math.min(180, lon));
};

const kmToLatDegrees = (km) => km / KM_PER_DEGREE_LAT;

const kmToLonDegrees = (km, latitude) => {
  const cosLat = Math.max(
    Math.abs(Math.cos(Math.abs(latitude) * DEG_TO_RAD)),
    MIN_COSINE_COEFFICIENT
  );
  return km / (KM_PER_DEGREE_LAT * cosLat);
};

const roundCoord = (value) => Number(value.toFixed(5));

const createCacheKey = (bbox, layerName, timeStr) =>
  JSON.stringify({
    layerName,
    time: timeStr,
    bbox: {
      minLat: roundCoord(bbox.minLat),
      maxLat: roundCoord(bbox.maxLat),
      minLon: roundCoord(bbox.minLon),
      maxLon: roundCoord(bbox.maxLon)
    }
  });

const getCachedStats = (key) => {
  if (!statsCache.has(key)) {
    return null;
  }

  const cached = statsCache.get(key);
  statsCache.delete(key);
  statsCache.set(key, cached);
  return { ...cached };
};

const setCachedStats = (key, value) => {
  if (statsCache.has(key)) {
    statsCache.delete(key);
  } else if (statsCache.size >= CACHE_CAPACITY) {
    const firstKey = statsCache.keys().next().value;
    statsCache.delete(firstKey);
  }

  statsCache.set(key, { ...value });
};

const fetchWithTimeout = async (url, timeoutMs) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

const processWithConcurrency = async (items, limit, iterator) => {
  if (!items.length) {
    return [];
  }

  const results = new Array(items.length);
  let index = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    (async () => {
      while (true) {
        const currentIndex = index;
        index += 1;

        if (currentIndex >= items.length) {
          break;
        }

        try {
          results[currentIndex] = await iterator(items[currentIndex], currentIndex);
        } catch (error) {
          results[currentIndex] = null;
        }
      }
    })()
  );

  await Promise.all(workers);
  return results;
};

const buildPointBoundingBox = (point, latStep, lonStep) => {
  const latSpacingKm = Math.abs(latStep) * KM_PER_DEGREE_LAT;
  const cosLat = Math.max(
    Math.abs(Math.cos(Math.abs(point.lat) * DEG_TO_RAD)),
    MIN_COSINE_COEFFICIENT
  );
  const lonSpacingKm = Math.abs(lonStep) * KM_PER_DEGREE_LAT * cosLat;
  const nominalSpacingKm = Math.min(
    Number.isFinite(latSpacingKm) && latSpacingKm > 0 ? latSpacingKm : Number.POSITIVE_INFINITY,
    Number.isFinite(lonSpacingKm) && lonSpacingKm > 0 ? lonSpacingKm : Number.POSITIVE_INFINITY
  );

  let pointBufferKm = nominalSpacingKm;
  if (!Number.isFinite(pointBufferKm) || pointBufferKm === Number.POSITIVE_INFINITY) {
    pointBufferKm = MIN_POINT_BUFFER_KM;
  } else {
    pointBufferKm = Math.max(MIN_POINT_BUFFER_KM, Math.min(pointBufferKm / 2, MAX_POINT_BUFFER_KM));
  }

  const latDelta = kmToLatDegrees(pointBufferKm);
  const lonDelta = kmToLonDegrees(pointBufferKm, point.lat);

  return {
    minLon: clampLongitude(point.lon - lonDelta),
    minLat: clampLatitude(point.lat - latDelta),
    maxLon: clampLongitude(point.lon + lonDelta),
    maxLat: clampLatitude(point.lat + latDelta)
  };
};

const buildFeatureInfoUrl = (baseUrl, params) => {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
};

const calculateMedian = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const calculateStdDev = (values, mean) => {
  const variance = values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
};

const calculateQuantiles = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const q = (p) => {
    const pos = (sorted.length - 1) * p;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    } 
    return sorted[base];
  };

  return {
    '25': q(0.25),
    '50': q(0.5),
    '75': q(0.75)
  };
};

/**
 * Get bounding box for an island with buffer zone
 * @param {Object} island - Island object with lat/lon
 * @param {number} bufferKm - Buffer distance in kilometers (default 15km for small atolls)
 * @returns {Object} - Bounding box { minLat, maxLat, minLon, maxLon }
 */
export const getIslandBoundingBox = (island, bufferKm = 15) => {
  if (!island || !island.lat || !island.lon) {
    logger.warn('ISLAND_STATS', 'Invalid island data for bounding box calculation');
    return null;
  }

  // Convert km to degrees (rough approximation at Tuvalu's latitude ~7°S)
  // 1 degree latitude ≈ 111 km
  // 1 degree longitude ≈ 111 * cos(latitude) km
  const safeCosLat = Math.max(
    Math.abs(Math.cos(Math.abs(island.lat) * DEG_TO_RAD)),
    MIN_COSINE_COEFFICIENT
  );

  const latBuffer = bufferKm / KM_PER_DEGREE_LAT;
  const lonBuffer = bufferKm / (KM_PER_DEGREE_LAT * safeCosLat);

  const rawBbox = {
    minLat: island.lat - latBuffer,
    maxLat: island.lat + latBuffer,
    minLon: island.lon - lonBuffer,
    maxLon: island.lon + lonBuffer,
    centerLat: island.lat,
    centerLon: island.lon
  };

  const clampedBbox = {
    minLat: clampLatitude(rawBbox.minLat),
    maxLat: clampLatitude(rawBbox.maxLat),
    minLon: clampLongitude(rawBbox.minLon),
    maxLon: clampLongitude(rawBbox.maxLon),
    centerLat: clampLatitude(rawBbox.centerLat),
    centerLon: clampLongitude(rawBbox.centerLon)
  };

  if (clampedBbox.minLat > clampedBbox.maxLat) {
    [clampedBbox.minLat, clampedBbox.maxLat] = [clampedBbox.maxLat, clampedBbox.minLat];
  }
  if (clampedBbox.minLon > clampedBbox.maxLon) {
    [clampedBbox.minLon, clampedBbox.maxLon] = [clampedBbox.maxLon, clampedBbox.minLon];
  }

  logger.debug('ISLAND_STATS', `Bounding box for ${island.name}`, clampedBbox);
  return clampedBbox;
};

/**
 * Query WMS server for min/max values within bounding box
 * Uses WMS GetFeatureInfo at multiple sample points
 * 
 * @param {Object} bbox - Bounding box from getIslandBoundingBox
 * @param {string} layerName - WMS layer name (e.g., 'Hs')
 * @param {Date|string} forecastTime - Forecast time (Date object or ISO string)
 * @param {string} wmsUrl - Island-specific WMS URL (optional, defaults to TuvaluConfig.WMS_BASE_URL)
 * @returns {Promise<Object>} - { min, max, mean, samples }
 */
export const queryIslandWaveStats = async (bbox, layerName, forecastTime, wmsUrl = null) => {
  if (!bbox || !layerName || !forecastTime) {
    return null;
  }

  const timeStr = forecastTime instanceof Date
    ? forecastTime.toISOString()
    : forecastTime;

  const cacheKey = createCacheKey(bbox, layerName, timeStr);
  const cachedStats = getCachedStats(cacheKey);
  if (cachedStats) {
    logger.debug('ISLAND_STATS', `Cache hit for ${layerName}`, { layerName, time: timeStr });
    return cachedStats;
  }

  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const statsPromise = (async () => {
    try {
      const gridSize = DEFAULT_GRID_SIZE;
      const denominator = gridSize > 1 ? (gridSize - 1) : 1;
      const latStep = (bbox.maxLat - bbox.minLat) / denominator;
      const lonStep = (bbox.maxLon - bbox.minLon) / denominator;

      const samplePoints = [];
      for (let i = 0; i < gridSize; i += 1) {
        for (let j = 0; j < gridSize; j += 1) {
          samplePoints.push({
            lat: bbox.minLat + (i * latStep),
            lon: bbox.minLon + (j * lonStep)
          });
        }
      }

      // Use island-specific WMS URL if provided, otherwise fall back to config default
      const baseUrl = wmsUrl || TuvaluConfig.WMS_BASE_URL;

      // Log first sample URL for debugging
      if (samplePoints.length > 0) {
        const firstPoint = samplePoints[0];
        const firstPointBbox = buildPointBoundingBox(firstPoint, latStep, lonStep);
        const sampleUrl = buildFeatureInfoUrl(baseUrl, {
          SERVICE: 'WMS',
          VERSION: '1.3.0',
          REQUEST: 'GetFeatureInfo',
          LAYERS: layerName,
          QUERY_LAYERS: layerName,
          INFO_FORMAT: 'text/xml',
          FEATURE_COUNT: '1',
          I: '50',
          J: '50',
          WIDTH: '100',
          HEIGHT: '100',
          CRS: 'EPSG:4326',
          BBOX: `${firstPointBbox.minLon},${firstPointBbox.minLat},${firstPointBbox.maxLon},${firstPointBbox.maxLat}`
          // TIME parameter omitted - using default time from WMS
        });
        logger.debug('ISLAND_STATS', `Sample WMS GetFeatureInfo URL for ${layerName}`, {
          url: sampleUrl,
          layer: layerName,
          timeRequested: timeStr,
          note: 'Using default WMS time (TIME parameter omitted)',
          point: `(${firstPoint.lat.toFixed(4)}, ${firstPoint.lon.toFixed(4)})`,
          bbox: firstPointBbox
        });
      }

      const pointValues = await processWithConcurrency(
        samplePoints,
        MAX_CONCURRENT_POINT_REQUESTS,
        async (point) => {
          const pointBbox = buildPointBoundingBox(point, latStep, lonStep);
          
          // Build WMS GetFeatureInfo request
          // NOTE: Omitting TIME parameter to use default/current time from dataset
          // because slider time may not match available times in island-specific files
          const url = buildFeatureInfoUrl(baseUrl, {
            SERVICE: 'WMS',
            VERSION: '1.3.0',
            REQUEST: 'GetFeatureInfo',
            LAYERS: layerName,
            QUERY_LAYERS: layerName,
            INFO_FORMAT: 'text/xml',
            FEATURE_COUNT: '1',
            I: '50',
            J: '50',
            WIDTH: '100',
            HEIGHT: '100',
            CRS: 'EPSG:4326',
            BBOX: `${pointBbox.minLon},${pointBbox.minLat},${pointBbox.maxLon},${pointBbox.maxLat}`,
            TIME: timeStr
          });

          try {
            const response = await fetchWithTimeout(url, REQUEST_TIMEOUT_MS);

            if (!response.ok) {
              logger.debug(
                'ISLAND_STATS',
                `GetFeatureInfo failed for ${layerName} at (${point.lat.toFixed(3)}, ${point.lon.toFixed(3)}): HTTP ${response.status}`
              );
              return null;
            }

            const text = await response.text();
            
            // Log first WMS response to see what format we're getting
            if (samplePoints.indexOf(point) === 0) {
              logger.debug('ISLAND_STATS', `First WMS response for ${layerName}`, {
                url: url.substring(0, 200),
                responseLength: text.length,
                responsePreview: text.substring(0, 500)
              });
            }
            
            const value = parseWMSFeatureInfoValue(text, layerName);

            if (value !== null && !Number.isNaN(value)) {
              logger.debug(
                'ISLAND_STATS',
                `Got ${layerName} value ${value} at (${point.lat.toFixed(3)}, ${point.lon.toFixed(3)})`
              );
              return value;
            }

            logger.debug(
              'ISLAND_STATS',
              `No numeric value found for ${layerName} at (${point.lat.toFixed(3)}, ${point.lon.toFixed(3)})`
            );
            return null;
          } catch (error) {
            if (error.name === 'AbortError') {
              logger.debug(
                'ISLAND_STATS',
                `GetFeatureInfo timeout for ${layerName} at (${point.lat.toFixed(3)}, ${point.lon.toFixed(3)})`
              );
            } else {
              logger.debug('ISLAND_STATS', `GetFeatureInfo error for ${layerName}: ${error.message}`);
            }
            return null;
          }
        }
      );

      const values = [];
      pointValues.forEach((value) => {
        if (value !== null && !Number.isNaN(value)) {
          values.push(value);
        }
      });

      if (values.length === 0) {
        logger.warn(
          'ISLAND_STATS',
          `No valid values found for ${layerName} in bounding box`,
          {
            layerName,
            bbox,
            time: timeStr,
            queriedPoints: samplePoints.length,
            successfulQueries: values.length
          }
        );
        return null;
      }

      const min = Math.min(...values);
      const max = Math.max(...values);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const median = calculateMedian(values);
      const stdDev = calculateStdDev(values, mean);
      const quantiles = calculateQuantiles(values);

      const stats = {
        min: parseFloat(min.toFixed(3)),
        max: parseFloat(max.toFixed(3)),
        mean: parseFloat(mean.toFixed(3)),
        median: parseFloat(median.toFixed(3)),
        stdDev: parseFloat(stdDev.toFixed(3)),
        quantiles,
        values,
        samples: values.length,
        layer: layerName
      };

      logger.info('ISLAND_STATS', `Wave stats for ${layerName}`, stats);
      return stats;
    } catch (error) {
      logger.error('ISLAND_STATS', `Failed to query wave stats: ${error.message}`);
      return null;
    }
  })();

  inFlightRequests.set(cacheKey, statsPromise);

  try {
    const stats = await statsPromise;
    if (stats) {
      setCachedStats(cacheKey, stats);
    }
    return stats;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
};

/**
 * Parse WMS FeatureInfo XML response to extract value for specific layer
 * @param {string} xmlText - XML response from WMS server
 * @param {string} layerName - Layer name to extract value for (e.g., 'Hs', 'Tm', 'Dir' for THREDDS)
 * @returns {number|null} - Parsed value or null
 */
const parseWMSFeatureInfoValue = (xmlText, layerName) => {
  try {
    // Parse XML using DOMParser for robust handling
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    // Check for XML parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      logger.debug('ISLAND_STATS', `XML parsing error for ${layerName}`, {
        error: parserError.textContent,
        rawXML: xmlText.substring(0, 200)
      });
      return null;
    }
    
    // Check for WMS ServiceException (invalid layer, time, or other errors)
    const serviceException = xmlDoc.querySelector('ServiceException');
    if (serviceException) {
      const errorMsg = serviceException.textContent?.trim();
      logger.warn('ISLAND_STATS', `WMS ServiceException for ${layerName}`, {
        layer: layerName,
        error: errorMsg,
        rawXML: xmlText.substring(0, 300)
      });
      return null;
    }
    
    // Try multiple strategies to find the value
    
    // Strategy 1: Look for tag matching the layer name (e.g., <Hs>2.5</Hs>)
    let element = xmlDoc.querySelector(layerName);
    if (element && element.textContent) {
      const value = parseNumericValue(element.textContent);
      if (value !== null) return value;
    }
    
    // Strategy 2: Look for layer name with namespace (e.g., <gml:Hs>)
    const namespacedSelectors = [
      `*|${layerName}`, // Any namespace
      `gml\\:${layerName}`, // GML namespace
      `wms\\:${layerName}`, // WMS namespace
    ];
    
    for (const selector of namespacedSelectors) {
      try {
        element = xmlDoc.querySelector(selector);
        if (element && element.textContent) {
          const value = parseNumericValue(element.textContent);
          if (value !== null) return value;
        }
      } catch (e) {
        // Selector might not be valid in all browsers, continue
      }
    }
    
    // Strategy 3: Look for <value> tag with attribute matching layer
    const valueElements = xmlDoc.querySelectorAll('value, Value');
    for (const elem of valueElements) {
      const name = elem.getAttribute('name') || elem.getAttribute('layer');
      if (name === layerName && elem.textContent) {
        const value = parseNumericValue(elem.textContent);
        if (value !== null) return value;
      }
    }
    
    // Strategy 4: Look for FeatureInfo with parameter name
    const featureInfos = xmlDoc.querySelectorAll('FeatureInfo, featureInfo');
    for (const info of featureInfos) {
      const params = info.querySelectorAll('parameter, Parameter');
      for (const param of params) {
        const name = param.getAttribute('name') || param.querySelector('name, Name')?.textContent;
        if (name === layerName) {
          const valueElem = param.querySelector('value, Value');
          if (valueElem && valueElem.textContent) {
            const value = parseNumericValue(valueElem.textContent);
            if (value !== null) return value;
          }
        }
      }
    }
    
    // Strategy 5: Plain text response (some WMS servers return text/plain despite requesting text/xml)
    if (!xmlDoc.querySelector('*') || xmlDoc.documentElement.tagName === 'html') {
      // Likely plain text, try to extract number
      const plainText = xmlText.trim();
      if (plainText) {
        const value = parseNumericValue(plainText);
        if (value !== null) return value;
      }
    }
    
    // Log failure with raw payload for debugging
    logger.debug('ISLAND_STATS', `Failed to parse ${layerName} value from WMS response`, {
      layer: layerName,
      rawXML: xmlText.substring(0, 500), // First 500 chars
      xmlLength: xmlText.length,
      rootTag: xmlDoc.documentElement?.tagName
    });
    
    return null;
  } catch (error) {
    logger.error('ISLAND_STATS', `Error parsing WMS FeatureInfo for ${layerName}`, {
      error: error.message,
      rawXML: xmlText.substring(0, 200)
    });
    return null;
  }
};

/**
 * Parse numeric value from text content, handling locale formats and invalid values
 * @param {string} text - Text content to parse
 * @param {string} layerName - Layer name for logging
 * @returns {number|null} - Parsed number or null
 */
const parseNumericValue = (text) => {
  if (!text || typeof text !== 'string') {
    return null;
  }
  
  const trimmed = text.trim();
  
  // Check for non-numeric indicators
  const invalidValues = ['NaN', 'nan', '--', 'N/A', 'n/a', 'null', 'undefined', ''];
  if (invalidValues.includes(trimmed.toLowerCase()) || invalidValues.includes(trimmed)) {
    return null;
  }
  
  // Handle both dot and comma decimal separators (international formats)
  // Replace comma with dot for parsing (e.g., "2,5" -> "2.5")
  let normalized = trimmed.replace(',', '.');
  
  // Extract first number found (handles formats like "Value: 2.5 m")
  const match = normalized.match(/([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)/);
  if (match && match[1]) {
    const value = parseFloat(match[1]);
    
    // Validate the parsed value
    if (!isNaN(value) && isFinite(value)) {
      return value;
    }
  }
  
  return null;
};

/**
 * Calculate adaptive color scale range based on island stats
 * @param {Object} stats - Wave statistics from queryIslandWaveStats
 * @param {string} variable - Variable name (hs, tm02, etc.)
 * @param {string} scaleType - Type of scale ('linear', 'log', 'quantile')
 * @param {string} centerOn - Center the scale on 'mean' or 'median'
 * @returns {Object} - { min, max, center } for color scale
 */
export const calculateAdaptiveColorScale = (
  stats,
  variable,
  scaleType = 'linear',
  centerOn = 'mean'
) => {
  if (!stats || !stats.values || stats.values.length === 0) {
    return null;
  }

  const { min, max, mean, stdDev, median, quantiles } = stats;

  let adaptiveMin = min;
  let adaptiveMax = max;
  let center = centerOn === 'median' ? median : mean;

  // Smart buffering based on standard deviation
  const buffer = stdDev * 0.5; // Use half a standard deviation as buffer

  if (scaleType === 'linear') {
    adaptiveMin = Math.max(0, min - buffer);
    adaptiveMax = max + buffer;
  } else if (scaleType === 'log') {
    // Log scale is tricky, especially with values near 0
    // We'll use a simple approach: log-transform the min/max
    adaptiveMin = min > 0 ? Math.log(min) : 0;
    adaptiveMax = max > 0 ? Math.log(max) : 0;
    center = center > 0 ? Math.log(center) : 0;
  } else if (scaleType === 'quantile') {
    // Use quantiles to define the range
    adaptiveMin = quantiles['25'];
    adaptiveMax = quantiles['75'];
    center = median; // Median is the 50th percentile
  }

  const colorScale = {
    min: parseFloat(adaptiveMin.toFixed(2)),
    max: parseFloat(adaptiveMax.toFixed(2)),
    center: parseFloat(center.toFixed(2)),
    range: parseFloat((adaptiveMax - adaptiveMin).toFixed(2)),
    variable,
    scaleType,
    centerOn,
  };

  logger.info('ISLAND_STATS', `Adaptive color scale for ${variable}`, colorScale);
  return colorScale;
};

/**
 * Get display-ready wave statistics for UI panel
 * @param {Object} island - Selected island object with wmsUrl property
 * @param {Date|string} forecastTime - Forecast time (Date object or ISO string)
 * @returns {Promise<Object>} - Wave statistics for display
 */
export const getIslandWaveDisplayStats = async (island, forecastTime) => {
  if (!island || !forecastTime) {
    return null;
  }

  const bbox = getIslandBoundingBox(island);
  if (!bbox) {
    return null;
  }

  // Use island-specific WMS URL if available (e.g., P1_Nanumea.nc)
  const wmsUrl = island.wmsUrl || null;
  
  if (wmsUrl) {
    logger.info('ISLAND_STATS', `Using island-specific WMS endpoint for ${island.name}`, {
      island: island.name,
      wmsUrl: wmsUrl.split('/').pop() // Just show filename
    });
  }

  try {
    // Query stats for main wave variables using island-specific endpoint
    // Note: THREDDS uses 'Hs', 'Tm', and 'Dir' for layer names
    const [hsStats, tmStats, dirStats] = await Promise.all([
      queryIslandWaveStats(bbox, 'Hs', forecastTime, wmsUrl),
      queryIslandWaveStats(bbox, 'Tm', forecastTime, wmsUrl),
      queryIslandWaveStats(bbox, 'Dir', forecastTime, wmsUrl)
    ]);

    // Check if we got ANY valid stats
    const hasAnyStats = hsStats || tmStats || dirStats;
    
    if (!hasAnyStats) {
      logger.warn('ISLAND_STATS', `No wave statistics available for ${island.name}`, {
        island: island.name,
        time: forecastTime instanceof Date ? forecastTime.toISOString() : forecastTime,
        wmsUrl: wmsUrl ? wmsUrl.split('/').pop() : 'default',
        reason: 'GetFeatureInfo returned no valid values - check TIME parameter and layer names'
      });
      return null;
    }

    return {
      island: island.name,
      waveHeight: hsStats,
      wavePeriod: tmStats,  // Tm (mean period)
      waveDirection: dirStats,
      bbox,
      timestamp: forecastTime instanceof Date ? forecastTime.toISOString() : forecastTime
    };
  } catch (error) {
    logger.error('ISLAND_STATS', `Failed to get island wave stats: ${error.message}`);
    return null;
  }
};

const IslandWaveStats = {
  getIslandBoundingBox,
  queryIslandWaveStats,
  calculateAdaptiveColorScale,
  getIslandWaveDisplayStats
};

export default IslandWaveStats;
