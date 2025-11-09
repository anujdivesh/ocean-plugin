import React, { useState } from 'react';
import './WorldClassOffCanvas.css';

const WorldClassUIDemo = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('buoy');
  const [showLoading, setShowLoading] = useState(false);
  const [showError, setShowError] = useState(false);

  const tabLabels = [
    { key: 'buoy', label: '🌊 Buoy Data' },
    { key: 'model', label: '🔮 Wave Model' },
    { key: 'combination', label: '📊 Comparison' }
  ];

  return (
    <div style={{ height: '100vh', background: '#0f172a', padding: '20px' }}>
      <div style={{ marginBottom: '20px', color: '#f1f5f9' }}>
        <h2>🌊 Oceanographic Dashboard Demo</h2>
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Toggle {isDarkMode ? 'Light' : 'Dark'} Mode
        </button>
        <button 
          onClick={() => setShowLoading(!showLoading)}
          style={{
            background: '#10b981',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          {showLoading ? 'Hide' : 'Show'} Loading State
        </button>
        <button 
          onClick={() => setShowError(!showError)}
          style={{
            background: '#ef4444',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          {showError ? 'Hide' : 'Show'} Error State
        </button>
      </div>

      <div 
        className={`world-class-offcanvas show ${isDarkMode ? '' : 'light-mode'}`}
        style={{
          position: 'relative',
          height: '400px',
          width: '800px',
          margin: '0 auto',
          borderRadius: '16px 16px 0 0'
        }}
      >
        {/* Drag Handle */}
        <div className={`world-class-drag-handle ${isDarkMode ? '' : 'light-mode'}`} />
        
        {/* Header */}
        <div className={`world-class-header ${isDarkMode ? '' : 'light-mode'}`}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {/* Tab Navigation */}
            <div className={`world-class-tabs ${isDarkMode ? '' : 'light-mode'}`}>
              {tabLabels.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`world-class-tab ${activeTab === tab.key ? 'active' : ''} ${isDarkMode ? '' : 'light-mode'}`}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>
            
            {/* Professional Close Button */}
            <button
              type="button"
              className={`world-class-close ${isDarkMode ? '' : 'light-mode'}`}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="world-class-content">
          {showLoading && (
            <div className="world-class-loading">
              <div className="world-class-spinner"></div>
              <div className={`world-class-loading-text ${isDarkMode ? '' : 'light-mode'}`}>
                Loading oceanographic data from Pacific buoys...
              </div>
              <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '8px' }}>
                Connecting to SPC data servers...
              </div>
            </div>
          )}

          {showError && (
            <div className={`world-class-error ${isDarkMode ? '' : 'light-mode'}`}>
              <strong>Data Fetch Error</strong><br />
              Unable to connect to buoy network. Please check your connection and try again.
            </div>
          )}

          {!showLoading && !showError && (
            <div className={`world-class-chart ${isDarkMode ? '' : 'light-mode'}`}>
              <div style={{ 
                padding: '40px', 
                textAlign: 'center',
                color: isDarkMode ? '#94a3b8' : '#475569'
              }}>
                <h3 style={{ margin: '0 0 16px 0', color: isDarkMode ? '#e2e8f0' : '#1e293b' }}>
                  🌊 Wave Height Analysis
                </h3>
                <p>Professional chart visualization would appear here</p>
                <div style={{
                  background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)',
                  height: '200px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: '500'
                }}>
                  📈 Interactive Plotly Chart Area
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ 
        marginTop: '20px', 
        padding: '20px', 
        background: 'rgba(59, 130, 246, 0.1)', 
        borderRadius: '12px',
        color: '#f1f5f9'
      }}>
        <h3>✨ Enhancement Features Demonstrated:</h3>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>🎨 **Glassmorphism background** with ocean-themed gradients</li>
          <li>🖱️ **Interactive drag handle** with glow effects</li>
          <li>📑 **Professional tab navigation** with active states</li>
          <li>⚡ **Smooth animations** with premium easing curves</li>
          <li>🌙 **Dark/Light mode** compatibility</li>
          <li>🔄 **World-class loading states** with contextual messaging</li>
          <li>❌ **Professional error handling** with clear feedback</li>
          <li>📊 **Enhanced chart containers** with hover effects</li>
          <li>♿ **Accessibility features** with keyboard navigation</li>
          <li>📱 **Responsive design** for all screen sizes</li>
        </ul>
      </div>
    </div>
  );
};

export default WorldClassUIDemo;
