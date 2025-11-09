import React, { useState, useEffect, useCallback } from 'react';
import './ResponsiveLayout.css';

const ResponsiveLayout = ({ 
  children, 
  leftPanel, 
  bottomPanel, 
  onExport, 
  onPermalink,
  colorBlindMode,
  onColorBlindToggle 
}) => {
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(300);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // Responsive breakpoints
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      
      // Auto-collapse on mobile/tablet
      if (width < 1024) {
        setLeftPanelCollapsed(true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    // ESC to close panels
    if (e.key === 'Escape') {
      setLeftPanelCollapsed(true);
    }
    
    // Ctrl+E for export
    if (e.ctrlKey && e.key === 'e') {
      e.preventDefault();
      onExport?.();
    }
    
    // Ctrl+L for permalink
    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      onPermalink?.();
    }
    
    // Ctrl+B for colorblind toggle
    if (e.ctrlKey && e.key === 'b') {
      e.preventDefault();
      onColorBlindToggle?.();
    }
  }, [onExport, onPermalink, onColorBlindToggle]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Bottom panel resize handler
  const handleBottomPanelResize = useCallback((e) => {
    const startY = e.clientY;
    const startHeight = bottomPanelHeight;

    const handleMouseMove = (e) => {
      const deltaY = startY - e.clientY;
      const newHeight = Math.max(200, Math.min(600, startHeight + deltaY));
      setBottomPanelHeight(newHeight);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [bottomPanelHeight]);

  return (
    <div 
      className={`responsive-layout ${colorBlindMode ? 'colorblind-mode' : ''} ${isMobile ? 'mobile' : ''} ${isTablet ? 'tablet' : ''}`}
      role="application"
      aria-label="Ocean Wave Forecast Application"
    >
      {/* Accessibility Skip Links */}
      <div className="skip-links">
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <a href="#controls-panel" className="skip-link">Skip to controls</a>
        <a href="#data-table" className="skip-link">Skip to data table</a>
      </div>

      {/* Left Panel - Remove redundant role and fix aria-expanded */}
      <aside 
        className={`left-panel ${leftPanelCollapsed ? 'collapsed' : ''}`}
        aria-label="Control Panel"
        id="controls-panel"
      >
        <button
          className="panel-toggle"
          onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
          aria-label={leftPanelCollapsed ? 'Expand control panel' : 'Collapse control panel'}
          aria-controls="controls-panel"
        >
          <span className={`toggle-icon ${leftPanelCollapsed ? 'collapsed' : ''}`}>
            {leftPanelCollapsed ? '→' : '←'}
          </span>
        </button>
        
        <div className="panel-content">
          {leftPanel}
        </div>
      </aside>

      {/* Main Content Area - Remove redundant role */}
      <main 
        className="main-content"
        id="main-content"
        aria-label="Interactive Map"
      >
        {children}
        
        {/* Floating Action Buttons */}
        <div className="floating-actions">
          <button
            className="fab export-btn"
            onClick={onExport}
            aria-label="Export data (Ctrl+E)"
            title="Export current view and data"
          >
            📥
          </button>
          
          <button
            className="fab permalink-btn"
            onClick={onPermalink}
            aria-label="Copy permalink (Ctrl+L)"
            title="Copy shareable link to current view"
          >
            🔗
          </button>
          
          <button
            className={`fab colorblind-btn ${colorBlindMode ? 'active' : ''}`}
            onClick={onColorBlindToggle}
            aria-label={`${colorBlindMode ? 'Disable' : 'Enable'} colorblind-friendly mode (Ctrl+B)`}
            title="Toggle colorblind-friendly color palette"
            aria-pressed={colorBlindMode}
          >
            👁️
          </button>
        </div>
      </main>

      {/* Bottom Panel - Remove redundant role */}
      <div 
        className="bottom-panel"
        style={{ height: `${bottomPanelHeight}px` }}
        aria-label="Data Table"
        id="data-table"
      >
        {/* Resize Handle */}
        <div 
          className="resize-handle"
          onMouseDown={handleBottomPanelResize}
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize data panel"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              setBottomPanelHeight(prev => Math.min(600, prev + 20));
            } else if (e.key === 'ArrowDown') {
              setBottomPanelHeight(prev => Math.max(200, prev - 20));
            }
          }}
        >
          <div className="resize-indicator" aria-hidden="true"></div>
        </div>
        
        <div className="panel-content">
          {bottomPanel}
        </div>
      </div>

      {/* Screen Reader Announcements */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
        id="announcements"
      />
    </div>
  );
};

export default ResponsiveLayout;