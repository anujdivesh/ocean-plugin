/**
 * Forecast Data Analyzer - Analyzes WMS GetFeatureInfo responses to optimize color ranges
 */

export class ForecastDataAnalyzer {
  constructor() {
    this.sampledData = new Map(); // Store sampled data by layer
    this.colorManager = null; // Will be injected
  }

  /**
   * Sample forecast data from multiple points across the domain
   * @param {Object} map - Leaflet map instance
   * @param {Object} wmsLayer - WMS layer to sample
   * @param {string} layerVariable - Variable name (hs, tm02, etc.)
   */
  async sampleForecastData(map, wmsLayer, layerVariable) {
    const bounds = map.getBounds();
    const samplePoints = this.generateSampleGrid(bounds, 5, 5); // 5x5 grid
    const values = [];

    console.log(`🔬 Sampling ${layerVariable} data from ${samplePoints.length} points...`);

    for (const point of samplePoints) {
      try {
        const value = await this.getPointValue(map, wmsLayer, point);
        if (value !== null && !isNaN(value)) {
          values.push(value);
        }
      } catch (error) {
        console.warn(`Failed to sample at ${point.lat}, ${point.lng}:`, error);
      }
    }

    // Store the sampled data
    this.sampledData.set(layerVariable, {
      values,
      timestamp: new Date(),
      bounds: bounds.toBBoxString(),
      sampleCount: values.length
    });

    console.log(`📊 Sampled ${values.length} values for ${layerVariable}:`, {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length
    });

    return values;
  }

  /**
   * Generate a grid of sample points within bounds
   */
  generateSampleGrid(bounds, rows, cols) {
    const points = [];
    const latStep = (bounds.getNorth() - bounds.getSouth()) / (rows - 1);
    const lngStep = (bounds.getEast() - bounds.getWest()) / (cols - 1);

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const lat = bounds.getSouth() + i * latStep;
        const lng = bounds.getWest() + j * lngStep;
        points.push({ lat, lng });
      }
    }

    return points;
  }

  /**
   * Get value at a specific point using GetFeatureInfo
   */
  async getPointValue(map, wmsLayer, point) {
    return new Promise((resolve) => {
      // Simulate clicking the map at the point to trigger GetFeatureInfo
      const containerPoint = map.latLngToContainerPoint(point);
      const size = map.getSize();
      const bounds = map.getBounds();

      const params = {
        request: 'GetFeatureInfo',
        service: 'WMS',
        crs: 'EPSG:4326',
        styles: wmsLayer.options.styles,
        transparent: wmsLayer.options.transparent,
        version: wmsLayer.options.version || '1.3.0',
        format: wmsLayer.options.format,
        bbox: bounds.toBBoxString(),
        height: Math.round(size.y),
        width: Math.round(size.x),
        layers: wmsLayer.options.layers,
        query_layers: wmsLayer.options.layers,
        info_format: 'text/html',
        i: Math.round(containerPoint.x),
        j: Math.round(containerPoint.y)
      };

      const url = wmsLayer._url + L.Util.getParamString(params, wmsLayer._url, true);

      fetch(url)
        .then(response => response.text())
        .then(data => {
          const value = this.parseFeatureInfoValue(data);
          resolve(value);
        })
        .catch(() => resolve(null));
    });
  }

  /**
   * Parse numerical value from GetFeatureInfo HTML response
   */
  parseFeatureInfoValue(htmlResponse) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlResponse, 'text/html');
      const tables = doc.getElementsByTagName('table');
      
      if (tables.length > 0) {
        const cells = tables[0].getElementsByTagName('td');
        for (let cell of cells) {
          const text = cell.textContent.trim();
          const num = parseFloat(text);
          if (!isNaN(num) && num > 0) {
            return num;
          }
        }
      }
      
      // Fallback: look for any number in the response
      const matches = htmlResponse.match(/[\d.]+/g);
      if (matches) {
        for (let match of matches) {
          const num = parseFloat(match);
          if (!isNaN(num) && num > 0 && num < 1000) { // Reasonable range
            return num;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.warn('Error parsing FeatureInfo:', error);
      return null;
    }
  }

  /**
   * Get adaptive color configuration based on sampled data
   */
  getAdaptiveColorConfig(layerVariable) {
    const data = this.sampledData.get(layerVariable);
    
    if (!data || !data.values || data.values.length === 0) {
      console.log(`⚠️ No sampled data for ${layerVariable}, using defaults`);
      return this.getDefaultColorConfig(layerVariable);
    }

    if (!this.colorManager) {
      console.warn('ColorManager not initialized');
      return this.getDefaultColorConfig(layerVariable);
    }

    const analysis = this.colorManager.analyzeForecastRange(data.values);
    const styleConfig = this.colorManager.getWaveHeightStyle(analysis.range, analysis.adaptiveStyle);
    
    console.log(`🎨 Adaptive styling for ${layerVariable}:`, {
      range: analysis.range,
      style: analysis.adaptiveStyle,
      seaState: analysis.dataStats?.seaState?.state
    });

    return {
      ...styleConfig,
      legendUrl: this.colorManager.getDynamicLegendUrl(
        layerVariable,
        analysis.range,
        this.getUnitForVariable(layerVariable),
        analysis.adaptiveStyle
      ),
      adaptiveMetadata: analysis
    };
  }

  /**
   * Get default color configuration if no data is available
   */
  getDefaultColorConfig(layerVariable) {
    const defaults = {
      'hs': {
        style: "default-scalar/x-Occam",
        colorscalerange: "0,4",
        numcolorbands: 300,
        belowmincolor: "transparent",
        abovemaxcolor: "extend"
      },
      'tm02': {
        style: "default-scalar/x-Rainbow", 
        colorscalerange: "0,20",
        numcolorbands: 250,
        belowmincolor: "transparent",
        abovemaxcolor: "extend"
      },
      'tpeak': {
        style: "default-scalar/x-Rainbow",
        colorscalerange: "0,20", 
        numcolorbands: 250,
        belowmincolor: "transparent",
        abovemaxcolor: "extend"
      }
    };

    return defaults[layerVariable] || defaults['hs'];
  }

  /**
   * Get unit for variable
   */
  getUnitForVariable(variable) {
    const units = {
      'hs': 'm',
      'tm02': 's',
      'tpeak': 's',
      'dirm': '°'
    };
    return units[variable] || 'm';
  }

  /**
   * Initialize with color manager
   */
  setColorManager(colorManager) {
    this.colorManager = colorManager;
  }

  /**
   * Clear sampled data (useful when forecast updates)
   */
  clearSampledData() {
    this.sampledData.clear();
    console.log('🧹 Cleared sampled forecast data');
  }

  /**
   * Get summary of all sampled data
   */
  getSampledDataSummary() {
    const summary = {};
    for (const [variable, data] of this.sampledData.entries()) {
      if (data.values && data.values.length > 0) {
        summary[variable] = {
          count: data.values.length,
          min: Math.min(...data.values),
          max: Math.max(...data.values),
          avg: data.values.reduce((a, b) => a + b, 0) / data.values.length,
          timestamp: data.timestamp
        };
      }
    }
    return summary;
  }
}

export default ForecastDataAnalyzer;