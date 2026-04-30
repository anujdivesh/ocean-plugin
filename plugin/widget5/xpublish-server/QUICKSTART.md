# 🚀 Quick Start: xpublish in 5 Minutes

## Step 1: Install xpublish (30 seconds)

```bash
cd /home/kishank/ocean-plugin/plugin/widget5/xpublish-server
pip install -r requirements.txt
```

## Step 2: Start Server with Your Data (30 seconds)

### Option A: Use Sample Data
```bash
# Generate sample ocean flow data for Cook Islands
cd ../scripts
python convert_netcdf_to_zarr.py --sample-data /tmp/sample_ocean.nc

# Serve it with xpublish
cd ../xpublish-server
python server.py --file /tmp/sample_ocean.nc
```

### Option B: Use Real THREDDS Data
```bash
# Serve directly from THREDDS OPeNDAP (no download needed!)
python server.py --opendap https://pae-paha.pacioos.hawaii.edu/thredds/dodsC/swan/hawaii/SWAN_Hawaii_Regional
```

### Option C: Use Your Own NetCDF File
```bash
python server.py --file /path/to/your/ocean_data.nc --variables u v
```

## Step 3: Verify Server (30 seconds)

```bash
# Test server health
curl http://localhost:9000/

# Expected output:
# {
#   "service": "xpublish Ocean Data Server",
#   "datasets": ["ocean"],
#   "endpoints": { ... }
# }

# Get dataset info
curl http://localhost:9000/datasets/ocean/info

# Test Zarr metadata
curl http://localhost:9000/datasets/ocean/zarr/.zmetadata | head
```

## Step 4: Configure Your React App (2 minutes)

### Quick Config (Development Only)

Edit your `.env.development`:
```bash
REACT_APP_ZARR_URL=http://localhost:9000/datasets/ocean/zarr
```

Or update your ZarrLoader directly:
```javascript
// src/services/ZarrLoader.js
const ZARR_URL = 'http://localhost:9000/datasets/ocean/zarr';
```

### Full Config (Development + Production)

1. **Create environment files:**

```bash
# .env.development
REACT_APP_ZARR_SOURCE=xpublish
REACT_APP_ZARR_URL=http://localhost:9000/datasets/ocean/zarr

# .env.production  
REACT_APP_ZARR_SOURCE=static
REACT_APP_ZARR_URL=https://cdn.your-domain.com/ocean/zarr
```

2. **Update your data config:**

```javascript
// src/config/dataConfig.js
export const ZARR_URL = process.env.REACT_APP_ZARR_URL || '/data/ocean/test.zarr';
```

## Step 5: Test in Browser (1 minute)

1. **Start your React app:**
```bash
cd /home/kishank/ocean-plugin/plugin/widget5
npm start
```

2. **Open browser console** and check for:
```
🌊 ZarrLoader initialized: http://localhost:9000/datasets/ocean/zarr
📡 Fetching metadata...
✅ Metadata loaded
```

3. **View your flow visualization** - particles should now stream from xpublish!

## 🎉 Success Indicators

You'll know it's working when you see:

1. ✅ Server logs showing HTTP requests:
```
INFO: 127.0.0.1:xxxxx - "GET /datasets/ocean/zarr/.zmetadata HTTP/1.1" 200 OK
INFO: 127.0.0.1:xxxxx - "GET /datasets/ocean/zarr/u/.zarray HTTP/1.1" 200 OK
INFO: 127.0.0.1:xxxxx - "GET /datasets/ocean/zarr/u/0.0.0 HTTP/1.1" 200 OK
```

2. ✅ Browser console showing data loads:
```
📡 Fetching metadata from: http://localhost:9000/datasets/ocean/zarr/.zmetadata
✅ Metadata loaded (125ms)
🌊 Loading timestep 0...
```

3. ✅ Animated particles flowing on your map!

## 🔧 Common Issues & Fixes

### Issue 1: Server won't start

**Error:** `ModuleNotFoundError: No module named 'xpublish'`

**Fix:**
```bash
pip install xpublish xarray zarr netCDF4 uvicorn
```

### Issue 2: CORS errors in browser

