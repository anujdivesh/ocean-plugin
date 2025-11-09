// ENHANCED TABLE IMPLEMENTATION - CRITICAL FIXES

// 1. DYNAMIC VARIABLE DETECTION
const detectVariables = (perVariableData) => {
  return Object.keys(perVariableData || {}).map(key => {
    const data = perVariableData[key];
    // Auto-detect ranges from actual data
    const values = extractValues(data);
    const min = Math.min(...values.filter(v => v !== null));
    const max = Math.max(...values.filter(v => v !== null));
    
    return {
      key,
      label: getMarineLabel(key),
      range: { min: Math.floor(min * 10) / 10, max: Math.ceil(max * 10) / 10 },
      colorScheme: getOptimalColorScheme(key),
      units: getMarineUnits(key)
    };
  });
};

// 2. TUVALU SPECIFIC MARINE LABELS
const getMarineLabel = (key) => {
  const labels = {
    'hs': 'Significant Wave Height',
    'tm02': 'Mean Wave Period', 
    'tpeak': 'Peak Wave Period',
    'dirm': 'Mean Wave Direction',
    'tp': 'Peak Period',
    'dp': 'Peak Direction',
    // Add Tuvalu specific variables
  };
  return labels[key] || key.toUpperCase();
};

// 3. SEA STATE INTEGRATION
const getSeaStateDescription = (waveHeight) => {
  if (waveHeight < 0.5) return { state: "Calm", description: "Like a mirror", color: "#E8F4FD" };
  if (waveHeight < 1.25) return { state: "Smooth", description: "Small wavelets", color: "#B3D9F2" };
  if (waveHeight < 2.5) return { state: "Slight", description: "Large wavelets", color: "#7FB8E3" };
  if (waveHeight < 4) return { state: "Moderate", description: "Small waves", color: "#4A90C2" };
  if (waveHeight < 6) return { state: "Rough", description: "Moderate waves", color: "#2E5984" };
  return { state: "Very Rough", description: "Large waves", color: "#1A3E63" };
};

// 4. ENHANCED CELL RENDERING WITH TOOLTIPS
const EnhancedCell = ({ value, config, isDarkMode }) => {
  const { min, max, type, decimalPlaces, units } = config;
  
  if (type === 'dir') {
    return (
      <div title={`${value}° ${getCompassDirection(value)}`}>
        <ArrowSVG angle={value + 180} isDarkMode={isDarkMode} />
        <small>{getCompassDirection(value)}</small>
      </div>
    );
  }
  
  if (type === 'hs') {
    const seaState = getSeaStateDescription(value);
    return (
      <div title={`${value}${units} - ${seaState.state}: ${seaState.description}`}>
        {formatSmart(value, decimalPlaces)}
        <small style={{ display: 'block', fontSize: '0.7em', opacity: 0.8 }}>
          {seaState.state}
        </small>
      </div>
    );
  }
  
  return (
    <span title={`${value}${units || ''}`}>
      {formatSmart(value, decimalPlaces)}
    </span>
  );
};

// 5. COMPASS DIRECTION HELPER
const getCompassDirection = (degrees) => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                     'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return directions[Math.round(degrees / 22.5) % 16];
};