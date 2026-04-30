// Production path will be served from the same origin
const STATIC_ZARR_PATH = '/widget5/SWAN_UGRID.zarr'; // Production path with basename

export function getZarrUrl() {
  // Environment variable takes precedence (for production/custom setups)
  if (process.env.REACT_APP_ZARR_URL) {
    return process.env.REACT_APP_ZARR_URL;
  }

  // In development, construct URL using current hostname to support network access
  if (process.env.NODE_ENV === 'development') {
    // Use current hostname (works for localhost and network IP)
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:8080/SWAN_UGRID.zarr`;
  }

  // In production, use path with basename
  return STATIC_ZARR_PATH;
}

export function getZarrConnectionHelp() {
  if (process.env.REACT_APP_ZARR_URL) {
    return `Configured Zarr URL: ${process.env.REACT_APP_ZARR_URL}`;
  }

  if (process.env.NODE_ENV === 'development') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `Dev mode: Using ${protocol}//${hostname}:8080/SWAN_UGRID.zarr (matches current hostname)`;
  }

  return `Production: Expecting static Zarr files at ${STATIC_ZARR_PATH}`;
}
