import React, { useRef, useState, useEffect, useCallback } from "react";
import Offcanvas from "react-bootstrap/Offcanvas";
import "./BottomOffCanvas.css";
import Tabular from "./tabular.js";
import Timeseries from "./timeseries.js";
import RiskDetailsPanel from "../components/risk/RiskDetailsPanel";
import InundationTimeseries from "./InundationTimeseries";


// ---- Variables & config for Cook Islands (adapted from Widget 1) ----
const variableDefs = [
  { key: "hs", label: "Wave{0-5/Bu/1}" },
  { key: "tm02", label: "Mean Period{0-20/Rd/0}" },
  { key: "tpeak", label: "Wave Period{0-20/Rd/0}" },
  { key: "dirm", label: "Mean Wave Dir{0/dir}" },
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

// ---- Centralized fetching helpers (Cook Islands) ----
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
  // Normalize bbox axis order (expects lon,lat when SRS=CRS:84)
  const bbox = normalizeBboxToLonLat(data.bbox);

  const baseUrl = "https://gemthreddshpc.spc.int/thredds/wms/POP/model/country/spc/forecast/hourly/COK/SWAN_UGRID.nc";
  const url =
    baseUrl +
    `?REQUEST=GetTimeseries` +
    `&LAYERS=${layer}` +
    `&QUERY_LAYERS=${layer}` +
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
    `&INFO_FORMAT=text/json`;

  // Add timeout to prevent app hanging when THREDDS is down
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) {
      console.warn("GetTimeseries failed", { layer: layer, status: response.status, url });
      return null;
    }
    const json = await response.json();
    if (!json || !json.ranges || !json.domain) {
      console.warn("GetTimeseries returned empty payload", { layer: layer, url });
    }
    return json;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.warn(`GetTimeseries request timed out for layer: ${layer} (THREDDS server may be down)`);
    } else {
      console.warn(`GetTimeseries error for layer ${layer}:`, error.message);
    }
    return null;
  }
}

const DEFAULT_MIN_HEIGHT = 100;
const DEFAULT_MAX_HEIGHT = 800;

const tabLabels = [
  { key: "tabular", label: "Tabular" },
  { key: "timeseries", label: "Timeseries" }
];

// Shared loading spinner used across all panel modes
function PanelSpinner({ isDarkMode, message }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "3rem 2rem", gap: 12,
      color: isDarkMode ? "#475569" : "#94a3b8",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        border: `3px solid ${isDarkMode ? "#334155" : "#e2e8f0"}`,
        borderTopColor: isDarkMode ? "#60a5fa" : "#3b82f6",
        animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ fontSize: 13 }}>{message || "Loading…"}</span>
    </div>
  );
}

