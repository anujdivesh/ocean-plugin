/**
 * UI Components Library - Niue Marine Edition
 * 
 * Reusable React components for the marine forecast dashboard
 * with Lucide React icons and consistent Niue theming.
 */

import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Waves, 
  Timer, 
  Navigation, 
  CloudRain,
  Play,
  Pause,
  RotateCcw,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';

// Icon mapping for marine variables
export const NIUE_ICON_MAP = {
  hs: Waves,
  composite_hs_dirm: Waves,
  tm02: Timer,
  tpeak: Navigation,
  dirm: Navigation,
  inundation: CloudRain
};

/**
 * Collapsible Control Group Component
 */
export const ControlGroup = ({ 
  title, 
  icon: IconComponent, 
  children, 
  isCollapsed = false, 
  onToggle,
  className = '' 
}) => {
  const [collapsed, setCollapsed] = useState(isCollapsed);

  const handleToggle = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    onToggle?.(newCollapsed);
  };

  // Get icon component
  const Icon = typeof IconComponent === 'string' ? 
    (IconComponent === 'Waves' ? Waves :
     IconComponent === 'Timer' ? Timer :
     IconComponent === 'Navigation' ? Navigation :
     IconComponent === 'CloudRain' ? CloudRain :
     Waves) : IconComponent;

  return (
    <div className={`control-group ${className}`} style={{
      marginBottom: '16px',
      borderRadius: '12px',
      border: '1px solid rgba(6, 182, 212, 0.2)',
      background: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(10px)',
      overflow: 'hidden'
    }}>
      <button
        onClick={handleToggle}
        className="control-group-header"
        style={{
          width: '100%',
          padding: '16px',
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(14, 165, 233, 0.05))',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: '600',
          color: '#0F172A',
          transition: 'all 0.2s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {Icon && <Icon size={20} color="#06b6d4" />}
          <span>{title}</span>
        </div>
        {collapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
      </button>
      
      {!collapsed && (
        <div className="control-group-content" style={{ padding: '16px' }}>
          {children}
        </div>
      )}
    </div>
  );
};

/**
 * Variable Selection Buttons
 */
export const VariableButtons = ({ 
  variables, 
  selectedVariable, 
  onVariableChange, 
  loading = false 
}) => {
  return (
    <div className="variable-buttons" style={{
      display: 'grid',
      gap: '8px',
      gridTemplateColumns: '1fr'
    }}>
      {variables.map((variable) => {
        const Icon = NIUE_ICON_MAP[variable.value] || Waves;
        const isSelected = selectedVariable === variable.value;
        
        return (
          <button
            key={variable.value}
            onClick={() => onVariableChange(variable.value)}
            disabled={loading}
            className="variable-button"
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              border: `2px solid ${isSelected ? '#06b6d4' : 'rgba(6, 182, 212, 0.2)'}`,
              background: isSelected ? 
                'linear-gradient(135deg, #06b6d4, #0ea5e9)' : 
                'rgba(255, 255, 255, 0.9)',
              color: isSelected ? 'white' : '#0F172A',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '14px',
              fontWeight: isSelected ? '600' : '500',
              transition: 'all 0.2s ease',
              opacity: loading ? 0.6 : 1
            }}
          >
            <Icon size={18} />
            <span>{variable.label}</span>
            {variable.units && (
              <span style={{ 
                fontSize: '12px', 
                opacity: 0.8,
                marginLeft: 'auto' 
              }}>
                ({variable.units})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

/**
 * Time Control Component
 */
export const TimeControl = ({ 
  availableTimes, 
  selectedTime, 
  onTimeChange, 
  loading = false,
  autoPlay = false,
  onAutoPlayToggle 
}) => {
  const formatTime = (time) => {
    if (!time) return 'No time selected';
    return time.toLocaleString('en-US', {
      timeZone: 'Pacific/Niue',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  return (
    <div className="time-control" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Time Selector */}
      <div>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontSize: '14px', 
          fontWeight: '500',
          color: '#374151' 
        }}>
          Forecast Time
        </label>
        <select
          value={selectedTime ? selectedTime.toISOString() : ''}
          onChange={(e) => onTimeChange(new Date(e.target.value))}
          disabled={loading || !availableTimes.length}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            background: 'rgba(255, 255, 255, 0.9)',
            fontSize: '14px',
            color: '#0F172A',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {availableTimes.map((time) => (
            <option key={time.toISOString()} value={time.toISOString()}>
              {formatTime(time)}
            </option>
          ))}
        </select>
      </div>

      {/* Auto-play Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={() => onAutoPlayToggle?.(!autoPlay)}
          disabled={loading}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            background: autoPlay ? '#06b6d4' : 'rgba(255, 255, 255, 0.9)',
            color: autoPlay ? 'white' : '#0F172A',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: '500'
          }}
        >
          {autoPlay ? <Pause size={14} /> : <Play size={14} />}
          {autoPlay ? 'Pause' : 'Play'}
        </button>
        
        <button
          onClick={() => {
            if (availableTimes.length > 0) {
              onTimeChange(availableTimes[0]);
            }
          }}
          disabled={loading}
          style={{
            padding: '8px',
            borderRadius: '6px',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            background: 'rgba(255, 255, 255, 0.9)',
            color: '#0F172A',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
          title="Reset to latest time"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
};

/**
 * Opacity Control Slider
 */
export const OpacityControl = ({ opacity, onOpacityChange, disabled = false }) => {
  return (
    <div className="opacity-control">
      <label style={{ 
        display: 'block', 
        marginBottom: '8px', 
        fontSize: '14px', 
        fontWeight: '500',
        color: '#374151' 
      }}>
        Layer Opacity: {Math.round(opacity * 100)}%
      </label>
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        value={opacity}
        onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
        disabled={disabled}
        style={{
          width: '100%',
          height: '6px',
          borderRadius: '3px',
          background: `linear-gradient(to right, 
            rgba(6, 182, 212, 0.3) 0%, 
            rgba(6, 182, 212, 0.3) ${opacity * 100}%, 
            rgba(203, 213, 225, 0.5) ${opacity * 100}%, 
            rgba(203, 213, 225, 0.5) 100%)`,
          outline: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer'
        }}
      />
    </div>
  );
};

/**
 * Data Information Display
 */
export const DataInfo = ({ layer, forecast, lastUpdated }) => {
  const formatDate = (date) => {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleString('en-US', {
      timeZone: 'Pacific/Niue',
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  return (
    <div className="data-info" style={{ 
      fontSize: '14px', 
      color: '#64748B',
      lineHeight: '1.5' 
    }}>
      <div style={{ marginBottom: '8px' }}>
        <strong style={{ color: '#0F172A' }}>Layer:</strong> {layer?.label || 'Unknown'}
      </div>
      
      {layer?.units && (
        <div style={{ marginBottom: '8px' }}>
          <strong style={{ color: '#0F172A' }}>Units:</strong> {layer.units}
        </div>
      )}
      
      {forecast?.metadata?.source && (
        <div style={{ marginBottom: '8px' }}>
          <strong style={{ color: '#0F172A' }}>Source:</strong> {forecast.metadata.source}
        </div>
      )}
      
      <div style={{ marginBottom: '8px' }}>
        <strong style={{ color: '#0F172A' }}>Last Updated:</strong><br />
        {formatDate(lastUpdated)}
      </div>
      
      {layer?.colorRange && (
        <div>
          <strong style={{ color: '#0F172A' }}>Range:</strong> {layer.colorRange[0]} - {layer.colorRange[1]} {layer.units}
        </div>
      )}
    </div>
  );
};

/**
 * Legend Toggle Button
 */
export const LegendToggle = ({ isVisible, onToggle, position = 'bottom-left' }) => {
  const positionStyles = {
    'bottom-left': { bottom: '20px', left: '20px' },
    'bottom-right': { bottom: '20px', right: '20px' },
    'top-left': { top: '20px', left: '20px' },
    'top-right': { top: '20px', right: '20px' }
  };

  return (
    <button
      onClick={onToggle}
      className="legend-toggle"
      style={{
        position: 'fixed',
        ...positionStyles[position],
        zIndex: 1000,
        padding: '12px',
        borderRadius: '50%',
        border: 'none',
        background: 'rgba(6, 182, 212, 0.9)',
        color: 'white',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 8px 24px rgba(6, 182, 212, 0.3)',
        transition: 'all 0.2s ease'
      }}
      title={isVisible ? 'Hide Legend' : 'Show Legend'}
    >
      {isVisible ? <EyeOff size={20} /> : <Eye size={20} />}
    </button>
  );
};

/**
 * Loading Indicator
 */
export const LoadingIndicator = ({ message = 'Loading...', position = 'top-center' }) => {
  const positionStyles = {
    'top-center': { 
      top: '20px', 
      left: '50%', 
      transform: 'translateX(-50%)' 
    },
    'center': { 
      top: '50%', 
      left: '50%', 
      transform: 'translate(-50%, -50%)' 
    }
  };

  return (
    <div
      className="loading-indicator"
      style={{
        position: 'fixed',
        ...positionStyles[position],
        zIndex: 1002,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        padding: '16px 24px',
        border: '1px solid rgba(6, 182, 212, 0.2)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '14px',
        fontWeight: '500',
        color: '#0F172A'
      }}
    >
      <Loader2 size={18} className="animate-spin" style={{
        animation: 'spin 1s linear infinite'
      }} />
      <span>{message}</span>
      
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

const UIComponents = {
  ControlGroup,
  VariableButtons,
  TimeControl,
  OpacityControl,
  DataInfo,
  LegendToggle,
  LoadingIndicator,
  NIUE_ICON_MAP
};

export default UIComponents;