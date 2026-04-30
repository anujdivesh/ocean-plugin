const DEFAULT_SFINCS_API_BASE = 'https://ocean-zarr.spc.int';

export function getSfincsRasterApiBase() {
  const configuredBase = process.env.REACT_APP_SFINCS_API_BASE;
  if (configuredBase && configuredBase.trim()) {
    return configuredBase.trim().replace(/\/$/, '');
  }

  return DEFAULT_SFINCS_API_BASE;
}

export function getSfincsRasterConnectionHelp() {
  if (process.env.REACT_APP_SFINCS_API_BASE) {
    return `Configured SFINCS raster API: ${process.env.REACT_APP_SFINCS_API_BASE}`;
  }

  return `Default SFINCS raster API: ${DEFAULT_SFINCS_API_BASE}`;
}
