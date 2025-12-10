import L from 'leaflet';
import $ from 'jquery';

/**
 * Adds a WMS tile layer to a Leaflet map.
 *
 * @param {L.Map} map - The Leaflet map instance to which the WMS layer will be added.
 * @param {string} url - The URL of the WMS service.
 * @param {Object} [options] - Optional parameters for the WMS layer.
 * @param {function} handleShow - Callback function to handle the feature info data (canvas update).
 */
const addWMSTileLayer = (map, url, options = {}, handleShow) => {
    // Set default WMS params
    const defaultOptions = {
        layers: '',
        format: 'image/png',
        transparent: true,
        ...options.params,
    };

    // Performance-focused defaults to avoid single-tile fetches and smooth panning/zooming
    const performanceTuning = {
        // Larger tiles mean fewer requests (helps slow WMS backends)
        tileSize: 512,
        // Keep previously rendered tiles around the viewport to prevent empty flashes
        keepBuffer: 4,
        // Allow the browser to pipeline multiple tile requests instead of one-by-one
        crossOrigin: true,
        // Keep loading tiles while panning but throttle refresh slightly
        updateWhenIdle: false,
        updateInterval: 120,
        // Reuse tiles between updates/zooms for smoother transitions
        reuseTiles: true,
        unloadInvisibleTiles: false,
    };

    // Create the WMS tile layer
    const wmsLayer = L.tileLayer.wms(url, {
        ...performanceTuning,
        layers: defaultOptions.layers,
        format: defaultOptions.format,
        transparent: defaultOptions.transparent,
        ...options,
    });

    // Add the layer to the map
    wmsLayer.addTo(map);

    // Reload broken tiles
    const RETRY_LIMIT = 3;
    const RETRY_DELAY = 3000;

    const handleTileError = (event) => {
        const tile = event.tile;
        checkUrlExists(tile.src)
            .then(exists => {
                if (exists) {
                    retryTile(tile, tile.src, 1);
                }
            })
            .catch(err => {
                console.error('Error checking tile URL:', err);
            });
    };

    const checkUrlExists = (url) => {
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open('HEAD', url, true);
            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    resolve(xhr.status >= 200 && xhr.status < 300);
                }
            };
            xhr.send();
        });
    };

    const retryTile = (tile, src, attempt) => {
        if (attempt <= RETRY_LIMIT) {
            setTimeout(() => {
                tile.src = '';
                tile.src = src;
                retryTile(tile, src, attempt + 1);
            }, RETRY_DELAY);
        }
    };

    wmsLayer.on('tileerror', handleTileError);

    // Store the getFeatureInfo function on the layer for external use
    wmsLayer.getFeatureInfo = function(latlng) {
        getFeatureInfo(latlng, url, wmsLayer, map, options, handleShow);
    };

    // Function to retrieve GetFeatureInfo from WMS
    const getFeatureInfo = (latlng, url, wmsLayer, map, options, handleShow) => {
        const point = map.latLngToContainerPoint(latlng, map.getZoom());
        const size = map.getSize();
        const bbox = map.getBounds().toBBoxString();

        const params = {
            request: 'GetFeatureInfo',
            service: 'WMS',
            srs: 'EPSG:4326',
            styles: wmsLayer.options.styles,
            transparent: wmsLayer.options.transparent,
            version: wmsLayer.options.version || '1.1.1',
            format: wmsLayer.options.format,
            bbox: bbox,
            height: Math.round(size.y),
            width: Math.round(size.x),
            layers: wmsLayer.options.layers,
            query_layers: wmsLayer.options.layers,
            info_format: 'text/html',
        };

        // For WMS 1.3.0, use i/j instead of x/y
        const xParam = params.version === '1.3.0' ? 'i' : 'x';
        const yParam = params.version === '1.3.0' ? 'j' : 'y';
        params[xParam] = Math.round(point.x);
        params[yParam] = Math.round(point.y);

        var featureInfoUrl = url + L.Util.getParamString(params, url, true);
        featureInfoUrl = featureInfoUrl.replace(/wms\?.*?REQUEST=[^&]*?&.*?REQUEST=[^&]*?&/, '');
        featureInfoUrl = featureInfoUrl.replace(/VERSION=1\.3\.0&/g, '');
        featureInfoUrl = featureInfoUrl.replace(/\/ncWMS\/?(?!wms\?)/i, '/ncWMS/wms?REQUEST=GetFeatureInfo&');

        // Gather extra info to send to handleShow
        const featureInfoBase = {
            id: options.id,
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
        if (typeof handleShow === "function") {
            handleShow(featureInfoBase);
        }

        $.ajax({
            url: featureInfoUrl,
            success: function (data) {
                const doc = (new DOMParser()).parseFromString(data, "text/html");
                let featureInfo = "No Data";
                if (doc.body.innerHTML.trim().length > 0) {
                    // Try parsing as before
                    const p = doc.getElementsByTagName('td');
                    if (p.length > 5) {
                        featureInfo = p[5] ? p[5].textContent.trim() : "No Data";
                        const num = Number(featureInfo);
                        if (!isNaN(num)) {
                            featureInfo = num.toFixed(2);
                        }
                    }
                }

                // Update canvas with all info including parsed value
                if (typeof handleShow === "function") {
                    handleShow({
                        ...featureInfoBase,
                        featureInfo
                    });
                }

                // Optionally show popup with "more..." link
                showFeatureInfoPopup(featureInfo, latlng, map, featureInfoBase, handleShow);
            },
            error: function () {
                // Show error in canvas
                if (typeof handleShow === "function") {
                    handleShow({
                        ...featureInfoBase,
                        featureInfo: "Error fetching data"
                    });
                }
            }
        });
    };

    // Function to show the feature info in a popup
    const showFeatureInfoPopup = (featureInfo, latlng, map, featureInfoBase, handleShow) => {
        // Create popup content with the "more..." link
        const popupContent = document.createElement('div');
        popupContent.innerHTML = `
            <p>Value: ${featureInfo}</p>
            <a href="#" class="open-timeseries-link" style="display: block;">&nbsp;more...</a>
        `;

        // eslint-disable-next-line no-unused-vars
        const popup = L.popup({ maxWidth: 800 }) // TODO: Use this or remove
            .setLatLng(latlng)
            .setContent(popupContent)
            .openOn(map);

        // "more..." link event
        const link = popupContent.querySelector('.open-timeseries-link');
        if (link) {
            link.addEventListener('click', (ev) => {
                ev.preventDefault();
                if (typeof handleShow === "function") {
                    handleShow({
                        ...featureInfoBase,
                        featureInfo
                    });
                }
                map.closePopup();
            });
        }
    };

    return wmsLayer; // Return the layer instance
};

export default addWMSTileLayer;