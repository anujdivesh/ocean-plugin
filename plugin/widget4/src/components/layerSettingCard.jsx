import React, { useState, useEffect } from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import DateSelector from './DateSelector';

// Direct API base for layer details
const LAYER_URL_BASE = 'https://ocean-middleware.spc.int/middleware/api/layer_web_map/';

const LayerSettingsCard = ({ layerId, onSettingsChange, onApply }) => {
  const [layerData, setLayerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    opacity: 100,
    enabled: false,
    selectedDate: '',
    colorScale: 'default',
    timeRange: { start: '', end: '' },
    colormin: 0,
    colormax: 5
  });

  // Fetch layer data from API
  useEffect(() => {
    if (!layerId) return;

    const fetchLayerData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${LAYER_URL_BASE}${layerId}/?format=json`);
        
        if (response.ok) {
          const data = await response.json();
          setLayerData(data);
          
          // Initialize settings with API data
          const isMonthly = data?.datetime_format === 'MONTHLY';
          const is3MonthlySeasonal = data?.datetime_format === '3MONTHLY_SEASONAL';
          const is3Monthly = data?.datetime_format === '3MONTHLY';
          const isDaily = data?.datetime_format === 'DAILY';
          
          // console.log('LayerSettingsCard - API data:', {
          //   datetime_format: data?.datetime_format,
          //   timeIntervalStart: data?.timeIntervalStart,
          //   timeIntervalEnd: data?.timeIntervalEnd,
          //   layer_type: data?.layer_type,
          //   layer_id: layerId,
          //   isMonthly,
          //   is3MonthlySeasonal,
          //   is3Monthly,
          //   isDaily
          // });
          
          // Determine initial date based on format and layer characteristics
          let initialDate;
          if (isDaily) {
            // For DAILY format, check if it's a forecast layer
            if (data?.layer_type === "WMS_FORECAST") {
              // Forecast layers typically use start date
              initialDate = data.timeIntervalStart || data.timeIntervalEnd || '';
            } else {
              // For non-forecast DAILY layers, use end date (most recent data)
              initialDate = data.timeIntervalEnd || data.timeIntervalStart || '';
            }
          } else if (isMonthly) {
            // For MONTHLY format, check if it's a forecast layer or has specific characteristics
            if (data?.layer_type === "WMS_FORECAST") {
              // Forecast layers typically use start date
              initialDate = data.timeIntervalStart || data.timeIntervalEnd || '';
            } else {
              // For non-forecast MONTHLY layers, use end date (most recent data)
              initialDate = data.timeIntervalEnd || data.timeIntervalStart || '';
            }
          } else if (is3MonthlySeasonal) {
            // For 3MONTHLY_SEASONAL, default to the FIRST date (matches the dropdown's
            // default first-item selection, so Generate Plot uses the first date too)
            initialDate = data.timeIntervalStart || data.timeIntervalEnd || '';
          } else if (is3Monthly) {
            // For 3MONTHLY, use end date (most recent data)
            initialDate = data.timeIntervalEnd || data.timeIntervalStart || '';
          } else {
            // For other formats, use start date
            initialDate = data.timeIntervalStart || '';
          }
          
          // console.log('LayerSettingsCard - Setting initialDate:', initialDate);
          
          setSettings(prev => ({
            ...prev,
            selectedDate: initialDate,
            timeRange: {
              start: data.timeIntervalStart || '',
              end: data.timeIntervalEnd || ''
            },
            colormin: isMonthly ? -300 : (data?.colorscalemin ?? 0),
            colormax: isMonthly ? 300 : (data?.colorscalemax ?? 5)
          }));
        } else {
          console.error('Failed to fetch layer data');
        }
      } catch (error) {
        console.error('Error fetching layer data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLayerData();
  }, [layerId]);

  // Handle settings changes
  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    // Callback to parent component
    if (onSettingsChange) {
      onSettingsChange(newSettings);
    }
  };

  // handleTimeRangeChange removed - now handled by DateSelector

  if (loading) {
    return (
      <Card style={{ width: '400px', margin: '20px' }}>
        <Card.Body>
          <div className="text-center">Loading layer settings...</div>
        </Card.Body>
      </Card>
    );
  }

  if (!layerData) {
    return (
      <Card style={{ width: '400px', margin: '20px' }}>
        <Card.Body>
          <div className="text-center text-danger">Failed to load layer data</div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="card-theme" style={{ width: '400px', margin: '20px' }}>
      <Card.Header className="bg-theme-surface border-theme">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--color-text)' }}>
          <div style={{ fontWeight: '600' }}>
            {layerData.layer_title || 'Layer'}
          </div>
        </div>
      </Card.Header>

      <Card.Body className="bg-theme-surface" style={{ color: 'var(--color-text)' }}>
        {/* Opacity Control */}
        {/* <div style={{ marginBottom: '20px' }}>
          <Form.Label style={{ color: 'var(--color-text)' }}>Opacity: {settings.opacity}%</Form.Label>
          <Form.Range
            min={0}
            max={100}
            value={settings.opacity}
            onChange={(e) => handleSettingChange('opacity', parseInt(e.target.value))}
          />
        </div> */}

        {/* Date/Time Controls using DateSelector */}
        <DateSelector
          item={{ layer_information: layerData }}
          period={layerData?.datetime_format}
          startDateStr={layerData?.timeIntervalStart}
          endDateStr={layerData?.timeIntervalEnd}
          onDateChange={(dateInfo) => {
            setSettings(prev => ({
              ...prev,
              selectedDate: dateInfo.currentDate,
              timeRange: {
                start: dateInfo.timeIntervalStart,
                end: dateInfo.timeIntervalEnd
              }
            }));
            if (onSettingsChange) {
              onSettingsChange({
                ...settings,
                selectedDate: dateInfo.currentDate,
                timeRange: {
                  start: dateInfo.timeIntervalStart,
                  end: dateInfo.timeIntervalEnd
                }
              });
            }
          }}
        />

        {/**
         * Color Scale Control (commented out)
         *
         * <div style={{ marginBottom: '20px' }}>
         *   <Form.Label>Color Scale</Form.Label>
         *   <Form.Select
         *     value={settings.colorScale}
         *     onChange={(e) => handleSettingChange('colorScale', e.target.value)}
         *   >
         *     <option value="default">Default</option>
         *     <option value="viridis">Viridis</option>
         *     <option value="plasma">Plasma</option>
         *     <option value="inferno">Inferno</option>
         *     <option value="coolwarm">Cool Warm</option>
         *   </Form.Select>
         * </div>
         */}

        {/* Color Range (Min/Max) */}
        {/* <div style={{ marginBottom: '20px' }}>
          <Form.Label style={{ color: 'var(--color-text)' }}>Color Range</Form.Label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Form.Control
              type="number"
              step="0.1"
              value={settings.colormin}
              onChange={(e) => handleSettingChange('colormin', parseFloat(e.target.value))}
              placeholder="Min"
            />
            <Form.Control
              type="number"
              step="0.1"
              value={settings.colormax}
              onChange={(e) => handleSettingChange('colormax', parseFloat(e.target.value))}
              placeholder="Max"
            />
          </div>
        </div> */}

        {/* Legend Image */}
        {/* {layerData.legend_url && (
          <div style={{ marginBottom: '15px' }}>
            <Form.Label style={{ color: 'var(--color-text)' }}>Legend</Form.Label>
            <div>
              <img
                src={layerData.legend_url}
                alt="Legend"
                style={{ maxWidth: '100%', height: 'auto', border: '1px solid var(--color-border, #e9ecef)', borderRadius: '4px', background: 'var(--color-surface)' }}
              />
            </div>
          </div>
        )} */}

        {/* Layer Type Info */}
        {/* <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: 'var(--color-background)', borderRadius: '4px', color: 'var(--color-text)' }}>
          <small>
            <strong>Type:</strong> {layerData.layer_type}<br />
             <strong>Time Series:</strong> {layerData.is_timeseries ? 'Yes' : 'No'}<br /> 
            {layerData.units && <><strong>Units:</strong> {layerData.units}</>}
          </small>
        </div> */}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button 
            variant="success" 
            onClick={() => {
              if (onApply) {
                onApply({ layerId, settings });
              } else {
                // console.log('Apply settings:', settings);
              }
            }}
          >
            Generate Plot
          </Button>
          <Button 
            variant="outline-secondary" 
            onClick={() => {/* console.log('Reset settings') */}}
          >
            Reset
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default LayerSettingsCard;