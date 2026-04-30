# 🎯 Local Testing - Complete Setup

## ✨ What You Have Now

I've created a complete local testing environment for your ocean visualization application. Everything runs on your local machine - no cloud services needed!

### 📁 New Files Created

```
widget5/
├── setup-local-test.sh          # 🚀 Automated setup script
├── start-server.sh              # Created by setup script
├── start-app.sh                 # Created by setup script  
├── test-connection.sh           # 🧪 Test connectivity
├── QUICK-START-LOCAL.md         # Quick reference
├── LOCAL-TESTING-GUIDE.md       # Complete documentation
│
└── xpublish-server/
    ├── server.py                # xpublish server (NEW!)
    ├── requirements.txt         # Python dependencies
    ├── README.md                # Full documentation
    ├── QUICKSTART.md            # 5-minute guide
    ├── test-server.sh           # Server tests
    └── frontend-integration-example.js  # Integration examples
```

---

## 🚀 Get Started in 3 Commands

### Option 1: Automated Setup (Recommended)

```bash
cd /home/kishank/ocean-plugin/plugin/widget5

# 1. Run setup (installs dependencies, generates data)
./setup-local-test.sh

# 2. Start server (Terminal 1)
./start-server.sh

# 3. Start app (Terminal 2)  
./start-app.sh

# Open http://localhost:3000 🎉
```

### Option 2: Manual Setup

```bash
cd /home/kishank/ocean-plugin/plugin/widget5

# 1. Generate sample data
python3 scripts/convert_netcdf_to_zarr.py --sample-data /tmp/ocean.zarr

# 2. Install Python dependencies
pip install -r xpublish-server/requirements.txt

# 3. Start xpublish server
python3 xpublish-server/server.py --file /tmp/ocean.zarr

# 4. In new terminal: Install Node dependencies
npm install

# 5. Start React app
npm start

# Open http://localhost:3000 🎉
```

---

## 🧪 Verify Everything Works

```bash
# Run comprehensive tests
./test-connection.sh

# Expected output:
# ✅ Server is running at http://localhost:9000
# ✅ Dataset 'ocean' is available
# ✅ Zarr metadata accessible
# ✅ CORS headers present
# ✅ Variable 'u' found
# ✅ Variable 'v' found
# ✅ Chunk download successful
# ✅ All critical tests passed!
```

---

## 📊 What's Happening Behind the Scenes

```
┌─────────────────────────┐
│  1. Data Generation     │
│  ───────────────────    │
│  Sample ocean flow data │  Generated with:
│  for Cook Islands       │  - Circular gyre patterns
│  region                 │  - Realistic velocities
└────────────┬────────────┘  - 48 timesteps
             │
             │ Stored as Zarr
             ▼
┌─────────────────────────┐
│  2. xpublish Server     │
│  ───────────────────    │
│  Python FastAPI server  │  Serves data as:
│  Port: 9000            │  - Zarr HTTP endpoints
│  CORS enabled          │  - /datasets/ocean/zarr/
└────────────┬────────────┘  - Chunk-level access
             │
             │ HTTP requests
             ▼
┌─────────────────────────┐
│  3. React Application   │
│  ───────────────────    │
│  Port: 3000            │  Features:
│  Deck.gl + Leaflet     │  - GPU particle rendering
│  ZarrLoader.js         │  - Interactive controls
└─────────────────────────┘  - Real-time updates
```

---

## 🎨 Data Source Options

The setup script gives you 3 choices:

### 1. Sample Data (Fastest - 30 seconds)
```bash
# Auto-generated synthetic ocean currents
# Perfect for development and testing
# Cook Islands region, 48 timesteps
```

### 2. Real THREDDS Data (5 minutes)
```bash
# Downloads from PacIOOS Hawaii SWAN
# Real ocean wave model data
# Requires internet connection
```

### 3. Your Own NetCDF (Variable)
```bash
# Use your existing ocean model outputs
# Supports standard NetCDF formats
# Works with SWAN, SCHISM, ROMS, etc.
```

---

## 🔍 Testing Checklist

After setup, verify these:

- [ ] `./start-server.sh` runs without errors
- [ ] Server shows: "Starting xpublish server..."
- [ ] `./start-app.sh` runs without errors
- [ ] Browser opens to http://localhost:3000
- [ ] Browser console shows: "ZarrLoader initialized"
- [ ] Browser console shows: "Metadata loaded"
- [ ] Map displays with ocean data
- [ ] Particles animate smoothly
- [ ] Timeline controls work
- [ ] No CORS errors in console

---

## 🆘 Troubleshooting

### Server Issues

**Problem:** `ModuleNotFoundError: No module named 'xpublish'`

```bash
cd xpublish-server
pip install -r requirements.txt
```

**Problem:** `Address already in use`

