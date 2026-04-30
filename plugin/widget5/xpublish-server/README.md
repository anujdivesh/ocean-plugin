# xpublish Server for Ocean Data

Serve NetCDF ocean data as Zarr-compatible HTTP endpoints for browser-based visualization.

## 🎯 Why Use xpublish?

### Advantages
- ✅ **No pre-conversion:** Serve NetCDF directly without creating Zarr stores
- ✅ **Dynamic:** Update source data, server reflects changes immediately
- ✅ **Development-friendly:** Quick iteration without regenerating Zarr files
- ✅ **On-the-fly processing:** Subset, transform, or aggregate data server-side
- ✅ **THREDDS integration:** Can serve directly from THREDDS OPeNDAP endpoints

### When to Use
- **Development/Testing:** Rapid iteration without storage overhead
- **Dynamic data:** Frequently updated datasets
- **Processing:** Need server-side computation before delivery
- **Small deployments:** Don't want to manage object storage

### When to Use Static Zarr Instead
- **Production at scale:** Need CDN caching, global distribution
- **Large datasets:** Pre-computed chunks are faster than on-demand
- **Cost optimization:** Object storage + CDN cheaper than compute servers
- **High traffic:** Static files scale infinitely, xpublish has compute limits

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd xpublish-server
pip install -r requirements.txt
```

### 2. Start Server

```bash
# Serve local NetCDF file
python server.py --file /path/to/ocean_currents.nc

# Serve from THREDDS OPeNDAP
python server.py --opendap https://pae-paha.pacioos.hawaii.edu/thredds/dodsC/swan/hawaii/SWAN_Hawaii_Regional

# Custom configuration
python server.py --file ocean.nc --variables u v --port 9000 --spatial-chunk 256
```

### 3. Test Server

```bash
# Check server status
curl http://localhost:9000/

# Get dataset info
curl http://localhost:9000/datasets/ocean/info

# Get Zarr metadata (what your frontend needs)
curl http://localhost:9000/datasets/ocean/zarr/.zmetadata
```

## 📡 Frontend Integration

### Option 1: Direct Usage (Recommended)

Update your `ZarrLoader.js` to point to the xpublish server:

```javascript
// src/services/ZarrLoader.js

const ZARR_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://data.your-domain.com/datasets/ocean/zarr'  // Production: static Zarr
  : 'http://localhost:9000/datasets/ocean/zarr';        // Development: xpublish

export class ZarrLoader {
  constructor(config = {}) {
    this.zarrUrl = config.zarrUrl || ZARR_BASE_URL;
    // ... rest of your code
  }
}
```

### Option 2: Proxy Through Your Dev Server

Update your `setupProxy.js`:

```javascript
// src/setupProxy.js

module.exports = function(app) {
  // Proxy Zarr requests to xpublish server
  app.use('/api/zarr', createProxyMiddleware({
    target: 'http://localhost:9000',
    pathRewrite: {
      '^/api/zarr': '/datasets/ocean/zarr'
    },
    changeOrigin: true,
    onProxyReq: (proxyReq, req, res) => {
      console.log(`Proxying Zarr request: ${req.path}`);
    }
  }));
};
```

Then use relative URLs in your frontend:

```javascript
const ZARR_URL = '/api/zarr';
```

## 🔧 Configuration Options

### Chunking Strategy

Optimize for your access patterns:

```bash
# Time series analysis (load full spatial slices)
python server.py --file ocean.nc --time-chunk 1 --spatial-chunk 512

# Spatial analysis (load multiple timesteps)
python server.py --file ocean.nc --time-chunk 24 --spatial-chunk 128

# Small regions, high detail
python server.py --file ocean.nc --spatial-chunk 64
```

### Memory Management

```bash
# Increase cache for large datasets
python server.py --file ocean.nc --cache-size 4GB

# Reduce cache for memory-constrained servers
python server.py --file ocean.nc --cache-size 256MB
```

### Variable Selection

```bash
# Serve only flow variables
python server.py --file ocean.nc --variables u v

