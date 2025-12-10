/**
 * Request Burst Prevention Service
 * Prevents initial simultaneous tile request bursts by staging tile loads
 * This eliminates the 23-request burst seen in the HAR file
 */

class BurstPrevention {
  constructor() {
    this.isInitialLoad = true;
    this.initialLoadDelay = 100; // 100ms between each tile during initial load
    this.loadedTileCount = 0;
    this.initialLoadThreshold = 10; // After 10 tiles, switch to normal mode
  }

  /**
   * Check if we should delay this tile request to prevent burst
   * @returns {number} Delay in milliseconds
   */
  getDelayForTile() {
    if (!this.isInitialLoad) {
      return 0; // No delay after initial load
    }

    this.loadedTileCount++;
    
    // After threshold tiles loaded, disable burst prevention
    if (this.loadedTileCount >= this.initialLoadThreshold) {
      console.log('🎯 Initial load complete, switching to normal mode');
      this.isInitialLoad = false;
      return 0;
    }

    // Stagger tiles with increasing delay
    const delay = this.loadedTileCount * this.initialLoadDelay;
    console.log(`⏱️ Staging tile ${this.loadedTileCount} with ${delay}ms delay`);
    return delay;
  }

  /**
   * Reset to initial load mode (e.g., when changing layers)
   */
  reset() {
    console.log('🔄 Resetting burst prevention for new layer');
    this.isInitialLoad = true;
    this.loadedTileCount = 0;
  }

  /**
   * Manually disable burst prevention
   */
  disable() {
    this.isInitialLoad = false;
  }
}

// Global singleton
const burstPrevention = new BurstPrevention();

export default burstPrevention;
