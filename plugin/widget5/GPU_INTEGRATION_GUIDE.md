# GPU Particle Flow Integration Guide

This guide shows how to replace WMS-based ocean visualization with GPU-accelerated Zarr-based rendering in Widget5.

## 🎯 Goal

Replace this:
```javascript
// OLD: WMS tile layer (slow, shaky, 5-10 fps)
addWMSTileLayer(map, FORECAST_WMS_URL, {
  layers: 'transp_x,transp_y',
  format: 'image/png',
  // ... every frame = new HTTP request
});
```

With this:
```javascript
// NEW: GPU particles (smooth, 60 fps, cached data)
new GPUParticleFlowLayer({
  velocityData: zarrManager.getVelocityFieldForGPU(timestep, 'transp_x', 'transp_y'),
  particleCount: 65536,
  speedFactor: 5.0
});
```

---

## 📦 Installation

### 1. Install Dependencies

```bash
cd /home/kishank/ocean-plugin/plugin/widget5
npm install zarr@0.6.3 @deck.gl/core@9.0.0 @deck.gl/layers@9.0.0 @luma.gl/constants@9.0.0
```

### 2. Verify Files

Ensure these files exist:
- ✅ `src/layers/GPUParticleFlowLayer.js`
- ✅ `src/services/ZarrDataManager.js`

---

## 🔧 Integration Steps

### Step 1: Start Zarr Server

```bash
cd /home/kishank/ocean-plugin/plugin/widget5
./start-zarr-server.sh

# Should see:
# Serving SWAN_UGRID.zarr at http://localhost:8080
```

### Step 2: Create AnimationController

Create `src/utils/AnimationController.js`:

```javascript
/**
 * AnimationController - Decoupled time progression
 * Manages timestep advancement, interpolation, and prefetching
 */
export default class AnimationController {
  constructor(zarrManager, options = {}) {
    this.zarr = zarrManager;
    this.currentTimestep = 0;
    this.interpAlpha = 0.0;
    this.isPlaying = false;
    this.speed = options.speed || 1; // Playback speed multiplier
    this.targetFPS = options.targetFPS || 60;
    this.onUpdate = options.onUpdate || (() => {});
    
    this.maxTimestep = zarrManager.metadata.timestepCount - 1;
    this.lastFrameTime = 0;
  }

  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.lastFrameTime = performance.now();
    this.animate();
  }

  pause() {
    this.isPlaying = false;
  }

  toggle() {
    this.isPlaying ? this.pause() : this.play();
  }

  setSpeed(speed) {
    this.speed = speed;
  }

  jumpTo(timestep) {
    this.currentTimestep = Math.max(0, Math.min(this.maxTimestep, timestep));
    this.interpAlpha = 0;
    this.onUpdate(this.getState());
  }

  animate() {
    if (!this.isPlaying) return;

    const now = performance.now();
    const delta = (now - this.lastFrameTime) / 1000; // seconds
    this.lastFrameTime = now;

    // Advance interpolation alpha
    // Speed of 1 = 1 timestep per second
    this.interpAlpha += delta * this.speed;

    // Move to next timestep when alpha >= 1
    if (this.interpAlpha >= 1.0) {
      this.currentTimestep++;
      this.interpAlpha = 0;

      // Loop at end
      if (this.currentTimestep > this.maxTimestep) {
        this.currentTimestep = 0;
      }
    }

    // Notify listeners
    this.onUpdate(this.getState());

    // Continue animation loop
    requestAnimationFrame(() => this.animate());
  }

  getState() {
    return {
      timestep: this.currentTimestep,
      interpAlpha: this.interpAlpha,
      isPlaying: this.isPlaying,
      speed: this.speed,
      progress: (this.currentTimestep + this.interpAlpha) / this.maxTimestep,
      timestamp: this.zarr.metadata.times?.[this.currentTimestep]
    };
  }
}
```

### Step 3: Update Home.jsx

Replace WMS layer with GPU particles:

