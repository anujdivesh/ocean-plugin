import React, { useEffect, useState } from "react";
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
    !json.ranges
  )
    return null;
  const range = getRangeForVariable(json, variable);
  if (!range || !range.values) return null;
  const times = json.domain.axes.t.values;
  const values = range.values;
  return { times, values };
}

function getRangeForVariable(json, variable) {
  if (!json?.ranges) return null;
  if (json.ranges[variable]) return json.ranges[variable];
  const target = variable.toLowerCase();
  const matchingKey = Object.keys(json.ranges).find(key => {
    const lower = key.toLowerCase();
    if (lower === target) return true;
    const trimmed = key.includes('/') ? key.split('/').pop().toLowerCase() : lower;
    return trimmed === target;
  });
  return matchingKey ? json.ranges[matchingKey] : null;
}

function Timeseries({ perVariableData }) {
  const [plotData, setPlotData] = useState([]);
  const [error, setError] = useState("");
  const [parentHeight, setParentHeight] = useState(undefined);
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

  useEffect(() => {
    const el = document.querySelector('.offcanvas-body');
    if (el) {
      setParentHeight(el.clientHeight - 36);
    }
    const observer = el
      ? new ResizeObserver(() => setParentHeight(el.clientHeight - 36))
      : null;
    if (observer && el) observer.observe(el);
    return () => observer && observer.disconnect();
  }, [perVariableData]);

  useEffect(() => {
    let isMounted = true;
    if (!perVariableData) {
      setPlotData([]);
      setError("No timeseries data available.");
      return;
    }

    // Tuvalu available variables (all 6 variables from THREDDS)
    const layers = [
      { key: "hs", label: "Significant Wave Height (m)", colorIdx: 0, yaxis: 'y1', type: 'scatter', mode: 'lines+markers' },
      { key: "tpeak", label: "Peak Wave Period (s)", colorIdx: 1, yaxis: 'y2', type: 'scatter', mode: 'lines+markers' },
      { key: "tm02", label: "Mean Wave Period (s)", colorIdx: 3, yaxis: 'y2', type: 'scatter', mode: 'lines+markers' },
      { key: "dirm", label: "Wave Direction (°)", colorIdx: 2, yaxis: 'y3', type: 'scatter', mode: 'markers' },
      { key: "wind", label: "Wind Speed (m/s)", colorIdx: 4, yaxis: 'y4', type: 'scatter', mode: 'lines+markers' },
      { key: "dirwind", label: "Wind Direction (°)", colorIdx: 2, yaxis: 'y3', type: 'scatter', mode: 'markers' },
    ];
    let newLabels = [];
    const traces = [];
    for (let idx = 0; idx < layers.length; idx++) {
      const { key, label, colorIdx, yaxis, type, mode } = layers[idx];
      const color = fixedColors[colorIdx % fixedColors.length];
      const tsJson = perVariableData[key];
      const ts = extractCoverageTimeseries(tsJson, key);
      if (ts && ts.times && ts.values) {
        if (newLabels.length === 0) {
          newLabels = ts.times.map(v =>
            typeof v === "string" && v.length > 15 ? v.substring(0, 16).replace("T", " ") : v
          );
        }
        traces.push({
          x: newLabels,
          y: ts.values,
          name: label,
          type,
          mode,
          marker: { color },
          line: { color },
          yaxis,
        });
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

  const layout = {
    autosize: true,
    height: parentHeight || 400,
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
        standoff: 30,
        x: 1.15
      },
      overlaying: 'y',
      side: 'right',
      showgrid: false,
      tickfont: { color: isDarkMode ? '#f1f5f9' : '#1e293b' },
      zerolinecolor: isDarkMode ? '#44454a' : '#e2e8f0'
    },
    yaxis3: {
      title: { 
        text: 'Direction (°)', 
        font: { color: isDarkMode ? '#f1f5f9' : '#1e293b' },
        standoff: 10,
        x: 1.25
      },
      overlaying: 'y',
      side: 'right',
      position: 1,
      showgrid: false,
      tickfont: { color: isDarkMode ? '#f1f5f9' : '#1e293b' },
      zerolinecolor: isDarkMode ? '#44454a' : '#e2e8f0'
    },
    yaxis4: {
      title: { 
        text: 'Wind Speed (m/s)', 
        font: { color: isDarkMode ? '#f1f5f9' : '#1e293b' },
        standoff: 10,
        x: -0.15
      },
      overlaying: 'y',
      side: 'left',
      position: 0,
      showgrid: false,
      tickfont: { color: isDarkMode ? '#f1f5f9' : '#1e293b' },
      zerolinecolor: isDarkMode ? '#44454a' : '#e2e8f0'
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
    <div style={{ width: "100%", height: parentHeight ? `${parentHeight}px` : "100%" }}>
      <Plot
        data={plotData}
        layout={layout}
        useResizeHandler={true}
        style={{ width: '100%', height: '100%' }}
        config={{ responsive: true }}
      />
    </div>
  );
}

export default Timeseries;
