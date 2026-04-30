# Multiscale Pyramid Generation for Zarr

## What Are Pyramids?

Multiscale pyramids create multiple resolutions of your data (like image mipmaps):
- **Level 0**: Native resolution (original)
- **Level 1**: 2× downsampled
- **Level 2**: 4× downsampled  
- **Level 3**: 8× downsampled
- ...and so on

## Why Use Pyramids?

**Performance**: Browser loads only the appropriate resolution for the current zoom level
- Zoomed out → Low-res (fast, small chunks)
- Zoomed in → High-res (detailed)

**Bandwidth**: Reduces data transfer by 75% or more for typical zoom operations

## Installation

```bash
# Install ndpyramid (required for pyramid generation)
pip install ndpyramid
```

## Usage

### Convert NetCDF to Zarr with Pyramids

```bash
python scripts/convert_netcdf_to_zarr.py \
  SWAN_UGRID.nc \
  SWAN_UGRID.zarr \
  --pyramid \
  --variables u,v \
  --compression blosc \
  --level 5
```

### Output Structure

```
SWAN_UGRID.zarr/          # Original full-resolution data
SWAN_UGRID_pyramid.zarr/  # Multiscale pyramid
  ├── 0/                  # Level 0 (native resolution)
  ├── 1/                  # Level 1 (2x downsampled)
  ├── 2/                  # Level 2 (4x downsampled)
  ├── 3/                  # Level 3 (8x downsampled)
  ├── 4/                  # Level 4 (16x downsampled)
  └── 5/                  # Level 5 (32x downsampled)
```

## Browser Integration

### Using Pyramided Zarr in JavaScript

```javascript
import { openGroup } from 'zarr';

// Open the pyramid group
const pyramidStore = await openGroup(
  'http://localhost:3001/SWAN_UGRID_pyramid.zarr'
);

// Select appropriate level based on zoom
const zoomLevel = map.getZoom();
const pyramidLevel = Math.max(0, Math.min(5, Math.floor(12 - zoomLevel)));

// Load from that level
const levelStore = await openArray({
  store: `http://localhost:3001/SWAN_UGRID_pyramid.zarr/${pyramidLevel}`,
  path: 'u'
});

const data = await levelStore.get([timeIndex, null, null]);
```

### Automatic Level Selection

```javascript
function getPyramidLevel(mapZoom, maxZoom = 12) {
  // Map zoom levels to pyramid levels
  // Higher map zoom → lower pyramid level (more detail)
  return Math.max(0, Math.min(5, Math.floor(maxZoom - mapZoom)));
}

// In your useEffect:
useEffect(() => {
  const level = getPyramidLevel(map.getZoom());
  loadZarrLevel(level);
}, [map.getZoom()]);
```

## Performance Impact

| Zoom Level | Pyramid Level | Resolution | Chunk Size | Load Time |
|------------|---------------|------------|------------|-----------|
| 4 (far out) | 5 | 1/32 native | ~4 KB | ~20 ms |
| 6 | 4 | 1/16 native | ~16 KB | ~40 ms |
| 8 | 3 | 1/8 native | ~64 KB | ~80 ms |
| 10 | 2 | 1/4 native | ~256 KB | ~150 ms |
| 12 (zoomed in) | 0 | Native | ~1 MB | ~400 ms |

## Technical Details

### Resampling Methods

```bash
# Nearest neighbor (preserves exact values, best for categorical data)
--pyramid  # Uses 'nearest' by default

# Bilinear (smooths values, better for continuous fields)
# Edit convert_netcdf_to_zarr.py line 511: resampling="bilinear"
```

### Custom Level Count

Edit [convert_netcdf_to_zarr.py:477](../scripts/convert_netcdf_to_zarr.py#L477):

```python
def create_zarr_pyramid(zarr_path, dataset_info, levels=6):
    #                                              ^^^^ Change this
```

**Recommendations:**
- **3 levels**: Minimal (for small regions)
- **6 levels**: Recommended (covers zoom 0-12)
- **8 levels**: Detailed (covers zoom 0-16)

## Troubleshooting

### "ModuleNotFoundError: No module named 'ndpyramid'"

```bash
pip install ndpyramid
```

### "Could not detect spatial dimensions"

Ensure your NetCDF has recognizable lon/lat coordinates:
```bash
ncdump -h SWAN_UGRID.nc | grep -E "(lon|lat)"
```

### Pyramid Not Created

Check the output:
```bash
ls -lah SWAN_UGRID_pyramid.zarr/
```

If missing, run with verbose output:
```bash
python -u scripts/convert_netcdf_to_zarr.py ... --pyramid 2>&1 | tee conversion.log
```

## Best Practices

1. **Always use pyramids** for data > 100 MB
2. **Use `blosc` compression** for fastest decompression in browser
3. **Set `--spatial-chunk 512`** for optimal HTTP range requests
4. **Upload both stores** to THREDDS:
   - `SWAN_UGRID.zarr` (for time-series access)
   - `SWAN_UGRID_pyramid.zarr` (for map visualization)

## References

- [ndpyramid documentation](https://github.com/carbonplan/ndpyramid)
- [Medium: Zarr in the Browser](https://medium.com/pangeo/zarr-in-the-browser-1e6f5cde86bb)
- [Zarr.js](https://github.com/gzuidhof/zarr.js)
