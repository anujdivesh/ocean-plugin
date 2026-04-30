/**
 * Example: Integrating xpublish with your React application
 * 
 * This shows how to configure ZarrLoader to work with either:
 * 1. xpublish server (development)
 * 2. Static Zarr files (production)
 */

// ============================================
// Option 1: Environment-based configuration
// ============================================

// In your .env.development
// REACT_APP_ZARR_SOURCE=xpublish
// REACT_APP_XPUBLISH_URL=http://localhost:9000/datasets/ocean/zarr

// In your .env.production
// REACT_APP_ZARR_SOURCE=static
// REACT_APP_ZARR_URL=https://cdn.your-domain.com/ocean/zarr

// src/config/dataConfig.js
export const getZarrConfig = () => {
  const source = process.env.REACT_APP_ZARR_SOURCE || 'static';
  
  if (source === 'xpublish') {
    return {
      type: 'xpublish',
      baseUrl: process.env.REACT_APP_XPUBLISH_URL || 'http://localhost:9000/datasets/ocean/zarr',
      updateInterval: 5000,  // Poll for updates every 5s
      cacheBust: true,       // Add timestamp to requests
    };
  }
  
  return {
    type: 'static',
    baseUrl: process.env.REACT_APP_ZARR_URL || '/data/ocean/test.zarr',
    updateInterval: 60000,   // Check less frequently
    cacheBust: false,
  };
};


// ============================================
// Option 2: Update ZarrLoader.js
// ============================================

// src/services/ZarrLoader.js
import { getZarrConfig } from '../config/dataConfig';

export class ZarrLoader {
  constructor(config = {}) {
    const defaultConfig = getZarrConfig();
    this.config = { ...defaultConfig, ...config };
    this.zarrUrl = this.config.baseUrl;
    
    console.log(`🌊 ZarrLoader initialized:`, {
      type: this.config.type,
      url: this.zarrUrl,
    });
  }

  async loadMetadata() {
    const metadataUrl = `${this.zarrUrl}/.zmetadata`;
    
    // Add cache busting for xpublish (dynamic data)
    const url = this.config.cacheBust 
      ? `${metadataUrl}?t=${Date.now()}`
      : metadataUrl;
    
    console.log(`📡 Fetching metadata from: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load metadata: ${response.statusText}`);
    }
    
    return response.json();
  }

  async loadChunk(variable, chunkId) {
    const chunkUrl = `${this.zarrUrl}/${variable}/${chunkId}`;
    
    // Add cache busting for xpublish
    const url = this.config.cacheBust
      ? `${chunkUrl}?t=${Date.now()}`
      : chunkUrl;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load chunk: ${response.statusText}`);
    }
    
    return response.arrayBuffer();
  }
}


// ============================================
// Option 3: Proxy Configuration (Alternative)
// ============================================

// src/setupProxy.js
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Only proxy in development when using xpublish
  if (process.env.REACT_APP_ZARR_SOURCE === 'xpublish') {
    console.log('🔀 Proxying Zarr requests to xpublish server');
    
    app.use('/api/zarr', createProxyMiddleware({
      target: 'http://localhost:9000',
      pathRewrite: {
        '^/api/zarr': '/datasets/ocean/zarr'
      },
      changeOrigin: true,
      onProxyReq: (proxyReq, req, res) => {
        console.log(`📡 Proxying: ${req.method} ${req.path}`);
      },
      onError: (err, req, res) => {
        console.error('❌ Proxy error:', err.message);
        res.status(500).send('xpublish server unavailable');
      }
    }));
  }
};

// Then use relative URL in your app:
// const zarrUrl = '/api/zarr';


// ============================================
// Option 4: Component Usage Example
// ============================================

// src/components/FlowVisualization.jsx
import React, { useEffect, useState } from 'react';
import { ZarrLoader } from '../services/ZarrLoader';

export const FlowVisualization = () => {
  const [loader, setLoader] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initLoader = async () => {
      try {
        const zarrLoader = new ZarrLoader();
        const meta = await zarrLoader.loadMetadata();
        
        setLoader(zarrLoader);
        setMetadata(meta);
        
        console.log('✅ Zarr data loaded:', {
          variables: Object.keys(meta.metadata || {}),
          source: zarrLoader.config.type,
        });
      } catch (err) {
        console.error('❌ Failed to load Zarr data:', err);
        setError(err.message);
      }
    };

    initLoader();
  }, []);

  if (error) {
    return (
      <div className="error">
        <h3>Failed to load ocean data</h3>
        <p>{error}</p>
        <p>
          {process.env.REACT_APP_ZARR_SOURCE === 'xpublish' ? (
            <>Make sure xpublish server is running: <code>python server.py --file ocean.nc</code></>
          ) : (
            <>Make sure Zarr files are available at: {process.env.REACT_APP_ZARR_URL}</>
          )}
        </p>
      </div>
    );
  }

  if (!metadata) {
    return <div>Loading ocean data...</div>;
  }

  return (
    <div className="flow-visualization">
      <div className="data-source-indicator">
        📡 Data source: {loader.config.type === 'xpublish' ? 'xpublish (live)' : 'Static Zarr'}
      </div>
      {/* Your visualization components */}
    </div>
  );
};


// ============================================
// Option 5: Testing Both Sources
// ============================================

// test-data-sources.js
const testDataSource = async (config) => {
  const loader = new ZarrLoader(config);
  
  console.log(`\n🧪 Testing ${config.type} source...`);
  console.log(`   URL: ${config.baseUrl}`);
  
  try {
    const start = performance.now();
    const metadata = await loader.loadMetadata();
    const metaTime = performance.now() - start;
    
    console.log(`   ✅ Metadata loaded (${metaTime.toFixed(0)}ms)`);
    console.log(`   Variables: ${Object.keys(metadata.metadata || {}).length}`);
    
    // Test chunk loading
    const chunkStart = performance.now();
    await loader.loadChunk('u', '0.0.0');
    const chunkTime = performance.now() - chunkStart;
    
    console.log(`   ✅ Chunk loaded (${chunkTime.toFixed(0)}ms)`);
    
    return { success: true, metaTime, chunkTime };
  } catch (err) {
    console.error(`   ❌ Failed: ${err.message}`);
    return { success: false, error: err.message };
  }
};

// Test both sources
(async () => {
  const xpublishResult = await testDataSource({
    type: 'xpublish',
    baseUrl: 'http://localhost:9000/datasets/ocean/zarr',
  });
  
  const staticResult = await testDataSource({
    type: 'static',
    baseUrl: '/data/ocean/test.zarr',
  });
  
  console.log('\n📊 Performance Comparison:');
  console.table({
    'xpublish': xpublishResult,
    'static': staticResult,
  });
})();
