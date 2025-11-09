/**
 * Enhanced Tile Loading Test and Monitoring
 * 
 * This script demonstrates the improved tile loading service
 * and provides monitoring capabilities for tile loading health.
 */

import WMSTileLoadingService from '../services/WMSTileLoadingService.js';

class TileLoadingMonitor {
  constructor() {
    this.monitoringInterval = null;
    this.statsHistory = [];
  }

  /**
   * Start monitoring tile loading health
   */
  startMonitoring(intervalMs = 30000) {
    console.log('🔍 Starting tile loading monitoring...');
    
    this.monitoringInterval = setInterval(() => {
      const health = WMSTileLoadingService.getServiceHealth();
      this.statsHistory.push({
        timestamp: new Date(),
        ...health
      });
      
      // Log current health status
      this.logHealthStatus(health);
      
      // Keep only last 20 entries
      if (this.statsHistory.length > 20) {
        this.statsHistory.shift();
      }
      
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('📊 Tile loading monitoring stopped');
    }
  }

  /**
   * Log current health status
   */
  logHealthStatus(health) {
    const { totalLayers, healthyLayers, problematicLayers, failedLayers } = health;
    
    if (totalLayers === 0) {
      console.log('📊 No layers currently being monitored');
      return;
    }
    
    const healthyPercent = Math.round((healthyLayers / totalLayers) * 100);
    
    if (failedLayers > 0) {
      console.warn(`🚨 Tile Loading Health: ${healthyPercent}% healthy (${failedLayers} failed, ${problematicLayers} problematic)`);
    } else if (problematicLayers > 0) {
      console.warn(`⚠️ Tile Loading Health: ${healthyPercent}% healthy (${problematicLayers} problematic)`);
    } else {
      console.log(`✅ Tile Loading Health: ${healthyPercent}% healthy (all layers loading normally)`);
    }
  }

  /**
   * Get monitoring history
   */
  getHistory() {
    return this.statsHistory;
  }

  /**
   * Get detailed layer statistics
   */
  getDetailedStats() {
    const health = WMSTileLoadingService.getServiceHealth();
    console.table(health);
    return health;
  }

  /**
   * Test tile loading recovery with simulated errors
   */
  async testRecoveryStrategies() {
    console.log('🧪 Testing tile loading recovery strategies...');
    
    // Initialize test layers
    const testLayers = [
      { id: 'test_forecast', name: 'Test Forecast Layer', type: 'forecast' },
      { id: 'test_static', name: 'Test Static Layer', type: 'static' },
      { id: 'test_limited', name: 'Test Limited Temporal', type: 'limited_temporal' }
    ];
    
    testLayers.forEach(layer => {
      WMSTileLoadingService.initializeLayer(layer.id, layer.name, layer.type);
    });
    
    // Simulate different error scenarios
    const mockTile = { 
      src: 'https://test.example.com/wms?layers=test&format=image/png',
      _originalWMSUrl: 'https://test.example.com/wms?layers=test&format=image/png'
    };
    
    // Test 1: Network error recovery
    console.log('🔄 Testing network error recovery...');
    for (let i = 0; i < 3; i++) {
      WMSTileLoadingService.handleTileError('test_forecast', mockTile, { type: 'network' });
      await this.sleep(100);
    }
    
    // Test 2: Server error recovery
    console.log('🔄 Testing server error recovery...');
    for (let i = 0; i < 6; i++) {
      WMSTileLoadingService.handleTileError('test_static', mockTile, { 
        target: { status: 500 }
      });
      await this.sleep(100);
    }
    
    // Test 3: Expected data gap (should be handled gracefully)
    console.log('🔄 Testing expected data gap handling...');
    WMSTileLoadingService.handleTileError('test_limited', mockTile, { type: 'expected' });
    
    // Log final status
    setTimeout(() => {
      console.log('🧪 Recovery test completed. Final status:');
      this.getDetailedStats();
    }, 1000);
  }

  /**
   * Helper function for async delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export for use in console or other modules
window.TileLoadingMonitor = TileLoadingMonitor;

// Auto-start monitoring in development
if (window.location.hostname === 'localhost' || window.location.hostname.includes('dev')) {
  const monitor = new TileLoadingMonitor();
  monitor.startMonitoring();
  
  // Make available in console
  window.tileMonitor = monitor;
  
  console.log('🔧 Development mode: Tile loading monitor started');
  console.log('🔧 Use window.tileMonitor.testRecoveryStrategies() to test error handling');
  console.log('🔧 Use window.tileMonitor.getDetailedStats() to view current stats');
}

export default TileLoadingMonitor;