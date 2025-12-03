async function requestMinMax(wmsUrl, layerName, time, bounds) {
  // For gem-ncwms-hpc.spc.int, use simpler parameter structure
  const params = new URLSearchParams({
    service: 'WMS',
    version: '1.3.0',
    request: 'GetMetadata',
    item: 'minmax',
    layerName: layerName  // Use layerName directly for ncWMS
  });

  // Remove duplicate layers parameter to avoid confusion

  if (time) {
    params.set('time', time);
  }

  if (Array.isArray(bounds) && bounds.length === 4) {
    params.set('bbox', bounds.join(','));
    params.set('crs', 'EPSG:4326');
  }

  const metadataUrl = `${wmsUrl}${wmsUrl.includes('?') ? '&' : '?'}${params.toString()}`;
  const response = await fetch(metadataUrl);

  if (!response.ok) {
    throw new Error(`Min/max metadata request failed (${response.status})`);
  }

  const rawText = await response.text();
  let payload = null;

  try {
    payload = JSON.parse(rawText);
  } catch (parseError) {
    console.warn('Unable to parse min/max metadata response', parseError, rawText);
  }

  // ncWMS minmax response is often {min: <number>, max: <number>}
  if (payload && !isNaN(Number(payload.min)) && !isNaN(Number(payload.max))) {
    return {
      min: Number(payload.min),
      max: Number(payload.max)
    };
  }

  // Some versions return {minValue, maxValue}
  if (payload && !isNaN(Number(payload.minValue)) && !isNaN(Number(payload.maxValue))) {
    return {
      min: Number(payload.minValue),
      max: Number(payload.maxValue)
    };
  }

  // Handle layerDetails format with scaleRange
  if (payload && Array.isArray(payload.scaleRange) && payload.scaleRange.length >= 2) {
    return {
      min: Number(payload.scaleRange[0]),
      max: Number(payload.scaleRange[1])
    };
  }

  // Text parsing fallback
  if (!payload) {
    const numericMatches = rawText.match(/-?\d*\.?\d+/g);
    if (numericMatches && numericMatches.length >= 2) {
      return {
        min: parseFloat(numericMatches[0]),
        max: parseFloat(numericMatches[1])
      };
    }
  }

  throw new Error('Invalid min/max metadata response');
}

async function requestLayerDetails(wmsUrl, layerName) {
  const params = new URLSearchParams({
    service: 'WMS',
    version: '1.3.0',
    request: 'GetMetadata',
    item: 'layerDetails',
    layerName,
    format: 'application/json'
  });

  const metadataUrl = `${wmsUrl}${wmsUrl.includes('?') ? '&' : '?'}${params.toString()}`;
  const response = await fetch(metadataUrl);

  if (!response.ok) {
    throw new Error(`Layer details request failed (${response.status})`);
  }

  const payload = await response.json();
  const [min, max] = Array.isArray(payload?.scaleRange) ? payload.scaleRange : [];

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new Error('Layer details response missing scaleRange');
  }

  return { min, max };
}

export async function fetchLayerMinMax(wmsUrl, layerName, time, bounds) {
  if (!wmsUrl || !layerName) {
    throw new Error('Missing WMS URL or layer name for min/max metadata request');
  }

  // For Cook Islands forecast layers, use known optimal ranges instead of server requests
  // This avoids 400 errors from servers that don't support GetMetadata
  const knownRanges = {
    'cook_forecast/hs': { min: 0, max: 4 },             // Wave height range (updated max from 1.66 to 4)
    'cook_forecast/tm02': { min: 0, max: 20 },          // Wave period range
    'cook_forecast/tpeak': { min: 9, max: 14 },         // Peak period optimized range
    'cook_forecast/dirm': { min: 0, max: 360 },         // Direction range
    'raro_inun/Band1': { min: -0.04149, max: 1.632 }    // Rarotonga inundation depth
  };

  if (knownRanges[layerName]) {
    console.log(`🎯 Using known range for ${layerName}:`, knownRanges[layerName]);
    return knownRanges[layerName];
  }

  try {
    return await requestMinMax(wmsUrl, layerName, time, bounds);
  } catch (error) {
    console.warn('Min/max metadata request failed, falling back to layer details', error);
    try {
      return await requestLayerDetails(wmsUrl, layerName);
    } catch (detailsError) {
      console.warn('Layer details request also failed, using default range', detailsError);
      // Return sensible default based on layer type
      if (layerName.includes('hs')) return { min: 0, max: 5 };
      if (layerName.includes('tm02') || layerName.includes('tpeak')) return { min: 0, max: 20 };
      if (layerName.includes('dir')) return { min: 0, max: 360 };
      return { min: 0, max: 10 }; // Generic fallback
    }
  }
}
