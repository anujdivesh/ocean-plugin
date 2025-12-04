/**
 * Shared UI Components for Forecast Application
 * 
 * Reusable components with consistent styling and accessibility
 * to maintain uniformity across widgets.
 */

import React from 'react';

/**
 * Control Group Container with consistent header styling
 */
export const ControlGroup = ({ 
  icon, 
  title, 
  ariaLabel, 
  children, 
  className = '' 
}) => (
  <div className={`control-group ${className}`} role="group" aria-label={ariaLabel}>
    <h3>{icon} {title}</h3>
    {children}
  </div>
);

/**
 * Variable Selection Buttons with Fancy Icons
 */
export const VariableButtons = ({ 
  layers, 
  selectedValue, 
  onVariableChange, 
  labelMap = {},
  ariaLabel = "Select forecast variable",
  getVariableIcon = null
}) => {
  const getShortLabel = (label) => labelMap[label] || label;
  
  return (
    <div className="variable-buttons" role="radiogroup" aria-label={ariaLabel}>
      {layers.map((layer) => (
        <button
          type="button"
          key={layer.value}
          className={`var-btn ${selectedValue === layer.value ? 'active' : ''}`}
          onClick={() => onVariableChange(layer.value)}
          role="radio"
          aria-checked={selectedValue === layer.value}
          aria-label={`${getShortLabel(layer.label)} forecast variable`}
        >
          {getVariableIcon && getVariableIcon(layer)}
          {getShortLabel(layer.label)}
        </button>
      ))}
    </div>
  );
};

/**
 * Time Control Section
 */
export const TimeControl = ({
  sliderIndex,
  totalSteps,
  currentSliderDate,
  isPlaying,
  capTime,
  onSliderChange,
  onPlayToggle,
  formatDateTime,
  stepHours = 1,
  playIcon = '▶️',
  pauseIcon = '⏸️',
  minIndex = 0,
  disabled = false
}) => (
  <div className="time-control">
    <div className="forecast-info">
      <div>Forecast Hour: <span>+{sliderIndex * stepHours}h</span></div>
      <div>Valid DateTime: <span>{formatDateTime(currentSliderDate)}</span></div>
    </div>
    
    <div className="time-slider-container">
      <input
        title="Forecast Time"
        aria-label="Forecast Time"
        type="range"
        className="time-slider"
        min={minIndex}
        max={totalSteps}
        value={sliderIndex}
        onChange={(e) => onSliderChange(e.target.value)}
        disabled={capTime.loading || disabled}
      />
      
      <div className="playback-controls">
        <button 
          type="button"
          className="play-btn"
          onClick={onPlayToggle}
          disabled={capTime.loading || disabled}
          aria-label={isPlaying ? 'Pause forecast animation' : 'Play forecast animation'}
        >
          <span>{isPlaying ? <>{pauseIcon} Pause</> : <>{playIcon} Play</>}</span>
        </button>
      </div>
    </div>
    
    <div className="forecast-info">
      <div>Forecast Length: <strong>{totalSteps + 1} hours</strong></div>
    </div>
    {disabled && (
      <div style={{ 
        marginTop: '0.5rem', 
        padding: '0.5rem', 
        background: 'rgba(255, 152, 0, 0.1)', 
        border: '1px solid rgba(255, 152, 0, 0.3)',
        borderRadius: '4px',
        fontSize: '0.85rem',
        color: '#ffb74d',
        textAlign: 'center'
      }}>
        Time controls disabled for static layers
      </div>
    )}
  </div>
);

/**
 * Opacity Control
 */
export const OpacityControl = ({ 
  opacity, 
  onOpacityChange,
  formatPercent,
  ariaLabel = "overlay-opacity"
}) => (
  <div className="opacity-control">
    <label>
      Overlay Opacity: <span>{formatPercent(opacity)}</span>
    </label>
    <input
      aria-label={ariaLabel}
      title={ariaLabel}
      type="range"
      className="opacity-slider"
      min="0"
      max="100"
      value={Math.round(opacity * 100)}
      onChange={(e) => onOpacityChange(e.target.value / 100)}
    />
  </div>
);

/**
 * Data Information Display
 */
export const DataInfo = ({ 
  source, 
  model, 
  resolution, 
  updateFrequency, 
  coverage 
}) => (
  <div className="data-info">
    <div><strong>Source:</strong> {source}</div>
    <div><strong>Update:</strong> {updateFrequency}</div>
  </div>
);

/**
 * Status Bar Footer
 */
/**export const StatusBar = ({ copyright, lastUpdated }) => (
  <div className="status-bar">
    <div className="status-indicator">
      {lastUpdated && <span className="last-update-time">{lastUpdated}</span>}
    </div>
    <div>{copyright}</div>
  </div>
);**/

const UIComponents = {
  ControlGroup,
  VariableButtons,
  TimeControl,
  OpacityControl,
  DataInfo,
  //StatusBar
};

export default UIComponents;