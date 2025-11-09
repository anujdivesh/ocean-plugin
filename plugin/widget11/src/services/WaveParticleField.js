/**
 * 🌊 Wave Particle Flow Field Visualization
 * Windy-style animated particle system for wave direction visualization
 * 
 * Features:
 * - 2000-5000 animated particles
 * - Speed varies with wave magnitude
 * - Zoom-adaptive density
 * - High-performance canvas rendering
 * - Beautiful ocean-themed colors
 * 
 * @author Ocean Visualization Team
 * @version 2.0.0
 */

import L from 'leaflet';

/**
 * Custom Leaflet canvas layer for particle-based wave direction visualization
 */
class WaveParticleField {
  constructor(options = {}) {
    // Configuration
    this.options = {
      particleCount: 1500,           // Reduced from 3000 - less clutter
      particleLifetime: 100,         // Frames before particle respawns
      particleSpeed: 0.8,            // Slower, more subtle movement
      particleWidth: 1.0,            // Thinner particles
      particleLength: 6,             // Shorter trails
      opacity: 0.4,                  // More transparent (was 0.6)
      fadeOpacity: 0.98,             // Faster fade (was 0.97)
      colorScheme: 'ocean',          // 'ocean', 'wind', 'energy'
      velocityScale: 0.002,          // Scale factor for velocity
      maxAge: 80,                    // Shorter lifetime (was 100)
      ...options
    };
    
    // State
    this.particles = [];
    this.animationFrame = null;
    this.isRunning = false;
    this.vectorField = null;       // Wave direction/magnitude data
    this.canvas = null;
    this.ctx = null;
    this.map = null;
    
    // Performance tracking
    this.frameCount = 0;
    this.lastFpsUpdate = Date.now();
    this.fps = 0;
  }
  
