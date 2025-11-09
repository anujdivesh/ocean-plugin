/**
 * Canvas Performance Patch - MUST BE IMPORTED FIRST
 * 
 * Patches HTMLCanvasElement.prototype.getContext to add willReadFrequently
 * This fixes Canvas2D performance warnings from leaflet.heat and other libraries
 */

// Apply patch immediately when this module loads (before any other imports)
if (typeof HTMLCanvasElement !== 'undefined' && !window.__canvasPatchApplied) {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.getContext = function(contextType, contextAttributes) {
    if (contextType === '2d') {
      const attrs = contextAttributes || {};
      
      if (attrs.willReadFrequently === undefined) {
        attrs.willReadFrequently = true;
      }
      
      return originalGetContext.call(this, contextType, attrs);
    }
    
    return originalGetContext.call(this, contextType, contextAttributes);
  };

  window.__canvasPatchApplied = true;
  console.log('✅ Canvas performance patch applied globally');
}

// Export a no-op function for explicit calls (patch already applied at module load)
export const ensureCanvasPatch = () => {
  // Patch is applied at import time, this is just for explicit calls
  return window.__canvasPatchApplied;
};

export default ensureCanvasPatch;
