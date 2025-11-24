import React, { useRef, useState, useEffect } from "react";
import Offcanvas from "react-bootstrap/Offcanvas";
import "./BottomOffCanvas.css";
import Tabular from "./tabular.js";
import Timeseries from "./timeseries.js";

// ---- Variables & config shared between modules ----
const variableDefs = [
  { key: "hs", label: "Wave{0-5/Bu/1}" },
  { key: "tpeak", label: "Wave Period{0-20/Rd/0}" },
  { key: "dirp", label: "Wave direction{0/dir}" },
  { key: "transp_x", label: "Wave Energy{calc/0-100/jet/0}" },
  { key: "hs_p2", label: "Swell(m){0-5/Bu/1}" },
  { key: "tp_p2", label: "Swell Period{0-25/Rd/0}" },
  { key: "dirp_p2", label: "Swell Dir{0/dir}" },
  { key: "hs_p3", label: "2.Swell (m) {0-5/Bu/1}" },
  { key: "tp_p3", label: "2.Swell Period{0-25/Rd/0}" },
  { key: "dirp_p3", label: "2. Swell Dir{0-5/dir}" },
  { key: "hs_p1", label: "Wind wave(m){0-5/Bu/1}" },
  { key: "tp_p1", label: "Wind wave period{0-25/Rd/0}" },
  { key: "dirp_p1", label: "Wind wave dir{0-4/dir}" }
];

// ---- Centralized fetching helpers ----
async function fetchLayerTimeseries(layer, data) {
  if (!data || !data.bbox || (data.x === undefined && data.i === undefined) || (data.y === undefined && data.j === undefined)) return null;
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
  const url =
    "https://gemthreddshpc.spc.int/thredds/wms/POP/model/country/spc/forecast/hourly/NIU/ForecastNiue_latest.nc" +
    `?REQUEST=GetTimeseries` +
    `&LAYERS=${layer}` +
    `&QUERY_LAYERS=${layer}` +
    `&BBOX=${encodeURIComponent(data.bbox)}` +
    `&SRS=CRS:84` +
    `&FEATURE_COUNT=5` +
    `&HEIGHT=${data.height}` +
    `&WIDTH=${data.width}` +
    `&X=${x}` +
    `&Y=${y}` +
    `&STYLES=default/default` +
    `&VERSION=1.1.1` +
    (timeParam ? `&TIME=${encodeURIComponent(timeParam)}` : "") +
    `&INFO_FORMAT=text/json`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

const MIN_HEIGHT = 100;
const MAX_HEIGHT = 800;

const tabLabels = [
  { key: "tabular", label: "Tabular" },
  { key: "timeseries", label: "Timeseries" }
];

function BottomOffCanvas({ show, onHide, data }) {
  const [height, setHeight] = useState(500);
  const [activeTab, setActiveTab] = useState("tabular");
  const [perVariableData, setPerVariableData] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  // Drag handle logic
  const dragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(500);
  const onMouseDown = (e) => {
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
    newHeight = Math.min(Math.max(newHeight, MIN_HEIGHT), MAX_HEIGHT);
    setHeight(newHeight);
  };
  const onMouseUp = () => {
    dragging.current = false;
    document.body.style.cursor = "";
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
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
      let transpX, transpY;
      for (let i = 0; i < variableDefs.length; i++) {
        const { key } = variableDefs[i];
        if (key === "transp_x") {
          // Only fetch both transp_x and transp_y ONCE
          transpX = await fetchLayerTimeseries("transp_x", data);
          transpY = await fetchLayerTimeseries("transp_y", data);
          out["transp_x"] = transpX;
          out["transp_y"] = transpY;
        } else if (key === "transp_y") {
          continue;
        } else {
          out[key] = await fetchLayerTimeseries(key, data);
        }
      }
      if (!isMounted) return;
      setPerVariableData(out);
      setLoading(false);
      if (Object.values(out).every(x => !x)) setFetchError("No data returned from server.");
    })();
    return () => { isMounted = false; };
  }, [data]);

  return (
    <Offcanvas
      show={show}
      onHide={onHide}
      placement="bottom"
      className="bottom-offcanvas"
      style={{
        height: height,
        minHeight: height,
        maxHeight: height,
        zIndex: 15000,
        background: isDarkMode ? "rgba(63, 72, 84, 0.98)" : "rgba(255,255,255,0.98)",
        color: isDarkMode ? "#f1f5f9" : "#1e293b",
        overflow: "visible",
        transition: "height 0.1s",
        borderTop: `1px solid ${isDarkMode ? "#44454a" : "#e2e8f0"}`,
        // Override Bootstrap Offcanvas flex behavior
        display: "block",
        flex: "none",
        flexGrow: 0,
        flexShrink: 0,
        flexBasis: "auto",
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
      }}
      backdrop={false}
      scroll={true}
    >
      {/* Drag Handle */}
      <div
        className="drag-handle"
        style={{
          height: 12,
          cursor: "ns-resize",
          background: isDarkMode ? "#44454a" : "#e0e0e0",
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          textAlign: "center",
          userSelect: "none",
          margin: "-8px 0 0 0",
          position: "relative",
          zIndex: 1000,
        }}
        onMouseDown={onMouseDown}
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
        <div style={{ display: "flex", flex: 1, paddingTop: 10 }} role="tablist">
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
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls={`tab-panel-${tab.key}`}
              tabIndex={activeTab === tab.key ? 0 : -1}
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
      <Offcanvas.Body style={{ 
        paddingTop: 16,
        height: `${height - 60}px`,
        maxHeight: `${height - 60}px`,
        overflow: 'auto',
        position: 'relative'
      }}>
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