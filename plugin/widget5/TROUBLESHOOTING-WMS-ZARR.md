# Troubleshooting WMS & Zarr Loading Issues

## 🔍 Problems Identified

### 1. WMS 400 Errors - Time Parameter Out of Range ❌

**Error**: `Failed to load resource: the server responded with a status of 400 ()`

**Root Cause**: The application is requesting data for **April 20, 2026**, but the SWAN_UGRID.nc dataset only contains data from:
- **Start**: January 24, 2026 00:00 UTC
- **End**: January 31, 2026 12:00 UTC

**Time Requested**: `time=2026-04-20T04:47:40Z`
**Time Available**: `2026-01-24T00:00:00.000Z/2026-01-31T12:00:00.000Z/PT1H`

### 2. Zarr 403 Forbidden - Store Doesn't Exist ❌

**Error**: `Failed to load resource: the server responded with a status of 403 (Forbidden)`

**Root Cause**: The Zarr store path doesn't exist on the THREDDS server. Only NetCDF files exist:
- ❌ `SWAN_UGRID.zarr` - Does not exist
- ✅ `SWAN_UGRID.nc` - Exists (NetCDF format)

The THREDDS catalog confirms only `.nc` files are available, not `.zarr` directories.

---

## ✅ Solutions

### Quick Fix 1: Use Data Within Time Range

The simplest fix is to ensure your time slider uses dates **within the available range**.

**Check current time selection**:
```javascript
// In useTimeAnimation.js or ForecastApp.jsx
console.log('Current slider date:', currentSliderDateStr);
```

**Verify available times from WMS capabilities**:
```bash
curl -s "https://gemthreddshpc.spc.int/thredds/wms/POP/model/country/spc/forecast/hourly/COK/SWAN_UGRID.nc?service=WMS&request=GetCapabilities" | grep -A 2 "Dimension name=\"time\""
```

**Expected output**:
```xml
<Dimension name="time" units="unknown" multipleValues="true" current="true" default="2026-01-31T12:00:00.000Z">
    2026-01-24T00:00:00.000Z/2026-01-31T12:00:00.000Z/PT1H
</Dimension>
```

### Quick Fix 2: Disable Particle Visualization (Zarr Not Available)

Since the Zarr store doesn't exist, disable particle features until the data is converted:

**Already disabled by default** ✅:
```javascript
// src/components/ForecastApp.jsx line 123
const [isParticlesEnabled, setIsParticlesEnabled] = useState(false);
```

The particle toggle should remain **OFF** until you convert NetCDF to Zarr.

---

## 🔧 Permanent Solutions

### Solution A: Update THREDDS Data to Latest Forecast

Contact your THREDDS admin to update the dataset with current forecast data:

1. **Current data**: January 24-31, 2026
2. **Needed**: April 2026 forecast data

The SWAN model should be generating new forecasts regularly. Ask them to:
- Update `SWAN_UGRID.nc` with latest model run
- Ensure automated updates are configured

### Solution B: Convert NetCDF to Zarr for Particle Visualization

To enable particle flow visualization, convert the NetCDF file to Zarr format:

**Step 1: Install dependencies**:
```bash
pip install xarray zarr netCDF4 dask numcodecs
```

**Step 2: Download the NetCDF file**:
```bash
curl -o SWAN_UGRID.nc "https://gemthreddshpc.spc.int/thredds/fileServer/POP/model/country/spc/forecast/hourly/COK/SWAN_UGRID.nc"
```

**Step 3: Convert to Zarr** (using your conversion script):
```bash
cd /home/kishank/ocean-plugin/plugin/widget5/scripts
python convert_netcdf_to_zarr.py \
  SWAN_UGRID.nc \
  SWAN_UGRID.zarr \
  --variables u,v \
  --time-chunk 1 \
  --spatial-chunk 512 \
  --compression blosc
```

