/**
 * Dynamic Legend Positioning Manager
 * Automatically positions legends to avoid overlap with other map elements
 */

import L from 'leaflet';

export class DynamicLegendPositioner {
  constructor() {
    this.legendPositions = [
      { position: 'bottomright', margin: [10, 10] },
      { position: 'bottomleft', margin: [10, 10] },
      { position: 'topright', margin: [10, 10] },
      { position: 'topleft', margin: [10, 10] }
    ];
    this.occupiedPositions = new Set();
  }

  /**
   * Find optimal position for a legend
   */
  findOptimalPosition(map, legendSize) {
    const mapSize = map.getSize();
    const availablePositions = this.legendPositions.filter(pos => 
      !this.occupiedPositions.has(pos.position)
    );

    // Score each position based on available space and visibility
    const scoredPositions = availablePositions.map(pos => ({
      ...pos,
      score: this.calculatePositionScore(pos, mapSize, legendSize)
    }));

    // Return the highest scoring position
    const optimalPosition = scoredPositions.reduce((best, current) => 
      current.score > best.score ? current : best
    );

    this.occupiedPositions.add(optimalPosition.position);
    return optimalPosition;
  }

  /**
   * Calculate position score based on available space and visibility
   */
  calculatePositionScore(position, mapSize, legendSize) {
    let score = 100;

    // Prefer bottom-right for consistency
    if (position.position === 'bottomright') score += 50;
    
    // Check for adequate space
    const spaceNeeded = {
      width: legendSize.width + position.margin[0] * 2,
      height: legendSize.height + position.margin[1] * 2
    };

    if (position.position.includes('right') && mapSize.x < spaceNeeded.width * 1.5) {
      score -= 30;
    }
    if (position.position.includes('bottom') && mapSize.y < spaceNeeded.height * 2) {
      score -= 20;
    }

    return score;
  }

  /**
   * Create responsive legend control
   */
  createResponsiveLegend(legendUrl, title) {
    const LegendControl = L.Control.extend({
      options: {
        position: 'bottomright'
      },

      onAdd: function(map) {
        const container = L.DomUtil.create('div', 'forecast-map-legend');
        
        // Make legend responsive
        const updateLegendSize = () => {
          const mapSize = map.getSize();
          const maxWidth = Math.min(200, mapSize.x * 0.25);
          container.style.maxWidth = `${maxWidth}px`;
        };

        // Initial size
        updateLegendSize();

        // Update on resize
        map.on('resize', updateLegendSize);

        if (legendUrl) {
          const img = L.DomUtil.create('img', 'forecast-map-legend__image', container);
          img.src = legendUrl;
          img.alt = title || 'Legend';
          img.onload = updateLegendSize;
          
          // Error handling
          img.onerror = () => {
            container.innerHTML = '<div class="legend-placeholder">Legend unavailable</div>';
          };
        } else {
          container.innerHTML = '<div class="legend-placeholder">No legend available</div>';
        }

        if (title) {
          const caption = L.DomUtil.create('div', 'forecast-map-legend__caption', container);
          caption.textContent = title;
        }

        // Prevent map events on legend
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        return container;
      },

      onRemove: function(map) {
        map.off('resize');
      }
    });

    return new LegendControl();
  }

  /**
   * Auto-position multiple legends
   */
  positionMultipleLegends(map, legends) {
    const positions = ['bottomright', 'bottomleft', 'topright', 'topleft'];
    
    legends.forEach((legend, index) => {
      if (index < positions.length) {
        legend.options.position = positions[index];
        legend.addTo(map);
      }
    });
  }

  /**
   * Reset occupied positions
   */
  reset() {
    this.occupiedPositions.clear();
  }
}

export const legendPositioner = new DynamicLegendPositioner();