```bash
# Find and kill process on port 9000
lsof -i :9000
kill -9 <PID>

# Or use different port
python3 server.py --file /tmp/ocean.zarr --port 9001
```

### React App Issues

**Problem:** `Cannot find module`

```bash
npm install
```

**Problem:** CORS errors in browser

```bash
# Verify server is running with CORS:
curl -I http://localhost:9000/datasets/ocean/zarr/.zmetadata | grep -i cors

# Should see: access-control-allow-origin: *
```

### Data Issues

**Problem:** No data displayed

```bash
# Test server endpoints:
./test-connection.sh

# Check what variables are available:
curl http://localhost:9000/datasets/ocean/info | jq '.data_vars'

# Make sure 'u' and 'v' are present
```

**Problem:** Slow performance

```bash
# Increase chunk size and cache:
python3 server.py \
  --file /tmp/ocean.zarr \
  --spatial-chunk 512 \
  --cache-size 2GB
```

---

## 📚 Documentation

- **Quick Start:** [QUICK-START-LOCAL.md](QUICK-START-LOCAL.md) ← Start here!
- **Full Guide:** [LOCAL-TESTING-GUIDE.md](LOCAL-TESTING-GUIDE.md)
- **xpublish Server:** [xpublish-server/README.md](xpublish-server/README.md)
- **xpublish Quick Start:** [xpublish-server/QUICKSTART.md](xpublish-server/QUICKSTART.md)

---

## 🎓 Next Steps After Testing

Once everything works locally:

### Development Workflow

```bash
# Keep both terminals open:

# Terminal 1: xpublish server (leave running)
./start-server.sh

# Terminal 2: React app (auto-reloads on code changes)
./start-app.sh

# Terminal 3: Make changes, they'll hot-reload!
```

### Testing Different Datasets

```bash
# Generate new test data
python3 scripts/generate_test_ocean_data.py \
  --output /tmp/new_data.nc \
  --timesteps 24

# Convert to Zarr
python3 scripts/convert_netcdf_to_zarr.py \
  /tmp/new_data.nc \
  /tmp/new_data.zarr

# Restart server with new data
python3 xpublish-server/server.py --file /tmp/new_data.zarr

# Refresh browser - new data loads!
```

### Connect to Remote THREDDS

```bash
# Serve directly from THREDDS (no download!)
python3 xpublish-server/server.py \
  --opendap https://your-thredds-server/dodsC/ocean/latest \
  --port 9000

# Your React app fetches from xpublish, which proxies THREDDS
```

### Prepare for Production

When ready to deploy:

1. **Static Zarr:** Pre-convert data for optimal performance
2. **Object Storage:** Upload to S3/Azure Blob
3. **CDN:** Add CloudFront/Azure CDN for global distribution
4. **Update Config:** Point React app to CDN URL

See [docs/DATA-SERVING-STRATEGY.md](docs/DATA-SERVING-STRATEGY.md) for details.

---

## 💡 Pro Tips

### Fast Iteration
```bash
# xpublish reads files dynamically!
# Update your Zarr store, refresh browser = instant new data
```

### Multiple Datasets
```bash
# Run multiple xpublish servers:
python3 server.py --file hawaii.zarr --port 9000  
python3 server.py --file cook_islands.zarr --port 9001

# Switch by changing REACT_APP_ZARR_URL
```

### Performance Monitoring
```bash
# Watch server requests in real-time:
./start-server.sh | grep "GET /datasets"

# Monitor browser performance:
# F12 → Network tab → Filter: zarr
```

---

## ✅ Success Indicators

When everything is working, you'll see:

**Server Terminal:**
```
🚀 Starting xpublish server...
📡 Access your data at:
   http://0.0.0.0:9000/datasets/ocean/zarr
INFO: 127.0.0.1:xxxxx - "GET /datasets/ocean/zarr/.zmetadata HTTP/1.1" 200 OK
```

**React Terminal:**
```
Compiled successfully!
webpack compiled successfully
```

**Browser Console:**
```
🌊 ZarrLoader initialized: http://localhost:9000/datasets/ocean/zarr
📡 Fetching metadata...
✅ Metadata loaded
🌊 Loading timestep 0...
✅ Chunk loaded
```

**Browser Window:**
```
🌊 Animated ocean particles flowing across the map! 🎉
```

---

## 🎯 Summary

You now have:

✅ **Automated setup script** - One command to install everything  
✅ **xpublish server** - Serves ocean data via HTTP  
✅ **Sample data generator** - Creates realistic test data  
✅ **Connection tests** - Verify everything works  
✅ **Startup scripts** - Easy start/stop  
✅ **Complete docs** - Step-by-step guides

**Ready to start?**

```bash
cd /home/kishank/ocean-plugin/plugin/widget5
./setup-local-test.sh
```

Happy ocean visualizing! 🌊✨
