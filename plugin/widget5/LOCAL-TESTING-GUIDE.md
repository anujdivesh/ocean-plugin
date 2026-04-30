# 🧪 Complete Local Testing Guide

This guide walks you through testing the entire ocean visualization application locally, from data acquisition to visualization.

## 📋 Prerequisites

```bash
# Python 3.8+ with pip
python3 --version

# Node.js 14+ with npm
node --version
npm --version
```

## 🎯 Quick Test (5 Minutes)

### Option 1: Test with Sample Data (Fastest)

```bash
# 1. Generate sample ocean flow data
cd /home/kishank/ocean-plugin/plugin/widget5/scripts
python3 convert_netcdf_to_zarr.py --sample-data /tmp/sample_ocean.zarr

# 2. Install xpublish dependencies
cd ../xpublish-server
pip install -r requirements.txt

# 3. Start xpublish server
python server.py --file /tmp/sample_ocean.zarr --port 9000

# 4. In a new terminal, start React app
cd /home/kishank/ocean-plugin/plugin/widget5
npm start

# ✅ Open http://localhost:3000 in your browser!
```

---

## 🌊 Full Test with Real Ocean Data

### Step 1: Download Ocean Data from THREDDS

You have three options:

#### Option A: Download from PacIOOS THREDDS (Hawaii SWAN)

```bash
cd /home/kishank/ocean-plugin/plugin/widget5/scripts

# Browse available datasets
python browse_thredds_catalog.py \
  https://pae-paha.pacioos.hawaii.edu/thredds/catalog/swan/hawaii/catalog.html

# Download a specific dataset (this will take a few minutes)
python thredds_to_zarr.py \
  --opendap https://pae-paha.pacioos.hawaii.edu/thredds/dodsC/swan/hawaii/SWAN_Hawaii_Regional \
  --output /tmp/hawaii_swan.nc \
  --variables hs dir tp

# Or convert directly to Zarr
python convert_netcdf_to_zarr.py \
  /tmp/hawaii_swan.nc \
  /tmp/hawaii_swan.zarr \
  --variables hs dir tp \
  --compression blosc \
  --level 5
```

#### Option B: Use Local NetCDF Files (if you have them)

```bash
# If you already have NetCDF files
cd /home/kishank/ocean-plugin/plugin/widget5/scripts

# List what's in your NetCDF file
python inspect_thredds_zarr.py --file /path/to/your/ocean_data.nc

# Convert to Zarr
python convert_netcdf_to_zarr.py \
  /path/to/your/ocean_data.nc \
  /tmp/ocean_data.zarr \
  --variables u v \
  --compression blosc
```

#### Option C: Generate Synthetic Test Data

```bash
cd /home/kishank/ocean-plugin/plugin/widget5/scripts

# Create realistic test data for Cook Islands region
python generate_test_ocean_data.py \
  --output /tmp/cook_islands_flow.nc \
  --bounds -161.0 -158.5 -22.0 -20.5 \
  --timesteps 48 \
  --resolution 0.05

# Convert to Zarr
python convert_netcdf_to_zarr.py \
  /tmp/cook_islands_flow.nc \
  /tmp/cook_islands_flow.zarr \
  --variables u v \
  --compression blosc \
  --pyramid
```

---

### Step 2: Verify Your Data

```bash
# Check the Zarr structure
ls -lah /tmp/cook_islands_flow.zarr/

# Should see:
# .zattrs
# .zgroup
# .zmetadata
# metadata.json
# u/
# v/
# lat/
# lon/
# time/

# Inspect metadata
cat /tmp/cook_islands_flow.zarr/metadata.json | jq '.'

# Check variable structure
cat /tmp/cook_islands_flow.zarr/u/.zarray | jq '.'
```

---

### Step 3: Start xpublish Server

```bash
cd /home/kishank/ocean-plugin/plugin/widget5/xpublish-server

# Install dependencies (first time only)
pip install -r requirements.txt

# Start server with your data
python server.py \
  --file /tmp/cook_islands_flow.zarr \
  --port 9000 \
  --variables u v \
  --spatial-chunk 256 \
  --cache-size 1GB

# Expected output:
# 📂 Loading dataset: ocean
#    Source: /tmp/cook_islands_flow.zarr
#    Dimensions: {'time': 48, 'lat': 30, 'lon': 50}
#    Variables: ['u', 'v']
# ✅ Dataset 'ocean' loaded and ready
# 🚀 Starting xpublish server...
#    Host: 0.0.0.0
#    Port: 9000
# 📡 Access your data at:
#    http://0.0.0.0:9000/
```

---

### Step 4: Test the Server

Open a **new terminal** and run:

