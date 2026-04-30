import { ScatterplotLayer } from '@deck.gl/layers';
import { CompositeLayer } from '@deck.gl/core';
import { COLOR_SCHEMES } from '../config/visualizationConfig';

/**
 * SimpleParticleFlowLayer - Ocean Flow Visualization using deck.gl built-in layers
 * 
 * Uses ScatterplotLayer (proven deck.gl layer) instead of custom luma.gl Model
 * Much simpler and guaranteed to work with deck.gl 9.3.1
 */

export default class SimpleParticleFlowLayer extends CompositeLayer {
  initializeState() {
    const { particleCount = 10000 } = this.props;
    
    // Initialize particles with random positions within bounds
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        id: i,
        position: [0, 0],
        velocity: [0, 0],
        age: Math.random(),
      });
    }
    
    this.setState({ particles });
    this._initializeParticles();
  }

  _initializeParticles() {
    const { bounds = [-180, -90, 180, 90] } = this.props;
    const { particles } = this.state;
    
    particles.forEach(p => {
      p.position = [
        bounds[0] + Math.random() * (bounds[2] - bounds[0]),
        bounds[1] + Math.random() * (bounds[3] - bounds[1]),
      ];
      p.velocity = [0, 0];
      p.age = Math.random();
    });
    
    this.setState({ particles });
  }

  updateState({ props, oldProps, changeFlags }) {
    if (changeFlags.propsChanged) {
      if (props.bounds !== oldProps.bounds && props.bounds) {
        this._initializeParticles();
      }
    }
  }

  _updateParticles() {
    const { flowData, bounds, speedFactor = 1.0, particleLifespan = 100 } = this.props;
    const { particles } = this.state;
    
    if (!flowData || !flowData.u || !flowData.v) return;
    
    const deltaTime = 0.016; // ~60fps
    
    particles.forEach(p => {
      // Age the particle
      p.age += 1.0 / particleLifespan;
      
      // Respawn if too old or out of bounds
      if (p.age >= 1.0 || !this._isInBounds(p.position, bounds)) {
        p.position = [
          bounds[0] + Math.random() * (bounds[2] - bounds[0]),
          bounds[1] + Math.random() * (bounds[3] - bounds[1]),
        ];
        p.age = 0;
        p.velocity = [0, 0];
        return;
      }
      
      // Sample flow field
      const velocity = this._sampleFlowField(p.position, flowData, bounds);
      p.velocity = velocity;
      
      // Update position
      p.position[0] += velocity[0] * speedFactor * deltaTime;
      p.position[1] += velocity[1] * speedFactor * deltaTime;
    });
    
    this.setState({ particles: [...particles] });
  }

  _isInBounds(position, bounds) {
    return (
      position[0] >= bounds[0] &&
      position[0] <= bounds[2] &&
      position[1] >= bounds[1] &&
      position[1] <= bounds[3]
    );
  }

  _sampleFlowField(position, flowData, bounds) {
    if (!flowData || !flowData.u || !flowData.v) {
      return [0, 0];
    }
    
    const { width, height } = flowData;
    
    // Normalize position to texture coordinates
    const u = (position[0] - bounds[0]) / (bounds[2] - bounds[0]);
    const v = (position[1] - bounds[1]) / (bounds[3] - bounds[1]);
    
    // Get grid indices with bilinear interpolation
    const x = u * (width - 1);
    const y = v * (height - 1);
    
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.min(x0 + 1, width - 1);
    const y1 = Math.min(y0 + 1, height - 1);
    
    const fx = x - x0;
    const fy = y - y0;
    
    // Sample u component
    const u00 = flowData.u[y0 * width + x0] || 0;
    const u10 = flowData.u[y0 * width + x1] || 0;
    const u01 = flowData.u[y1 * width + x0] || 0;
    const u11 = flowData.u[y1 * width + x1] || 0;
    
    const uVal = (1 - fx) * (1 - fy) * u00 +
                  fx * (1 - fy) * u10 +
                  (1 - fx) * fy * u01 +
                  fx * fy * u11;
    
    // Sample v component
    const v00 = flowData.v[y0 * width + x0] || 0;
    const v10 = flowData.v[y0 * width + x1] || 0;
    const v01 = flowData.v[y1 * width + x0] || 0;
    const v11 = flowData.v[y1 * width + x1] || 0;
    
    const vVal = (1 - fx) * (1 - fy) * v00 +
                  fx * (1 - fy) * v10 +
                  (1 - fx) * fy * v01 +
                  fx * fy * v11;
    
    return [uVal || 0, vVal || 0];
  }

  _getColor(velocity, colorScheme) {
    const speed = Math.sqrt(velocity[0] * velocity[0] + velocity[1] * velocity[1]);
    const maxSpeed = 2.0; // m/s
    const t = Math.min(speed / maxSpeed, 1.0);
    
    const colors = COLOR_SCHEMES[colorScheme] || COLOR_SCHEMES.viridis;
    const index = Math.floor(t * (colors.length - 1));
    const color = colors[Math.min(index, colors.length - 1)];
    
    return color;
  }

  renderLayers() {
    const { particles } = this.state;
    const { colorScheme = 'viridis', opacity = 0.8, lineWidth = 2 } = this.props;
    
    // Update particles every frame
    this._updateParticles();
    
    return [
      new ScatterplotLayer({
        id: `${this.props.id}-particles`,
        data: particles,
        getPosition: d => d.position,
        getRadius: lineWidth,
        getFillColor: d => {
          const color = this._getColor(d.velocity, colorScheme);
          const alpha = Math.floor((1.0 - d.age * 0.3) * opacity * 255);
          return [color[0], color[1], color[2], alpha];
        },
        radiusUnits: 'pixels',
        radiusMinPixels: lineWidth,
        radiusMaxPixels: lineWidth * 2,
        updateTriggers: {
          getPosition: this.state.particles,
          getFillColor: [colorScheme, opacity],
        },
      }),
    ];
  }
}
