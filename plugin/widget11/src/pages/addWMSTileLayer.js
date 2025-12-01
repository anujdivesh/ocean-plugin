import L from "leaflet";
import logger from "../utils/logger";
import WMSTileLoadingService from '../services/WMSTileLoadingService.js';
import createCORSWMSLayer from '../utils/CORSWMSLayer.js';

/**
    // Handle tuvalu_inundation layer configuration
 *
 * @param {L.Map} map - The Leaflet map instance to which the WMS layer will be added.
 * @param {string} url - The URL of the WMS service.
 * @param {Object} [options] - Optional parameters for the WMS layer.
 * @param {function} handleShow - Callback function to handle the feature info data (canvas update).
 */
const addWMSTileLayer = (map, url, options = {}, handleShow) => {
    // Separate the non-standard 'id' from the WMS options
    const { id, ...wmsOptions } = options;

    // Set default options
    const defaultOptions = {
        layers: '',
        format: 'image/png',
        transparent: true,
        ...wmsOptions.params,
    };

    // WMS 1.3.0 requires lat/lng axis order for EPSG:4326, which Leaflet might not do by default.
    // We explicitly set the CRS on the layer to enforce this.
    if (wmsOptions.version === '1.3.0' && wmsOptions.crs === L.CRS.EPSG4326) {
        wmsOptions.crs = L.CRS.EPSG4326;
    }

    // Merge defaults with provided options so we can safely override styles
    const finalOptions = {
        ...defaultOptions,
        ...wmsOptions,
        layers: wmsOptions.layers || defaultOptions.layers,
        format: wmsOptions.format || defaultOptions.format,
        transparent: wmsOptions.transparent !== undefined ? wmsOptions.transparent : defaultOptions.transparent,
    };

    // Ensure peak period layer always uses the server-compatible magma palette and proper range
    const targetLayerName = finalOptions.layers || '';
    if (targetLayerName.includes('tpeak')) {
        const currentStyle = finalOptions.styles || '';
        if (!currentStyle) {
            finalOptions.styles = 'default-scalar/psu-magma';
        } else if (currentStyle.includes('psu-plasma') || currentStyle.includes('seq-')) {
            finalOptions.styles = 'default-scalar/psu-magma';
        }
        
        // Ensure proper color scale range for Tuvalu tpeak data (full range from 0)
        if (!finalOptions.colorscalerange) {
            finalOptions.colorscalerange = '0,13.68';
            console.log('🌊 Setting Tuvalu tpeak color scale range: 0-13.68s');
        }
    }

    // Handle tuvalu_inundation layer configuration
    if (targetLayerName.includes('tuvalu_inun')) {
        // Ensure proper color scale range for inundation data
        if (!finalOptions.colorscalerange) {
            finalOptions.colorscalerange = '-0.05,1.63';
            console.log('Setting Tuvalu inundation color scale range: -0.05-1.63m');
        }
        // Use x-Sst (jet) color palette for inundation visualization, similar to CK model
        if (!finalOptions.styles) {
            finalOptions.styles = 'default-scalar/x-Sst';
        }
    }    // Clean up undefined values to prevent them from appearing in WMS requests
    Object.keys(finalOptions).forEach(key => {
        if (finalOptions[key] === undefined) {
            delete finalOptions[key];
        }
    });

    // For ncWMS servers, we need to create a custom WMS layer that handles the coordinate transformation
    let wmsLayer;
    
    // Use CORS-enabled layer for THREDDS servers (direct access)
    if (url.includes('thredds')) {
      // THREDDS server requires CORS handling
      wmsLayer = createCORSWMSLayer(url, finalOptions);
    } else {
      // Standard WMS layer for ncWMS servers
      wmsLayer = L.tileLayer.wms(url, finalOptions);
    }
    
    // Add the layer to the map
    wmsLayer.addTo(map);

    // Initialize layer in the enhanced tile loading service
    const layerId = `${targetLayerName}_${Date.now()}`;
    WMSTileLoadingService.initializeLayer(layerId, targetLayerName, getLayerType(targetLayerName));

    // Enhanced error handling using service
    const handleTileError = (e) => {
        WMSTileLoadingService.handleTileError(layerId, e.tile, e);
    };
    
    // Helper function to determine layer type
    function getLayerType(layerName) {
        // tpeak is a full forecast layer with continuous data coverage
        if (layerName.includes('raro_inun')) return 'static';
        return 'forecast'; // All forecast layers including tpeak should be treated as 'forecast'
    }

    // Enhanced error handling is now managed by WMSTileLoadingService

    wmsLayer.on('tileerror', handleTileError);
    
    // Add success handler to reset error tracking
    wmsLayer.on('tileload', () => {
        WMSTileLoadingService.resetErrorTracking(layerId);
    });

    // Store the getFeatureInfo function on the layer for external use (returns Promise)
    wmsLayer.getFeatureInfo = function(latlng, requestOptions = {}) {
        return getFeatureInfo(latlng, url, wmsLayer, map, options, handleShow, requestOptions);
    };

    // Function to retrieve GetFeatureInfo from WMS (returns Promise)
    const getFeatureInfo = (latlng, url, wmsLayer, map, options, handleShow, requestOptions = {}) => {
        return new Promise((resolve, reject) => {
            const point = map.latLngToContainerPoint(latlng, map.getZoom());
            const size = map.getSize();
            
            // Check if this is an ncWMS layer (EPSG:4326) or regular WMS (EPSG:3857)
            const isNcWMS = url.includes('ncWMS') || url.includes('ncwms');
            const targetCRS = 'EPSG:4326'; // Set to always use 4326.
            
            let bbox;
            if (isNcWMS) {
                // For EPSG:4326, use lat/lng bounds directly with proper axis order for WMS 1.3.0
                const bounds = map.getBounds();
                const version = wmsLayer.options.version || '1.3.0';
                if (version === '1.3.0') {
                    // WMS 1.3.0 with EPSG:4326 expects lat,lon,lat,lon order
                    bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;
                } else {
                    // WMS 1.1.1 expects lon,lat,lon,lat order
                    bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
                }
            } else {
                // For EPSG:3857, use the standard bbox
                bbox = map.getBounds().toBBoxString();
            }

            // Only include parameters valid for GetFeatureInfo (exclude style-specific params)
            const params = {
                request: 'GetFeatureInfo',
                service: 'WMS',
                crs: targetCRS,
                styles: wmsLayer.options.styles,
                transparent: wmsLayer.options.transparent,
                version: wmsLayer.options.version || '1.3.0',
                format: wmsLayer.options.format,
                bbox: bbox,
                height: Math.round(size.y),
                width: Math.round(size.x),
                layers: wmsLayer.options.layers,
                query_layers: wmsLayer.options.layers,
                info_format: 'text/html', // Request HTML format
            };

            // Add time parameter if present (valid for both GetMap and GetFeatureInfo)
            if (wmsLayer.options.time) {
                params.time = wmsLayer.options.time;
            }

            // For WMS 1.3.0, use i/j instead of x/y
            const xParam = params.version === '1.3.0' ? 'i' : 'x';
            const yParam = params.version === '1.3.0' ? 'j' : 'y';
            params[xParam] = Math.round(point.x);
            params[yParam] = Math.round(point.y);

            const featureInfoUrl = url + L.Util.getParamString(params, url, true);
          
          // Proxy the GetFeatureInfo request
           // const proxyUrl = `/wms-proxy?url=${encodeURIComponent(featureInfoUrl)}`;
          
          
          
          
          
          
          
          
          
          
          
          
            // Gather extra info to send to handleShow
            const featureInfoBase = {
                id: id, // Use the separated id here
                latlng,
                layerName: wmsLayer.options.layers,
                bbox,
                [xParam]: params[xParam],
                [yParam]: params[yParam],
                height: params.height,
                width: params.width,
                style: wmsLayer.options.styles || "",
                timeDimension: wmsLayer.options.time || options.time || "",
                featureInfo: "Loading..."
            };

            // Immediately update the canvas with the basic info and "Loading..."
            const shouldAutoShow = requestOptions.autoShow !== false;

            if (shouldAutoShow && typeof handleShow === "function") {
                handleShow(featureInfoBase);
            }

          // Use fetch instead of jQuery for GetFeatureInfo request
          fetch(featureInfoUrl)
            .then(response => response.text())
            .then(data => {
                    let featureInfo = "No Data";
                    
                   //  Try parsing as HTML table
                    const doc = (new DOMParser()).parseFromString(data, "text/html");
                    if (doc.body.innerHTML.trim().length > 0) {
                        // Try parsing as HTML table
                        const p = doc.getElementsByTagName('td');
                        if (p.length > 5) {
                            featureInfo = p[5] ? p[5].textContent.trim() : "No Data";
                            const num = Number(featureInfo);
                            if (!isNaN(num)) {
                                featureInfo = num.toFixed(2);
                            }
                        }
                    }

                    // // First try to parse as JSON (CoverageJSON format)
                    // try {
                    //     if (typeof data === 'string' && data.trim().startsWith('{')) {
                    //         const jsonData = JSON.parse(data);
                            
                    //         // Handle CoverageJSON format
                    //         if (jsonData.type === "Coverage" && jsonData.ranges) {
                    //             const parameters = Object.keys(jsonData.ranges);
                    //             if (parameters.length > 0) {
                    //                 const paramName = parameters[0];
                    //                 const values = jsonData.ranges[paramName].values;
                                    
                    //                 // Find the first non-null value or current time index
                    //                 let value = null;
                    //                 if (Array.isArray(values)) {
                    //                     // Try to find value at current time or first non-null
                    //                     value = values.find(v => v !== null) || null;
                    //                 }
                                    
                    //                 if (value !== null && !isNaN(value)) {
                    //                     featureInfo = Number(value).toFixed(2);
                    //                 } else {
                    //                     featureInfo = "No Data Available";
                    //                 }
                    //             }
                    //         }
                    //     }
                    // } catch (jsonError) {
                    //     // If JSON parsing fails, fall back to "No Data"
                    //     featureInfo = "No Data";
                    //     console.log("JSON parse error, falling back to No Data");
                    //     console.error(jsonError);
                    // }

                    const result = {
                        ...featureInfoBase,
                        featureInfo
                    };

                    // Update canvas with all info including parsed value
                    if (shouldAutoShow && typeof handleShow === "function") {
                        handleShow(result);
                    }

                    // Resolve the Promise with the result
                    resolve(result);
            })
            .catch(error => {
                    const errorResult = {
                        ...featureInfoBase,
                        featureInfo: "Error fetching data"
                    };

                    // Show error in canvas
                    if (shouldAutoShow && typeof handleShow === "function") {
                        handleShow(errorResult);
                    }
                    
                    // Reject the Promise with error info
                    logger.error('FEATURE_INFO', 'GetFeatureInfo failed', error);
                    reject(new Error(`GetFeatureInfo failed: ${error.message}`));
            });
        });
    };

    return wmsLayer; // Return the layer instance
};

export default addWMSTileLayer;
