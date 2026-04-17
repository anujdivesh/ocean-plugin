import React, { useEffect, useRef, useState } from 'react';
import WaterLevelChart from './WaterLevelChart';
import './RiskDetailsPanel.css';

const RISK_COLORS = {
  0: '#3498db',
  1: '#f39c12',
  2: '#e74c3c'
};

const RISK_LABELS = {
  0: 'No Risk',
  1: 'Minor Risk',
  2: 'Moderate Risk'
};

const normalizeIsland = (value) => {
  if (typeof value === 'string') {
    return value.replace(/\0/g, '').trim();
  }

  if (Array.isArray(value)) {
    return value.join('').replace(/\0/g, '').trim();
  }

  if (value && typeof value === 'object' && typeof value.length === 'number') {
    try {
      return Array.from(value).join('').replace(/\0/g, '').trim();
    } catch (error) {
      return '';
    }
  }

  return '';
};

function RiskDetailsPanel({ data, isDarkMode = false }) {
  const point = data?.point || {};
  const details = data?.details || null;
  const riskLevel = Number.isFinite(point?.riskLevel) ? point.riskLevel : Number(details?.riskLevel) || 0;
  const riskColor = RISK_COLORS[riskLevel] || RISK_COLORS[0];
  const riskLabel = RISK_LABELS[riskLevel] || RISK_LABELS[0];
  const islandName = normalizeIsland(point?.island);
  const thresholds = details?.thresholds || point?.thresholds || [];
  const wrapperClassName = isDarkMode ? 'risk-details-panel risk-panel-dark' : 'risk-details-panel';
  const minorThreshold = Number(thresholds[0]);
  const moderateThreshold = Number(thresholds[1]);
  const previousRiskLevelRef = useRef(riskLevel);
  const [badgePulse, setBadgePulse] = useState(false);

  const formatCoord = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? `${numeric.toFixed(4)}°` : 'N/A';
  };

  useEffect(() => {
    if (previousRiskLevelRef.current === riskLevel) {
      return undefined;
    }

    previousRiskLevelRef.current = riskLevel;
    setBadgePulse(true);

    const timeoutId = window.setTimeout(() => {
      setBadgePulse(false);
    }, 340);

    return () => window.clearTimeout(timeoutId);
  }, [riskLevel]);

  if (data?.status === 'loading') {
    return (
      <div className={wrapperClassName}>
        <div className="risk-loading risk-skeleton">
          Loading coastal risk details...
        </div>
        <div className="risk-summary-compact">
          <div className="risk-summary-primary risk-skeleton risk-skeleton-block" />
          <div className="risk-summary-metric risk-skeleton risk-skeleton-block" />
          <div className="risk-summary-metric risk-skeleton risk-skeleton-block" />
        </div>
        <div className="risk-chart-card risk-skeleton risk-skeleton-chart" />
      </div>
    );
  }

  if (data?.status === 'error') {
    return (
      <div className={wrapperClassName}>
        <div className="risk-error">
          {data?.error || 'Unable to load coastal risk details.'}
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClassName}>
      <div className="risk-details-header">
        <div className="risk-details-title">
          <h3>Coastal Risk Details{islandName ? ` - ${islandName}` : ''}</h3>
          <p className="risk-details-subtitle">
            Point {point?.id ?? 'N/A'} · {formatCoord(point?.lat)}, {formatCoord(point?.lon)}
          </p>
        </div>
        <span
          className={`risk-status-badge${badgePulse ? ' risk-changed' : ''}`}
          style={{ backgroundColor: riskColor }}
        >
          {riskLabel}
        </span>
      </div>

      <div className="risk-summary-compact">
        <div className="risk-summary-primary risk-summary-card">
          <span className="risk-summary-label">Max TWL</span>
          <strong>{Number.isFinite(point?.maxTWL) ? `${point.maxTWL.toFixed(2)} m` : 'N/A'}</strong>
        </div>
        <div className="risk-summary-metric risk-summary-card">
          <span className="risk-summary-label">Minor</span>
          <strong>{Number.isFinite(minorThreshold) ? `${minorThreshold.toFixed(2)} m` : 'N/A'}</strong>
        </div>
        <div className="risk-summary-metric risk-summary-card">
          <span className="risk-summary-label">Moderate</span>
          <strong>{Number.isFinite(moderateThreshold) ? `${moderateThreshold.toFixed(2)} m` : 'N/A'}</strong>
        </div>
      </div>

      <div className="risk-summary-meta">
        {/* <span>Strategy: {point?.type || 'detailed'}</span>
        <span>Thresholds: {thresholds.length}</span> */}
        {!!islandName && <span>Island: {islandName}</span>}
      </div>

      <div className="risk-chart-card">
        <WaterLevelChart
          timestamps={details?.time_10min || []}
          totalWaterLevel={details?.twl_10min || []}
          tideLevel={details?.tide_10min || []}
          surgeLevel={details?.sla_10min || []}
          thresholds={thresholds}
          now={new Date()}
          isDarkMode={isDarkMode}
        />
      </div>
    </div>
  );
}

export default RiskDetailsPanel;
