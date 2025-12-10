/**
 * WMS Capabilities Caching Service
 * Caches GetCapabilities responses to avoid redundant 277KB downloads
 * Uses localStorage with TTL for persistence across page reloads
 */

const CACHE_PREFIX = 'wms_capabilities_';
const DEFAULT_TTL = 3600000; // 1 hour in milliseconds

class CapabilitiesCache {
  /**
   * Get cached capabilities for a URL
   * @param {string} url - The GetCapabilities URL
   * @returns {string|null} Cached XML or null if not found/expired
   */
  get(url) {
    try {
      const key = this._getCacheKey(url);
      const cached = localStorage.getItem(key);
      
      if (!cached) {
        console.log('📦 No cache found for:', url.substring(0, 80));
        return null;
      }

      const { data, timestamp, ttl } = JSON.parse(cached);
      const age = Date.now() - timestamp;

      if (age > ttl) {
        console.log('⏰ Cache expired (age: ' + Math.round(age / 1000) + 's)');
        localStorage.removeItem(key);
        return null;
      }

      console.log('✅ Cache hit! (age: ' + Math.round(age / 1000) + 's, size: ' + Math.round(data.length / 1024) + 'KB)');
      return data;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }

  /**
   * Store capabilities in cache
   * @param {string} url - The GetCapabilities URL
   * @param {string} data - The XML response data
   * @param {number} ttl - Time to live in milliseconds
   */
  set(url, data, ttl = DEFAULT_TTL) {
    try {
      const key = this._getCacheKey(url);
      const cacheEntry = {
        data,
        timestamp: Date.now(),
        ttl,
        url: url.substring(0, 100) // Store partial URL for debugging
      };

      localStorage.setItem(key, JSON.stringify(cacheEntry));
      console.log('💾 Cached capabilities (size: ' + Math.round(data.length / 1024) + 'KB, TTL: ' + Math.round(ttl / 1000) + 's)');
      
      // Clean old entries if storage is getting full
      this._cleanIfNeeded();
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('⚠️ localStorage quota exceeded, clearing old caches');
        this._clearOldest();
        // Try again with fresh key and cacheEntry references
        try {
          const retryKey = this._getCacheKey(url);
          const retryCacheEntry = {
            data,
            timestamp: Date.now(),
            ttl,
            url: url.substring(0, 100)
          };
          localStorage.setItem(retryKey, JSON.stringify(retryCacheEntry));
        } catch (e) {
          console.error('Failed to cache even after cleanup:', e);
        }
      } else {
        console.error('Cache write error:', error);
      }
    }
  }

  /**
   * Clear cache for a specific URL
   * @param {string} url - The GetCapabilities URL
   */
  clear(url) {
    const key = this._getCacheKey(url);
    localStorage.removeItem(key);
    console.log('🗑️ Cleared cache for:', url.substring(0, 80));
  }

  /**
   * Clear all capabilities caches
   */
  clearAll() {
    const keys = Object.keys(localStorage);
    let cleared = 0;
    
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
        cleared++;
      }
    });
    
    console.log(`🗑️ Cleared ${cleared} capability caches`);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    
    let totalSize = 0;
    const entries = cacheKeys.map(key => {
      const cached = localStorage.getItem(key);
      const size = cached ? cached.length : 0;
      totalSize += size;
      
      try {
        const { timestamp, ttl, url } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        const expired = age > ttl;
        
        return { key, size, age, expired, url };
      } catch (e) {
        return { key, size, age: 0, expired: true, url: 'unknown' };
      }
    });

    return {
      count: cacheKeys.length,
      totalSize,
      totalSizeKB: Math.round(totalSize / 1024),
      entries
    };
  }

  /**
   * Generate cache key from URL
   * @private
   */
  _getCacheKey(url) {
    // Normalize URL to avoid cache misses due to parameter ordering
    const normalized = this._normalizeUrl(url);
    return CACHE_PREFIX + this._hashCode(normalized);
  }

  /**
   * Normalize URL for consistent caching
   * @private
   */
  _normalizeUrl(url) {
    try {
      const urlObj = new URL(url);
      // Sort parameters for consistency
      const params = Array.from(urlObj.searchParams.entries())
        .sort(([a], [b]) => a.localeCompare(b));
      
      const normalized = urlObj.origin + urlObj.pathname + '?' + 
        params.map(([k, v]) => `${k}=${v}`).join('&');
      
      return normalized.toLowerCase();
    } catch (e) {
      // Fallback if URL parsing fails
      return url.toLowerCase();
    }
  }

  /**
   * Simple hash function for URLs
   * @private
   */
  _hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return 'h' + Math.abs(hash).toString(36);
  }

  /**
   * Clean old caches if needed
   * @private
   */
  _cleanIfNeeded() {
    const stats = this.getStats();
    
    // If we have more than 10 cached capabilities or >5MB, clean expired ones
    if (stats.count > 10 || stats.totalSize > 5 * 1024 * 1024) {
      const expired = stats.entries.filter(e => e.expired);
      expired.forEach(e => localStorage.removeItem(e.key));
      
      if (expired.length > 0) {
        console.log(`🧹 Cleaned ${expired.length} expired cache entries`);
      }
    }
  }

  /**
   * Clear oldest cache entries to free space
   * @private
   */
  _clearOldest() {
    const stats = this.getStats();
    
    // Sort by age (oldest first)
    const sorted = stats.entries.sort((a, b) => b.age - a.age);
    
    // Remove oldest 50%
    const toRemove = Math.ceil(sorted.length / 2);
    for (let i = 0; i < toRemove; i++) {
      localStorage.removeItem(sorted[i].key);
    }
    
    console.log(`🧹 Removed ${toRemove} oldest cache entries to free space`);
  }
}

// Global singleton instance
const capabilitiesCache = new CapabilitiesCache();

export default capabilitiesCache;
