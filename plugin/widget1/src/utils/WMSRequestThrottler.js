/**
 * WMS Request Throttling Service
 * Prevents browser connection pool exhaustion by limiting concurrent tile requests
 * Addresses the 43-request burst that causes UI freezing
 */

class WMSRequestThrottler {
  constructor(maxConcurrent = 3) { // Reduced from 6 to 3 for less congestion
    this.maxConcurrent = maxConcurrent;
    this.activeRequests = 0;
    this.requestQueue = [];
    this.domainQueues = new Map();
    this.maxPerDomain = 2; // Reduced from 4 to 2 per domain
    this.lastRequestTime = 0;
    this.minDelay = 50; // Minimum 50ms between request starts
  }

  /**
   * Throttle a tile load request with priority support
   * @param {HTMLImageElement} tile - The tile image element
   * @param {string} url - The tile URL
   * @param {string} domain - The domain for domain-specific throttling
   * @param {number} priority - Priority level (lower = higher priority)
   * @returns {Promise} Resolves when tile is loaded or fails
   */
  async throttleRequest(tile, url, domain, priority = 5) {
    // Check domain-specific limits
    if (!this.domainQueues.has(domain)) {
      this.domainQueues.set(domain, { active: 0, queue: [] });
    }

    const domainInfo = this.domainQueues.get(domain);

    // If we're at capacity, queue the request with priority
    if (this.activeRequests >= this.maxConcurrent || domainInfo.active >= this.maxPerDomain) {
      return new Promise((resolve, reject) => {
        this.requestQueue.push({ tile, url, domain, priority, resolve, reject });
        // Sort queue by priority (lower number = higher priority)
        this.requestQueue.sort((a, b) => a.priority - b.priority);
      });
    }

    // Enforce minimum delay between requests to prevent bursts
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minDelay) {
      await new Promise(resolve => setTimeout(resolve, this.minDelay - timeSinceLastRequest));
    }

    // Execute the request
    return this._executeRequest(tile, url, domain);
  }

  /**
   * Execute a tile request
   * @private
   */
  async _executeRequest(tile, url, domain) {
    this.activeRequests++;
    this.lastRequestTime = Date.now(); // Track request timing
    const domainInfo = this.domainQueues.get(domain);
    domainInfo.active++;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        tile.onload = null;
        tile.onerror = null;
        console.warn(`⏱️ Tile request timeout: ${url.substring(0, 100)}...`);
        reject(new Error('Tile load timeout'));
        this._onRequestComplete(domain);
      }, 10000); // 10 second timeout

      tile.onload = () => {
        clearTimeout(timeout);
        resolve();
        this._onRequestComplete(domain);
      };

      tile.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
        this._onRequestComplete(domain);
      };

      // Start loading
      tile.src = url;
    });
  }

  /**
   * Called when a request completes
   * @private
   */
  _onRequestComplete(domain) {
    this.activeRequests--;
    
    const domainInfo = this.domainQueues.get(domain);
    if (domainInfo) {
      domainInfo.active--;
    }

    // Process next request in queue
    this._processQueue();
  }

  /**
   * Process the next queued request
   * @private
   */
  _processQueue() {
    if (this.requestQueue.length === 0) return;

    // Find next request that can be processed
    for (let i = 0; i < this.requestQueue.length; i++) {
      const request = this.requestQueue[i];
      const domainInfo = this.domainQueues.get(request.domain);

      if (this.activeRequests < this.maxConcurrent && domainInfo.active < this.maxPerDomain) {
        // Remove from queue and execute
        this.requestQueue.splice(i, 1);
        
        this._executeRequest(request.tile, request.url, request.domain)
          .then(request.resolve)
          .catch(request.reject);
        
        break; // Process one at a time
      }
    }
  }

  /**
   * Get queue statistics for debugging
   */
  getStats() {
    return {
      activeRequests: this.activeRequests,
      queuedRequests: this.requestQueue.length,
      maxConcurrent: this.maxConcurrent,
      domainStats: Array.from(this.domainQueues.entries()).map(([domain, info]) => ({
        domain,
        active: info.active,
        queued: this.requestQueue.filter(r => r.domain === domain).length
      }))
    };
  }
}

// Global singleton instance with aggressive throttling
const requestThrottler = new WMSRequestThrottler(3); // Max 3 concurrent requests globally

// Log statistics periodically in development
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const stats = requestThrottler.getStats();
    if (stats.activeRequests > 0 || stats.queuedRequests > 0) {
      console.log('🔄 Request Throttler:', stats);
    }
  }, 5000);
}

export default requestThrottler;
