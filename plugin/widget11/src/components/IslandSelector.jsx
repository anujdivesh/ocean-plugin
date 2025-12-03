/**
 * Island Selector Component
 * 
 * Provides island selection UI with "Tuvalu" whole domain option
 */

import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Dropdown } from 'react-bootstrap';
import { TreePalm } from 'lucide-react';
import multiIslandManager from '../services/MultiIslandManager';
import TuvaluConfig from '../config/TuvaluConfig';
import logger from '../utils/logger';
import './IslandSelector.css';

// Special "Tuvalu" option for whole domain view
const TUVALU_WHOLE_DOMAIN = {
  name: 'Tuvalu',
  lat: -8.0, // Center of Tuvalu
  lon: 178.0,
  dataset: 'tuvalu_forecast',
  wmsUrl: TuvaluConfig.WMS_BASE_URL, // Tuvalu.nc for whole domain
  isWholeDomain: true
};

const IslandSelector = ({
  onIslandChange,
  currentIsland,
  islandManager = multiIslandManager, // Dependency injection with default
  // Persist selection control removed
  variant = 'full'
}) => {
  const [islands, setIslands] = useState([]);
  const [selectedIsland, setSelectedIsland] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const allIslands = islandManager.getAllIslands();
    setIslands(allIslands);
    
    if (currentIsland) {
      if (currentIsland === 'Tuvalu') {
        setSelectedIsland(TUVALU_WHOLE_DOMAIN);
      } else {
        const island = islandManager.getIslandByName(currentIsland);
        setSelectedIsland(island);
      }
    }
  }, [currentIsland, islandManager]);

  const regionStats = useMemo(() => {
    const stats = { north: 0, central: 0, south: 0 };
    islands.forEach((island) => {
      if (island.lat > -7.0) stats.north += 1;
      else if (island.lat > -9.0) stats.central += 1;
      else stats.south += 1;
    });
    return stats;
  }, [islands]);

  // selection lock feature removed
  const isCompact = variant === 'compact';

  const currentSummary = selectedIsland
    ? selectedIsland.isWholeDomain
      ? 'National scale (Tuvalu.nc) active'
      : `${selectedIsland.name} high-resolution grid`
    : 'Explore Tuvalu’s nine atolls in high resolution';

  // selection lock feature removed

  const handleIslandSelect = (island) => {
    // Only set current island in manager for individual islands, not whole domain
    if (!island.isWholeDomain) {
      islandManager.setCurrentIsland(island.name);
    }
    setSelectedIsland(island);
    logger.island(island.name, island.isWholeDomain ? 'Selected whole domain' : 'Selected');
    
    if (onIslandChange) {
      onIslandChange(island);
    }
  };
  
  // Refactored to reuse handleIslandSelect logic
  const handleTuvaluSelect = () => {
    handleIslandSelect(TUVALU_WHOLE_DOMAIN);
  };

  const getRegionColor = (lat) => {
    if (lat > -7.0) return '#28a745'; // North - Green
    if (lat > -9.0) return '#ffc107'; // Central - Yellow
    return '#007bff'; // South - Blue
  };

  const getRegionName = (lat) => {
    if (lat > -7.0) return 'North';
    if (lat > -9.0) return 'Central';
    return 'South';
  };

  const getRegionClass = (lat) => {
    if (lat > -7.0) return 'region-pill--north';
    if (lat > -9.0) return 'region-pill--central';
    return 'region-pill--south';
  };

  const modeSummary = selectedIsland?.isWholeDomain
    ? {
        label: 'National Domain',
        caption: 'Tuvalu.nc',
        accent: 'mode-chip--domain'
      }
    : selectedIsland
      ? {
          label: `${selectedIsland.name} Focus`,
          caption: selectedIsland.dataset,
          accent: 'mode-chip--island'
        }
      : {
          label: 'Awaiting Selection',
          caption: 'Choose any atoll',
          accent: 'mode-chip--idle'
        };

  return (
    <div className={`island-selector-container ${isCompact ? 'compact' : ''}`}>
      {!isCompact && (
        <>
          <div className="island-selector-header">
            <div>
              <span className="selector-eyebrow">Tuvalu Marine Network</span>
              <h4 className="selector-title">Island Command Center</h4>
              <p className="selector-description">{currentSummary}</p>
            </div>
            {/* selection lock removed */}
          </div>

          <div className="island-selector-stats">
            <div className="stat-block">
              <span className="stat-label">North</span>
              <strong className="stat-value">{regionStats.north}</strong>
            </div>
            <div className="stat-block">
              <span className="stat-label">Central</span>
              <strong className="stat-value">{regionStats.central}</strong>
            </div>
            <div className="stat-block">
              <span className="stat-label">South</span>
              <strong className="stat-value">{regionStats.south}</strong>
            </div>
            <div className="stat-block highlight">
              <span className="stat-label">Total</span>
              <strong className="stat-value">{islands.length}</strong>
            </div>
          </div>

          <div className={`selector-mode-chip ${modeSummary.accent}`}>
            <div>
              <span className="mode-label">{modeSummary.label}</span>
              <span className="mode-caption">{modeSummary.caption}</span>
            </div>
            {!selectedIsland?.isWholeDomain && selectedIsland?.dataset && (
              <span className="mode-pill">High-Res</span>
            )}
          </div>
        </>
      )}

      {isCompact && (
        <div className="compact-location-header">
          <div className="compact-text">
            <span className="selector-eyebrow">Active Dataset</span>
            <p className="selector-description">{currentSummary}</p>
          </div>
          {/* selection lock mini removed */}
        </div>
      )}

      {/* Main Island Selector */}
      <Dropdown className="island-dropdown" show={menuOpen} onToggle={(isOpen) => setMenuOpen(isOpen)}>
        <Dropdown.Toggle variant="primary" id="island-selector">
          <span className="selector-icon">
            <TreePalm size={18} strokeWidth={2} />
          </span>
          {selectedIsland ? selectedIsland.name : 'Select Island'}
          {selectedIsland?.isCapital && <span className="capital-pill ms-2">Capital</span>}
          {selectedIsland?.isWholeDomain && <span className="region-pill region-pill--domain ms-2">All Islands</span>}
        </Dropdown.Toggle>

        <Dropdown.Menu className={menuOpen ? 'show' : ''}>
          {/* Tuvalu whole domain option at the top */}
          <Dropdown.Header>Tuvalu Domain</Dropdown.Header>
          <Dropdown.Item
            onClick={handleTuvaluSelect}
            active={selectedIsland?.isWholeDomain === true}
          >
            <div className="d-flex justify-content-between align-items-center">
              <span>
                🌊 Tuvalu
                <span className="region-pill region-pill--domain ms-2">Whole Domain</span>
              </span>
            </div>
          </Dropdown.Item>
          
          <Dropdown.Divider />
          <Dropdown.Header>Select Atoll</Dropdown.Header>
          {islands.map((island) => (
            <Dropdown.Item
              key={island.name}
              onClick={() => handleIslandSelect(island)}
              active={selectedIsland?.name === island.name && !selectedIsland?.isWholeDomain}
            >
              <div className="d-flex justify-content-between align-items-center">
                <span>
                  {island.name}
                  {island.isCapital && <span className="capital-pill ms-2">Capital</span>}
                </span>
                <span 
                  className={`region-pill ${getRegionClass(island.lat)}`}
                  style={{ backgroundColor: getRegionColor(island.lat) }}
                >
                  {getRegionName(island.lat)}
                </span>
              </div>
            </Dropdown.Item>
          ))}
      </Dropdown.Menu>
    </Dropdown>

    
  
    </div>
  );
};

IslandSelector.propTypes = {
  onIslandChange: PropTypes.func,
  currentIsland: PropTypes.string,
  islandManager: PropTypes.shape({
    getAllIslands: PropTypes.func,
    getIslandByName: PropTypes.func,
    setCurrentIsland: PropTypes.func
  }),
  persistIslandSelection: PropTypes.bool,
  onPersistToggle: PropTypes.func,
  variant: PropTypes.oneOf(['full', 'compact'])
};

export default IslandSelector;
