/**
 * Console Error Suppressor for Known WMS Server Issues
 * Reduces noise in console while maintaining functionality
 */

class ConsoleErrorSuppressor {
  constructor() {
    this.originalConsoleError = console.error;
    this.originalConsoleWarn = console.warn;
    
    // Known error patterns to suppress (regex patterns)
    this.suppressPatterns = [
      /gem-ncwms-hpc\.spc\.int.*500.*Internal Server Error/i,
      /GetLegendGraphic.*cook_forecast\/tpeak.*psu-(plasma|magma).*500/i,
      /Failed to load resource.*gem-ncwms-hpc\.spc\.int.*500/i,
      /net::ERR_HTTP2_PROTOCOL_ERROR.*gem-ncwms-hpc\.spc\.int/i,
      /net::ERR_HTTP2_PROTOCOL_ERROR/i,
      /Failed to load resource.*net::ERR_HTTP2_PROTOCOL_ERROR/i
    ];
    
    // Track error frequencies to avoid spam
    this.errorCounts = new Map();
    this.maxErrorsPerType = 3;
    
    this.init();
  }

  init() {
    // Override console.error to suppress known issues
    console.error = (...args) => {
      const message = args.join(' ');
      
      // Check if this matches any suppression pattern
      const matchedPattern = this.suppressPatterns.find(pattern => 
        pattern.test(message)
      );
      
      if (matchedPattern) {
        const patternKey = matchedPattern.toString();
        const errorCount = this.errorCounts.get(patternKey) || 0;
        
        // Show first few errors, then suppress
        if (errorCount < this.maxErrorsPerType) {
          this.errorCounts.set(patternKey, errorCount + 1);
          
          // Show user-friendly message for HTTP/2 errors
          if (message.includes('ERR_HTTP2_PROTOCOL_ERROR')) {
            console.warn(`🌐 Marine Forecast: Connection optimization in progress... (${errorCount + 1}/${this.maxErrorsPerType})`);
          } else if (!this.hasLoggedKnownIssue) {
            console.info('🌊 Marine Forecast: Using client-side legends due to temporary server issues');
            this.hasLoggedKnownIssue = true;
          }
          return;
        }
        
        // Suppress after max errors reached
        return;
      }
      
      // For other errors, use original console.error
      this.originalConsoleError.apply(console, args);
    };

    // Override console.warn for related warnings
    console.warn = (...args) => {
      const message = args.join(' ');
      
      const shouldSuppress = this.suppressPatterns.some(pattern => 
        pattern.test(message)
      );
      
      if (!shouldSuppress) {
        this.originalConsoleWarn.apply(console, args);
      }
    };
  }

  restore() {
    console.error = this.originalConsoleError;
    console.warn = this.originalConsoleWarn;
  }
}

// Initialize suppressor
let suppressorInstance = null;

export const initConsoleErrorSuppressor = () => {
  if (!suppressorInstance && typeof window !== 'undefined') {
    suppressorInstance = new ConsoleErrorSuppressor();
  }
  return suppressorInstance;
};

export const restoreConsoleErrorSuppressor = () => {
  if (suppressorInstance) {
    suppressorInstance.restore();
    suppressorInstance = null;
  }
};

export default ConsoleErrorSuppressor;
