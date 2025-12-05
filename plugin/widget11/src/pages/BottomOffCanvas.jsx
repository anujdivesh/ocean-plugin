import React, { useRef, useState, useEffect } from "react";
import Offcanvas from "react-bootstrap/Offcanvas";
import "./BottomOffCanvas.css";
import Tabular from "./tabular.js";
import Timeseries from "./timeseries.js";


// ---- Variables & config for Tuvalu (all available variables) ----
const variableDefs = [
  { key: "hs", label: "Wave Height{0-5/Bu/1}" },
  { key: "tpeak", label: "Peak Period{0-20/Rd/0}" },
  { key: "tm02", label: "Mean Period{0-20/YlGnBu/0}" },
  { key: "dirm", label: "Wave Direction{0/dir}" },
  { key: "wind", label: "Wind Speed{0-25/jet/1}" },
  { key: "dirwind", label: "Wind Direction{0/dir}" }
];

const SERVER_LAYER_MAP = {
  hs: "Hs",
  tm02: "Tm",
  tpeak: "Tp",
  dirm: "Dir",
  wind: "Wind",
  dirwind: "DirWind"
};

// ---- Centralized fetching helpers (Tuvalu) ----
// Ensure BBOX is in lon,lat,lon,lat order for THREDDS (CRS:84)
function normalizeBboxToLonLat(bboxStr) {
  try {
    if (!bboxStr || typeof bboxStr !== 'string') return bboxStr;
    const parts = bboxStr.split(',').map(Number);
    if (parts.length !== 4 || parts.some(n => Number.isNaN(n))) return bboxStr;
    const [a, b, c, d] = parts;
    // Heuristic: if first is latitude (<=90 in magnitude) and second looks like longitude (>90 in magnitude for our AOI), then it's lat,lon order
    const looksLatLon = Math.abs(a) <= 90 && Math.abs(b) > 90;
    if (looksLatLon) {
      // Convert from latmin, lonmin, latmax, lonmax -> lonmin, latmin, lonmax, latmax
      const reordered = [b, a, d, c];
      return reordered.join(',');
    }
    // Otherwise assume it's already lon,lat
    return bboxStr;
  } catch {
    return bboxStr;
  }
}

function normalizeCoverageResponse(json, clientKey, serverKey) {
  if (!json || !json.ranges || !clientKey) return json;
  if (json.ranges[clientKey]) return json;
  const targetKey = (serverKey || clientKey).toLowerCase();
  const matchingKey = Object.keys(json.ranges).find(rangeKey => {
    const lower = rangeKey.toLowerCase();
    if (lower === targetKey) return true;
    const trimmed = rangeKey.includes('/') ? rangeKey.split('/').pop().toLowerCase() : lower;
    return trimmed === targetKey;
  });
  if (matchingKey) {
    json.ranges[clientKey] = json.ranges[matchingKey];
  }
  return json;
}

async function fetchLayerTimeseries(layer, data, serverLayerOverride, wmsUrl) {
  if (!data || !data.bbox || (data.x === undefined && data.i === undefined) || (data.y === undefined && data.j === undefined)) return null;
  
  // Strip dataset prefix if present (e.g., "tuvalu_forecast/hs" -> "hs")
  // THREDDS server doesn't use dataset prefixes in GetTimeseries requests
  const serverLayer = serverLayerOverride || SERVER_LAYER_MAP[layer] || layer;
  const targetLayer = typeof serverLayer === 'string' ? serverLayer : String(serverLayer || layer);
  const cleanLayer = targetLayer.includes('/') ? targetLayer.split('/').pop() : targetLayer;
  
  let timeParam = "";
  if (data.timeDimension) {
    if (data.timeDimension.includes("/")) {
      timeParam = data.timeDimension;
    } else {
      try {
        const start = new Date(data.timeDimension);
        const end = new Date(start);
        end.setDate(start.getDate() + 7);
        timeParam = `${start.toISOString()}/${end.toISOString()}`;
      } catch {
        timeParam = data.timeDimension;
      }
    }
  }
  const x = data.x !== undefined ? data.x : data.i;
  const y = data.y !== undefined ? data.y : data.j;
  // Normalize bbox axis order for THREDDS (expects lon,lat when SRS=CRS:84)
  const bbox = normalizeBboxToLonLat(data.bbox);
  
  // Use provided wmsUrl if available, otherwise fallback to national-scale Tuvalu.nc
  // This ensures timeseries data matches the currently displayed island or national view
  const baseUrl = wmsUrl || "https://gemthreddshpc.spc.int/thredds/wms/POP/model/country/spc/forecast/hourly/TUV/Tuvalu.nc";
  
  const url =
    baseUrl +
    `?REQUEST=GetTimeseries` +
    `&LAYERS=${cleanLayer}` +
    `&QUERY_LAYERS=${cleanLayer}` +
    `&BBOX=${encodeURIComponent(bbox)}` +
    `&SRS=CRS:84` +
    `&FEATURE_COUNT=5` +
    `&HEIGHT=${data.height}` +
    `&WIDTH=${data.width}` +
    `&X=${x}` +
    `&Y=${y}` +
    `&STYLES=default/default` +
    `&VERSION=1.1.1` +
    (timeParam ? `&TIME=${encodeURIComponent(timeParam)}` : "") +
    `&INFO_FORMAT=text/json`;  // THREDDS requires text/json, not application/json
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn("GetTimeseries failed", { layer: cleanLayer, status: response.status, url });
      return null;
    }
    const json = await response.json();
    normalizeCoverageResponse(json, layer, cleanLayer);
    if (!json || !json.ranges || !json.domain) {
      console.warn("GetTimeseries returned empty payload", { layer: cleanLayer, url });
    }
    return json;
  } catch {
    return null;
  }
}

