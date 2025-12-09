import React from 'react';
import PropTypes from 'prop-types';
import { InfoDisplay, AccessibleSlider, ActionButton } from './SharedComponents';
import { formatTimeString, getControlConfig } from '../../config/uiConfig';

/**
 * Time control component with slider and playback controls
 */
export const TimeControl = ({
  sliderIndex,
  totalSteps,
  currentSliderDate,
  isPlaying,
  onSliderChange,
  onPlayToggle,
  disabled = false,
  formatTime,
  minIndex = 0
}) => {
  const timeConfig = getControlConfig('timeSlider');
  const playConfig = getControlConfig('playButton');

  const forecastInfo = [
    {
      content: (
        <div>
          {formatTimeString('currentTime', { hours: sliderIndex })}
        </div>
      )
    },
    {
      content: (
        <div>
          {formatTimeString('validTime', { timestamp: formatTime(currentSliderDate) })}
        </div>
      )
    }
  ];

  const lengthInfo = [
    {
      content: (
        <div>
          <strong>{formatTimeString('forecastLength', { total: totalSteps + 1 })}</strong>
        </div>
      )
    }
  ];

  return (
    <div className="time-control">
      <InfoDisplay items={forecastInfo} className="forecast-info" />
      
      <div className="time-slider-container">
        <AccessibleSlider
          label="Time"
          value={sliderIndex}
          min={minIndex}
          max={totalSteps}
          onChange={onSliderChange}
          ariaLabel={timeConfig.ariaLabel}
          title={timeConfig.title}
          disabled={disabled}
          className="time-slider"
        />
        
        <div className="playback-controls">
          <ActionButton
            onClick={onPlayToggle}
            disabled={disabled}
            variant="play"
            ariaLabel={isPlaying ? playConfig.pause.ariaLabel : playConfig.play.ariaLabel}
            title={isPlaying ? playConfig.pause.title : playConfig.play.title}
            className="play-btn"
          >
            <span>{isPlaying ? playConfig.pause.text : playConfig.play.text}</span>
          </ActionButton>
        </div>
      </div>
      
      <InfoDisplay items={lengthInfo} className="forecast-info" />
    </div>
  );
};

TimeControl.propTypes = {
  sliderIndex: PropTypes.number.isRequired,
  totalSteps: PropTypes.number.isRequired,
  currentSliderDate: PropTypes.instanceOf(Date),
  isPlaying: PropTypes.bool.isRequired,
  onSliderChange: PropTypes.func.isRequired,
  onPlayToggle: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  formatTime: PropTypes.func.isRequired
};

/**
 * Opacity control component with percentage display
 */
export const OpacityControl = ({
  opacity,
  onChange,
  disabled = false
}) => {
  const opacityConfig = getControlConfig('opacitySlider');

  return (
    <AccessibleSlider
      label={opacityConfig.label}
      value={Math.round(opacity * 100)}
      min={0}
      max={100}
      onChange={(value) => onChange(value / 100)}
      formatValue={(value) => `${value}%`}
      ariaLabel={opacityConfig.ariaLabel}
      title={opacityConfig.title}
      disabled={disabled}
      className="opacity-slider"
    />
  );
};

OpacityControl.propTypes = {
  opacity: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};

/**
 * Data information component displaying source and update details
 */
export const DataInfoPanel = ({
  dataInfo = {},
  className = ''
}) => {
  const infoItems = [
    { label: 'Source', value: dataInfo.source },
    { label: 'Update', value: dataInfo.update }
  ].filter(item => item.value); // Only show items with values

  return (
    <InfoDisplay 
      items={infoItems} 
      className={`data-info ${className}`}
    />
  );
};

DataInfoPanel.propTypes = {
  dataInfo: PropTypes.shape({
    source: PropTypes.string,
    update: PropTypes.string
  }),
  className: PropTypes.string
};

/**
 * Status bar component with footer information
 */
export const StatusBar = ({
  copyright,
  className = '',
  lastUpdated
}) => {
  return (
    <div className={`status-bar ${className}`}>
      <div className="status-indicator">
        <div className="status-dot"></div>
        <span>Live</span>
        <span className="last-update-time">{lastUpdated}</span>
      </div>
      <div>{copyright}</div>
    </div>
  );
};

StatusBar.propTypes = {
  copyright: PropTypes.string.isRequired,
  className: PropTypes.string,
  lastUpdated: PropTypes.string
};