module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
  rules: {
    'no-unused-vars': ['error', {
      varsIgnorePattern: '^(setCollapsed|setLegendSize|legendBodyId)$',
      argsIgnorePattern: '^(compactMode|showDescription|opacity|WAVE_FORECAST_LAYERS|activeLayers|isUpdatingVisualization|currentSliderDateStr)$'
    }]
  }
};