```bash
cd /home/kishank/ocean-plugin/plugin/widget5/xpublish-server

# Run comprehensive tests
./test-server.sh

# Or test manually:

# 1. Check server health
curl http://localhost:9000/ | jq '.'

# 2. Get dataset info
curl http://localhost:9000/datasets/ocean/info | jq '.'

# 3. Check Zarr metadata
curl http://localhost:9000/datasets/ocean/zarr/.zmetadata | head -20

# 4. Get array metadata
curl http://localhost:9000/datasets/ocean/zarr/u/.zarray | jq '.'

# 5. Test chunk download (should return binary data)
curl -I http://localhost:9000/datasets/ocean/zarr/u/0.0.0

# 6. Verify CORS headers
curl -I http://localhost:9000/datasets/ocean/zarr/.zmetadata | grep -i cors
```

**Expected Results:**

```json
// Health check
{
  "service": "xpublish Ocean Data Server",
  "version": "0.3.x",
  "datasets": ["ocean"],
  "endpoints": { ... }
}

// Dataset info
{
  "dims": {
    "time": 48,
    "lat": 30,
    "lon": 50
  },
  "coords": ["time", "lat", "lon"],
  "data_vars": ["u", "v"]
}
```

---

### Step 5: Configure React App

#### Option A: Quick Test (Temporary)

```bash
cd /home/kishank/ocean-plugin/plugin/widget5

# Create .env.development
cat > .env.development << 'EOF'
REACT_APP_ZARR_URL=http://localhost:9000/datasets/ocean/zarr
REACT_APP_ZARR_SOURCE=xpublish
EOF
```

#### Option B: Update Config (Permanent)

```bash
# Edit your config file
nano src/config/index.js
```

Add or update:

```javascript
// src/config/index.js
export const DATA_CONFIG = {
  zarr: {
    baseUrl: process.env.REACT_APP_ZARR_URL || 
             'http://localhost:9000/datasets/ocean/zarr',
    variables: {
      u: 'u',
      v: 'v'
    }
  }
};
```

---

### Step 6: Update ZarrLoader (if needed)

Check if your ZarrLoader needs updating:

```bash
# View current ZarrLoader
head -50 src/services/ZarrLoader.js
```

If it needs updating, apply this pattern:

```javascript
// src/services/ZarrLoader.js
export class ZarrLoader {
  constructor(config = {}) {
    this.zarrUrl = config.zarrUrl || 
                   process.env.REACT_APP_ZARR_URL || 
                   'http://localhost:9000/datasets/ocean/zarr';
    
    console.log('🌊 ZarrLoader initialized:', this.zarrUrl);
  }

  async loadMetadata() {
    const url = `${this.zarrUrl}/.zmetadata`;
    console.log('📡 Fetching metadata from:', url);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load metadata: ${response.statusText}`);
    }
    
    return response.json();
  }
}
```

---

### Step 7: Start React Application

```bash
cd /home/kishank/ocean-plugin/plugin/widget5

# Install dependencies (first time)
npm install

# Start development server
npm start

# Expected output:
# Compiled successfully!
# 
# You can now view widget5 in the browser.
#   Local:            http://localhost:3000
#   On Your Network:  http://192.168.x.x:3000
```

---

### Step 8: Verify Integration in Browser

1. **Open DevTools** (F12)

2. **Check Console** for successful data loading:
   ```
   🌊 ZarrLoader initialized: http://localhost:9000/datasets/ocean/zarr
   📡 Fetching metadata from: http://localhost:9000/datasets/ocean/zarr/.zmetadata
   ✅ Metadata loaded
   📊 Variables: u, v
   🌊 Loading timestep 0...
   ✅ Chunk loaded: u/0.0.0
   ✅ Chunk loaded: v/0.0.0
   ```

3. **Check Network Tab**:
   - Should see successful requests to `localhost:9000`
   - Status: 200 OK
   - Type: fetch
   - No CORS errors

4. **Visual Verification**:
   - Map should load
   - Particles should animate
   - Flow vectors should be visible
   - Timeline controls should work

---

## 🔍 Troubleshooting

### Problem 1: Server Won't Start

**Error:** `ModuleNotFoundError: No module named 'xpublish'`

```bash
# Solution: Install dependencies
pip install xpublish xarray zarr netCDF4 uvicorn fastapi

# Or use requirements file
pip install -r xpublish-server/requirements.txt
```

---

### Problem 2: CORS Errors in Browser

**Error:** `Access to fetch has been blocked by CORS policy`

```bash
# Check server logs - should see CORS middleware enabled
# Look for: "✅ REST API created with CORS enabled"

# Test CORS headers:
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://localhost:9000/datasets/ocean/zarr/.zmetadata -v

