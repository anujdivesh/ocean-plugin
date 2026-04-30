/**
 * AnimationController - Decoupled time progression for ocean visualization
 * 
 * Key principles:
 * - Time progression ≠ render loop
 * - Manages timestep advancement, interpolation alpha, and data prefetching
 * - Independent of React re-renders
 * - Supports variable playback speed, pause, scrub, and loop
 * 
 * Usage:
 *   const controller = new AnimationController(zarrManager, {
 *     speed: 1,
 *     targetFPS: 60,
 *     onUpdate: (state) => updateVisualization(state)
 *   });
 *   controller.play();
 */

export default class AnimationController {
  constructor(zarrManager, options = {}) {
    this.zarr = zarrManager;
    this.currentTimestep = options.initialTimestep || 0;
    this.interpAlpha = 0.0;
    this.isPlaying = false;
    this.speed = options.speed || 1; // Playback speed multiplier (1 = real-time)
    this.targetFPS = options.targetFPS || 60;
    this.loop = options.loop !== undefined ? options.loop : true;
    
    // Callbacks
    this.onUpdate = options.onUpdate || (() => {});
    this.onTimestepChange = options.onTimestepChange || (() => {});
    this.onComplete = options.onComplete || (() => {});
    
    // State
    this.maxTimestep = zarrManager.metadata.timestepCount - 1;
    this.lastFrameTime = 0;
    this.animationFrameId = null;
    
    // FPS tracking
    this.fpsHistory = [];
    this.fpsUpdateInterval = 500; // ms
    this.lastFpsUpdate = 0;
  }

  /**
   * Start animation playback
   */
  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.lastFrameTime = performance.now();
    this._animate();
    console.log('▶️  Animation started');
  }

  /**
   * Pause animation playback
   */
  pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    console.log('⏸️  Animation paused');
  }

  /**
   * Toggle play/pause
   */
  toggle() {
    this.isPlaying ? this.pause() : this.play();
  }

  /**
   * Set playback speed
   * @param {number} speed - Multiplier (0.5 = half speed, 2 = double speed)
   */
  setSpeed(speed) {
    this.speed = Math.max(0.1, Math.min(10, speed));
    console.log(`⏩ Speed set to ${this.speed}x`);
  }

  /**
   * Jump to specific timestep
   * @param {number} timestep - Target timestep index
   */
  jumpTo(timestep) {
    const wasPlaying = this.isPlaying;
    this.pause();
    
    const previousTimestep = this.currentTimestep;
    this.currentTimestep = Math.max(0, Math.min(this.maxTimestep, timestep));
    this.interpAlpha = 0;
    
    if (this.currentTimestep !== previousTimestep) {
      this.onTimestepChange(this.currentTimestep);
    }
    
    this.onUpdate(this.getState());
    
    if (wasPlaying) {
      this.play();
    }
    
    console.log(`⏭️  Jumped to timestep ${this.currentTimestep}`);
  }

  /**
   * Step forward one timestep
   */
  stepForward() {
    this.jumpTo(this.currentTimestep + 1);
  }

  /**
   * Step backward one timestep
   */
  stepBackward() {
    this.jumpTo(this.currentTimestep - 1);
  }

  /**
   * Reset to beginning
   */
  reset() {
    this.jumpTo(0);
  }

  /**
   * Main animation loop (private)
   */
  _animate() {
    if (!this.isPlaying) return;

    const now = performance.now();
    const delta = (now - this.lastFrameTime) / 1000; // Convert to seconds
    this.lastFrameTime = now;

    // Track FPS
    this._updateFPS(now, delta);

    // Advance interpolation alpha
    // Speed of 1.0 means 1 timestep per second
    const alphaIncrement = delta * this.speed;
    this.interpAlpha += alphaIncrement;

    // Move to next timestep when alpha exceeds 1.0
    if (this.interpAlpha >= 1.0) {
      const previousTimestep = this.currentTimestep;
      this.currentTimestep++;
      this.interpAlpha = 0;

      // Handle end of timeline
      if (this.currentTimestep > this.maxTimestep) {
        if (this.loop) {
          this.currentTimestep = 0;
          console.log('🔄 Loop: restarting from beginning');
        } else {
          this.currentTimestep = this.maxTimestep;
          this.interpAlpha = 0;
          this.pause();
          this.onComplete();
          console.log('⏹️  Animation complete');
          return;
        }
      }

      // Notify timestep change
      if (this.currentTimestep !== previousTimestep) {
        this.onTimestepChange(this.currentTimestep);
      }
    }

    // Notify update with current state
    this.onUpdate(this.getState());

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(() => this._animate());
  }

  /**
   * Update FPS calculation
   */
  _updateFPS(now, delta) {
    const fps = 1 / delta;
    this.fpsHistory.push(fps);
    
    // Keep only last 60 frames
    if (this.fpsHistory.length > 60) {
      this.fpsHistory.shift();
    }
  }

  /**
   * Get current FPS (average of last 60 frames)
   */
  getFPS() {
    if (this.fpsHistory.length === 0) return 0;
    const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.fpsHistory.length);
  }

  /**
   * Get current animation state
   */
  getState() {
    const totalProgress = (this.currentTimestep + this.interpAlpha) / this.maxTimestep;
    
    return {
      timestep: this.currentTimestep,
      interpAlpha: this.interpAlpha,
      isPlaying: this.isPlaying,
      speed: this.speed,
      progress: totalProgress,
      progressPercent: (totalProgress * 100).toFixed(1),
      timestamp: this.zarr.metadata.times?.[this.currentTimestep],
      fps: this.getFPS(),
      loop: this.loop
    };
  }

  /**
   * Get time remaining (in seconds)
   */
  getTimeRemaining() {
    const remainingSteps = this.maxTimestep - (this.currentTimestep + this.interpAlpha);
    return remainingSteps / this.speed;
  }

  /**
   * Set loop mode
   */
  setLoop(enabled) {
    this.loop = enabled;
    console.log(`🔁 Loop ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Cleanup
   */
  destroy() {
    this.pause();
    this.onUpdate = null;
    this.onTimestepChange = null;
    this.onComplete = null;
    console.log('🗑️  AnimationController destroyed');
  }

  /**
   * Get detailed stats
   */
  getStats() {
    return {
      currentTimestep: this.currentTimestep,
      totalTimesteps: this.maxTimestep + 1,
      interpAlpha: this.interpAlpha.toFixed(3),
      speed: this.speed,
      fps: this.getFPS(),
      isPlaying: this.isPlaying,
      timeRemaining: this.getTimeRemaining().toFixed(1) + 's',
      loop: this.loop
    };
  }
}