**Step 4: Upload Zarr store to THREDDS**:
```bash
# Example: Upload via rsync (adjust to your THREDDS server access method)
rsync -av SWAN_UGRID.zarr/ \
  user@thredds-server:/path/to/thredds/data/POP/model/country/spc/forecast/hourly/COK/SWAN_UGRID.zarr/
```

**Step 5: Verify Zarr is accessible**:
```bash
curl -I "https://gemthreddshpc.spc.int/thredds/fileServer/POPdata/model/country/spc/forecast/hourly/COK/SWAN_UGRID.zarr/.zgroup"

# Should return: HTTP/2 200 (not 404)
```

**Step 6: Enable particles in the app**:
- Click the "Particle Visualization" toggle in the UI
- The ZarrLoader will initialize and load flow data

---

## 🧪 Testing & Verification

### Test 1: Verify WMS Time Range

Open browser console and check logs when loading the map:
```
📅 First timestamp: 2026-01-24T00:00:00.000Z
📅 Last timestamp: 2026-01-31T12:00:00.000Z
```

Your slider should start at **January 24, 2026** if using this dataset.

### Test 2: Check WMS Request Format

Monitor Network tab in DevTools:
```
✅ Good: time=2026-01-24T00:00:00Z
❌ Bad:  time=2026-04-20T04:47:40Z (out of range)
```

### Test 3: Verify Zarr Store Structure

If you create a Zarr store, verify it has the required structure:
```bash
ls -la SWAN_UGRID.zarr/
# Should show:
# .zgroup
# .zattrs
# u/
# v/
# lon/
# lat/
```

### Test 4: Test Zarr Loading in Browser

After Zarr is available, enable particles and check console:
```
🌊 Initializing ZarrLoader for THREDDS data...
[ZarrLoader] Opening Zarr store: http://localhost:3001/...
✅ ZarrLoader initialized
✅ Flow data loaded: { uShape: [180, 15234], vShape: [180, 15234] }
```

---

## 📋 Checklist Before Deploying

- [ ] THREDDS dataset contains data for the time range you're displaying
- [ ] Time slider initializes to a date within the available range
- [ ] WMS layers load successfully without 400 errors
- [ ] If using particles: Zarr store exists and is accessible via CORS proxy
- [ ] If using particles: Zarr store contains `u`, `v`, `lon`, `lat` arrays
- [ ] Particle toggle is disabled if Zarr is not available

---

## 🆘 Still Having Issues?

### Check THREDDS Logs

Ask your THREDDS admin to check server logs for:
```
[ERROR] Invalid time parameter: 2026-04-20T04:47:40Z
[ERROR] Time out of range for dataset SWAN_UGRID.nc
```

### Enable Debug Logging

Add to your app:
```javascript
// src/components/ForecastApp.jsx
useEffect(() => {
  console.log('🔍 DEBUG - Available timestamps:', availableTimestamps);
  console.log('🔍 DEBUG - Current slider date:', currentSliderDateStr);
  console.log('🔍 DEBUG - Selected layer:', selectedWaveForecast);
}, [availableTimestamps, currentSliderDateStr, selectedWaveForecast]);
```

### Contact Info

**THREDDS Admin**: Anuj Divesh <divesha@spc.int>
- Request: Update SWAN_UGRID.nc with latest forecast
- Request: Enable CORS headers for Zarr access
- Request: Upload Zarr store to fileServer

---

## 📚 Additional Resources

- **WMS Capabilities**: https://gemthreddshpc.spc.int/thredds/wms/POP/model/country/spc/forecast/hourly/COK/SWAN_UGRID.nc?service=WMS&request=GetCapabilities
- **THREDDS Catalog**: https://gemthreddshpc.spc.int/thredds/catalog/POP/model/country/spc/forecast/hourly/COK/catalog.xml
- **Conversion Script**: `/home/kishank/ocean-plugin/plugin/widget5/scripts/convert_netcdf_to_zarr.py`
- **Zarr Documentation**: https://zarr.readthedocs.io/
- **THREDDS WMS**: https://www.unidata.ucar.edu/software/tds/current/reference/WMS.html
