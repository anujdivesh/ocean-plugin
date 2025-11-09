/**
 * Vector Arrow Optimizer Tests
 * 
 * Validates zoom-based density control and magnitude-based styling
 */

import vectorArrowOptimizer, { VectorArrowOptimizer } from './VectorArrowOptimizer';

describe('VectorArrowOptimizer', () => {
  let optimizer;

  beforeEach(() => {
    optimizer = new VectorArrowOptimizer();
  });

  describe('Density Configuration', () => {
    test('should return correct density for each zoom level', () => {
      const zoom8 = optimizer.getDensityForZoom(8);
      expect(zoom8.spacing).toBe(8);
      expect(zoom8.description).toContain('National');

      const zoom11 = optimizer.getDensityForZoom(11);
      expect(zoom11.spacing).toBe(2);
      expect(zoom11.description).toContain('Island scale');

      const zoom14 = optimizer.getDensityForZoom(14);
      expect(zoom14.spacing).toBe(0.75);
    });

    test('should find closest zoom level for intermediate values', () => {
      const zoom10_5 = optimizer.getDensityForZoom(10.5);
      expect(zoom10_5.spacing).toBe(4); // Closest to zoom 10

      const zoom9_5 = optimizer.getDensityForZoom(9.5);
      expect(zoom9_5.spacing).toBe(6); // Closest to zoom 9
    });
  });

  describe('NUMVECTORS Calculation', () => {
    test('should calculate correct number of vectors for different zooms', () => {
      // Zoom 8: National view - sparse
      const num8 = optimizer.calculateNumVectors(8, 8);
      expect(num8).toBeGreaterThan(10);
      expect(num8).toBeLessThan(100);

      // Zoom 11: Island scale - optimal
      const num11 = optimizer.calculateNumVectors(11, 2);
      expect(num11).toBeGreaterThan(150);
      expect(num11).toBeLessThan(300);

      // Zoom 14: Coastal detail - dense
      const num14 = optimizer.calculateNumVectors(14, 0.75);
      expect(num14).toBeGreaterThan(300);
      expect(num14).toBeLessThanOrEqual(500); // Clamped maximum
    });

    test('should clamp values to reasonable range', () => {
      // Very low zoom should clamp to minimum
      const numLow = optimizer.calculateNumVectors(1, 20);
      expect(numLow).toBeGreaterThanOrEqual(10);

      // Very high zoom should clamp to maximum
      const numHigh = optimizer.calculateNumVectors(20, 0.1);
      expect(numHigh).toBeLessThanOrEqual(500);
    });

    test('should scale inversely with spacing', () => {
      const zoom = 10;
      const num2km = optimizer.calculateNumVectors(zoom, 2);
      const num4km = optimizer.calculateNumVectors(zoom, 4);

      // Fewer vectors with larger spacing
      expect(num4km).toBeLessThan(num2km);
      
      // Approximately double density with half spacing
      expect(num2km / num4km).toBeGreaterThan(1.5);
      expect(num2km / num4km).toBeLessThan(2.5);
    });
  });

  describe('Opacity Management', () => {
    test('should use full opacity at island scale (zoom >= 11)', () => {
      const baseOpacity = 0.9;
      
      const opacity11 = optimizer.calculateBaseOpacity(11, baseOpacity, 'dynamic');
      expect(opacity11).toBe(0.9);

      const opacity12 = optimizer.calculateBaseOpacity(12, baseOpacity, 'dynamic');
      expect(opacity12).toBe(0.9);
    });

    test('should reduce opacity at national scale (zoom < 11)', () => {
      const baseOpacity = 0.9;
      
      const opacity10 = optimizer.calculateBaseOpacity(10, baseOpacity, 'dynamic');
      expect(opacity10).toBe(0.81); // 0.9 * 0.9

      const opacity9 = optimizer.calculateBaseOpacity(9, baseOpacity, 'dynamic');
      expect(opacity9).toBeCloseTo(0.72, 2); // 0.9 * 0.8

      const opacity8 = optimizer.calculateBaseOpacity(8, baseOpacity, 'dynamic');
      expect(opacity8).toBeCloseTo(0.63, 2); // 0.9 * 0.7
    });

    test('should maintain uniform opacity in uniform mode', () => {
      const baseOpacity = 0.85;
      
      const opacity8 = optimizer.calculateBaseOpacity(8, baseOpacity, 'uniform');
      const opacity11 = optimizer.calculateBaseOpacity(11, baseOpacity, 'uniform');
      const opacity14 = optimizer.calculateBaseOpacity(14, baseOpacity, 'uniform');

      expect(opacity8).toBe(0.85);
      expect(opacity11).toBe(0.85);
      expect(opacity14).toBe(0.85);
    });
  });

  describe('Arrow Size Calculation', () => {
    test('should scale arrow size with zoom level', () => {
      const size8 = optimizer.calculateArrowSize(8);
      const size11 = optimizer.calculateArrowSize(11);
      const size12 = optimizer.calculateArrowSize(12);

      // Smaller at low zoom, larger at high zoom
      expect(size8).toBeLessThan(size11);
      expect(size11).toBeLessThan(size12);
    });

    test('should return reasonable multipliers', () => {
      const sizes = [8, 9, 10, 11, 12, 13].map(z => optimizer.calculateArrowSize(z));
      
      sizes.forEach(size => {
        expect(size).toBeGreaterThanOrEqual(0.7);
        expect(size).toBeLessThanOrEqual(1.3);
      });
    });
  });

  describe('Magnitude-Based Styling', () => {
    test('should provide correct fade filters for magnitude ranges', () => {
      const veryCalm = optimizer.getMagnitudeFadeFilter(0.1);
      expect(veryCalm).toContain('0.2');

      const calm = optimizer.getMagnitudeFadeFilter(0.3);
      expect(calm).toContain('0.4');

      const moderate = optimizer.getMagnitudeFadeFilter(0.7);
      expect(moderate).toContain('0.7');

      const energetic = optimizer.getMagnitudeFadeFilter(1.5);
      expect(energetic).toContain('0.9');

      const veryEnergetic = optimizer.getMagnitudeFadeFilter(3.5);
      expect(veryEnergetic).toContain('1.0');
      expect(veryEnergetic).toContain('brightness');
    });

    test('should provide magnitude-based colors', () => {
      const veryCalm = optimizer.getMagnitudeColor(0.1);
      expect(veryCalm).toContain('150'); // Light gray

      const calm = optimizer.getMagnitudeColor(0.3);
      expect(calm).toContain('100'); // Medium gray

      const energetic = optimizer.getMagnitudeColor(1.5);
      expect(energetic).toBe('rgb(0, 0, 0)'); // Black

      const veryEnergetic = optimizer.getMagnitudeColor(2.5);
      expect(veryEnergetic).toContain('139'); // Dark red

      const extreme = optimizer.getMagnitudeColor(4.0);
      expect(extreme).toContain('220'); // Bright red
    });
  });

  describe('Full Integration', () => {
    test('should generate complete optimized params for zoom 8 (national)', () => {
      const params = optimizer.getOptimizedArrowParams(8, {
        baseOpacity: 0.9,
        energyMode: 'dynamic',
        arrowStyle: 'scaled'
      });

      expect(params.style).toBe('black-arrow');
      expect(params.NUMVECTORS).toBeGreaterThan(10);
      expect(params.NUMVECTORS).toBeLessThan(100);
      expect(params.opacity).toBeLessThan(0.9); // Reduced at national scale
      expect(params.zIndex).toBe(2);
      expect(params._optimizationMetadata.zoomLevel).toBe(8);
      expect(params._optimizationMetadata.description).toContain('National');
    });

    test('should generate complete optimized params for zoom 11 (island)', () => {
      const params = optimizer.getOptimizedArrowParams(11, {
        baseOpacity: 0.9,
        energyMode: 'dynamic',
        arrowStyle: 'scaled'
      });

      expect(params.style).toBe('black-arrow');
      expect(params.NUMVECTORS).toBeGreaterThan(150);
      expect(params.NUMVECTORS).toBeLessThan(300);
      expect(params.opacity).toBe(0.9); // Full opacity at island scale
      expect(params.ARROWSIZE).toBe(1.0); // Standard size
      expect(params._optimizationMetadata.densitySpacing).toBe(2);
      expect(params._optimizationMetadata.description).toContain('Island scale');
    });

    test('should generate complete optimized params for zoom 13 (coastal)', () => {
      const params = optimizer.getOptimizedArrowParams(13, {
        baseOpacity: 0.9,
        energyMode: 'dynamic',
        arrowStyle: 'scaled'
      });

      expect(params.NUMVECTORS).toBeGreaterThan(300);
      expect(params.opacity).toBe(0.9);
      expect(params.ARROWSIZE).toBeGreaterThan(1.0); // Larger arrows
      expect(params._optimizationMetadata.densitySpacing).toBe(1);
    });

    test('should respect uniform energy mode', () => {
      const params = optimizer.getOptimizedArrowParams(8, {
        baseOpacity: 0.85,
        energyMode: 'uniform',
        arrowStyle: 'scaled'
      });

      expect(params.opacity).toBe(0.85); // No reduction in uniform mode
    });
  });

  describe('Status and Reporting', () => {
    test('should provide current status after optimization', () => {
      optimizer.getOptimizedArrowParams(11);
      const status = optimizer.getStatus();

      expect(status.zoomLevel).toBe(11);
      expect(status.densitySpacing).toBe(2);
      expect(status.isOptimized).toBe(true);
      expect(status.thresholds).toBeDefined();
    });

    test('should provide user-friendly explanation', () => {
      optimizer.getOptimizedArrowParams(11);
      const explanation = optimizer.getExplanation();

      expect(explanation).toContain('zoom level 11');
      expect(explanation).toContain('2km');
      expect(explanation).toContain('Island scale');
      expect(explanation).toContain('fade');
    });

    test('should provide correct description', () => {
      optimizer.getOptimizedArrowParams(8);
      expect(optimizer.getCurrentDensityDescription()).toContain('National');

      optimizer.getOptimizedArrowParams(11);
      expect(optimizer.getCurrentDensityDescription()).toContain('Island scale');
    });
  });

  describe('Singleton Instance', () => {
    test('should export singleton instance', () => {
      expect(vectorArrowOptimizer).toBeInstanceOf(VectorArrowOptimizer);
    });

    test('should maintain state across calls', () => {
      vectorArrowOptimizer.getOptimizedArrowParams(10);
      const status1 = vectorArrowOptimizer.getStatus();

      vectorArrowOptimizer.getOptimizedArrowParams(12);
      const status2 = vectorArrowOptimizer.getStatus();

      expect(status1.zoomLevel).toBe(10);
      expect(status2.zoomLevel).toBe(12);
      expect(status1.densitySpacing).not.toBe(status2.densitySpacing);
    });
  });

  describe('Edge Cases', () => {
    test('should handle extreme zoom levels gracefully', () => {
      const params0 = optimizer.getOptimizedArrowParams(0);
      expect(params0.NUMVECTORS).toBeGreaterThanOrEqual(10);

      const params20 = optimizer.getOptimizedArrowParams(20);
      expect(params20.NUMVECTORS).toBeLessThanOrEqual(500);
    });

    test('should handle negative zoom levels', () => {
      const params = optimizer.getOptimizedArrowParams(-5);
      expect(params.NUMVECTORS).toBeGreaterThanOrEqual(10);
      expect(params.opacity).toBeGreaterThan(0);
      expect(params.opacity).toBeLessThanOrEqual(1);
    });

    test('should handle fractional zoom levels', () => {
      const params = optimizer.getOptimizedArrowParams(10.7);
      expect(params.NUMVECTORS).toBeGreaterThan(0);
      expect(params._optimizationMetadata.zoomLevel).toBe(10.7);
    });

    test('should handle missing options gracefully', () => {
      const params = optimizer.getOptimizedArrowParams(11);
      expect(params.opacity).toBeDefined();
      expect(params.NUMVECTORS).toBeDefined();
    });
  });
});