const DEFAULT_MIN_HEIGHT = 100;
const DEFAULT_MAX_HEIGHT = 800;

const tabLabels = [
  { key: "tabular", label: "Tabular" },
  { key: "timeseries", label: "Timeseries" }
];

function BottomOffCanvas({ show, onHide, data, wmsUrl }) {
  const [height, setHeight] = useState(() => {
    if (typeof window === "undefined") return 500;
    const viewportMax = Math.max(DEFAULT_MIN_HEIGHT, window.innerHeight - 120);
    return Math.min(500, viewportMax);
  });
  const [maxHeight, setMaxHeight] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_MAX_HEIGHT;
    return Math.max(DEFAULT_MIN_HEIGHT, window.innerHeight - 120);
  });
  const [activeTab, setActiveTab] = useState("tabular");
  const [perVariableData, setPerVariableData] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const minHeight = DEFAULT_MIN_HEIGHT;

  // Check for dark mode
  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.body.classList.contains('dark-mode');
      setIsDarkMode(isDark);
    };
    
    checkTheme();
    
    // Listen for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const computeMax = () => {
      if (typeof window === "undefined") return DEFAULT_MAX_HEIGHT;
      return Math.max(minHeight, window.innerHeight - 120);
    };
    const handleResize = () => setMaxHeight(computeMax());
    setMaxHeight(computeMax());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [minHeight]);

  useEffect(() => {
    if (height > maxHeight) {
      setHeight(maxHeight);
    } else if (height < minHeight) {
      setHeight(minHeight);
    }
  }, [height, maxHeight, minHeight]);

  // Drag handle logic
  const dragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(height);
  const onMouseDown = (e) => {
    e.preventDefault();
    dragging.current = true;
    startY.current = e.clientY;
    startHeight.current = height;
    document.body.style.cursor = "ns-resize";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };
  const onMouseMove = (e) => {
    if (!dragging.current) return;
    let newHeight = startHeight.current - (e.clientY - startY.current);
    newHeight = Math.min(Math.max(newHeight, minHeight), maxHeight);
    console.log(`[BottomCanvas] MouseMove: startHeight=${startHeight.current}, clientY=${e.clientY}, startY=${startY.current}, newHeight=${newHeight}, minHeight=${minHeight}, maxHeight=${maxHeight}`);
    setHeight(newHeight);
    console.log(`[BottomCanvas] height: ${Math.round(newHeight)}px`);
  };
  const onMouseUp = () => {
    dragging.current = false;
    document.body.style.cursor = "";
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    console.log(`[BottomCanvas] resize end height: ${Math.round(height)}px`);
  };

  // Centralized network fetching
  useEffect(() => {
    let isMounted = true;
    if (!data || !data.bbox || (data.x === undefined && data.i === undefined) || (data.y === undefined && data.j === undefined)) {
      setPerVariableData({});
      setFetchError("No data available");
      return;
    }
    setLoading(true);
    setFetchError("");
    (async () => {
      const out = {};
      for (let i = 0; i < variableDefs.length; i++) {
        const { key } = variableDefs[i];
        const serverLayer = SERVER_LAYER_MAP[key] || key;
        out[key] = await fetchLayerTimeseries(key, data, serverLayer, wmsUrl);
      }
      if (!isMounted) return;
      setPerVariableData(out);
      setLoading(false);
      if (Object.values(out).every(x => !x)) setFetchError("No data returned from server.");
    })();
    return () => { isMounted = false; };
  }, [data, wmsUrl]);

  return (
    <Offcanvas
      show={show}
      onHide={onHide}
      placement="bottom"
      className="bottom-offcanvas"
      style={{
        // Ensure Bootstrap offcanvas-bottom respects dynamic height
        height,
        maxHeight,
        "--bs-offcanvas-height": `${Math.round(height)}px`,
        zIndex: 15000,
        background: isDarkMode ? "rgba(63, 72, 84, 0.98)" : "rgba(255,255,255,0.98)",
        color: isDarkMode ? "#f1f5f9" : "#1e293b",
        overflow: "visible",
        transition: "height 0.1s",
        borderTop: `1px solid ${isDarkMode ? "#44454a" : "#e2e8f0"}`,
      }}
      backdrop={false}
      scroll={true}
    >
      {/* Drag Handle */}
      <div
        style={{
          height: 16,
          cursor: "ns-resize",
          background: isDarkMode ? "#44454a" : "#e0e0e0",
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          textAlign: "center",
          userSelect: "none",
          margin: "-8px 0 0 0",
          position: "relative",
          zIndex: 15002,
        }}
        onMouseDown={onMouseDown}
        onTouchStart={(e) => {
          e.preventDefault();
          if (!e.touches || !e.touches.length) return;
          dragging.current = true;
          startY.current = e.touches[0].clientY;
          startHeight.current = height;
          document.body.style.cursor = "ns-resize";
          const onTouchMove = (ev) => {
            ev.preventDefault();
            if (!dragging.current || !ev.touches || !ev.touches.length) return;
            let newHeight = startHeight.current - (ev.touches[0].clientY - startY.current);
            newHeight = Math.min(Math.max(newHeight, minHeight), maxHeight);
            console.log(`[BottomCanvas] TouchMove: startHeight=${startHeight.current}, clientY=${ev.touches[0].clientY}, startY=${startY.current}, newHeight=${newHeight}, minHeight=${minHeight}, maxHeight=${maxHeight}`);
            setHeight(newHeight);
            console.log(`[BottomCanvas] height: ${Math.round(newHeight)}px`);
          };
          const onTouchEnd = () => {
            dragging.current = false;
            document.body.style.cursor = "";
            document.removeEventListener("touchmove", onTouchMove);
            document.removeEventListener("touchend", onTouchEnd);
            console.log(`[BottomCanvas] resize end height: ${Math.round(height)}px`);
          };
          document.addEventListener("touchmove", onTouchMove, { passive: false });
          document.addEventListener("touchend", onTouchEnd);
        }}
        title="Drag to resize"
      >
        <div
          style={{
            width: 40,
            height: 4,
            background: isDarkMode ? "#a1a1aa" : "#aaa",
            borderRadius: 2,
            margin: "4px auto",
          }}
        />
      </div>
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        borderBottom: `1px solid ${isDarkMode ? "#44454a" : "#eee"}`, 
        padding: "0 1rem 0 0.5rem" 
      }}>
        {/* Custom CSS Tabs */}
        <div style={{ display: "flex", flex: 1, paddingTop: 10 }}>
          {tabLabels.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                border: "none",
                borderBottom: activeTab === tab.key ? `2px solid ${isDarkMode ? "#60a5fa" : "#007bff"}` : "2px solid transparent",
                background: "none",
                padding: "8px 20px",
                marginRight: 8,
                fontWeight: activeTab === tab.key ? "bold" : "normal",
                color: activeTab === tab.key ? (isDarkMode ? "#60a5fa" : "#007bff") : (isDarkMode ? "#a1a1aa" : "#555"),
                cursor: "pointer",
                fontSize: 16,
                transition: "border-bottom 0.1s"
              }}

              aria-controls={`tab-panel-${tab.key}`}
              tabIndex={activeTab === tab.key ? 0 : -1}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={onHide}
          type="button"
          aria-label="Close"
          style={{
            border: "none",
            background: "none",
            fontSize: 26,
            marginLeft: 8,
            color: isDarkMode ? "#a1a1aa" : "#666",
            cursor: "pointer",
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
      <Offcanvas.Body style={{ paddingTop: 16 }}>
        {loading
          ? <div style={{ textAlign: "center", padding: "2rem" }}>Loading data...</div>
          : fetchError
              ? <div style={{ color: "red", textAlign: "center" }}>{fetchError}</div>
              : <>
                  {activeTab === "tabular" && <Tabular perVariableData={perVariableData} />}
                  {activeTab === "timeseries" && <Timeseries perVariableData={perVariableData} />}
                  
                </>
        }
      </Offcanvas.Body>
    </Offcanvas>
  );
}

export default BottomOffCanvas;
