const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api/sfincs',
    createProxyMiddleware({
      target: process.env.REACT_APP_SFINCS_PROXY_TARGET || 'https://ocean-zarr.spc.int',
      changeOrigin: true,
      timeout: 30000,
      proxyTimeout: 30000,
      onError: (err, req, res) => {
        console.error('🚨 SFINCS Proxy Error:', err.message);
        res.status(500).send('SFINCS proxy error: ' + err.message);
      },
      onProxyReq: (proxyReq, req) => {
        console.log('🌊 Proxying SFINCS raster request:', req.url);
      }
    })
  );

  // Proxy for Zarr data (handles /SWAN_UGRID.zarr/*)
  app.use(
    '/SWAN_UGRID.zarr',
    createProxyMiddleware({
      target: 'http://localhost:8080',
      changeOrigin: true,
      timeout: 30000,
      proxyTimeout: 30000,
      logLevel: 'debug',
      onError: (err, req, res) => {
        console.error('🚨 Zarr Proxy Error:', err.message);
        res.status(500).send('Zarr proxy error: ' + err.message);
      },
      onProxyReq: (proxyReq, req) => {
        console.log('🌊 Proxying Zarr request:', req.url);
      }
    })
  );

  // Legacy proxy path for Zarr
  app.use(
    '/api/zarr',
    createProxyMiddleware({
      target: process.env.REACT_APP_ZARR_PROXY_TARGET || 'http://localhost:8080',
      changeOrigin: true,
      pathRewrite: {
        '^/api/zarr': '/SWAN_UGRID.zarr',
      },
      timeout: 30000,
      proxyTimeout: 30000,
      onError: (err, req, res) => {
        console.error('🚨 Zarr Proxy Error:', err.message);
        res.status(500).send('Zarr proxy error: ' + err.message);
      },
      onProxyReq: (proxyReq, req) => {
        console.log('🌊 Proxying Zarr request:', req.url);
      }
    })
  );

  // Proxy for THREDDS server to resolve CORS issues
  app.use(
    '/api/thredds',
    createProxyMiddleware({
      target: 'https://gemthreddshpc.spc.int',
      changeOrigin: true,
      secure: true,
      pathRewrite: {
        '^/api/thredds': '/thredds',
      },
      timeout: 30000,
      proxyTimeout: 30000,
      headers: {
        'Accept': 'image/png,image/*,*/*',
        'User-Agent': 'Marine-Forecast-Widget/1.0'
      },
      onError: (err, req, res) => {
        console.error('🚨 THREDDS Proxy Error:', err.message);
        res.status(500).send('Proxy Error: ' + err.message);
      },
      onProxyReq: (proxyReq, req) => {
        console.log('🌐 Proxying THREDDS request:', req.url);
      }
    })
  );
};
