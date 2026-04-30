function buildUrl(baseUrl, path, params = {}) {
  const normalizedBase = (baseUrl || '').replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${normalizedBase}${normalizedPath}`, window.location.origin);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

async function requestJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const error = new Error(`Request failed (${response.status})`);
    error.status = response.status;
    error.url = url;
    throw error;
  }

  return response.json();
}

function getCachedPromise(cache, key, loader) {
  if (cache.has(key)) {
    return cache.get(key);
  }

  const promise = Promise.resolve()
    .then(loader)
    .catch((error) => {
      cache.delete(key);
      throw error;
    });

  cache.set(key, promise);
  return promise;
}

function preloadImage(url) {
  return getCachedPromise(SfincsRasterService.imageCache, url, () => new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = (error) => reject(error);
    image.src = url;
  }));
}

function normalizeTimesteps(payload) {
  const rawTimesteps = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.timesteps)
      ? payload.timesteps
      : [];

  return rawTimesteps
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()));
}

function normalizePointValue(payload) {
  if (payload == null) {
    return 'No Data';
  }

  if (typeof payload === 'number') {
    return payload.toFixed(2);
  }

  if (typeof payload === 'string') {
    return payload;
  }

  const numericValue = payload.value ?? payload.depth ?? payload.data?.value;
  if (typeof numericValue === 'number' && Number.isFinite(numericValue)) {
    return numericValue.toFixed(2);
  }

  if (typeof numericValue === 'string' && numericValue.trim()) {
    return numericValue;
  }

  if (typeof payload.featureInfo === 'string' && payload.featureInfo.trim()) {
    return payload.featureInfo;
  }

  return 'No Data';
}

export default class SfincsRasterService {
  static metadataCache = new Map();

  static timestepsCache = new Map();

  static imageCache = new Map();

  constructor(baseUrl) {
    this.baseUrl = (baseUrl || '').replace(/\/$/, '');
  }

  async loadMetadata() {
    const url = buildUrl(this.baseUrl, '/metadata');
    return getCachedPromise(SfincsRasterService.metadataCache, url, () => requestJson(url));
  }

  async loadTimesteps() {
    const url = buildUrl(this.baseUrl, '/timesteps');
    const payload = await getCachedPromise(SfincsRasterService.timestepsCache, url, () => requestJson(url));
    return normalizeTimesteps(payload);
  }

  getFrameUrl({ timeIndex, vmin, vmax }) {
    return buildUrl(this.baseUrl, '/raster-png', {
      time_index: timeIndex,
      vmin,
      vmax
    });
  }

  async preloadFrame({ timeIndex, vmin, vmax }) {
    const url = this.getFrameUrl({ timeIndex, vmin, vmax });
    const image = await preloadImage(url);
    return { url, image };
  }

  async warmupFrames({ startIndex = 0, count = 1, frameCount = count, vmin, vmax }) {
    const totalFrames = Math.max(Number(frameCount) || 0, 0);
    const preloadCount = Math.max(Number(count) || 0, 0);

    if (totalFrames <= 0 || preloadCount <= 0) {
      return [];
    }

    const jobs = [];
    const seenUrls = new Set();

    for (let offset = 0; offset < Math.min(preloadCount, totalFrames); offset += 1) {
      const index = (startIndex + offset) % totalFrames;
      const url = this.getFrameUrl({ timeIndex: index, vmin, vmax });

      if (seenUrls.has(url)) {
        continue;
      }

      seenUrls.add(url);
      jobs.push(preloadImage(url));
    }

    return Promise.all(jobs);
  }

  async getPointValue({ lat, lng, timeIndex }) {
    try {
      const payload = await requestJson(buildUrl(this.baseUrl, '/point-value', {
        lat,
        lon: lng,
        time_index: timeIndex
      }));

      return {
        value: normalizePointValue(payload),
        raw: payload,
        available: true
      };
    } catch (error) {
      if (error?.status === 404) {
        return {
          value: 'Point sampling unavailable',
          raw: null,
          available: false,
          reason: 'missing-endpoint'
        };
      }

      throw error;
    }
  }
}
