/**
 * MultiIslandManager Service Tests
 * 
 * Tests for island management, distance calculations, and analytics
 */

import multiIslandManager, { MultiIslandManager } from './MultiIslandManager';
import TuvaluConfig from '../config/TuvaluConfig';

describe('MultiIslandManager', () => {
  let manager;

  beforeEach(() => {
    // Create fresh instance for each test
    manager = new MultiIslandManager();
  });

  describe('Island Management', () => {
    test('should return all 9 Tuvalu atolls', () => {
      const islands = manager.getAllIslands();
      expect(islands).toHaveLength(9);
      expect(islands[0]).toHaveProperty('name');
      expect(islands[0]).toHaveProperty('lat');
      expect(islands[0]).toHaveProperty('lon');
    });

    test('should find island by name (case-insensitive)', () => {
      const funafuti = manager.getIslandByName('Funafuti');
      expect(funafuti).toBeDefined();
      expect(funafuti.name).toBe('Funafuti');
      expect(funafuti.isCapital).toBe(true);

      const funafutiLower = manager.getIslandByName('funafuti');
      expect(funafutiLower).toBeDefined();
      expect(funafutiLower.name).toBe('Funafuti');
    });

    test('should return null for non-existent island', () => {
      const island = manager.getIslandByName('NonExistent');
      expect(island).toBeUndefined();
    });

    test('should set current island', () => {
      const success = manager.setCurrentIsland('Nanumea');
      expect(success).toBe(true);
      expect(manager.getCurrentIsland().name).toBe('Nanumea');
    });

    test('should fail to set non-existent island', () => {
      const success = manager.setCurrentIsland('FakeIsland');
      expect(success).toBe(false);
      expect(manager.getCurrentIsland()).toBeNull();
    });
  });

  describe('Comparison Mode', () => {
    test('should toggle comparison mode', () => {
      expect(manager.comparisonMode).toBe(false);
      
      const result1 = manager.toggleComparisonMode();
      expect(result1).toBe(true);
      expect(manager.comparisonMode).toBe(true);

      const result2 = manager.toggleComparisonMode();
      expect(result2).toBe(false);
      expect(manager.comparisonMode).toBe(false);
    });

    test('should add islands to comparison', () => {
      const success = manager.addToComparison('Funafuti');
      expect(success).toBe(true);
      expect(manager.getComparisonIslands()).toHaveLength(1);
      expect(manager.getComparisonIslands()[0].name).toBe('Funafuti');
    });

    test('should not add duplicate islands', () => {
      manager.addToComparison('Funafuti');
      const success = manager.addToComparison('Funafuti');
      expect(success).toBe(false);
      expect(manager.getComparisonIslands()).toHaveLength(1);
    });

    test('should add multiple islands', () => {
      manager.addToComparison('Funafuti');
      manager.addToComparison('Nanumea');
      manager.addToComparison('Niulakita');
      expect(manager.getComparisonIslands()).toHaveLength(3);
    });

    test('should remove island from comparison', () => {
      manager.addToComparison('Funafuti');
      manager.addToComparison('Nanumea');
      
      const success = manager.removeFromComparison('Funafuti');
      expect(success).toBe(true);
      expect(manager.getComparisonIslands()).toHaveLength(1);
      expect(manager.getComparisonIslands()[0].name).toBe('Nanumea');
    });

    test('should clear all comparison islands', () => {
      manager.addToComparison('Funafuti');
      manager.addToComparison('Nanumea');
      manager.addToComparison('Niulakita');
      
      manager.clearComparison();
      expect(manager.getComparisonIslands()).toHaveLength(0);
    });
  });

  describe('Distance Calculations (Haversine Formula)', () => {
    test('should calculate distance between Funafuti and Nanumea', () => {
      // Funafuti: -8.5167, 179.1967
      // Nanumea: -5.6883, 176.1367
      // Expected: ~460 km
      const distance = manager.calculateDistance('Funafuti', 'Nanumea');
      expect(distance).toBeGreaterThan(450);
      expect(distance).toBeLessThan(470);
    });

    test('should calculate distance between adjacent atolls', () => {
      const distance = manager.calculateDistance('Nukufetau', 'Funafuti');
      expect(distance).toBeGreaterThan(50);
      expect(distance).toBeLessThan(100);
    });

    test('should return null for invalid island names', () => {
      const distance = manager.calculateDistance('Funafuti', 'FakeIsland');
      expect(distance).toBeNull();
    });

    test('should return null when either island is missing', () => {
      const distance1 = manager.calculateDistance('FakeIsland1', 'FakeIsland2');
      expect(distance1).toBeNull();
    });

    test('should return distance in kilometers rounded to 1 decimal', () => {
      const distance = manager.calculateDistance('Funafuti', 'Nanumea');
      const decimalPlaces = (distance.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(1);
    });
  });

  describe('Nearest Islands', () => {
    test('should find nearest islands to Funafuti', () => {
      const nearest = manager.getNearestIslands('Funafuti', 3);
      expect(nearest).toHaveLength(3);
      expect(nearest[0]).toHaveProperty('island');
      expect(nearest[0]).toHaveProperty('distance');
      
      // Should be sorted by distance (closest first)
      expect(nearest[0].distance).toBeLessThan(nearest[1].distance);
      expect(nearest[1].distance).toBeLessThan(nearest[2].distance);
    });

    test('should exclude the reference island from nearest list', () => {
      const nearest = manager.getNearestIslands('Nanumea', 8);
      const islandNames = nearest.map(n => n.island.name);
      expect(islandNames).not.toContain('Nanumea');
    });

    test('should handle limit parameter', () => {
      const nearest2 = manager.getNearestIslands('Funafuti', 2);
      expect(nearest2).toHaveLength(2);

      const nearest5 = manager.getNearestIslands('Funafuti', 5);
      expect(nearest5).toHaveLength(5);
    });

    test('should return empty array for non-existent island', () => {
      const nearest = manager.getNearestIslands('FakeIsland', 3);
      expect(nearest).toHaveLength(0);
    });
  });

  describe('Regional Grouping', () => {
    test('should get northern islands (lat > -7.0)', () => {
      const northIslands = manager.getIslandsByRegion('north');
      expect(northIslands.length).toBeGreaterThan(0);
      northIslands.forEach(island => {
        expect(island.lat).toBeGreaterThan(-7.0);
      });
    });

    test('should get central islands (-9.0 <= lat <= -7.0)', () => {
      const centralIslands = manager.getIslandsByRegion('central');
      expect(centralIslands.length).toBeGreaterThan(0);
      centralIslands.forEach(island => {
        expect(island.lat).toBeGreaterThanOrEqual(-9.0);
        expect(island.lat).toBeLessThanOrEqual(-7.0);
      });
    });

    test('should get southern islands (lat < -9.0)', () => {
      const southIslands = manager.getIslandsByRegion('south');
      expect(southIslands.length).toBeGreaterThan(0);
      southIslands.forEach(island => {
        expect(island.lat).toBeLessThan(-9.0);
      });
    });

    test('should return empty array for invalid region', () => {
      const islands = manager.getIslandsByRegion('invalid');
      expect(islands).toHaveLength(0);
    });

    test('should handle case-insensitive region names', () => {
      const north1 = manager.getIslandsByRegion('NORTH');
      const north2 = manager.getIslandsByRegion('north');
      expect(north1.length).toBe(north2.length);
    });

    test('should have all 9 islands distributed across regions', () => {
      const north = manager.getIslandsByRegion('north');
      const central = manager.getIslandsByRegion('central');
      const south = manager.getIslandsByRegion('south');
      expect(north.length + central.length + south.length).toBe(9);
    });
  });

  describe('Island Data Storage', () => {
    test('should store island-specific data', () => {
      const mockData = { depth: 0.5, points: 10 };
      manager.setIslandData('Funafuti', 'inundation', mockData);
      
      const retrieved = manager.getIslandData('Funafuti', 'inundation');
      expect(retrieved).toEqual(mockData);
    });

    test('should return undefined for non-existent data', () => {
      const data = manager.getIslandData('Funafuti', 'nonexistent');
      expect(data).toBeUndefined();
    });

    test('should store multiple data types for same island', () => {
      manager.setIslandData('Funafuti', 'inundation', { depth: 0.5 });
      manager.setIslandData('Funafuti', 'forecast', { waveHeight: 2.0 });
      
      expect(manager.getIslandData('Funafuti', 'inundation')).toEqual({ depth: 0.5 });
      expect(manager.getIslandData('Funafuti', 'forecast')).toEqual({ waveHeight: 2.0 });
    });
  });

  describe('Island Health Metrics', () => {
    test('should calculate health score based on available data', () => {
      manager.setIslandData('Funafuti', 'inundation', { depth: 0.5 });
      manager.setIslandData('Funafuti', 'forecast', { waveHeight: 2.0 });
      
      const health = manager.getIslandHealth('Funafuti');
      expect(health).toHaveProperty('score');
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('availableData');
      expect(health).toHaveProperty('missingData');
      expect(health.score).toBe(50); // 2 out of 4 data types
    });

    test('should have excellent status for 100% data', () => {
      manager.setIslandData('Funafuti', 'inundation', {});
      manager.setIslandData('Funafuti', 'forecast', {});
      manager.setIslandData('Funafuti', 'waveHeight', {});
      manager.setIslandData('Funafuti', 'wavePeriod', {});
      
      const health = manager.getIslandHealth('Funafuti');
      expect(health.score).toBe(100);
      expect(health.status).toBe('excellent');
    });

    test('should categorize health status correctly', () => {
      // Poor: 0-49%
      const poor = manager.getIslandHealth('EmptyIsland');
      expect(poor.status).toBe('poor');

      // Fair: 50-74%
      manager.setIslandData('FairIsland', 'inundation', {});
      manager.setIslandData('FairIsland', 'forecast', {});
      const fair = manager.getIslandHealth('FairIsland');
      expect(fair.status).toBe('fair');

      // Good: 75-99%
      manager.setIslandData('GoodIsland', 'inundation', {});
      manager.setIslandData('GoodIsland', 'forecast', {});
      manager.setIslandData('GoodIsland', 'waveHeight', {});
      const good = manager.getIslandHealth('GoodIsland');
      expect(good.status).toBe('good');
    });
  });

  describe('Island Profile', () => {
    test('should get comprehensive island profile', () => {
      const profile = manager.getIslandProfile('Funafuti');
      
      expect(profile).toHaveProperty('name', 'Funafuti');
      expect(profile).toHaveProperty('lat');
      expect(profile).toHaveProperty('lon');
      expect(profile).toHaveProperty('dataset');
      expect(profile).toHaveProperty('isCapital', true);
      expect(profile).toHaveProperty('health');
      expect(profile).toHaveProperty('nearestIslands');
      expect(profile).toHaveProperty('region');
      expect(profile).toHaveProperty('datasets');
    });

    test('should determine correct region in profile', () => {
      const nanumea = manager.getIslandProfile('Nanumea');
      expect(nanumea.region).toBe('North');

      const funafuti = manager.getIslandProfile('Funafuti');
      expect(funafuti.region).toBe('Central');

      const niulakita = manager.getIslandProfile('Niulakita');
      expect(niulakita.region).toBe('South');
    });

    test('should include nearest islands in profile', () => {
      const profile = manager.getIslandProfile('Funafuti');
      expect(profile.nearestIslands).toHaveLength(2);
      expect(profile.nearestIslands[0]).toHaveProperty('island');
      expect(profile.nearestIslands[0]).toHaveProperty('distance');
    });

    test('should return null for non-existent island profile', () => {
      const profile = manager.getIslandProfile('FakeIsland');
      expect(profile).toBeNull();
    });
  });

  describe('Aggregated Statistics', () => {
    test('should aggregate statistics across all islands', () => {
      manager.setIslandData('Funafuti', 'inundation', { depth: 0.5 });
      manager.setIslandData('Nanumea', 'inundation', { depth: 0.3 });
      manager.setIslandData('Niulakita', 'inundation', { depth: 0.8 });
      
      const stats = manager.getAggregatedStats('inundation');
      expect(stats.totalIslands).toBe(9);
      expect(stats.dataAvailable).toBe(3);
      expect(stats.aggregatedData).toHaveLength(3);
    });

    test('should handle no data available', () => {
      const stats = manager.getAggregatedStats('nonexistent');
      expect(stats.totalIslands).toBe(9);
      expect(stats.dataAvailable).toBe(0);
      expect(stats.aggregatedData).toHaveLength(0);
    });
  });

  describe('Singleton Instance', () => {
    test('should export singleton instance', () => {
      expect(multiIslandManager).toBeInstanceOf(MultiIslandManager);
    });

    test('should maintain state across imports', () => {
      multiIslandManager.setCurrentIsland('Funafuti');
      expect(multiIslandManager.getCurrentIsland().name).toBe('Funafuti');
    });
  });
});