function BottomOffCanvas({ show, onHide, data, currentSliderDate, onTimeSelect }) {
  const offcanvasRef = useRef(null);
  const isRiskMode = data?.mode === "risk";
  const isInundationMode = data?.mode === "inundation";
  const [height, setHeight] = useState(() => {
    if (typeof window === "undefined") return 500;
    const viewportMax = Math.max(DEFAULT_MIN_HEIGHT, window.innerHeight - 120);
    const defaultHeight = isRiskMode ? 620 : 500;
    return Math.min(defaultHeight, viewportMax);
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
  const [isDragging, setIsDragging] = useState(false);
  const minHeight = DEFAULT_MIN_HEIGHT;

  // Track previous show value so height only resets on open, not on mode change
  const wasShowingRef = useRef(false);

  const handleClose = useCallback((event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    offcanvasRef.current?.classList?.remove("offcanvas-toggling");
    offcanvasRef.current?.classList?.remove("show");
    onHide?.();
  }, [onHide]);

  // Check for dark mode
  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.body.classList.contains('dark-mode');
      setIsDarkMode(isDark);
    };

    checkTheme();

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

  // Only reset to the preferred default when the panel first opens — not when
  // the user clicks a different map point while it is already visible.
  useEffect(() => {
    const justOpened = show && !wasShowingRef.current;
    wasShowingRef.current = show;
    if (!justOpened) return;
    const preferredHeight = isRiskMode ? 620 : 500;
    setHeight((h) => Math.min(Math.max(preferredHeight, h), maxHeight));
  }, [show, isRiskMode, maxHeight]);

  useEffect(() => {
    if (!show) return undefined;
    offcanvasRef.current?.classList?.remove("offcanvas-toggling");
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        handleClose(event);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose, show]);

  // Drag handle logic
  const dragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(height);

  const onMouseDown = (e) => {
    e.preventDefault();
    dragging.current = true;
    startY.current = e.clientY;
    startHeight.current = height;
    setIsDragging(true);
    document.body.style.cursor = "ns-resize";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };
  const onMouseMove = (e) => {
    if (!dragging.current) return;
    let newHeight = startHeight.current - (e.clientY - startY.current);
    newHeight = Math.min(Math.max(newHeight, minHeight), maxHeight);
    setHeight(newHeight);
  };
  const onMouseUp = () => {
    dragging.current = false;
    setIsDragging(false);
    document.body.style.cursor = "";
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };

  // Centralized network fetching
  useEffect(() => {
    let isMounted = true;
    if (isRiskMode || isInundationMode) {
      setPerVariableData({});
      setFetchError("");
      setLoading(false);
      return () => { isMounted = false; };
    }
    if (!data || !data.bbox || (data.x === undefined && data.i === undefined) || (data.y === undefined && data.j === undefined)) {
      setPerVariableData({});
      setFetchError("No data available");
      setLoading(false);
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
  }, [data, isRiskMode, isInundationMode]);

  return (
    <Offcanvas
      ref={offcanvasRef}
      show={show}
      onHide={onHide}
      placement="bottom"
      className="bottom-offcanvas"
      transition={false}
      style={{
        height,
        maxHeight,
        "--bs-offcanvas-height": `${Math.round(height)}px`,
        zIndex: 15000,
        background: isDarkMode ? "rgba(63, 72, 84, 0.98)" : "rgba(255,255,255,0.98)",
        color: isDarkMode ? "#f1f5f9" : "#1e293b",
        overflow: "hidden",
        // Disable animation while dragging so the panel tracks the cursor instantly
        transition: isDragging ? "none" : "height 0.18s ease-out",
        borderTop: `1px solid ${isDarkMode ? "#44454a" : "#e2e8f0"}`,
      }}
      backdrop={false}
      scroll={true}
    >
      {/* Drag Handle */}
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize panel — drag or use Up/Down arrow keys"
        tabIndex={0}
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
          outline: "none",
        }}
        onMouseDown={onMouseDown}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 50 : 20;
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setHeight((h) => Math.min(h + step, maxHeight));
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setHeight((h) => Math.max(h - step, minHeight));
          }
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          if (!e.touches || !e.touches.length) return;
          dragging.current = true;
          startY.current = e.touches[0].clientY;
          startHeight.current = height;
          setIsDragging(true);
          document.body.style.cursor = "ns-resize";
          const onTouchMove = (ev) => {
            ev.preventDefault();
            if (!dragging.current || !ev.touches || !ev.touches.length) return;
            let newHeight = startHeight.current - (ev.touches[0].clientY - startY.current);
            newHeight = Math.min(Math.max(newHeight, minHeight), maxHeight);
            setHeight(newHeight);
          };
          const onTouchEnd = () => {
            dragging.current = false;
            setIsDragging(false);
            document.body.style.cursor = "";
            document.removeEventListener("touchmove", onTouchMove);
            document.removeEventListener("touchend", onTouchEnd);
          };
          document.addEventListener("touchmove", onTouchMove, { passive: false });
          document.addEventListener("touchend", onTouchEnd);
        }}
        title="Drag to resize"
      >
        <div
          style={{
            width: 80,
            height: 4,
            background: isDarkMode ? "#a1a1aa" : "#aaa",
            borderRadius: 2,
            margin: "4px auto",
          }}
        />
      </div>

      {/* Header */}
      <div
        className="bottom-offcanvas__header"
        style={{ borderBottom: `1px solid ${isDarkMode ? "#44454a" : "#eee"}` }}
      >
        <div style={{ display: "flex", flex: 1, alignItems: "center", paddingTop: 10, minWidth: 0 }}>
          {isRiskMode ? (
            <div style={{
              padding: "8px 20px",
              fontWeight: "bold",
              color: isDarkMode ? "#60a5fa" : "#007bff",
              fontSize: 16
            }}>
              Coastal Risk
            </div>
          ) : isInundationMode ? (
            <div style={{
              padding: "6px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 0,
              flex: 1,
            }}>
              <span style={{
                fontWeight: 700,
                color: isDarkMode ? "#f1f5f9" : "#0f172a",
                fontSize: 15,
                letterSpacing: "-0.01em",
              }}>
                Point Inundation Forecast
              </span>
              {data?.lat != null && (
                <span style={{
                  fontSize: 11,
                  color: isDarkMode ? "#cbd5e1" : "#475569",
                  fontFamily: "ui-monospace, monospace",
                  background: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                  borderRadius: 5,
                  padding: "2px 7px",
                  whiteSpace: "nowrap",
                }}>
                  {data.lat.toFixed(5)}, {data.lng.toFixed(5)}
                </span>
              )}
              <span style={{
                marginLeft: "auto",
                fontSize: 10,
                color: isDarkMode ? "#64748b" : "#94a3b8",
                fontFamily: "ui-monospace, monospace",
                whiteSpace: "nowrap",
              }}>
                Source: SFINCS zarr
              </span>
            </div>
          ) : (
            <div role="tablist" aria-label="View mode" style={{ display: "flex" }}>
              {tabLabels.map(tab => (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  aria-controls={`tab-panel-${tab.key}`}
                  id={`tab-btn-${tab.key}`}
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
                  tabIndex={activeTab === tab.key ? 0 : -1}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          data-bs-dismiss="offcanvas"
          onClick={handleClose}
          onClickCapture={handleClose}
          onMouseDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
          type="button"
          aria-label="Close"
          className="bottom-offcanvas__close"
          style={{
            color: isDarkMode ? "#f1f5f9" : "#1e293b",
          }}
        >
          ×
        </button>
      </div>

      <Offcanvas.Body
        className={isInundationMode ? "bottom-offcanvas__body bottom-offcanvas__body--inundation" : "bottom-offcanvas__body"}
        role={(!isRiskMode && !isInundationMode) ? "tabpanel" : undefined}
        id={(!isRiskMode && !isInundationMode) ? `tab-panel-${activeTab}` : undefined}
        aria-labelledby={(!isRiskMode && !isInundationMode) ? `tab-btn-${activeTab}` : undefined}
      >
        {isRiskMode ? (
          <RiskDetailsPanel data={data} isDarkMode={isDarkMode} currentSliderDate={currentSliderDate} onTimeSelect={onTimeSelect} />
        ) : isInundationMode ? (
          data?.loading
            ? <PanelSpinner isDarkMode={isDarkMode} message="Loading depth timeseries…" />
            : data?.error
              ? (
                <div style={{
                  textAlign: "center", padding: "2rem",
                  color: isDarkMode ? "#f87171" : "#dc2626", fontSize: 13,
                }}>
                  Failed to load timeseries: {data.error}
                </div>
              )
              : <InundationTimeseries
                  timeseries={data?.timeseries}
                  categories={data?.categories}
                  isDarkMode={isDarkMode}
                  currentSliderDate={currentSliderDate}
                  onTimeSelect={onTimeSelect}
                />
        ) : loading
          ? <PanelSpinner isDarkMode={isDarkMode} message="Loading wave data…" />
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
