/**
 * Island Selector Component
 * 
 * Provides island selection UI with "Tuvalu" whole domain option
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, Badge, Card } from 'react-bootstrap';
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
  islandManager = multiIslandManager // Dependency injection with default
}) => {
  const [islands, setIslands] = useState([]);
  const [selectedIsland, setSelectedIsland] = useState(null);
  const [showProfiles, setShowProfiles] = useState(false);

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

  const handleIslandSelect = (island) => {
    if (!island.isWholeDomain) {
      islandManager.setCurrentIsland(island.name);
    }
    setSelectedIsland(island);
    logger.island(island.name, island.isWholeDomain ? 'Selected whole domain' : 'Selected');
    
    if (onIslandChange) {
      onIslandChange(island);
    }
  };
  
  const handleTuvaluSelect = () => {
    setSelectedIsland(TUVALU_WHOLE_DOMAIN);
    logger.info('ISLAND', 'Tuvalu whole domain selected');
    
    if (onIslandChange) {
      // Pass the TUVALU_WHOLE_DOMAIN object for consistent state handling
      onIslandChange(TUVALU_WHOLE_DOMAIN);
    }
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

  return (
    <div className="island-selector-container">
      {/* Main Island Selector */}
      <Dropdown className="island-dropdown">
        <Dropdown.Toggle variant="primary" id="island-selector">
          🏝️ {selectedIsland ? selectedIsland.name : 'Select Island'}
          {selectedIsland?.isCapital && <Badge bg="warning" className="ms-2">Capital</Badge>}
          {selectedIsland?.isWholeDomain && <Badge bg="info" className="ms-2">All Islands</Badge>}
        </Dropdown.Toggle>

        <Dropdown.Menu>
          {/* Tuvalu whole domain option at the top */}
          <Dropdown.Header>Tuvalu Domain</Dropdown.Header>
          <Dropdown.Item
            onClick={handleTuvaluSelect}
            active={selectedIsland?.isWholeDomain === true}
          >
            <div className="d-flex justify-content-between align-items-center">
              <span>
                🌊 Tuvalu
                <Badge bg="info" size="sm" className="ms-2">Whole Domain</Badge>
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
                  {island.isCapital && <Badge bg="warning" size="sm" className="ms-2">Capital</Badge>}
                </span>
                <Badge 
                  bg="light" 
                  text="dark"
                  style={{ 
                    backgroundColor: getRegionColor(island.lat),
                    color: 'white'
                  }}
                >
                  {getRegionName(island.lat)}
                </Badge>
              </div>
            </Dropdown.Item>
          ))}
          <Dropdown.Divider />
          <Dropdown.Item onClick={() => setShowProfiles(!showProfiles)}>
            📊 {showProfiles ? 'Hide' : 'Show'} Island Profiles
          </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>

    
  

      {/* Island Profiles */}
      {showProfiles && selectedIsland && (
        <div className="island-profile mt-3">
          <Card>
            <Card.Header>
              <strong>{selectedIsland.name} Profile</strong>
            </Card.Header>
            <Card.Body>
              {selectedIsland.isWholeDomain ? (
                <>
                  <p><strong>Coverage:</strong> All 9 Tuvalu Atolls</p>
                  <p><strong>Dataset:</strong> Tuvalu.nc (Full Domain)</p>
                  <Badge bg="info">National Scale View</Badge>
                </>
              ) : (
                <>
                  <p><strong>Coordinates:</strong> {selectedIsland.lat.toFixed(4)}°S, {selectedIsland.lon.toFixed(4)}°E</p>
                  <p><strong>Region:</strong> {getRegionName(selectedIsland.lat)}</p>
                  <p><strong>Dataset:</strong> {selectedIsland.dataset}</p>
                  {selectedIsland.isCapital && (
                    <Badge bg="warning">Capital of Tuvalu</Badge>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </div>
      )}
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
  })
};

export default IslandSelector;
