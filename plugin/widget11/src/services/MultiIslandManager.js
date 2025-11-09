/**
 * World-Class Multi-Island Management System
 * 
 * Manages island data, comparisons, routing, and aggregated views
 * for Tuvalu's 9 atolls
 */

import TuvaluConfig from '../config/TuvaluConfig';
import logger from '../utils/logger';

class MultiIslandManager {
  constructor() {
    this.islands = TuvaluConfig.TUVALU_ATOLLS;
    this.currentIsland = null;
    this.selectedIslands = [];
    this.islandData = new Map();
    this.comparisonMode = false;
  }

  /**
   * Get all islands
   * @returns {Array} - All Tuvalu atolls
   */
  getAllIslands() {
    return this.islands;
  }

  /**
   * Get island by name
   * @param {string} name - Island name
   * @returns {Object|null} - Island configuration
   */
  getIslandByName(name) {
    const island = this.islands.find(i => 
      i.name.toLowerCase() === name.toLowerCase()
    );
    
    if (!island) {
      logger.warn('ISLAND', `Island not found: ${name}`);
    }
    
    return island;
  }

  /**
   * Set current active island
   * @param {string} islandName - Island name
   */
  setCurrentIsland(islandName) {
    const island = this.getIslandByName(islandName);
    
    if (island) {
      this.currentIsland = island;
      logger.island(island.name, 'Selected as current island');
      return true;
    }
    
    return false;
  }

  /**
   * Get current island
   * @returns {Object|null}
   */
  getCurrentIsland() {
    return this.currentIsland;
  }

  /**
   * Toggle comparison mode
   */
  toggleComparisonMode() {
    this.comparisonMode = !this.comparisonMode;
    logger.info('COMPARISON', `Comparison mode: ${this.comparisonMode ? 'ON' : 'OFF'}`);
    return this.comparisonMode;
  }

  /**
   * Add island to comparison
   * @param {string} islandName - Island to add
   */
  addToComparison(islandName) {
    const island = this.getIslandByName(islandName);
    
    if (!island) return false;
    
    if (!this.selectedIslands.find(i => i.name === island.name)) {
      this.selectedIslands.push(island);
      logger.island(island.name, 'Added to comparison', { 
        total: this.selectedIslands.length 
      });
      return true;
    }
    
    return false;
  }

  /**
   * Remove island from comparison
   * @param {string} islandName - Island to remove
   */
  removeFromComparison(islandName) {
    const index = this.selectedIslands.findIndex(i => 
      i.name.toLowerCase() === islandName.toLowerCase()
    );
    
    if (index !== -1) {
      this.selectedIslands.splice(index, 1);
      logger.island(islandName, 'Removed from comparison', {
        remaining: this.selectedIslands.length
      });
      return true;
    }
    
    return false;
  }

  /**
   * Clear comparison selection
   */
  clearComparison() {
    this.selectedIslands = [];
    logger.info('COMPARISON', 'Cleared all selected islands');
  }

  /**
   * Get islands in comparison
   * @returns {Array}
   */
  getComparisonIslands() {
    return this.selectedIslands;
  }

  /**
   * Store island-specific data
   * @param {string} islandName - Island name
   * @param {string} dataType - Type of data (inundation, forecast, etc.)
   * @param {*} data - Data to store
   */
  setIslandData(islandName, dataType, data) {
    const key = `${islandName}-${dataType}`;
    this.islandData.set(key, {
      island: islandName,
      type: dataType,
      data,
      timestamp: new Date().toISOString()
    });
    
    logger.island(islandName, `Stored ${dataType} data`, {
      dataSize: JSON.stringify(data).length
    });
  }

  /**
   * Get island-specific data
   * @param {string} islandName - Island name
   * @param {string} dataType - Type of data
   * @returns {*}
   */
  getIslandData(islandName, dataType) {
    const key = `${islandName}-${dataType}`;
    const stored = this.islandData.get(key);
    return stored?.data;
  }

