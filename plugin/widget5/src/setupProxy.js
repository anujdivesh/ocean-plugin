const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
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