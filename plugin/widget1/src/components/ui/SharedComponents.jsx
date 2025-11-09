import React from 'react';
import PropTypes from 'prop-types';
import './SharedComponents.css';

/**
 * Reusable control group component with consistent styling and accessibility
 */
export const ControlGroup = ({ 
  title, 
  icon, 
  ariaLabel, 
  children, 
  className = '' 
}) => {
  return (
    <div 
      className={`control-group ${className}`}
      role="group"
      aria-labelledby={`${title.replace(/\s+/g, '-').toLowerCase()}-heading`}
      aria-label={ariaLabel}
    >
      <h3 id={`${title.replace(/\s+/g, '-').toLowerCase()}-heading`}>
        {icon && <span className="section-icon" aria-hidden="true">{icon}</span>}
        {title}
      </h3>
      {children}
    </div>
  );
};

ControlGroup.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.string,
  ariaLabel: PropTypes.string,
  children: PropTypes.node.isRequired,
  className: PropTypes.string
};

/**
 * Accessible slider component with consistent styling and labeling
 */
export const AccessibleSlider = ({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  formatValue,
  ariaLabel,
  title,
  disabled = false,
  className = ''
}) => {
  const displayValue = formatValue ? formatValue(value) : value;
  const sliderId = `slider-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className={`slider-control ${className}`}>
      <label htmlFor={sliderId} className="slider-label">
        {label}: <span className="slider-value">{displayValue}</span>
      </label>
      <input
        id={sliderId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel || label}
        title={title || `Adjust ${label.toLowerCase()}`}
        disabled={disabled}
        className={`slider ${className}`}
      />
    </div>
  );
};

AccessibleSlider.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  min: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  max: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  step: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  formatValue: PropTypes.func,
  ariaLabel: PropTypes.string,
  title: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string
};

/**
 * Action button component with consistent styling and accessibility
 */
export const ActionButton = ({
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  ariaLabel,
  title,
  children,
  className = ''
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title}
      className={`action-btn ${variant} ${size} ${className}`}
    >
      {children}
    </button>
  );
};

ActionButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  variant: PropTypes.oneOf(['primary', 'secondary', 'play']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  ariaLabel: PropTypes.string,
  title: PropTypes.string,
  children: PropTypes.node.isRequired,
  className: PropTypes.string
};

/**
 * Info display component for metadata and status information
 */
export const InfoDisplay = ({ 
  items, 
  title, 
  className = '' 
}) => {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className={`info-display ${className}`}>
      {title && <h4 className="info-title">{title}</h4>}
      <div className="info-items">
        {items.map((item, index) => (
          <div key={index} className="info-item">
            {item.label && <strong>{item.label}:</strong>}
            {item.value && <span className="info-value">{item.value}</span>}
            {item.content}
          </div>
        ))}
      </div>
    </div>
  );
};

InfoDisplay.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      content: PropTypes.node
    })
  ).isRequired,
  title: PropTypes.string,
  className: PropTypes.string
};

/**
 * Variable selector component for layer selection buttons
 */
export const VariableSelector = ({
  layers,
  selectedValue,
  onChange,
  getLabel,
  disabled = false,
  className = ''
}) => {
  return (
    <div className={`variable-selector ${className}`}>
      {layers.map((layer) => (
        <ActionButton
          key={layer.value}
          onClick={() => onChange(layer.value)}
          disabled={disabled}
          variant={selectedValue === layer.value ? 'primary' : 'secondary'}
          ariaLabel={`Select ${layer.label}`}
          title={`Switch to ${layer.label} layer`}
          className={`var-btn ${selectedValue === layer.value ? 'active' : ''}`}
        >
          {getLabel ? getLabel(layer.label) : layer.label}
        </ActionButton>
      ))}
    </div>
  );
};

VariableSelector.propTypes = {
  layers: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired
    })
  ).isRequired,
  selectedValue: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  getLabel: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string
};