**Error:** `Access to fetch at 'http://localhost:9000/...' has been blocked by CORS policy`

**Fix:** Server already includes CORS headers. If still failing:
1. Check server started successfully (look for "Starting xpublish server...")
2. Verify URL in browser console matches server URL exactly
3. Try clearing browser cache

### Issue 3: Can't load NetCDF file

**Error:** `FileNotFoundError: No such file`

**Fix:**
```bash
# Use absolute path
python server.py --file /home/kishank/ocean-plugin/data/ocean.nc

# Or create sample data first
python scripts/convert_netcdf_to_zarr.py --sample-data /tmp/sample.nc
```

### Issue 4: Slow performance

**Fix:** Increase chunk size and cache:
```bash
python server.py --file ocean.nc --spatial-chunk 256 --cache-size 2GB
```

### Issue 5: Frontend shows "Loading..." forever

**Debug steps:**
1. Check browser console for errors
2. Verify server is running: `curl http://localhost:9000/`
3. Test metadata endpoint: `curl http://localhost:9000/datasets/ocean/zarr/.zmetadata`
4. Check network tab in browser DevTools for failed requests

## 🎯 Next Steps

### Development Workflow
```bash
# Terminal 1: Start xpublish server
cd xpublish-server
python server.py --file /path/to/data.nc

# Terminal 2: Start React app
cd ..
npm start

# Now edit your visualization code and see live updates!
```

### Advanced: Serve from Remote THREDDS
```bash
# Hawaii SWAN wave model
python server.py --opendap https://pae-paha.pacioos.hawaii.edu/thredds/dodsC/swan/hawaii/SWAN_Hawaii_Regional

# Cook Islands (if available)
python server.py --opendap https://your-thredds-server/dodsC/ocean/cook_islands/latest
```

### Production: Deploy to Server
```bash
# Build Docker image
docker build -t ocean-xpublish xpublish-server/

# Run in production
docker run -d \
  -p 9000:9000 \
  -e OPENDAP_URL="https://your-thredds.server/dodsC/ocean/latest" \
  ocean-xpublish

# Or use kubernetes (see README.md)
```

## 📊 Performance Tips

1. **Chunking:** Match your access patterns
   - Time series: `--time-chunk 1 --spatial-chunk 512`
   - Spatial analysis: `--time-chunk 24 --spatial-chunk 128`

2. **Caching:** Increase for better performance
   - Development: `--cache-size 1GB`
   - Production: `--cache-size 4GB`

3. **Variables:** Only serve what you need
   - `--variables u v` (just flow)
   - `--variables u v hs tp` (flow + waves)

## 🆚 When to Use What

**Use xpublish for:**
- ✅ Development and testing
- ✅ Data updates frequently
- ✅ Need server-side processing
- ✅ Low-medium traffic

**Use static Zarr for:**
- ✅ Production at scale
- ✅ High traffic (>1000 req/min)
- ✅ Global CDN distribution
- ✅ Cost optimization

**Best practice:** Use both!
- Development: xpublish (fast iteration)
- Production: Static Zarr + CDN (performance)

## 💡 Pro Tips

1. **Auto-reload on data changes:**
   - xpublish dynamically reads the NetCDF file
   - Update your source file, refresh browser = new data!

2. **Test different datasets quickly:**
   ```bash
   # Test Hawaii
   python server.py --opendap https://pae-paha.pacioos.hawaii.edu/thredds/dodsC/swan/hawaii/...
   
   # Test Cook Islands (different terminal)
   python server.py --file cook_islands.nc --port 9001
   ```

3. **Monitor performance:**
   ```bash
   # Watch server logs
   python server.py --file ocean.nc | grep "GET /datasets"
   ```

4. **Compare with static Zarr:**
   - Keep your static Zarr files
   - Point xpublish to same data
   - Compare load times in browser DevTools

## 🎓 Learning Resources

- **xpublish docs:** https://xpublish.readthedocs.io/
- **Zarr spec:** https://zarr.readthedocs.io/
- **xarray docs:** https://xarray.pydata.org/

Ready to visualize ocean currents! 🌊✨
