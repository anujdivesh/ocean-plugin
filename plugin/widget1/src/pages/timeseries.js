import React, { useEffect, useState, useRef } from "react";
import Plot from 'react-plotly.js';

const fixedColors = [
  'rgb(255, 99, 132)',   // 0: hs
  'rgb(54, 162, 235)',   // 1: tpeak
  'rgb(255, 206, 86)',   // 2: dirp
  'rgb(75, 192, 192)',
  'rgb(153, 102, 255)',
];

function extractCoverageTimeseries(json, variable) {
  if (
    !json ||
    !json.domain ||
    !json.domain.axes ||
    !json.domain.axes.t ||
    !json.domain.axes.t.values ||
    !json.ranges ||
    !json.ranges[variable] ||
    !json.ranges[variable].values
  )
    return null;
  const times = json.domain.axes.t.values;
  const values = json.ranges[variable].values;
  return { times, values };
}

function Timeseries({ perVariableData }) {
  const [plotData, setPlotData] = useState([]);
  const [error, setError] = useState("");
  const [parentHeight, setParentHeight] = useState(400);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const containerRef = useRef(null);
  const parentHeightRef = useRef(400); // Track current height without causing re-renders

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
    // Use container ref instead of searching DOM
    const updateHeight = () => {
      const el = containerRef.current?.parentElement;
      if (el) {
        const height = el.clientHeight - 36;
        // Only update if height is valid and significantly different
        // Use ref to avoid stale closure and dependency array issues
        if (height > 0 && isFinite(height) && Math.abs(height - parentHeightRef.current) > 5) {
          parentHeightRef.current = height;
          setParentHeight(height);
        }
      }
    };
    
    // Initial measurement
    updateHeight();
    
    let resizeTimeout;
    const el = containerRef.current?.parentElement;
    const observer = el
      ? new ResizeObserver(() => {
          // Debounce resize updates to prevent loop
          clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(updateHeight, 150);
        })
      : null;
    if (observer && el) observer.observe(el);
    return () => {
      clearTimeout(resizeTimeout);
      observer && observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency - only set up once to avoid resize loop

  useEffect(() => {
    let isMounted = true;
    if (!perVariableData) {
      setPlotData([]);
      setError("No timeseries data available.");
      return;
    }

    // Same variables as Widget 5
    const layers = [
      { key: "hs", label: "Significant Wave Height", colorIdx: 0, yaxis: 'y1', type: 'scatter', mode: 'lines+markers' },
      { key: "tpeak", label: "Peak Wave Period", colorIdx: 1, yaxis: 'y2', type: 'scatter', mode: 'lines+markers' },
      { key: "dirp", label: "Mean Wave Direction", colorIdx: 2, yaxis: 'y3', type: 'scatter', mode: 'markers' },
    ];
    const traces = [];
    for (let idx = 0; idx < layers.length; idx++) {
      const { key, label, colorIdx, yaxis, type, mode } = layers[idx];
      const color = fixedColors[colorIdx % fixedColors.length];
      const tsJson = perVariableData[key];
      const ts = extractCoverageTimeseries(tsJson, key);
      if (ts && ts.times && ts.values) {
        // Filter out invalid values (null, undefined, NaN, Infinity)
        const validIndices = ts.values
          .map((v, i) => (v != null && isFinite(v) ? i : -1))
          .filter(i => i !== -1);
        
        if (validIndices.length > 0) {
          const filteredTimes = validIndices.map(i => ts.times[i]);
          const filteredValues = validIndices.map(i => ts.values[i]);
          
          // Format times for this specific trace
          const formattedLabels = filteredTimes.map(v =>
            typeof v === "string" && v.length > 15 ? v.substring(0, 16).replace("T", " ") : v
          );
          
          traces.push({
            x: formattedLabels,
            y: filteredValues,
            name: label,
            type,
            mode,
            marker: { color },
            line: { color },
            yaxis,
          });
        }
      }
    }
    if (!isMounted) return;
    setPlotData(traces);
    if (traces.length === 0) setError("No timeseries data returned.");
    else setError("");
    return () => {
      isMounted = false;
    };
  }, [perVariableData]);

  if (!perVariableData) return <div>No data available.</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;
  if (plotData.length === 0) return <div>No timeseries data.</div>;

  // Ensure valid height to prevent Infinity errors in Plotly
  const validHeight = parentHeight && isFinite(parentHeight) && parentHeight > 0 
    ? parentHeight 
    : 400;

  const layout = {
    autosize: true,
    height: validHeight,
    margin: { t: 40, l: 60, r: 60, b: 60 },
    paper_bgcolor: isDarkMode ? '#2e2f33' : '#ffffff',
    plot_bgcolor: isDarkMode ? '#2e2f33' : '#ffffff',
    font: { color: isDarkMode ? '#f1f5f9' : '#1e293b' },
    legend: { 
      orientation: 'h', 
      y: -0.2,
      font: { color: isDarkMode ? '#f1f5f9' : '#1e293b' },
      bgcolor: isDarkMode ? '#3f4854' : '#ffffff',
      bordercolor: isDarkMode ? '#44454a' : '#e2e8f0'
    },
    xaxis: { 
      title: { text: 'Time', font: { color: isDarkMode ? '#f1f5f9' : '#1e293b' } }, 
      tickangle: -45,
      showgrid: true,
      gridcolor: isDarkMode ? '#44454a' : '#e2e8f0',
      tickfont: { color: isDarkMode ? '#f1f5f9' : '#1e293b' },
      zerolinecolor: isDarkMode ? '#44454a' : '#e2e8f0'
    },
    yaxis: { 
      title: { 
        text: 'Height (m)', 
        font: { color: isDarkMode ? '#f1f5f9' : '#1e293b' },
        standoff: 30
      }, 
      side: 'left',
      showgrid: true,
      gridcolor: isDarkMode ? '#44454a' : '#e2e8f0',
      tickfont: { color: isDarkMode ? '#f1f5f9' : '#1e293b' },
      zerolinecolor: isDarkMode ? '#44454a' : '#e2e8f0'
    },
    yaxis2: {
      title: { 
        text: 'Period (s)', 
        font: { color: isDarkMode ? '#f1f5f9' : '#1e293b' },
        standoff: 15
      },
      overlaying: 'y',
      side: 'right',
      showgrid: false,
      tickfont: { color: isDarkMode ? '#f1f5f9' : '#1e293b' },
      zerolinecolor: isDarkMode ? '#44454a' : '#e2e8f0',
      anchor: 'free',
      position: 0.95
    },
    yaxis3: {
      title: { 
        text: 'Direction (°)', 
        font: { color: isDarkMode ? '#f1f5f9' : '#1e293b' },
        standoff: 15
      },
      overlaying: 'y',
      side: 'right',
      showgrid: false,
      tickfont: { color: isDarkMode ? '#f1f5f9' : '#1e293b' },
      zerolinecolor: isDarkMode ? '#44454a' : '#e2e8f0',
      anchor: 'free',
      position: 1.0
    },
    showlegend: true,
  };

  // Map yaxis for each trace
  plotData.forEach((trace, idx) => {
    if (idx === 0) trace.yaxis = 'y1';
    if (idx === 1) trace.yaxis = 'y2';
    if (idx === 2) trace.yaxis = 'y3';
  });

  return (
    <div 
      ref={containerRef}
      style={{ 
        width: "100%", 
        height: validHeight,
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <Plot
        data={plotData}
        layout={layout}
        useResizeHandler={false}
        style={{ width: '100%', height: '100%' }}
        config={{ responsive: true }}
      />
    </div>
  );
}

export default Timeseries;