```javascript
// src/pages/Home.jsx
import React, { useState, useEffect, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import { MapView } from '@deck.gl/core';
import GPUParticleFlowLayer from '../layers/GPUParticleFlowLayer';
import ZarrDataManager from '../services/ZarrDataManager';
import AnimationController from '../utils/AnimationController';

function Home() {
  const [viewState, setViewState] = useState({
    longitude: -159.8,
    latitude: -21.2,
    zoom: 7,
    pitch: 0,
    bearing: 0
  });

  const [layers, setLayers] = useState([]);
  const [animationState, setAnimationState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const zarrManagerRef = useRef(null);
  const animControllerRef = useRef(null);
  const velocityDataRef = useRef(null);
  const colorDataRef = useRef(null);

  // Initialize Zarr and Animation
  useEffect(() => {
    async function init() {
      try {
        console.log('🚀 Initializing GPU Particle System...');
        
        // Initialize Zarr data manager
        const zarr = new ZarrDataManager('http://localhost:8080/SWAN_UGRID.zarr', {
          cacheSize: 8,
          prefetchWindow: 4
        });
        await zarr.init();
        zarrManagerRef.current = zarr;

        console.log('📊 Metadata:', zarr.metadata);

        // Load initial data
        await updateLayerData(0);

        // Initialize animation controller
        const controller = new AnimationController(zarr, {
          speed: 1,
          targetFPS: 60,
          onUpdate: handleAnimationUpdate
        });
        animControllerRef.current = controller;

        setIsLoading(false);
        console.log('✅ Initialization complete!');

      } catch (error) {
        console.error('❌ Initialization failed:', error);
        setIsLoading(false);
      }
    }

    init();
  }, []);

  async function updateLayerData(timestep) {
    const zarr = zarrManagerRef.current;
    if (!zarr) return;

    try {
      // Load velocity field (4 timesteps for cubic interpolation)
      const velocityData = await zarr.getVelocityFieldForGPU(
        timestep, 
        'transp_x', 
        'transp_y', 
        256 // Grid resolution
      );
      velocityDataRef.current = velocityData;

      // Load color field (wave height)
      const colorData = await zarr.getScalarFieldForGPU(timestep, 'hs', 256);
      colorDataRef.current = colorData;

      // Update layers
      updateLayers(0); // Start with alpha=0

      console.log('📦 Data loaded for timestep', timestep);
      console.log('📈 Stats:', zarr.getStats());

    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  function handleAnimationUpdate(state) {
    setAnimationState(state);

    // Check if we need new timestep data
    const currentData = velocityDataRef.current;
    if (!currentData || !currentData.timesteps.includes(state.timestep)) {
      updateLayerData(state.timestep);
    } else {
      // Just update interpolation alpha
      updateLayers(state.interpAlpha);
    }
  }

  function updateLayers(interpAlpha) {
    const velocityData = velocityDataRef.current;
    const colorData = colorDataRef.current;

    if (!velocityData || !colorData) return;

    const particleLayer = new GPUParticleFlowLayer({
      id: 'gpu-particles',
      velocityField: velocityData,
      colorField: colorData,
      bounds: zarrManagerRef.current.metadata.bounds,
      particleResolution: 256, // 65k particles
      windResolution: 256,
      speedFactor: 5.0,
      fadeAmount: 0.982,
      dropRate: 0.003,
      lineWidth: 2.0,
      interpAlpha: interpAlpha,
      useWaveMode: true,
      normalizeVelocity: false,
      waveSpeedScale: 35.0,
      opacity: 0.8,
      pickable: false
    });

    setLayers([particleLayer]);
  }

  // UI Controls
  function handlePlayPause() {
    if (animControllerRef.current) {
      animControllerRef.current.toggle();
    }
  }

  function handleSpeedChange(speed) {
    if (animControllerRef.current) {
      animControllerRef.current.setSpeed(speed);
    }
  }

  function handleSeek(timestep) {
    if (animControllerRef.current) {
      animControllerRef.current.jumpTo(parseInt(timestep));
    }
  }

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <h2>Loading GPU Particle System...</h2>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState }) => setViewState(viewState)}
        controller={true}
        layers={layers}
        parameters={{
          blendFunc: ['SRC_ALPHA', 'ONE_MINUS_SRC_ALPHA'],
          blendEquation: 'FUNC_ADD',
          depthTest: false
        }}
      >
        <MapView id="map" controller={true} />
      </DeckGL>

      {/* Animation Controls */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '15px 25px',
        borderRadius: 10,
        display: 'flex',
        gap: 15,
        alignItems: 'center',
        zIndex: 10
      }}>
        <button 
          onClick={handlePlayPause}
          style={{ padding: '8px 16px', borderRadius: 5 }}
        >
          {animationState?.isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>

        <select 
          value={animationState?.speed || 1}
          onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
          style={{ padding: '8px' }}
        >
          <option value={0.5}>×0.5</option>
          <option value={1}>×1</option>
          <option value={2}>×2</option>
          <option value={5}>×5</option>
        </select>

        <input
          type="range"
          min="0"
          max={zarrManagerRef.current?.metadata.timestepCount - 1 || 0}
          value={animationState?.timestep || 0}
          onChange={(e) => handleSeek(e.target.value)}
          style={{ width: 300 }}
        />

        <span style={{ fontFamily: 'monospace', minWidth: 120 }}>
          t={animationState?.timestep || 0} / {zarrManagerRef.current?.metadata.timestepCount || 0}
        </span>

        <span style={{ fontSize: 11, opacity: 0.7 }}>
          {animationState?.timestamp?.substring(0, 19) || 'Loading...'}
        </span>
      </div>

      {/* FPS Counter */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        background: 'rgba(0,0,0,0.7)',
        color: '#0f0',
        padding: '8px 12px',
        borderRadius: 5,
        fontFamily: 'monospace',
        fontSize: 12,
        zIndex: 10
      }}>
        GPU Particles: 65,536 | Mode: Zarr + WebGL2
      </div>
    </div>
  );
}

export default Home;
```