  /**
   * Get aggregated statistics across all islands
   * @param {string} dataType - Type of data to aggregate
   * @returns {Object}
   */
  getAggregatedStats(dataType) {
    const stats = {
      totalIslands: this.islands.length,
      dataAvailable: 0,
      aggregatedData: []
    };

    this.islands.forEach(island => {
      const data = this.getIslandData(island.name, dataType);
      if (data) {
        stats.dataAvailable++;
        stats.aggregatedData.push({
          island: island.name,
          data
        });
      }
    });

    logger.info('AGGREGATION', `${dataType} stats`, stats);
    return stats;
  }

  /**
   * Get islands by geographic region (North, Central, South)
   * @param {string} region - 'north', 'central', or 'south'
   * @returns {Array}
   */
  getIslandsByRegion(region) {
    const regions = {
      north: this.islands.filter(i => i.lat > -7.0),
      central: this.islands.filter(i => i.lat >= -9.0 && i.lat <= -7.0),
      south: this.islands.filter(i => i.lat < -9.0)
    };

    return regions[region.toLowerCase()] || [];
  }

  /**
   * Calculate distance between two islands (simple Haversine)
   * @param {string} island1Name
   * @param {string} island2Name
   * @returns {number} - Distance in kilometers
   */
  calculateDistance(island1Name, island2Name) {
    const island1 = this.getIslandByName(island1Name);
    const island2 = this.getIslandByName(island2Name);

    if (!island1 || !island2) return null;

    const R = 6371; // Earth radius in km
    const dLat = this.toRad(island2.lat - island1.lat);
    const dLon = this.toRad(island2.lon - island1.lon);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(island1.lat)) * 
              Math.cos(this.toRad(island2.lat)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 10) / 10; // Round to 1 decimal
  }

  toRad(degrees) {
    return degrees * Math.PI / 180;
  }

  /**
   * Get nearest islands to a given island
   * @param {string} islandName - Reference island
   * @param {number} limit - Number of nearest islands to return
   * @returns {Array}
   */
  getNearestIslands(islandName, limit = 3) {
    const referenceIsland = this.getIslandByName(islandName);
    
    if (!referenceIsland) return [];

    const distances = this.islands
      .filter(i => i.name !== islandName)
      .map(i => ({
        island: i,
        distance: this.calculateDistance(islandName, i.name)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    logger.island(islandName, `Found ${limit} nearest islands`, {
      nearest: distances.map(d => ({ name: d.island.name, km: d.distance }))
    });

    return distances;
  }

  /**
   * Get island health score based on data availability
   * @param {string} islandName - Island name
   * @returns {Object}
   */
  getIslandHealth(islandName) {
    const dataTypes = ['inundation', 'forecast', 'waveHeight', 'wavePeriod'];
    const available = dataTypes.filter(type => 
      this.getIslandData(islandName, type) !== undefined
    );

    const score = (available.length / dataTypes.length) * 100;
    const status = score === 100 ? 'excellent' : 
                   score >= 75 ? 'good' :
                   score >= 50 ? 'fair' : 'poor';

    return {
      island: islandName,
      score: Math.round(score),
      status,
      availableData: available,
      missingData: dataTypes.filter(t => !available.includes(t))
    };
  }

  /**
   * Get comprehensive island profile
   * @param {string} islandName - Island name
   * @returns {Object}
   */
  getIslandProfile(islandName) {
    const island = this.getIslandByName(islandName);
    
    if (!island) return null;

    return {
      ...island,
      health: this.getIslandHealth(islandName),
      nearestIslands: this.getNearestIslands(islandName, 2),
      region: island.lat > -7.0 ? 'North' : 
              island.lat > -9.0 ? 'Central' : 'South',
      isCapital: island.isCapital || false,
      datasets: {
        forecast: island.dataset,
        wms: `${TuvaluConfig.WMS_BASE_URL}?LAYERS=${island.dataset}/hs`
      }
    };
  }
}

// Singleton instance
const multiIslandManager = new MultiIslandManager();

export default multiIslandManager;
export { MultiIslandManager };
