import React from 'react';
import styles from './CompactLegend.module.css';
import WorldClassVisualization from '../../utils/WorldClassVisualization';

const LegendDescriptions = ({ layer }) => {
  // Generate meaningful descriptions based on layer type and values
  const getDescriptions = (layer) => {
    const layerName = (layer.name || layer.title || '').toLowerCase();
    
    if (layerName.includes('hs') || layerName.includes('wave_height')) {
      // Use original WMO standards for wave height
      const wmoRanges = WorldClassVisualization.wmoStandards.significantWaveHeight.ranges;
      return wmoRanges.slice(0, 8).map(range => ({
        label: range.label,
        value: `${range.min}-${range.max}m`,
        description: range.description
      }));
    }
    
    if (layerName.includes('tm') || layerName.includes('period')) {
      return [
        { label: 'Wind Waves', value: '2-5s', description: 'Short period wind waves' },
        { label: 'Mixed Seas', value: '5-8s', description: 'Combined wind & swell' },
        { label: 'Swell', value: '8-12s', description: 'Long period swell' },
        { label: 'Long Swell', value: '> 12s', description: 'Very long period swell' }
      ];
    }
    
    if (layerName.includes('wind')) {
      return [
        { label: 'Calm', value: '< 2 m/s', description: 'Light air, smoke drifts' },
        { label: 'Light', value: '2-6 m/s', description: 'Light breeze, leaves rustle' },
        { label: 'Moderate', value: '6-10 m/s', description: 'Gentle breeze, waves form' },
        { label: 'Fresh', value: '10-17 m/s', description: 'Moderate wind, whitecaps' },
        { label: 'Strong', value: '17-21 m/s', description: 'Fresh breeze, spray' },
        { label: 'Gale', value: '> 21 m/s', description: 'Strong wind, difficult conditions' }
      ];
    }
    
    if (layerName.includes('current')) {
      return [
        { label: 'Weak', value: '< 0.25 m/s', description: 'Minimal current effect' },
        { label: 'Moderate', value: '0.25-0.5 m/s', description: 'Noticeable drift' },
        { label: 'Strong', value: '0.5-1 m/s', description: 'Significant current' },
        { label: 'Very Strong', value: '> 1 m/s', description: 'Powerful current' }
      ];
    }
    
    if (layerName.includes('temp')) {
      return [
        { label: 'Cool', value: '< 24°C', description: 'Cool water temperatures' },
        { label: 'Comfortable', value: '24-27°C', description: 'Pleasant swimming' },
        { label: 'Warm', value: '27-30°C', description: 'Warm tropical waters' },
        { label: 'Very Warm', value: '> 30°C', description: 'Very warm conditions' }
      ];
    }
    
    if (layerName.includes('inundation')) {
      return [
        { label: 'None', value: '0m', description: 'No inundation risk' },
        { label: 'Low', value: '0-1m', description: 'Minor flooding possible' },
        { label: 'Moderate', value: '1-2m', description: 'Moderate flood risk' },
        { label: 'High', value: '2-3m', description: 'Significant flooding' },
        { label: 'Extreme', value: '> 3m', description: 'Severe flood conditions' }
      ];
    }
    
    // Default generic descriptions
    return [
      { label: 'Low', value: 'Minimal', description: 'Low values' },
      { label: 'Moderate', value: 'Medium', description: 'Moderate values' },
      { label: 'High', value: 'Maximum', description: 'High values' }
    ];
  };

  const descriptions = getDescriptions(layer);

  return (
    <div className={styles.descriptions}>
      {descriptions.map((item, index) => (
        <div 
          key={index}
          className={styles.descriptionItem}
          title={item.description}
        >
          <div className={styles.descriptionLabel}>
            {item.label}
          </div>
          <div className={styles.descriptionValue}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
};

export default LegendDescriptions;