/**
 * Leaflet Heat Performance Patch
 * 
 * Patches leaflet.heat to use willReadFrequently attribute on canvas
 * This fixes the Canvas2D performance warning about multiple getImageData operations
 * 
 * Issue: https://html.spec.whatwg.org/multipage/canvas.html#concept-canvas-will-read-frequently
 * 
 * Strategy: Monkey-patch HTMLCanvasElement.prototype.getContext to automatically
 * add willReadFrequently for 2d contexts used by leaflet.heat
 */

import L from 'leaflet';
import 'leaflet.heat';

// Store whether global patch has been applied
let globalCanvasPatchApplied = false;

/**
 * Global canvas patch - intercepts ALL canvas getContext calls
 * and adds willReadFrequently for 2d contexts
 */
export function patchCanvasGlobally() {
  if (globalCanvasPatchApplied) {
    return;
  }

  // Store the original getContext method
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  // Override getContext to add willReadFrequently for 2d contexts
  HTMLCanvasElement.prototype.getContext = function(contextType, contextAttributes) {
    // If requesting 2d context and attributes don't already specify willReadFrequently
    if (contextType === '2d') {
      const attrs = contextAttributes || {};
      
      // Add willReadFrequently if not already set
      if (attrs.willReadFrequently === undefined) {
        attrs.willReadFrequently = true;
      }
      
      return originalGetContext.call(this, contextType, attrs);
    }
    
    // For non-2d contexts, use original behavior
    return originalGetContext.call(this, contextType, contextAttributes);
  };

  globalCanvasPatchApplied = true;
  console.log('✅ Canvas globally patched: willReadFrequently enabled for all 2d contexts');
}

/**
 * Patch the HeatLayer prototype to use willReadFrequently
 * This must be called before creating any heatmap layers
 */
export function patchLeafletHeat() {
  // Apply global canvas patch first (catches all canvas creation)
  patchCanvasGlobally();

  // Check if HeatLayer-specific patch already applied
  if (L.HeatLayer && L.HeatLayer.prototype._patchedForPerformance) {
    return;
  }

  // Only patch if HeatLayer exists
  if (!L.HeatLayer || !L.HeatLayer.prototype) {
    console.warn('leaflet.heat not loaded, skipping HeatLayer-specific patch');
    return;
  }

  // Mark as patched
  L.HeatLayer.prototype._patchedForPerformance = true;
  
  console.log('✅ Leaflet Heat library ready with performance optimization');
}

/**
 * Create a patched heatLayer with willReadFrequently enabled
 * This is a wrapper around L.heatLayer that ensures the patch is applied
 */
export function createOptimizedHeatLayer(latlngs, options) {
  // Ensure patch is applied
  patchLeafletHeat();
  
  // Create heat layer with standard API
  // The global canvas patch ensures willReadFrequently is set
  return L.heatLayer(latlngs, options);
}

export default {
  patchCanvasGlobally,
  patchLeafletHeat,
  createOptimizedHeatLayer
};