---

## 🎨 Customization Options

### Variable Modes

```javascript
// Wind mode (velocity coloring)
new GPUParticleFlowLayer({
  velocityField: await zarr.getVelocityFieldForGPU(t, 'u10', 'v10'),
  useWaveMode: false,
  speedFactor: 3.0
});

// Wave energy mode (wave height coloring)
new GPUParticleFlowLayer({
  velocityField: await zarr.getVelocityFieldForGPU(t, 'transp_x', 'transp_y'),
  colorField: await zarr.getScalarFieldForGPU(t, 'hs'),
  useWaveMode: true,
  waveSpeedScale: 35.0
});

// Ocean currents mode
new GPUParticleFlowLayer({
  velocityField: await zarr.getVelocityFieldForGPU(t, 'ucur', 'vcur'),
  useWaveMode: false,
  normalizeVelocity: true
});
```

### Performance Tuning

```javascript
// Mobile / Low-end devices
new GPUParticleFlowLayer({
  particleResolution: 128,  // 16k particles
  windResolution: 128,
  fadeAmount: 0.96,
  dropRate: 0.005
});

// Desktop / High-end
new GPUParticleFlowLayer({
  particleResolution: 512,  // 262k particles
  windResolution: 512,
  fadeAmount: 0.995,
  dropRate: 0.001,
  maxAge: 300
});
```

### Visual Styles

```javascript
// Subtle background flow
new GPUParticleFlowLayer({
  lineWidth: 1.0,
  fadeAmount: 0.99,
  opacity: 0.4
});

// Bold, high-contrast
new GPUParticleFlowLayer({
  lineWidth: 3.0,
  fadeAmount: 0.97,
  dropRate: 0.01,
  opacity: 1.0
});
```

---

## 🔬 Testing

### 1. Verify Zarr Server

```bash
# Should return JSON metadata
curl http://localhost:8080/SWAN_UGRID.zarr/.zgroup

# Should return binary chunk data
curl http://localhost:8080/SWAN_UGRID.zarr/transp_x/0 --output test.bin
```

### 2. Check Browser Console

Look for these logs:
```
✅ Loaded 12345 mesh nodes
⏱️  181 timesteps available
📦 Bounds: [-161.00, -22.50, -158.50, -20.00]
⚡ Loaded timestep 5 (transp_x, transp_y, hs) in 23.4ms
```

### 3. Monitor Performance

```javascript
// In browser console
console.log(zarrManager.getStats());
// {
//   cacheHits: 45,
//   cacheMisses: 12,
//   cacheHitRate: "78.9%",
//   mbLoaded: "14.3 MB",
//   cachedEntries: 8
// }
```

---

## 🚀 Expected Performance

| Metric | WMS (Old) | GPU Zarr (New) |
|--------|-----------|----------------|
| **Initial Load** | 500KB × 180 tiles = 90MB | 2-3MB total |
| **Per-Frame Network** | 500KB (200-500ms) | 0 bytes (cached) |
| **Render FPS** | 5-10 fps (shaky) | 60 fps (smooth) |
| **Particle Count** | N/A (images) | 65,536 |
| **Memory** | ~200MB (tiles) | ~50MB (arrays) |
| **Interpolation** | None (jumpy) | Cubic (smooth) |

---

## 🐛 Troubleshooting

### Issue: "WebGL2 not supported"
**Solution:** Check browser compatibility. Require Chrome 56+, Firefox 51+, Safari 15+

### Issue: "Failed to load Zarr data"
**Solution:** 
1. Verify Zarr server is running: `curl http://localhost:8080/SWAN_UGRID.zarr/.zgroup`
2. Check CORS headers are enabled
3. Verify zarr.js is imported correctly

### Issue: "Particles not moving"
**Solution:**
1. Check velocity data has non-zero values: `console.log(velocityData.u[1])`
2. Verify `speedFactor` is > 0
3. Check bounds match data coordinates

### Issue: "Low FPS / Stuttering"
**Solution:**
1. Reduce `particleResolution` (256 → 128)
2. Increase `fadeAmount` (0.982 → 0.95)
3. Check if prefetch is working: `zarr.getStats()`

---

## 📚 Next Steps

1. **Multi-Layer Composition**: Add bathymetry, coastlines, arrows
2. **3D Extrusion**: Elevate particles by wave height
3. **Interactive Probes**: Click to show time series
4. **Advanced Analytics**: Hotspot detection, energy density
5. **Export to CDN**: Deploy Zarr to CloudFlare R2 / AWS S3

---

## 🎯 Success Criteria

✅ WMS layers removed  
✅ 60 fps animation achieved  
✅ Smooth temporal interpolation  
✅ Cache hit rate > 80%  
✅ Memory usage < 100MB  
✅ Prefetch working (console logs)  
✅ All variables working (wind, waves, currents)

---

**🎉 You now have a world-class ocean visualization platform! 🌊**