# Include waves and currents
python server.py --file ocean.nc --variables u v hs tp dirm
```

## 🌐 Production Deployment

### Docker Deployment

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy server
COPY server.py .

# Expose port
EXPOSE 9000

# Run server
CMD ["python", "server.py", \
     "--opendap", "https://your-thredds.server/dodsC/ocean/latest", \
     "--port", "9000", \
     "--host", "0.0.0.0"]
```

```bash
# Build and run
docker build -t ocean-xpublish .
docker run -p 9000:9000 ocean-xpublish
```

### Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ocean-xpublish
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ocean-xpublish
  template:
    metadata:
      labels:
        app: ocean-xpublish
    spec:
      containers:
      - name: xpublish
        image: your-registry/ocean-xpublish:latest
        ports:
        - containerPort: 9000
        env:
        - name: OPENDAP_URL
          value: "https://your-thredds.server/dodsC/ocean/latest"
        resources:
          requests:
            memory: "2Gi"
            cpu: "1"
          limits:
            memory: "4Gi"
            cpu: "2"
---
apiVersion: v1
kind: Service
metadata:
  name: ocean-xpublish
spec:
  selector:
    app: ocean-xpublish
  ports:
  - port: 9000
    targetPort: 9000
```

## 📊 Performance Comparison

| Approach | First Load | Subsequent Loads | Scalability | Cost |
|----------|-----------|------------------|-------------|------|
| **xpublish** | Medium | Medium | Medium (compute-bound) | Medium |
| **Static Zarr + CDN** | Fast | Very Fast | Infinite | Low |
| **THREDDS OPeNDAP** | Slow | Slow | Low | Low |

## 🔍 Monitoring

### Check Server Health

```bash
# Server info
curl http://localhost:9000/

# Dataset metadata
curl http://localhost:9000/datasets/ocean/info | jq

# Sample chunk (should return binary data)
curl -I http://localhost:9000/datasets/ocean/zarr/u/0.0.0
```

### Performance Logging

Add logging to track requests:

```python
# In server.py, add middleware
from starlette.middleware.base import BaseHTTPMiddleware

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        print(f"Request: {request.method} {request.url.path}")
        response = await call_next(request)
        print(f"Response: {response.status_code}")
        return response

# Add to REST app
rest.app.add_middleware(LoggingMiddleware)
```

## 🎓 Advanced Features

### Multi-Dataset Server

Serve multiple datasets:

```python
server = OceanDataServer()
server.load_dataset('currents', path='currents.nc')
server.load_dataset('waves', path='waves.nc')
server.serve()

# Access at:
# http://localhost:9000/datasets/currents/zarr/...
# http://localhost:9000/datasets/waves/zarr/...
```

### Custom Processing

Add data transformations:

```python
# In load_dataset()
ds = ds.where(ds.lat > -25)  # Filter to specific region
ds['speed'] = np.sqrt(ds.u**2 + ds.v**2)  # Compute speed
```

## 🆚 Decision Matrix: xpublish vs Static Zarr

Choose **xpublish** if:
- You're in development/testing phase
- Data updates frequently (daily/hourly)
- You need server-side processing
- Storage is expensive/limited
- Traffic is low-medium (<1000 req/min)

Choose **Static Zarr + CDN** if:
- You're in production at scale
- Data is stable or updates infrequently
- You need global distribution
- You have high traffic
- Cost optimization is important

## 💡 Best Practice: Hybrid Approach

Use both for optimal development workflow:

```javascript
// config.js
export const DATA_CONFIG = {
  development: {
    zarrUrl: 'http://localhost:9000/datasets/ocean/zarr',  // xpublish
    updateInterval: 5000,  // Frequent updates
  },
  production: {
    zarrUrl: 'https://cdn.your-domain.com/ocean/zarr',  // Static Zarr
    updateInterval: 60000,  // Less frequent
  }
};
```

This gives you fast iteration in development and optimal performance in production!
