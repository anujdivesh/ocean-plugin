/**
 * World-Class Logging System
 * 
 * Environment-aware logging with levels, structured data, and production safety
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

class Logger {
  constructor() {
    this.level = this.getLogLevel();
    this.enabledInProduction = process.env.REACT_APP_ENABLE_LOGGING === 'true';
  }

  getLogLevel() {
    const envLevel = process.env.REACT_APP_LOG_LEVEL?.toUpperCase();
    return LOG_LEVELS[envLevel] ?? (process.env.NODE_ENV === 'production' ? LOG_LEVELS.ERROR : LOG_LEVELS.DEBUG);
  }

  shouldLog(level) {
    // Always evaluate current env level to reflect test/runtime changes
    const currentLevel = this.getLogLevel();
    if (process.env.NODE_ENV === 'production' && !this.enabledInProduction) {
      return level >= LOG_LEVELS.ERROR;
    }
    return level >= currentLevel;
  }

  formatMessage(level, category, message, data) {
    const timestamp = new Date().toISOString();
    const emoji = {
      DEBUG: '🔍',
      INFO: 'ℹ️',
      WARN: '⚠️',
      ERROR: '🚨',
      SUCCESS: '✅'
    }[level] || '';
    
    return {
      timestamp,
      level,
      category,
      message: `${emoji} [${category}] ${message}`,
      data,
      environment: process.env.NODE_ENV
    };
  }

  debug(category, message, data = {}) {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      const formatted = this.formatMessage('DEBUG', category, message, data);
      console.debug(formatted.message, data);
    }
  }

  info(category, message, data = {}) {
    if (this.shouldLog(LOG_LEVELS.INFO)) {
      const formatted = this.formatMessage('INFO', category, message, data);
      console.log(formatted.message, data);
    }
  }

  success(category, message, data = {}) {
    if (this.shouldLog(LOG_LEVELS.INFO)) {
      const formatted = this.formatMessage('SUCCESS', category, message, data);
      console.log(formatted.message, data);
    }
  }

  warn(category, message, data = {}) {
    if (this.shouldLog(LOG_LEVELS.WARN)) {
      const formatted = this.formatMessage('WARN', category, message, data);
      console.warn(formatted.message, data);
    }
  }

  error(category, message, error = {}) {
    if (this.shouldLog(LOG_LEVELS.ERROR)) {
      const formatted = this.formatMessage('ERROR', category, message, error);
      console.error(formatted.message, error);
      
      // In production, could send to error tracking service
      if (process.env.NODE_ENV === 'production') {
        this.sendToErrorTracking(formatted);
      }
    }
  }

  sendToErrorTracking(/* logData */) {
    // Placeholder for Sentry, LogRocket, or other error tracking
    // window.errorTracker?.captureException(logData);
  }

  // Multi-island specific logging helpers
  island(atollName, action, data = {}) {
    this.info('ISLAND', `${atollName}: ${action}`, data);
  }

  forecast(message, data = {}) {
    this.info('FORECAST', message, data);
  }

  inundation(message, data = {}) {
    this.info('INUNDATION', message, data);
  }

  performance(metric, value, data = {}) {
    this.debug('PERFORMANCE', `${metric}: ${value}`, data);
  }

  network(method, url, status, data = {}) {
    const level = status >= 400 ? 'ERROR' : 'INFO';
    this[level.toLowerCase()]('NETWORK', `${method} ${url} - ${status}`, data);
  }
}

// Singleton instance
const logger = new Logger();

export default logger;
export { LOG_LEVELS };
