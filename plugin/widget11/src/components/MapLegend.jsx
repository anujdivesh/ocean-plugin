import React from 'react';

const legendStyle = {
  position: 'absolute',
  bottom: '30px', // Adjust vertical position
  right: '10px',  // Keep horizontal position
  zIndex: 1000,
  background: 'rgba(255, 255, 255, 0.8)',
  padding: '5px 10px',
  borderRadius: '5px',
  boxShadow: '0 1px 5px rgba(0,0,0,0.4)',
  lineHeight: '1.2',
  maxWidth: '300px',
};

const legendImageStyle = {
  width: '100%',
  display: 'block',
};

const MapLegend = ({ selectedLayer }) => {
  if (!selectedLayer || !selectedLayer.legendUrl) {
    return null;
  }

  // For composite layers, find the first sub-layer with a legend.
  let legendUrl = selectedLayer.legendUrl;
  if (selectedLayer.composite && selectedLayer.layers) {
    const firstSubLayerWithLegend = selectedLayer.layers.find(l => l.legendUrl);
    if (firstSubLayerWithLegend) {
      legendUrl = firstSubLayerWithLegend.legendUrl;
    }
  }

  return (
    <div style={legendStyle}>
      <img 
        src={legendUrl} 
        alt="Layer Legend" 
        style={legendImageStyle} 
      />
    </div>
  );
};

export default MapLegend;