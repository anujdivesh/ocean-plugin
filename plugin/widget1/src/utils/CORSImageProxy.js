/**
 * CORS-enabled Image Proxy
 * Handles THREDDS WMS requests that are blocked by CORS
 */

class CORSImageProxy {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
  }

  /**
   * Fetch image through CORS proxy or fallback methods
   */
  async fetchImage(url) {
    // Check cache first
    if (this.cache.has(url)) {
      return this.cache.get(url);
    }

    // Check if request is already in progress
    if (this.pendingRequests.has(url)) {
      return this.pendingRequests.get(url);
    }

    // Create new request promise
    const requestPromise = this.attemptImageFetch(url);
    this.pendingRequests.set(url, requestPromise);

    try {
      const result = await requestPromise;
      this.cache.set(url, result);
      this.pendingRequests.delete(url);
      return result;
    } catch (error) {
      this.pendingRequests.delete(url);
      throw error;
    }
  }

  /**
   * Attempt to fetch image using various methods
   */
  async attemptImageFetch(url) {
    // Method 1: Try direct fetch (might work if CORS is properly configured)
    try {
      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (response.ok) {
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      }
    } catch (error) {
      console.log(`Direct fetch failed for ${url}: ${error.message}`);
    }

    // Method 2: Try using img element with crossOrigin
    try {
      return await this.loadImageWithCrossOrigin(url);
    } catch (error) {
      console.log(`CrossOrigin image load failed for ${url}: ${error.message}`);
    }

    // Method 3: Try using a public CORS proxy
    try {
      return await this.loadImageThroughProxy(url);
    } catch (error) {
      console.log(`Proxy load failed for ${url}: ${error.message}`);
    }

    throw new Error(`All methods failed to load image: ${url}`);
  }

  /**
   * Load image using img element with crossOrigin attribute
   */
  loadImageWithCrossOrigin(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        // Convert image to blob URL
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(URL.createObjectURL(blob));
          } else {
            reject(new Error('Failed to convert image to blob'));
          }
        }, 'image/png');
      };
      
      img.onerror = () => {
        reject(new Error('Image load error'));
      };
      
      img.src = url;
    });
  }

  /**
   * Load image through a public CORS proxy
   */
  async loadImageThroughProxy(originalUrl) {
    // Use a public CORS proxy service
    const proxyUrl = `https://cors-anywhere.herokuapp.com/${originalUrl}`;
    
    const response = await fetch(proxyUrl, {
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    
    if (response.ok) {
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    }
    
    throw new Error(`Proxy request failed: ${response.status}`);
  }

  /**
   * Clear cache to prevent memory leaks
   */
  clearCache() {
    // Revoke all blob URLs to free memory
    for (const blobUrl of this.cache.values()) {
      if (blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
      }
    }
    this.cache.clear();
  }
}

// Export singleton instance
const corsImageProxy = new CORSImageProxy();
export default corsImageProxy;