# Should return:
# access-control-allow-origin: *
```

**Fix:** Server already includes CORS. If still failing:
1. Clear browser cache
2. Restart server
3. Check URL matches exactly

---

### Problem 3: No Data Displayed

**Debug steps:**

```bash
# 1. Check server is running
curl http://localhost:9000/

# 2. Check React app can reach server
# In browser console:
fetch('http://localhost:9000/datasets/ocean/info')
  .then(r => r.json())
  .then(console.log)

# 3. Check data structure
curl http://localhost:9000/datasets/ocean/zarr/.zmetadata | jq '.metadata | keys'

# 4. Verify variable names match
# Server variables should match what your app expects (u, v)
```

---

### Problem 4: Slow Performance

**Solutions:**

```bash
# 1. Increase chunk size
python server.py --file data.zarr --spatial-chunk 512

# 2. Increase cache
python server.py --file data.zarr --cache-size 2GB

# 3. Reduce data resolution (if generating synthetic data)
python generate_test_ocean_data.py --resolution 0.1  # Lower resolution

# 4. Use fewer timesteps
python convert_netcdf_to_zarr.py input.nc output.zarr --time-chunk 1
```

---

### Problem 5: Port Already in Use

**Error:** `Address already in use`

```bash
# Find process using port 9000
lsof -i :9000

# Kill process
kill -9 <PID>

# Or use a different port
python server.py --file data.zarr --port 9001

# Update React app:
REACT_APP_ZARR_URL=http://localhost:9001/datasets/ocean/zarr npm start
```

---

## 📊 Performance Monitoring

### Monitor Server Requests

```bash
# In server terminal, watch for:
INFO: 127.0.0.1:xxxxx - "GET /datasets/ocean/zarr/.zmetadata HTTP/1.1" 200 OK
INFO: 127.0.0.1:xxxxx - "GET /datasets/ocean/zarr/u/.zarray HTTP/1.1" 200 OK
INFO: 127.0.0.1:xxxxx - "GET /datasets/ocean/zarr/u/0.0.0 HTTP/1.1" 200 OK
```

### Monitor Browser Performance

In browser DevTools:

1. **Network Tab:**
   - Total requests: Should see ~10-50 requests initially
   - Load time: Metadata ~100ms, chunks ~50-200ms each
   - Size: Chunks typically 10-100KB each

2. **Performance Tab:**
   - Record while particles animate
   - Check for 60 FPS rendering
   - Look for memory leaks

---

## 🎯 Testing Checklist

- [ ] Server starts without errors
- [ ] Server health check returns valid JSON
- [ ] Dataset info shows correct dimensions
- [ ] Metadata endpoint returns .zmetadata
- [ ] Chunk requests return binary data (200 OK)
- [ ] CORS headers present
- [ ] React app starts without errors
- [ ] Browser console shows "ZarrLoader initialized"
- [ ] Browser console shows "Metadata loaded"
- [ ] No CORS errors in browser
- [ ] Map renders
- [ ] Particles animate
- [ ] Can change timesteps
- [ ] Performance is smooth (>30 FPS)

---

## 🚀 Next Steps

### Development Workflow

```bash
# Terminal 1: xpublish server
cd xpublish-server
python server.py --file /tmp/ocean_data.zarr

# Terminal 2: React app
cd ..
npm start

# Terminal 3: Watch logs/run tests
tail -f server.log
```

### Update Data Without Restart

```bash
# xpublish dynamically reads files!
# Just update your source file:
python convert_netcdf_to_zarr.py \
  new_data.nc \
  /tmp/ocean_data.zarr

# Refresh browser - new data loads automatically!
```

### Test Different Datasets

```bash
# Hawaii SWAN waves
python server.py \
  --opendap https://pae-paha.pacioos.hawaii.edu/thredds/dodsC/swan/hawaii/SWAN_Hawaii_Regional \
  --port 9000

# Your own data
python server.py --file /path/to/your/data.nc --port 9001

# Switch between them by changing REACT_APP_ZARR_URL
```

---

## 📚 Additional Resources

- **xpublish docs:** https://xpublish.readthedocs.io/
- **Zarr spec:** https://zarr.readthedocs.io/
- **Your project docs:**
  - [xpublish-server/README.md](xpublish-server/README.md)
  - [xpublish-server/QUICKSTART.md](xpublish-server/QUICKSTART.md)
  - [docs/HOW-ZARR-SERVING-WORKS.md](docs/HOW-ZARR-SERVING-WORKS.md)

---

## ✅ Success!

When everything works, you should see:

1. **Server terminal:** Streaming request logs
2. **Browser console:** Successful data loads
3. **Browser window:** Animated ocean particles flowing!

Now you can:
- ✨ Develop new visualizations
- 🔄 Test with different datasets
- 🚀 Prepare for production deployment

Happy ocean visualizing! 🌊
