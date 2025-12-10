const CompressionWebpackPlugin = require('compression-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  webpack: {
    plugins: {
      add: [
        // Gzip compression for production builds
        new CompressionWebpackPlugin({
          filename: '[path][base].gz',
          algorithm: 'gzip',
          test: /\.(js|css|html|svg)$/,
          threshold: 10240, // Only compress files larger than 10KB
          minRatio: 0.8,
        }),
        // Brotli compression (better than gzip, supported by modern browsers)
        new CompressionWebpackPlugin({
          filename: '[path][base].br',
          algorithm: 'brotliCompress',
          test: /\.(js|css|html|svg)$/,
          threshold: 10240,
          minRatio: 0.8,
        }),
        // Bundle analyzer (only in analyze mode)
        ...(process.env.ANALYZE ? [new BundleAnalyzerPlugin()] : []),
      ],
    },
    configure: (webpackConfig, { env, paths }) => {
      // Production optimizations
      if (env === 'production') {
        // Enhanced minification
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          minimize: true,
          minimizer: [
            new TerserPlugin({
              terserOptions: {
                parse: {
                  ecma: 8,
                },
                compress: {
                  ecma: 5,
                  warnings: false,
                  comparisons: false,
                  inline: 2,
                  drop_console: true, // Remove console.logs in production
                  drop_debugger: true,
                  pure_funcs: ['console.log', 'console.info', 'console.debug'], // Remove specific console methods
                },
                mangle: {
                  safari10: true,
                },
                output: {
                  ecma: 5,
                  comments: false,
                  ascii_only: true,
                },
              },
            }),
          ],
          // Split chunks to enable better caching
          splitChunks: {
            chunks: 'all',
            cacheGroups: {
              // Separate vendor bundle for better caching
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendors',
                priority: 10,
                reuseExistingChunk: true,
              },
              // Separate leaflet (large library)
              leaflet: {
                test: /[\\/]node_modules[\\/](leaflet|react-leaflet)[\\/]/,
                name: 'leaflet',
                priority: 20,
                reuseExistingChunk: true,
              },
              // Separate chart libraries
              charts: {
                test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2|plotly\.js|react-plotly\.js)[\\/]/,
                name: 'charts',
                priority: 20,
                reuseExistingChunk: true,
              },
              // Common code shared between chunks
              common: {
                minChunks: 2,
                priority: 5,
                reuseExistingChunk: true,
                enforce: true,
              },
            },
          },
        };

        // Increase performance budget warnings
        webpackConfig.performance = {
          ...webpackConfig.performance,
          maxEntrypointSize: 512000, // 500KB
          maxAssetSize: 512000,
          hints: 'warning',
        };
      }

      return webpackConfig;
    },
  },
  // Development server optimizations
  devServer: {
    compress: true, // Enable gzip compression in dev server
    hot: true,
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
    },
  },
};
