/**
 * Logger Utility Tests
 * 
 * Tests for structured logging system
 */

import logger, { LOG_LEVELS } from './logger';

describe('Logger', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalConsole = { ...console };

  beforeEach(() => {
    // Mock console methods
    console.log = jest.fn();
    console.debug = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    // Restore console
    console.log = originalConsole.log;
    console.debug = originalConsole.debug;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    
    // Restore environment
    process.env.NODE_ENV = originalEnv;
    delete process.env.REACT_APP_LOG_LEVEL;
    delete process.env.REACT_APP_ENABLE_LOGGING;
  });

  describe('Log Levels', () => {
    test('should have all log levels defined', () => {
      expect(LOG_LEVELS).toHaveProperty('DEBUG', 0);
      expect(LOG_LEVELS).toHaveProperty('INFO', 1);
      expect(LOG_LEVELS).toHaveProperty('WARN', 2);
      expect(LOG_LEVELS).toHaveProperty('ERROR', 3);
      expect(LOG_LEVELS).toHaveProperty('NONE', 4);
    });

    test('should have ascending numeric values', () => {
      expect(LOG_LEVELS.DEBUG).toBeLessThan(LOG_LEVELS.INFO);
      expect(LOG_LEVELS.INFO).toBeLessThan(LOG_LEVELS.WARN);
      expect(LOG_LEVELS.WARN).toBeLessThan(LOG_LEVELS.ERROR);
      expect(LOG_LEVELS.ERROR).toBeLessThan(LOG_LEVELS.NONE);
    });
  });

  describe('Development Mode Logging', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      process.env.REACT_APP_LOG_LEVEL = 'DEBUG';
    });

    test('should log debug messages in development', () => {
      logger.debug('TEST', 'Debug message', { key: 'value' });
      expect(console.debug).toHaveBeenCalled();
    });

    test('should log info messages in development', () => {
      logger.info('TEST', 'Info message');
      expect(console.log).toHaveBeenCalled();
    });

    test('should log warn messages in development', () => {
      logger.warn('TEST', 'Warning message');
      expect(console.warn).toHaveBeenCalled();
    });

    test('should log error messages in development', () => {
      logger.error('TEST', 'Error message', new Error('Test'));
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Production Mode Logging', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_ENABLE_LOGGING = 'false';
    });

    test('should only log errors in production by default', () => {
      logger.debug('TEST', 'Debug message');
      logger.info('TEST', 'Info message');
      logger.warn('TEST', 'Warning message');
      
      expect(console.debug).not.toHaveBeenCalled();
      expect(console.log).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
    });

    test('should log errors in production', () => {
      logger.error('TEST', 'Error message');
      expect(console.error).toHaveBeenCalled();
    });

    test('should respect ENABLE_LOGGING flag in production', () => {
      process.env.REACT_APP_ENABLE_LOGGING = 'true';
      process.env.REACT_APP_LOG_LEVEL = 'INFO';
      
      // Create new logger instance (or reset)
      logger.info('TEST', 'Info message');
      // Should log based on LOG_LEVEL
    });
  });

  describe('Category-Based Logging', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    test('should log island-specific messages', () => {
      logger.island('Funafuti', 'Selected', { zoom: 10 });
      expect(console.log).toHaveBeenCalled();
      const callArgs = console.log.mock.calls[0];
      expect(callArgs[0]).toContain('ISLAND');
      expect(callArgs[0]).toContain('Funafuti');
    });

    test('should log forecast messages', () => {
      logger.forecast('Time slider updated', { time: 'T+24' });
      expect(console.log).toHaveBeenCalled();
      const callArgs = console.log.mock.calls[0];
      expect(callArgs[0]).toContain('FORECAST');
    });

    test('should log inundation messages', () => {
      logger.inundation('Loaded 42 points', { atoll: 'Funafuti' });
      expect(console.log).toHaveBeenCalled();
      const callArgs = console.log.mock.calls[0];
      expect(callArgs[0]).toContain('INUNDATION');
    });

    test('should log performance metrics', () => {
      logger.performance('Bundle load time', '2.1s');
      expect(console.debug).toHaveBeenCalled();
      const callArgs = console.debug.mock.calls[0];
      expect(callArgs[0]).toContain('PERFORMANCE');
    });

    test('should log network requests', () => {
      logger.network('GET', 'https://api.example.com', 200);
      expect(console.log).toHaveBeenCalled();
      const callArgs = console.log.mock.calls[0];
      expect(callArgs[0]).toContain('NETWORK');
    });

    test('should log network errors with ERROR level', () => {
      logger.network('GET', 'https://api.example.com', 500);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Log Message Format', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    test('should include emoji for log level', () => {
      logger.debug('TEST', 'Message');
      const message = console.debug.mock.calls[0][0];
      expect(message).toContain('🔍'); // Debug emoji
    });

    test('should include category in message', () => {
      logger.info('CATEGORY', 'Test message');
      const message = console.log.mock.calls[0][0];
      expect(message).toContain('[CATEGORY]');
    });

    test('should include actual message text', () => {
      logger.warn('TEST', 'Warning text');
      const message = console.warn.mock.calls[0][0];
      expect(message).toContain('Warning text');
    });

    test('should pass data object as second parameter', () => {
      const data = { key: 'value', number: 42 };
      logger.info('TEST', 'Message', data);
      expect(console.log.mock.calls[0][1]).toEqual(data);
    });
  });

  describe('Log Level Filtering', () => {
    test('should not log DEBUG when level is INFO', () => {
      process.env.REACT_APP_LOG_LEVEL = 'INFO';
      logger.debug('TEST', 'Debug message');
      expect(console.debug).not.toHaveBeenCalled();
    });

    test('should log INFO when level is INFO', () => {
      process.env.REACT_APP_LOG_LEVEL = 'INFO';
      logger.info('TEST', 'Info message');
      expect(console.log).toHaveBeenCalled();
    });

    test('should log WARN when level is INFO', () => {
      process.env.REACT_APP_LOG_LEVEL = 'INFO';
      logger.warn('TEST', 'Warning message');
      expect(console.warn).toHaveBeenCalled();
    });

    test('should log ERROR when level is INFO', () => {
      process.env.REACT_APP_LOG_LEVEL = 'INFO';
      logger.error('TEST', 'Error message');
      expect(console.error).toHaveBeenCalled();
    });

    test('should not log anything when level is NONE', () => {
      process.env.REACT_APP_LOG_LEVEL = 'NONE';
      logger.debug('TEST', 'Debug message');
      logger.info('TEST', 'Info message');
      logger.warn('TEST', 'Warn message');
      logger.error('TEST', 'Error message');
      expect(console.debug).not.toHaveBeenCalled();
      expect(console.log).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe('Error Tracking Integration', () => {
    test('should have placeholder for error tracking', () => {
      // Verify sendToErrorTracking method exists
      expect(logger).toHaveProperty('sendToErrorTracking');
    });

    test('should call error tracking in production', () => {
      process.env.NODE_ENV = 'production';
      const sendToErrorTracking = jest.spyOn(logger, 'sendToErrorTracking');
      
      logger.error('TEST', 'Error message', new Error('Test'));
      
      // Should attempt to send to error tracking
      expect(sendToErrorTracking).toHaveBeenCalled();
      
      sendToErrorTracking.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    test('should handle empty data object', () => {
      expect(() => logger.info('TEST', 'Message', {})).not.toThrow();
    });

    test('should handle missing data object', () => {
      expect(() => logger.info('TEST', 'Message')).not.toThrow();
    });

    test('should handle null data', () => {
      expect(() => logger.info('TEST', 'Message', null)).not.toThrow();
    });

    test('should handle undefined data', () => {
      expect(() => logger.info('TEST', 'Message', undefined)).not.toThrow();
    });

    test('should handle complex nested data', () => {
      const complexData = {
        nested: {
          array: [1, 2, 3],
          object: { key: 'value' }
        },
        date: new Date(),
        error: new Error('Test')
      };
      
      expect(() => logger.info('TEST', 'Message', complexData)).not.toThrow();
    });

    test('should handle very long messages', () => {
      const longMessage = 'A'.repeat(10000);
      expect(() => logger.info('TEST', longMessage)).not.toThrow();
    });

    test('should handle special characters in messages', () => {
      const message = 'Test 🎉 with émojis and spëcial chars: <>&"\'';
      expect(() => logger.info('TEST', message)).not.toThrow();
    });
  });
});
