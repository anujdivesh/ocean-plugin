# Why the xpublish setup didn't work (but deckgl experiment did)

## Problem Summary

The React app was trying to load Zarr data via **xpublish** (FastAPI REST API), but the browser's `zarr.js` library expects **raw static file access** to the Zarr directory structure.

## Root Cause

### ❌ What didn't work: xpublish server
```
http://localhost:9000/datasets/ocean/zarr/.zgroup
→ Returns: {"zarr_format":2} as JSON (Content-Type: application/json)
→ zarr.js HTTPStore: Confused by JSON wrapper, expects raw file bytes
→ Browser: ERR_EMPTY_RESPONSE
```

### ✅ What works: Static file serving (like deckgl experiment)
```
http://localhost:8080/SWAN_UGRID.zarr/.zgroup  
→ Returns: Raw file bytes (Content-Type: application/octet-stream or text/plain)
→ zarr.js HTTPStore: Reads files directly, works perfectly
→ Browser: ✅ Success
```

## Key Differences

| Aspect | deckgl experiment (Working) | React App with xpublish (Broken) |
|--------|----------------------------|----------------------------------|
| **Server Type** | Python SimpleHTTPServer (static files) | xpublish FastAPI (REST API) |
| **Zarr Access** | `niue_forecast.zarr/` directory served as-is | `/datasets/ocean/zarr` API endpoint |
| **HTTP Response** | Raw file bytes | JSON-wrapped responses |
| **Content-Type** | Varies by file extension | `application/json` |
| **zarr.js Compatibility** | ✅ HTTPStore expects this | ❌ Confused by JSON wrapper |

## Solution

**Replace xpublish with simple static file server:**

1. **Created** `serve-zarr.py` - CORS-enabled Python HTTP server
2. **Updated** `.env.development.local`:
   ```bash
   # OLD (xpublish API - doesn't work with zarr.js HTTPStore):
   REACT_APP_ZARR_URL=http://localhost:9000/datasets/ocean/zarr
   
   # NEW (static files - works like deckgl experiment):
   REACT_APP_ZARR_URL=http://localhost:8080/SWAN_UGRID.zarr
   ```

3. **Start server**: `./start-zarr-server.sh`

## Technical Details

**zarr.js HTTPStore** expects:
- Direct file access to `.zgroup`, `.zarray`, `.zattrs`, and chunk files
- Standard HTTP `GET` requests returning raw bytes
- Optional: CORS headers for cross-origin access

**xpublish** provides:
- RESTful API abstraction over Xarray datasets  
- JSON responses with Zarr-compatible metadata
- Great for server-to-server communication
- **NOT compatible** with browser-based `zarr.js HTTPStore`

## Lesson Learned

**For browser-based Zarr access with `zarr.js`:**
- ✅ Use static file serving (nginx, Apache, Python http.server, etc.)
- ❌ Don't use xpublish or any REST API wrapper
- The deckgl experiment worked because it served `niue_forecast.zarr/` as **static files**, not through an API

**For server-side Zarr access:**
- ✅ xpublish is excellent for Python-to-Python communication
- ✅ Great for aggregating multiple datasets
- ✅ Perfect for server-rendered applications

## Updated Architecture

```
Browser (React + zarr.js)
    ↓
    ↓ HTTP GET /SWAN_UGRID.zarr/transp_x/.zarray
    ↓ (raw file bytes)
    ↓
Python HTTP Server (port 8080)
    ↓
    ↓ Direct file access
    ↓
SWAN_UGRID.zarr/ directory
    ├── .zgroup
    ├── .zattrs
    ├── .zmetadata
    ├── transp_x/
    │   ├── .zarray
    │   ├── .zattrs
    │   └── 0 (chunk data)
    ├── transp_y/
    ├── mesh_node_lon/
    └── mesh_node_lat/
```

## References

- Working example: `/home/kishank/deckgl experiment/index_zarr.html`
- Zarr spec: https://zarr.readthedocs.io/
- zarr.js HTTPStore: Expects direct file access, not API endpoints
