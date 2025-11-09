import React from 'react';

const WorldClassLoader = ({ text, subtext, isDarkMode }) => {
  return (
    <div className="world-class-loading">
      <div className="world-class-spinner"></div>
      <div className={`world-class-loading-text ${isDarkMode ? '' : 'light-mode'}`}>
        {text}
      </div>
      {subtext && (
        <div style={{ 
          fontSize: '12px', 
          opacity: 0.7, 
          marginTop: '8px',
          color: isDarkMode ? 'rgba(148, 163, 184, 0.6)' : 'rgba(71, 85, 105, 0.6)' 
        }}>
          {subtext}
        </div>
      )}
    </div>
  );
};

const WorldClassError = ({ title, message, isDarkMode }) => {
  return (
    <div className={`world-class-error ${isDarkMode ? '' : 'light-mode'}`}>
      <strong>{title}</strong><br />
      {message}
    </div>
  );
};

const WorldClassChart = ({ children, isDarkMode, style }) => {
  return (
    <div 
      className={`world-class-chart ${isDarkMode ? '' : 'light-mode'}`}
      style={{ width: "100%", height: "100%", minHeight: '300px', ...style }}
    >
      {children}
    </div>
  );
};

export { WorldClassLoader, WorldClassError, WorldClassChart };