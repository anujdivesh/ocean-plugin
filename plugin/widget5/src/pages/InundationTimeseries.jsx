import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import Plot from 'react-plotly.js';
import Plotly from 'plotly.js/dist/plotly';
import { classifyDepth } from '../config/inundationThresholds';

function getSeverityStyle(index, total) {
  if (index === 0) return { color: '#94a3b4', bg: 'rgba(148,163,180,0.08)' };
  if (total <= 2)  return { color: '#ef4444', bg: 'rgba(239,68,68,0.16)' };
  const t = (index - 1) / (total - 2);
  if (t <= 0.15) return { color: '#38bdf8', bg: 'rgba(56,189,248,0.10)' };    // minor
  if (t <= 0.40) return { color: '#facc15', bg: 'rgba(250,204,21,0.12)' };    // moderate
  if (t <= 0.70) return { color: '#fb923c', bg: 'rgba(251,146,60,0.14)' };    // severe
  return           { color: '#ef4444', bg: 'rgba(239,68,68,0.16)' };           // extreme
}

// ── helpers ─────────────────────────────────────────────────────────────────

function hexToRgba(hex, alpha) {
  const h = (hex || '#888888').replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function closestEntry(timeseries, targetDate) {
  if (!targetDate || !timeseries?.length) return null;
  const target = new Date(targetDate).getTime();
  return timeseries.reduce((best, d) => {
    const diff = Math.abs(new Date(d.time).getTime() - target);
    return diff < Math.abs(new Date(best.time).getTime() - target) ? d : best;
  });
}

function displayCategoryDescription(description) {
  const text = String(description || '').trim();
  const replacements = {
    'Catastrophic inundation; immediate evacuation required': 'Highest modelled depth category; verify against local guidance',
    'Widespread destructive inundation with urgent evacuation concern.': 'Highest modelled depth category for exposed areas.',
    'Life-threatening depth; vehicles and ground-floor structures inundated': 'Very high modelled inundation depth; major disruption is possible',
  };
  return replacements[text] || text;
}

function buildAdvisory(maxDepth, maxCat, floodedHours, severityT) {
  if (!maxCat || maxDepth <= 0) return null;
  const d = `${maxDepth.toFixed(2)} m`;
  const dur = floodedHours < 1
    ? `${Math.round(floodedHours * 60)} min`
    : `${Math.round(floodedHours)} h`;
  if (severityT >= 0.70) {
    return `${maxCat.label} model category for ${dur} at this location. Peak modelled depth is ${d}; review alongside official warnings and local exposure.`;
  }
  if (severityT >= 0.40) {
    return `${maxCat.label} model category for ${dur}. Peak modelled depth reaches ${d} at this location.`;
  }
  if (severityT >= 0.15) {
    return `${maxCat.label} model category. Peak modelled depth is ${d} over a ${dur} window.`;
  }
  return `Modelled inundation is low. Peak depth: ${d}.`;
}

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, subtext, color, isDarkMode, live }) {
  const hex = (color || '#888888').replace('#', '');
  const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);

  return (
    <div style={{
      flex: '1 1 220px',
      minWidth: 0,
      background: isDarkMode ? `rgba(${r},${g},${b},0.12)` : `rgba(${r},${g},${b},0.08)`,
      borderRadius: 10,
      padding: '10px 13px',
      borderLeft: `3px solid ${color}`,
      boxShadow: isDarkMode
        ? `0 0 0 1px rgba(${r},${g},${b},0.2), inset 0 0 28px rgba(${r},${g},${b},0.07)`
        : `0 1px 4px rgba(${r},${g},${b},0.15)`,
      position: 'relative',
      overflow: 'hidden',
      overflowWrap: 'anywhere',
    }}>
      <div style={{
        position: 'absolute', top: -20, right: -10,
        width: 60, height: 60, borderRadius: '50%',
        background: `radial-gradient(circle, rgba(${r},${g},${b},0.18) 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      <div style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.09em',
        textTransform: 'uppercase',
        color: isDarkMode ? `rgba(${r},${g},${b},0.85)` : `rgba(${r},${g},${b},0.75)`,
        marginBottom: 4,
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        {live && (
          <span style={{
            display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
            background: color, boxShadow: `0 0 5px ${color}`,
          }} />
        )}
        {label}
      </div>
      <div style={{
        fontSize: 20, fontWeight: 800,
        color: isDarkMode ? '#f1f5f9' : '#0f172a',
        lineHeight: 1.1, letterSpacing: '-0.02em',
      }}>
        {value}
      </div>
      {subtext && (
        <div style={{ fontSize: 10, color: isDarkMode ? '#64748b' : '#94a3b8', marginTop: 2 }}>
          {subtext}
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

function InundationTimeseries({ timeseries, categories, isDarkMode, currentSliderDate, onTimeSelect }) {
  const [plotHeight, setPlotHeight] = useState(220);
  const [showThresholdLabels, setShowThresholdLabels] = useState(false);
  const chartRef = useRef(null);

  // Stable ref so the plotly_click handler always reads the latest onTimeSelect
  // without needing to be re-attached after every layout update.
  const onTimeSelectRef = useRef(onTimeSelect);
  onTimeSelectRef.current = onTimeSelect;
  const plotlyDivRef = useRef(null);
  const plotlyClickHandlerRef = useRef(null);

  const handlePlotInitialized = useCallback((figure, graphDiv) => {
    if (plotlyDivRef.current && plotlyClickHandlerRef.current) {
      plotlyDivRef.current.removeListener('plotly_click', plotlyClickHandlerRef.current);
    }
    plotlyDivRef.current = graphDiv;
    const handler = (data) => {
      const x = data.points?.[0]?.x;
      if (!x || !onTimeSelectRef.current) return;
      onTimeSelectRef.current(new Date(x));
    };
    plotlyClickHandlerRef.current = handler;
    graphDiv.on('plotly_click', handler);
  }, []);

  const handleExportPNG = useCallback(() => {
    if (!plotlyDivRef.current) return;
    Plotly.downloadImage(plotlyDivRef.current, {
      format: 'png',
      width: 1200,
      height: 500,
      scale: 2,
      filename: 'inundation-forecast',
    });
  }, []);

  const handleExportPDF = useCallback(() => {
    if (!plotlyDivRef.current) return;
    Plotly.toImage(plotlyDivRef.current, { format: 'svg', width: 1200, height: 500 }).then((svgDataUrl) => {
      const win = window.open('', '_blank', 'width=960,height=720');
      if (!win) return;
      const statsHtml = stats
        ? `<p style="margin:4px 0;font-size:13px;color:#334155">
            Peak depth: <strong>${stats.maxDepth.toFixed(2)} m</strong>
            &nbsp;·&nbsp; Category: <strong>${stats.maxCat?.label ?? 'N/A'}</strong>
            &nbsp;·&nbsp; Flood duration: <strong>${stats.floodedHours < 1
              ? `${Math.round(stats.floodedHours * 60)} min`
              : `${Math.round(stats.floodedHours)} h`}</strong>
           </p>`
        : '';
      win.document.write(`<!DOCTYPE html><html><head>
        <title>Point Inundation Forecast</title>
        <style>
          body { margin: 20px; font-family: Inter, system-ui, sans-serif; color: #0f172a; }
          h2 { margin: 0 0 4px; font-size: 16px; }
          img { max-width: 100%; margin-top: 12px; display: block; }
          .footer { margin-top: 12px; font-size: 11px; color: #94a3b8; }
          @media print { body { margin: 0; } }
        </style>
      </head><body>
        <h2>Point Inundation Forecast</h2>
        ${statsHtml}
        <img src="${svgDataUrl}" alt="Inundation timeseries chart" />
        <div class="footer">Generated ${new Date().toLocaleString('en-NZ', { timeZone: 'UTC' })} UTC &nbsp;·&nbsp; Source: SFINCS zarr</div>
        <script>window.onload = function() { window.print(); };<\/script>
      </body></html>`);
      win.document.close();
    });
  }, [stats]);

  useEffect(() => {
    const el = chartRef.current;
    const compute = () => el ? Math.max(180, el.clientHeight) : 220;
    setPlotHeight(compute());
    if (!el) return;
    const obs = new ResizeObserver(() => setPlotHeight(compute()));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Trim to the operational range: dry → cok-maximum (inclusive).
  // Discards any API-injected test/extra categories beyond the max boundary
  // so that getSeverityStyle positional mapping is never diluted by them.
  const realCategories = useMemo(() => {
    if (!Array.isArray(categories)) return [];
    const maxIdx = categories.findIndex(c => c.id === 'cok-maximum');
    return maxIdx >= 0 ? categories.slice(0, maxIdx + 1) : categories;
  }, [categories]);

  // Flood duration uses the first non-zero threshold (operationally meaningful)
  const floodThresholdM = useMemo(() => {
    const firstWet = realCategories.find(c => Number(c.thresholdM) > 0);
    return Number(firstWet?.thresholdM) || 0.05;
  }, [realCategories]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!Array.isArray(timeseries) || !timeseries.length) return null;
    const depths = timeseries.map(d => d.depth_m ?? 0);
    const maxDepth = Math.max(...depths);
    const total = realCategories.length;
    const maxCat = total ? classifyDepth(realCategories, maxDepth) : null;
    const maxCatIdx = maxCat ? realCategories.indexOf(maxCat) : 0;
    const maxCatStyle = getSeverityStyle(maxCatIdx, total);
    const severityT = maxCatIdx > 0 && total > 2
      ? (maxCatIdx - 1) / (total - 2)
      : 0;

    let floodedHours = 0;
    if (timeseries.length > 1) {
      const dtH = (new Date(timeseries[1].time) - new Date(timeseries[0].time)) / 3.6e6;
      floodedHours = depths.filter(d => d > floodThresholdM).length * dtH;
    }

    return { maxDepth, maxCat, maxCatIdx, maxCatStyle, severityT, floodedHours };
  }, [timeseries, realCategories, floodThresholdM]);

  // Live "at cursor"
  const nowEntry = useMemo(() => closestEntry(timeseries, currentSliderDate), [timeseries, currentSliderDate]);
  const nowDepth = nowEntry?.depth_m ?? 0;
  const total = realCategories.length;
  const nowCat = total ? classifyDepth(realCategories, nowDepth) : null;
  const nowCatIdx = nowCat ? realCategories.indexOf(nowCat) : 0;
  const nowStyle = getSeverityStyle(nowCatIdx, total);

  // ── Chart data ────────────────────────────────────────────────────────────
  const { times, depths, peakStyle } = useMemo(() => {
    if (!Array.isArray(timeseries) || !timeseries.length) {
      return { times: [], depths: [], peakStyle: { color: '#888888' } };
    }
    const times = timeseries.map(d => new Date(d.time));
    const depths = timeseries.map(d => d.depth_m ?? 0);
    const maxD = Math.max(...depths);
    const n = realCategories.length;
    const peak = n ? classifyDepth(realCategories, maxD) : null;
    const peakIdx = peak ? realCategories.indexOf(peak) : 0;
    return { times, depths, peakStyle: getSeverityStyle(peakIdx, n) };
  }, [timeseries, realCategories]);

  const traces = useMemo(() => {
    if (!times.length) return [];
    return [{
      type: 'scatter',
      x: times,
      y: depths,
      mode: 'lines',
      fill: 'tozeroy',
      fillcolor: hexToRgba(peakStyle.color, isDarkMode ? 0.20 : 0.13),
      line: { color: peakStyle.color, width: 2.5, shape: 'spline', smoothing: 0.85 },
      hovertemplate:
        '<span style="font-size:12px"><b>%{x|%b %d %H:%M UTC}</b></span><br>' +
        'Depth: <b>%{y:.3f} m</b><extra></extra>',
    }];
  }, [times, depths, peakStyle, isDarkMode]);

  // ── Threshold reference lines ─────────────────────────────────────────────
  // Skip the first (dry=0 m) and last (maximum display range) categories
  // to avoid clutter; use operational severity colors — not the palette.
  const { thresholdShapes, thresholdAnnotations } = useMemo(() => {
    if (realCategories.length < 2 || !times.length) {
      return { thresholdShapes: [], thresholdAnnotations: [] };
    }
    const shapes = [];
    const annotations = [];
    const x0 = times[0];
    const x1 = times[times.length - 1];
    const n = realCategories.length;

    realCategories.forEach((cat, idx) => {
      if (idx === 0 || idx === n - 1) return;   // skip dry (0 m) and upper bound (cok-maximum)
      const y = Number(cat?.thresholdM);
      if (!Number.isFinite(y) || y <= 0) return;
      const { color } = getSeverityStyle(idx, n);
      shapes.push({
        type: 'line', xref: 'x', yref: 'y',
        x0, x1, y0: y, y1: y,
        line: { color: hexToRgba(color, 0.45), width: 1, dash: 'dot' },
      });
      if (showThresholdLabels) {
        annotations.push({
          x: x1, y: y, xref: 'x', yref: 'y',
          text: `<b>${cat.label}</b>`,
          showarrow: false,
          xanchor: 'right', yanchor: 'bottom',
          font: { size: 9, color, family: 'Inter, system-ui, sans-serif' },
          bgcolor: isDarkMode ? 'rgba(18,20,26,0.88)' : 'rgba(255,255,255,0.88)',
          borderpad: 2,
        });
      }
    });
    return { thresholdShapes: shapes, thresholdAnnotations: annotations };
  }, [realCategories, times, isDarkMode, showThresholdLabels]);

  // ── "Now" vertical line + selected-timestep annotation ───────────────────
  const { nowShape, nowAnnotation } = useMemo(() => {
    if (!currentSliderDate || !times.length) return {};
    const t = new Date(currentSliderDate);
    const shape = {
      type: 'line', xref: 'x', yref: 'paper',
      x0: t, x1: t, y0: 0, y1: 1,
      line: {
        color: isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.25)',
        width: 1.5, dash: 'dashdot',
      },
    };
    const label = nowDepth > 0
      ? `${nowDepth.toFixed(2)} m — ${nowCat?.label ?? ''}`
      : 'Dry';
    const annotation = {
      x: t, y: 1, xref: 'x', yref: 'paper',
      text: `<b>${label}</b>`,
      showarrow: true, arrowhead: 0,
      arrowcolor: nowStyle.color,
      ax: 0, ay: -28,
      font: { size: 9, color: nowStyle.color, family: 'Inter, system-ui, sans-serif' },
      bgcolor: isDarkMode ? 'rgba(18,20,26,0.9)' : 'rgba(255,255,255,0.9)',
      borderpad: 3, bordercolor: nowStyle.color, borderwidth: 1,
    };
    return { nowShape: shape, nowAnnotation: annotation };
  }, [currentSliderDate, times, nowDepth, nowCat, nowStyle, isDarkMode]);

  // ── Advisory sentence ─────────────────────────────────────────────────────
  const advisory = useMemo(() => {
    if (!stats) return null;
    return buildAdvisory(stats.maxDepth, stats.maxCat, stats.floodedHours, stats.severityT);
  }, [stats]);

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const grid = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tick = isDarkMode ? '#475569' : '#94a3b8';
  const axisTitle = isDarkMode ? '#64748b' : '#94a3b8';

  if (!timeseries?.length) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 2rem', color: isDarkMode ? '#475569' : '#94a3b8', fontSize: 14 }}>
        No inundation data recorded at this location.
      </div>
    );
  }

  const allShapes = [...thresholdShapes, ...(nowShape ? [nowShape] : [])];
  const allAnnotations = [...thresholdAnnotations, ...(nowAnnotation ? [nowAnnotation] : [])];

  return (
    <div className="inundation-timeseries">

      {/* ── Stat cards ── */}
      {stats && (
        <div className="inundation-timeseries__stats">
          <StatCard
            label="Maximum forecast depth"
            value={`${stats.maxDepth.toFixed(2)} m`}
            subtext={displayCategoryDescription(stats.maxCat?.description)}
            color={stats.maxCatStyle.color}
            isDarkMode={isDarkMode}
          />
          <StatCard
            label="Depth category"
            value={stats.maxCat?.label ?? 'No inundation'}
            color={stats.maxCatStyle.color}
            isDarkMode={isDarkMode}
          />
          <StatCard
            label="Flood duration"
            value={stats.floodedHours < 1
              ? `${Math.round(stats.floodedHours * 60)} min`
              : `${Math.round(stats.floodedHours)} h`}
            subtext={`Above ${floodThresholdM.toFixed(2)} m`}
            color={stats.maxCatStyle.color}
            isDarkMode={isDarkMode}
          />
          {nowEntry && (
            <StatCard
              label="Selected timestep depth"
              value={nowDepth > 0 ? `${nowDepth.toFixed(2)} m` : 'Dry'}
              subtext={nowCat?.label ?? null}
              color={nowStyle.color}
              isDarkMode={isDarkMode}
              live
            />
          )}
        </div>
      )}

      {/* ── Advisory sentence ── */}
      {advisory && (
        <div className="inundation-timeseries__advisory" style={{
          fontSize: 12,
          lineHeight: 1.55,
          padding: '8px 12px',
          borderRadius: 8,
          background: stats?.maxCatStyle?.bg ?? 'rgba(148,163,180,0.08)',
          borderLeft: `3px solid ${stats?.maxCatStyle?.color ?? '#94a3b4'}`,
          color: isDarkMode ? '#cbd5e1' : '#334155',
        }}>
          {advisory}
        </div>
      )}

      <div className="inundation-timeseries__controls">
        <span>Depth values, category labels, and notes are editable in Inundation Thresholds.</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {onTimeSelect && (
            <span style={{ opacity: 0.55, fontStyle: "italic" }}>
              Click chart to jump slider
            </span>
          )}
          <label className="inundation-timeseries__toggle">
            <input
              type="checkbox"
              checked={showThresholdLabels}
              onChange={(event) => setShowThresholdLabels(event.target.checked)}
            />
            Show chart labels
          </label>
          <button
            type="button"
            className="inundation-timeseries__export-btn"
            onClick={handleExportPNG}
            title="Download chart as PNG"
            aria-label="Download chart as PNG"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            PNG
          </button>
          <button
            type="button"
            className="inundation-timeseries__export-btn"
            onClick={handleExportPDF}
            title="Print / save as PDF"
            aria-label="Print chart as PDF"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            PDF
          </button>
        </div>
      </div>

      {/* ── Chart ── */}
      <div className="inundation-timeseries__chart" ref={chartRef}>
        <Plot
          data={traces}
          layout={{
            autosize: true,
            height: plotHeight,
            margin: { l: 48, r: 70, t: 10, b: 42 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            xaxis: {
              tickfont: { color: tick, size: 10.5, family: 'Inter, system-ui, sans-serif' },
              gridcolor: grid,
              linecolor: 'transparent',
              zerolinecolor: 'transparent',
              tickformat: '%b %d\n%H:%M',
              type: 'date',
              showgrid: true,
              ticks: 'outside', ticklen: 4, tickcolor: 'transparent',
            },
            yaxis: {
              title: {
                text: 'Depth (m)',
                font: { color: axisTitle, size: 10.5, family: 'Inter, system-ui, sans-serif' },
                standoff: 6,
              },
              tickfont: { color: tick, size: 10.5, family: 'Inter, system-ui, sans-serif' },
              gridcolor: grid,
              linecolor: 'transparent',
              zerolinecolor: grid,
              zeroline: true,
              rangemode: 'nonnegative',
              ticks: 'outside', ticklen: 4, tickcolor: 'transparent',
            },
            showlegend: false,
            clickmode: 'event',
            shapes: allShapes,
            annotations: allAnnotations,
            hoverlabel: {
              bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
              bordercolor: isDarkMode ? '#334155' : '#e2e8f0',
              font: { color: isDarkMode ? '#f1f5f9' : '#0f172a', size: 12, family: 'Inter, system-ui, sans-serif' },
              align: 'left',
            },
            hovermode: 'x unified',
          }}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: '100%', height: '100%', cursor: onTimeSelect ? 'pointer' : 'default' }}
          useResizeHandler
          onInitialized={handlePlotInitialized}
          onUpdate={handlePlotInitialized}
        />
      </div>
    </div>
  );
}

export default InundationTimeseries;
