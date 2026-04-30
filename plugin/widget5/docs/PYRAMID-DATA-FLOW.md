# Pyramid Data Access Flow

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Actions                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Leaflet Map (ForecastApp)                     │
│                                                                  │
│  User zooms: 4 → 8 → 12                                         │
│           ↓    ↓    ↓                                           │
│  Triggers: zoomend event                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Calculate Pyramid Level (Static Method)             │
│                                                                  │
│  OceanFlowZarrLoader.getPyramidLevelFromZoom(mapZoom)          │
│                                                                  │
│  Zoom 4  → Level 4 (16x downsampled)                           │
│  Zoom 8  → Level 2 (4x downsampled)                            │
│  Zoom 12 → Level 0 (native resolution)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ZarrLoader.setPyramidLevel()                  │
│                                                                  │
│  1. Check if level changed                                      │
│  2. Clear cache (different resolution data)                     │
│  3. Update currentPyramidLevel                                  │
│  4. Call initialize() to reopen store                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ZarrLoader.initialize()                       │
│                                                                  │
│  Base URL: "SWAN_UGRID.zarr"                                    │
│      ↓                                                          │
│  Replace: ".zarr" → "_pyramid.zarr/{level}"                     │
│      ↓                                                          │
│  Result: "SWAN_UGRID_pyramid.zarr/2"  (if level=2)              │
│      ↓                                                          │
│  Create: new zarr.HTTPStore(pyramidUrl)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ZarrLoader.loadTimestep(0)                    │
│                                                                  │
│  HTTP GET: /SWAN_UGRID_pyramid.zarr/2/.zgroup                   │
│  HTTP GET: /SWAN_UGRID_pyramid.zarr/2/u/.zarray                 │
│  HTTP GET: /SWAN_UGRID_pyramid.zarr/2/v/.zarray                 │
│  HTTP GET: /SWAN_UGRID_pyramid.zarr/2/u/0.0  ← Chunk data       │
│  HTTP GET: /SWAN_UGRID_pyramid.zarr/2/v/0.0  ← Chunk data       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Proxy Server :3001                       │
│                                                                  │
│  Forwards requests with CORS headers:                           │
│  → https://gemthreddshpc.spc.int/thredds/fileServer/           │
│     POPdata/.../SWAN_UGRID_pyramid.zarr/2/u/0.0                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     THREDDS Server File System                   │
│                                                                  │
│  SWAN_UGRID_pyramid.zarr/                                       │
│  ├── 0/  ← Native (512×512 chunks, ~1 MB each)                  │
│  ├── 1/  ← 2x (256×256 chunks, ~256 KB each)                    │
│  ├── 2/  ← 4x (128×128 chunks, ~64 KB each)      ◄─── Reading   │
│  ├── 3/  ← 8x (64×64 chunks, ~16 KB each)                       │
│  ├── 4/  ← 16x (32×32 chunks, ~4 KB each)                       │
│  └── 5/  ← 32x (16×16 chunks, ~1 KB each)                       │
│                                                                  │
│  Returns: Binary chunk data (compressed with Blosc)             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    zarr.js (Browser Decompression)               │
│                                                                  │
│  1. Decompress Blosc-compressed chunk                           │
│  2. Parse binary data → Float32Array                            │
│  3. Return: { u: Float32Array, v: Float32Array }                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Update Particle Layer                       │
│                                                                  │
│  setFlowData({ u, v, lon, lat })                                │
│      ↓                                                          │
│  GPU shader reads u/v velocity                                  │
│      ↓                                                          │
│  Particles animate on map                                       │
└─────────────────────────────────────────────────────────────────┘
```

## Example Data Flow for Zoom Change

### Scenario: User zooms from 4 → 12

**Step 1: Zoom Level 4 (Continent View)**
```
Map Zoom: 4
    ↓ getPyramidLevelFromZoom(4)
Pyramid Level: 4
    ↓ setPyramidLevel(4)
URL: SWAN_UGRID_pyramid.zarr/4/
    ↓ HTTP request
Chunk Size: ~4 KB
    ↓ loadTimestep(0)
Data Points: 512 spatial nodes
    ↓ 
Particles: Low density, fast render
```

**Step 2: User Zooms In → Zoom Level 8 (Regional View)**
```
Map Zoom: 8
    ↓ getPyramidLevelFromZoom(8)
Pyramid Level: 2  ← Changed from 4!
    ↓ setPyramidLevel(2) detects change
Cache Cleared: Previous level 4 data removed
    ↓ initialize() with new level
URL: SWAN_UGRID_pyramid.zarr/2/
    ↓ HTTP request
Chunk Size: ~64 KB (16× larger)
    ↓ loadTimestep(0)
Data Points: 2048 spatial nodes (4× more)
    ↓ 
Particles: Medium density, smooth render
```

**Step 3: User Zooms In → Zoom Level 12 (Detailed View)**
```
Map Zoom: 12
    ↓ getPyramidLevelFromZoom(12)
Pyramid Level: 0  ← Changed from 2!
    ↓ setPyramidLevel(0) detects change
Cache Cleared: Previous level 2 data removed
    ↓ initialize() with new level
URL: SWAN_UGRID_pyramid.zarr/0/
    ↓ HTTP request
Chunk Size: ~1 MB (16× larger than level 2)
    ↓ loadTimestep(0)
Data Points: 8192 spatial nodes (4× more)
    ↓ 
Particles: High density, full detail
```

## HTTP Request Timeline

```
Time  Action                    HTTP Requests
─────────────────────────────────────────────────────────────
0ms   Initial load (zoom=8)
      └→ GET /.../pyramid.zarr/2/.zgroup       (1 KB)
10ms    └→ GET /.../pyramid.zarr/2/u/.zarray   (500 B)
15ms      └→ GET /.../pyramid.zarr/2/v/.zarray (500 B)
20ms        └→ GET /.../pyramid.zarr/2/u/0.0   (64 KB)
40ms          └→ GET /.../pyramid.zarr/2/v/0.0 (64 KB)
100ms ✅ Particles render

2000ms User zooms to 12
2010ms setPyramidLevel(0) called
       Cache cleared
       └→ GET /.../pyramid.zarr/0/.zgroup      (1 KB)
2020ms   └→ GET /.../pyramid.zarr/0/u/.zarray  (500 B)
2025ms     └→ GET /.../pyramid.zarr/0/v/.zarray(500 B)
2030ms       └→ GET /.../pyramid.zarr/0/u/0.0  (1 MB)
2500ms         └→ GET /.../pyramid.zarr/0/v/0.0(1 MB)
3000ms ✅ Particles update with higher resolution
```

## Key Benefits

### 1. **Bandwidth Efficiency**
- Zoom 4: Downloads 8 KB (level 4)
- Zoom 12: Downloads 2 MB (level 0)
- **Savings**: Only downloads what's needed for current zoom

### 2. **Progressive Loading**
- Start at mid-resolution (level 3)
- User sees particles immediately
- Upgrade to higher detail as they zoom in

### 3. **Cache Management**
- Each pyramid level has its own cache
- Switching levels clears old cache
- Prevents memory bloat from mixed resolutions

### 4. **Smooth Transitions**
- Zoom → Calculate level → Check if changed → Reload
- Only reloads when pyramid level actually changes
- Minimal disruption to user experience