  /**
   * Leaflet layer lifecycle: add to map
   */
  onAdd(map) {
    this.map = map;
    
    // Create canvas element
    this.canvas = L.DomUtil.create('canvas', 'wave-particle-canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'none'; // Don't block map interactions
    this.canvas.style.zIndex = '400'; // Above tiles, below controls
    
    // Get 2D context
    this.ctx = this.canvas.getContext('2d', { alpha: true });
    
    // Size canvas to map
    this._resize();
    
    // Add to map pane
    map.getPanes().overlayPane.appendChild(this.canvas);
    
    // Listen to map events
    map.on('moveend', this._reset, this);
    map.on('zoomstart', this._pause, this);
    map.on('zoomend', this._resume, this);
    map.on('resize', this._resize, this);
    
    // Initialize particles
    this._initializeParticles();
    
    // Start animation
    this.start();
    
    return this;
  }
  
  /**
   * Leaflet layer lifecycle: remove from map
   */
  onRemove(map) {
    this.stop();
    
    map.off('moveend', this._reset, this);
    map.off('zoomstart', this._pause, this);
    map.off('zoomend', this._resume, this);
    map.off('resize', this._resize, this);
    
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    
    this.canvas = null;
    this.ctx = null;
    this.map = null;
  }
  
  /**
   * Set wave direction/magnitude data
   * @param {Object} vectorField - { u: Float32Array, v: Float32Array, bounds, width, height }
   */
  setVectorField(vectorField) {
    this.vectorField = vectorField;
    this._reset();
  }
  
  /**
   * Initialize particle positions randomly across canvas
   */
  _initializeParticles() {
    this.particles = [];
    const count = this._getParticleCount();
    
    for (let i = 0; i < count; i++) {
      this.particles.push(this._createParticle());
    }
  }
  
  /**
   * Create a new particle with random position
   */
  _createParticle() {
    return {
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      age: Math.floor(Math.random() * this.options.maxAge),
      speed: 1.0 // Will be updated by vector field
    };
  }
  
  /**
   * Get particle count based on zoom level
   */
  _getParticleCount() {
    if (!this.map) return this.options.particleCount;
    
    const zoom = this.map.getZoom();
    
    // Fewer particles at low zoom (national scale)
    // More particles at high zoom (coastal detail)
    // But keep it subtle - not overwhelming
    if (zoom < 9) return Math.floor(this.options.particleCount * 0.3);  // ~450
    if (zoom < 11) return Math.floor(this.options.particleCount * 0.6); // ~900
    return this.options.particleCount; // ~1500 max
  }
  
  /**
   * Resize canvas to match map size
   */
  _resize() {
    if (!this.canvas || !this.map) return;
    
    const size = this.map.getSize();
    this.canvas.width = size.x;
    this.canvas.height = size.y;
    
    // Adjust particle count
    const newCount = this._getParticleCount();
    if (newCount > this.particles.length) {
      // Add particles
      const toAdd = newCount - this.particles.length;
      for (let i = 0; i < toAdd; i++) {
        this.particles.push(this._createParticle());
      }
    } else if (newCount < this.particles.length) {
      // Remove particles
      this.particles = this.particles.slice(0, newCount);
    }
  }
  
  /**
   * Reset particles when map moves
   */
  _reset() {
    this._initializeParticles();
  }
  
  /**
   * Pause animation (e.g., during zoom)
   */
  _pause() {
    this.isRunning = false;
  }
  
  /**
   * Resume animation
   */
  _resume() {
    if (!this.animationFrame) {
      this.isRunning = true;
      this._animate();
    }
  }
  
  /**
   * Start animation loop
   */
  start() {
    if (this.animationFrame) return;
    this.isRunning = true;
    this._animate();
  }
  
  /**
   * Stop animation loop
   */
  stop() {
    this.isRunning = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }
  
  /**
   * Main animation loop
   */
  _animate() {
    if (!this.isRunning) {
      this.animationFrame = null;
      return;
    }
    
    // Update and draw
    this._update();
    this._draw();
    
    // FPS tracking
    this.frameCount++;
    const now = Date.now();
    if (now - this.lastFpsUpdate > 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
    
    // Continue loop
    this.animationFrame = requestAnimationFrame(() => this._animate());
  }
  
  /**
   * Update particle positions
   */
  _update() {
    if (!this.map) return;
    
    for (const particle of this.particles) {
      // Age particle
      particle.age++;
      
      // Respawn if too old or out of bounds
      if (particle.age > this.options.maxAge ||
          particle.x < 0 || particle.x > this.canvas.width ||
          particle.y < 0 || particle.y > this.canvas.height) {
        Object.assign(particle, this._createParticle());
        continue;
      }
      
      // Get velocity from vector field (or use default)
      const velocity = this._getVelocity(particle.x, particle.y);
      
      // Move particle
      particle.x += velocity.u * this.options.particleSpeed;
      particle.y += velocity.v * this.options.particleSpeed;
      particle.speed = velocity.speed;
    }
  }
  
  /**
   * Get velocity at screen position from vector field
   * For now, uses a simple spiral pattern as demo
   * TODO: Replace with actual WMS GetFeatureInfo data
   */
    /**
   * Get velocity at screen position from vector field
   * Uses bilinear interpolation for smooth flow between grid points
   */
  _getVelocity(x, y) {
    // If we have real vector field data, use it with interpolation
    if (this.vectorField && this.vectorField.u && this.vectorField.v) {
      const fw = this.vectorField.width;
      const fh = this.vectorField.height;
      
      // Map screen coords to vector field coords (continuous)
      const fx = (x / this.canvas.width) * (fw - 1);
      const fy = (y / this.canvas.height) * (fh - 1);
      
      // Get grid cell
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const x1 = Math.min(x0 + 1, fw - 1);
      const y1 = Math.min(y0 + 1, fh - 1);
      
      // Interpolation weights
      const wx = fx - x0;
      const wy = fy - y0;
      
      // Get corner values
      const idx00 = y0 * fw + x0;
      const idx10 = y0 * fw + x1;
      const idx01 = y1 * fw + x0;
      const idx11 = y1 * fw + x1;
      
      // Bilinear interpolation for U
      const u00 = this.vectorField.u[idx00] || 0;
      const u10 = this.vectorField.u[idx10] || 0;
      const u01 = this.vectorField.u[idx01] || 0;
      const u11 = this.vectorField.u[idx11] || 0;
      
      const u = (1 - wx) * (1 - wy) * u00 +
                wx * (1 - wy) * u10 +
                (1 - wx) * wy * u01 +
                wx * wy * u11;
      
      // Bilinear interpolation for V
      const v00 = this.vectorField.v[idx00] || 0;
      const v10 = this.vectorField.v[idx10] || 0;
      const v01 = this.vectorField.v[idx01] || 0;
      const v11 = this.vectorField.v[idx11] || 0;
      
      const v = (1 - wx) * (1 - wy) * v00 +
                wx * (1 - wy) * v10 +
                (1 - wx) * wy * v01 +
                wx * wy * v11;
      
      const speed = Math.sqrt(u * u + v * v);
      
      return { u, v, speed };
    }
    
    // Fallback: Subtle uniform flow from north (typical Pacific swell)
    // This creates gentle downward flow (from 0° = North)
    // Much better than the circular pattern for ocean waves
    const baseSpeed = 0.8;
    const noise = (Math.sin(x * 0.01) + Math.cos(y * 0.01)) * 0.1; // Subtle variation
    
    return {
      u: 0.2 + noise,  // Slight eastward component (typical trade winds)
      v: baseSpeed + noise * 0.5,  // Mainly southward (typical Pacific swell)
      speed: baseSpeed
    };
  }
  
  /**
   * Draw particles on canvas
   */
  _draw() {
    if (!this.ctx) return;
    
    const ctx = this.ctx;
    
    // Fade previous frame (creates particle trails)
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = `rgba(0, 0, 0, ${1 - this.options.fadeOpacity})`;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw particles
    ctx.globalCompositeOperation = 'lighter'; // Additive blending for glow
    ctx.lineWidth = this.options.particleWidth;
    ctx.lineCap = 'round';
    
    for (const particle of this.particles) {
      // Color based on speed/age
      const color = this._getParticleColor(particle);
      const alpha = (1 - particle.age / this.options.maxAge) * this.options.opacity;
      
      ctx.strokeStyle = color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
      
      // Draw particle as short line (creates motion blur effect)
      ctx.beginPath();
      const velocity = { u: 0, v: 0 };
      if (this.map) {
        velocity.u = particle.speed * Math.cos(particle.age * 0.1);
        velocity.v = particle.speed * Math.sin(particle.age * 0.1);
      }
      
      ctx.moveTo(particle.x, particle.y);
      ctx.lineTo(
        particle.x - velocity.u * this.options.particleLength,
        particle.y - velocity.v * this.options.particleLength
      );
      ctx.stroke();
    }
  }
  
  /**
   * Get particle color based on speed and color scheme
   */
  _getParticleColor(particle) {
    const speed = particle.speed || 0;
    
    switch (this.options.colorScheme) {
      case 'ocean':
        // Blue to cyan to white (calm to energetic)
        if (speed < 0.5) return 'rgb(0, 100, 200)';        // Deep blue
        if (speed < 1.0) return 'rgb(0, 150, 255)';        // Ocean blue
        if (speed < 1.5) return 'rgb(0, 200, 255)';        // Cyan
        if (speed < 2.0) return 'rgb(100, 230, 255)';      // Light cyan
        return 'rgb(200, 255, 255)';                       // Almost white
      
      case 'energy':
        // Blue to green to yellow to red (increasing energy)
        if (speed < 0.5) return 'rgb(0, 100, 255)';        // Blue
        if (speed < 1.0) return 'rgb(0, 200, 200)';        // Cyan
        if (speed < 1.5) return 'rgb(0, 255, 100)';        // Green
        if (speed < 2.0) return 'rgb(255, 200, 0)';        // Yellow
        return 'rgb(255, 100, 0)';                         // Orange/red
      
      case 'wind':
      default:
        // White to cyan (Windy.com style)
        if (speed < 1.0) return 'rgb(255, 255, 255)';      // White
        if (speed < 2.0) return 'rgb(200, 255, 255)';      // Light cyan
        return 'rgb(0, 255, 255)';                         // Cyan
    }
  }
  
  /**
   * Update options dynamically
   */
  setOptions(options) {
    Object.assign(this.options, options);
    if (options.particleCount !== undefined) {
      this._initializeParticles();
    }
  }
  
  /**
   * Get current FPS (for debugging)
   */
  getFPS() {
    return this.fps;
  }
  
  /**
   * Add layer to map (Leaflet-style API)
   */
  addTo(map) {
    this.onAdd(map);
    return this;
  }
  
  /**
   * Remove layer from map (Leaflet-style API)
   */
  remove() {
    if (this.map) {
      this.onRemove(this.map);
    }
    return this;
  }
}

/**
 * Factory function for Leaflet integration
 */
L.waveParticleField = function(options) {
  return new WaveParticleField(options);
};

export default WaveParticleField;
