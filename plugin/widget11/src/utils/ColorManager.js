// ColorManager.js - Colorblind-friendly color management

export const ColorPalettes = {
  DEFAULT: 'default',
  COLORBLIND_FRIENDLY: 'colorblind',
  HIGH_CONTRAST: 'high-contrast'
};

// Default color scheme (current)
const defaultColors = {
  waveHeight: {
    low: 'rgb(146, 173, 198)',      // Light blue
    medium: 'rgb(120, 151, 181)',   // Medium blue
    high: 'rgb(100, 130, 165)',     // Dark blue
    extreme: 'rgb(80, 110, 145)'    // Very dark blue
  },
  waveEnergy: {
    low: 'rgb(0, 0, 150)',          // Dark blue
    medium: 'rgb(0, 87, 255)',      // Blue
    high: 'rgb(110, 255, 144)',     // Green
    extreme: 'rgb(191, 255, 63)'    // Yellow-green
  },
  wavePeriod: {
    low: 'rgb(255, 229, 229)',      // Very light red
    medium: 'rgb(201, 133, 133)',   // Medium red
    high: 'rgb(184, 101, 101)',     // Dark red
    extreme: 'rgb(167, 71, 71)'     // Very dark red
  }
};

// Colorblind-friendly palette (Viridis-inspired)
const colorblindColors = {
  waveHeight: {
    low: '#fde725',     // Yellow
    medium: '#5dc863',  // Green
    high: '#21908c',    // Teal
    extreme: '#440154'  // Purple
  },
  waveEnergy: {
    low: '#0d0887',     // Dark purple
    medium: '#6a00a8',  // Purple
    high: '#b12a90',    // Magenta
    extreme: '#e16462'  // Pink-red
  },
  wavePeriod: {
    low: '#fcfdbf',     // Light yellow
    medium: '#feb078',  // Orange
    high: '#d73027',    // Red
    extreme: '#a50026'  // Dark red
  }
};

// High contrast palette
const highContrastColors = {
  waveHeight: {
    low: '#ffffff',     // White
    medium: '#cccccc',  // Light gray
    high: '#666666',    // Dark gray
    extreme: '#000000'  // Black
  },
  waveEnergy: {
    low: '#000000',     // Black
    medium: '#333333',  // Dark gray
    high: '#999999',    // Medium gray
    extreme: '#ffffff'  // White
  },
  wavePeriod: {
    low: '#ffffff',     // White
    medium: '#cccccc',  // Light gray
    high: '#666666',    // Dark gray
    extreme: '#000000'  // Black
  }
};

export class ColorManager {
  constructor() {
    this.currentPalette = ColorPalettes.DEFAULT;
    this.listeners = [];
    
    // Check for system preferences
    this.detectSystemPreferences();
  }

  detectSystemPreferences() {
    // Check for high contrast preference
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      this.currentPalette = ColorPalettes.HIGH_CONTRAST;
    }
    
    // Listen for changes
    window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
      if (e.matches) {
        this.setPalette(ColorPalettes.HIGH_CONTRAST);
      }
    });
  }

  setPalette(palette) {
    this.currentPalette = palette;
    this.updateCSSVariables();
    this.notifyListeners();
    
    // Store preference
    localStorage.setItem('colorPalette', palette);
  }

  getCurrentPalette() {
    return this.currentPalette;
  }

  getColors() {
    switch (this.currentPalette) {
      case ColorPalettes.COLORBLIND_FRIENDLY:
        return colorblindColors;
      case ColorPalettes.HIGH_CONTRAST:
        return highContrastColors;
      default:
        return defaultColors;
    }
  }

  updateCSSVariables() {
    const colors = this.getColors();
    const root = document.documentElement;
    
    // Update CSS custom properties
    Object.entries(colors).forEach(([category, values]) => {
      Object.entries(values).forEach(([level, color]) => {
        root.style.setProperty(`--${category}-${level}`, color);
      });
    });
    
    // Update body class for CSS cascade
    document.body.className = document.body.className.replace(
      /palette-\w+/g, 
      ''
    );
    document.body.classList.add(`palette-${this.currentPalette}`);
  }

  // Convert value to color based on range and category
  getColorForValue(value, range, category = 'waveHeight') {
    const colors = this.getColors()[category];
    const { min, max } = range;
    const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
    
    if (normalized < 0.25) return colors.low;
    if (normalized < 0.50) return colors.medium;
    if (normalized < 0.75) return colors.high;
    return colors.extreme;
  }

  // Generate color scale legend
  generateColorScale(category = 'waveHeight', steps = 5) {
    const colors = this.getColors()[category];
    const colorArray = Object.values(colors);
    
    return Array.from({ length: steps }, (_, i) => {
      const index = Math.floor((i / (steps - 1)) * (colorArray.length - 1));
      return colorArray[index];
    });
  }

  // Event listener management
  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.currentPalette, this.getColors());
      } catch (error) {
        console.error('Error in color manager listener:', error);
      }
    });
  }

  // Accessibility helpers
  getContrastRatio(color1, color2) {
    // Simplified contrast ratio calculation
    const getLuminance = (color) => {
      const rgb = color.match(/\d+/g);
      if (!rgb) return 0;
      
      const [r, g, b] = rgb.map(c => {
        c = parseInt(c) / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    
    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  // Get accessible text color for background
  getTextColor(backgroundColor) {
    const contrastWithWhite = this.getContrastRatio(backgroundColor, '#ffffff');
    const contrastWithBlack = this.getContrastRatio(backgroundColor, '#000000');
    
    return contrastWithWhite > contrastWithBlack ? '#ffffff' : '#000000';
  }

  // Initialize from saved preference
  loadSavedPalette() {
    const saved = localStorage.getItem('colorPalette');
    if (saved && Object.values(ColorPalettes).includes(saved)) {
      this.setPalette(saved);
    }
  }
}

// Singleton instance
export const colorManager = new ColorManager();

// Initialize on load
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    colorManager.loadSavedPalette();
  });
}