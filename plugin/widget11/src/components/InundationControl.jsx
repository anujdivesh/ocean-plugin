/**
 * InundationControl Component
 * 
 * UI control for managing inundation forecast points display
 * Provides toggle, atoll filtering, and statistics display
 */

import React, { useState, useEffect, useCallback } from 'react';
import { CloudRain, Eye, EyeOff, Loader, AlertCircle } from 'lucide-react';
import FancyIcon from './FancyIcon';
import '../styles/InundationPoints.css';

const InundationControl = ({ 
  loadPoints,
  isVisible,
  onToggle,
  stats,
  isLoading,
  error,
  position = 'topright' 
}) => {
  const [selectedAtoll, setSelectedAtoll] = useState('all');
  const [showStats, setShowStats] = useState(false);
  const [riskFilter, setRiskFilter] = useState('all'); // 'all', 'high-medium', 'high-only'
  
  // Available atolls in Tuvalu
  const atolls = [
    { value: 'all', label: 'All Atolls' },
    { value: 'Nanumaga', label: 'Nanumaga' },
    { value: 'Nanumea', label: 'Nanumea' },
    { value: 'Niutao', label: 'Niutao' },
    { value: 'Nui', label: 'Nui' },
    { value: 'Vaitupu', label: 'Vaitupu' },
    { value: 'Nukufetau', label: 'Nukufetau' },
    { value: 'Funafuti', label: 'Funafuti' },
    { value: 'Nukulaelae', label: 'Nukulaelae' },
    { value: 'Niulakita', label: 'Niulakita' }
  ];
  
  // Load points when visibility changes or atoll selection changes
  const performLoad = useCallback(() => {
    if (!isVisible || !loadPoints) {
      return Promise.resolve();
    }

    const options = { 
      atoll: selectedAtoll !== 'all' ? selectedAtoll : undefined,
      riskFilter
    };

    return loadPoints(options);
  }, [isVisible, loadPoints, riskFilter, selectedAtoll]);

  useEffect(() => {
    if (!isVisible) return;

    performLoad().catch(err => {
      // Hook already exposes error state; log for debugging only.
      console.error('Failed to load inundation points:', err);
    });
  }, [isVisible, performLoad]);
  
  const handleToggle = () => {
    console.log('🖱️ Inundation button clicked!', { 
      onToggle: typeof onToggle,
      onToggleName: onToggle?.name,
      isVisible,
      loadPoints: typeof loadPoints
    });
    
    try {
      if (onToggle) {
        console.log('📞 Calling onToggle()...');
        onToggle();
        console.log('✅ onToggle() completed');
      } else {
        console.error('❌ onToggle prop is missing!');
      }
    } catch (err) {
      console.error('💥 Error in handleToggle:', err);
    }
  };
  
  const handleAtollChange = (e) => {
    setSelectedAtoll(e.target.value);
  };
  
  const positionClass = `inundation-control-${position}`;
  
  return (
    <div className={`inundation-control ${positionClass}`}>
      {/* Main toggle button */}
      <button
        className={`inundation-toggle ${isVisible ? 'active' : ''}`}
        onClick={handleToggle}
        disabled={isLoading}
        title={isVisible ? 'Hide Inundation Points' : 'Show Inundation Points'}
      >
        {isLoading ? (
          <Loader className="inundation-toggle-icon" style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <FancyIcon 
            icon={CloudRain} 
            animationType="shimmer" 
            size={16} 
            color={isVisible ? 'white' : '#2196F3'}
          />
        )}
        <span>{isVisible ? 'Hide' : 'Show'} Inundation</span>
        {isVisible && (
          <FancyIcon 
            icon={Eye} 
            animationType="pulse" 
            size={14} 
            color="white"
          />
        )}
        {!isVisible && (
          <FancyIcon 
            icon={EyeOff} 
            animationType="fade" 
            size={14} 
            color="#666"
          />
        )}
      </button>
      
      {/* Expanded controls when visible */}
      {isVisible && (
        <div className="inundation-controls-expanded">
          {/* Risk level filter */}
          <div className="inundation-atoll-selector">
            <label htmlFor="risk-filter">Filter by Risk:</label>
            <select 
              id="risk-filter"
              value={riskFilter} 
              onChange={(e) => setRiskFilter(e.target.value)}
              disabled={isLoading}
            >
              <option value="all">All Risk Levels ({stats?.total || '2905'} points)</option>
              <option value="low-only">🟢 Low Risk Only ({stats?.lowRisk || '~2903'} points)</option>
              <option value="moderate-only">🟡 Moderate Risk Only ({stats?.moderateRisk || '~2'} points)</option>
              <option value="high-only">🔴 High Risk Only ({stats?.highRisk || '~0'} points)</option>
            </select>
            {console.log('🎯 InundationControl stats:', stats, 'selectedAtoll:', selectedAtoll)}
            {riskFilter === 'moderate-only' && (
              <div className="inundation-warning-note">
                ℹ️ Very few moderate risk points in current forecast
              </div>
            )}
            {riskFilter === 'high-only' && stats?.highRisk === 0 && (
              <div className="inundation-warning-note">
                ✅ No high risk inundation points in current forecast
              </div>
            )}
          </div>
          
          {/* Atoll selector */}
          <div className="inundation-atoll-selector">
            <label htmlFor="atoll-select">Filter by Atoll:</label>
            <select 
              id="atoll-select"
              value={selectedAtoll} 
              onChange={handleAtollChange}
              disabled={isLoading}
            >
              {atolls.map(atoll => (
                <option key={atoll.value} value={atoll.value}>
                  {atoll.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Performance warning for "All" filter */}
          {riskFilter === 'all' && selectedAtoll === 'all' && (
            <div className="inundation-warning-card">
              ⚠️ Showing all {stats?.total || '2900+'} points may slow down the map. Consider filtering by atoll or risk level.
            </div>
          )}
          
          {/* Error display */}
          {error && (
            <div className="inundation-error">
              <AlertCircle size={16} />
              <div style={{ flex: 1 }}>
                <div>{error}</div>
                <button
                  onClick={() => {
                    performLoad().catch(err => {
                      console.error('Retry failed to load inundation points:', err);
                    });
                  }}
                  style={{
                    marginTop: '8px',
                    padding: '4px 8px',
                    background: '#C62828',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Retry
                </button>
              </div>
            </div>
          )}
          
          {/* Statistics toggle */}
          {stats && (
            <button
              className="inundation-stats-toggle"
              onClick={() => setShowStats(!showStats)}
            >
              {showStats ? 'Hide' : 'Show'} Statistics
            </button>
          )}
          
          {/* Statistics panel */}
          {showStats && stats && (
            <div className="inundation-stats">
              <div className="inundation-stats-title">Inundation Points</div>
              
              <div className="inundation-stats-item">
                <span className="inundation-stats-label">Total Points:</span>
                <span className="inundation-stats-value">{stats.total}</span>
              </div>
              
              {stats.byRiskLevel && (
                <>
                  <div className="inundation-stats-item">
                    <span className="inundation-stats-label">
                      <span className="inundation-stats-color" style={{ backgroundColor: '#2196F3' }}></span>
                      Low Risk:
                    </span>
                    <span className="inundation-stats-value">{stats.byRiskLevel.low}</span>
                  </div>
                  
                  <div className="inundation-stats-item">
                    <span className="inundation-stats-label">
                      <span className="inundation-stats-color" style={{ backgroundColor: '#FF9800' }}></span>
                      Medium Risk:
                    </span>
                    <span className="inundation-stats-value">{stats.byRiskLevel.medium}</span>
                  </div>
                  
                  <div className="inundation-stats-item">
                    <span className="inundation-stats-label">
                      <span className="inundation-stats-color" style={{ backgroundColor: '#F44336' }}></span>
                      High Risk:
                    </span>
                    <span className="inundation-stats-value">{stats.byRiskLevel.high}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InundationControl;
