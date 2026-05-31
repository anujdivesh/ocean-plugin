const X_SST_GRADIENT_RGB = [
  [0, 0, 128],
  [0, 60, 200],
  [0, 120, 255],
  [0, 200, 220],
  [100, 255, 100],
  [255, 255, 0],
  [255, 180, 0],
  [255, 100, 0],
  [200, 0, 0],
];

const generateGradientBands = (paletteRGB, bands = 250) => {
  const colors = [];
  for (let i = 0; i < bands; i += 1) {
    const normalized = i / (bands - 1);
    const maxIndex = paletteRGB.length - 1;
    const index = normalized * maxIndex;
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.min(Math.ceil(index), maxIndex);
    const fraction = index - lowerIndex;

    const lower = paletteRGB[lowerIndex];
    const upper = paletteRGB[upperIndex];

    const r = Math.round(lower[0] + (upper[0] - lower[0]) * fraction);
    const g = Math.round(lower[1] + (upper[1] - lower[1]) * fraction);
    const b = Math.round(lower[2] + (upper[2] - lower[2]) * fraction);

    colors.push(`rgb(${r}, ${g}, ${b})`);
  }
  return colors;
};

const X_SST_250_BANDS = generateGradientBands(X_SST_GRADIENT_RGB, 250);

export const X_SST_GRADIENT = `linear-gradient(to top, ${X_SST_250_BANDS.map((color, i) =>
  `${color} ${(i / (X_SST_250_BANDS.length - 1) * 100).toFixed(2)}%`
).join(', ')})`;

export const parseLegendColorRange = (rangeString) => {
  if (!rangeString) return null;
  const parts = rangeString.split(',');
  if (parts.length !== 2) return null;
  const min = Number(parts[0]);
  const max = Number(parts[1]);
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return null;
  }
  return { min, max };
};

export const buildInundationLegendBands = ({
  categories,
  minVisibleDepth,
  colorscalerange,
  rasterMinDepth,
  rasterMaxDepth,
}) => {
  const colorRange = parseLegendColorRange(colorscalerange);
  const configuredMin = minVisibleDepth
    ?? colorRange?.min
    ?? rasterMinDepth
    ?? -0.05;
  const configuredMax = colorRange?.max ?? rasterMaxDepth ?? 3.0;

  if (!categories || categories.length < 2) {
    return {
      gradient: X_SST_GRADIENT,
      ticks: [configuredMin, configuredMax],
      tickBands: {},
      gradientMarkers: [],
      min: configuredMin,
      max: configuredMax,
    };
  }

  const firstThreshold = categories[0]?.thresholdM ?? configuredMin;
  const lastThreshold = categories[categories.length - 1]?.thresholdM ?? configuredMax;
  const minVal = Math.min(configuredMin, firstThreshold);
  const upperBound = Math.max(configuredMax, lastThreshold);
  const headroom =
    upperBound === lastThreshold
      ? Math.max(0.05, Math.abs(lastThreshold) * 0.05)
      : 0;
  const maxVal = Number((upperBound + headroom).toFixed(2));
  const span = maxVal - minVal;

  if (span <= 0) {
    return {
      gradient: X_SST_GRADIENT,
      ticks: [minVal, maxVal],
      tickBands: {},
      gradientMarkers: [],
      min: minVal,
      max: maxVal,
    };
  }

  const tickSet = new Set([Number(minVal.toFixed(2)), Number(maxVal.toFixed(2))]);
  categories.forEach((category) => {
    tickSet.add(Number(category.thresholdM.toFixed(2)));
  });
  const ticks = [...tickSet].sort((a, b) => a - b);

  const tickBands = {};
  const gradientMarkers = categories.filter(
    (category) => category.thresholdM > minVal && category.thresholdM < maxVal
  );

  categories.forEach((category) => {
    const key = Number(category.thresholdM.toFixed(2));
    if (tickSet.has(key)) {
      tickBands[key] = category;
    }
  });

  return {
    gradient: X_SST_GRADIENT,
    ticks,
    tickBands,
    gradientMarkers,
    min: minVal,
    max: maxVal,
  };
};
