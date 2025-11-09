# Inundation Points - Quick Reference

## Quick Start

### Enable Inundation Points
```javascript
// Already integrated in ForecastApp.jsx
// Click "Show Inundation" button in the UI
```

### Filter by Atoll
```javascript
// Use the dropdown in the UI, or programmatically:
await inundationPoints.loadPoints({ atoll: 'Funafuti' });
```

### Get Statistics
```javascript
const stats = inundationPoints.getStats();
// Returns: { total: 45, byRiskLevel: { low: 20, medium: 15, high: 10 } }
```

## Risk Levels

| Level  | Threshold | Color  | Hex     |
|--------|-----------|--------|---------|
| Low    | ≤ 0.4m   | Blue   | #2196F3 |
| Medium | 0.4-0.8m | Orange | #FF9800 |
| High   | > 0.8m   | Red    | #F44336 |

## Data Sources

### JSON Data
```
https://gemthreddshpc.spc.int/thredds/fileServer/POP/model/country/spc/forecast/hourly/TUV/final.json
```

### Forecast Images
```
https://gemthreddshpc.spc.int/thredds/fileServer/POP/model/country/spc/forecast/hourly/TUV/{filename}.png
```

## Tuvalu Atolls

1. Nanumaga
2. Nanumea
3. Niutao
4. Nui
5. Vaitupu
6. Nukufetau
7. Funafuti (capital)
8. Nukulaelae
9. Niulakita

## Common Tasks

### Load All Points
```javascript
inundationPoints.loadPoints();
```

### Load Specific Atoll
```javascript
inundationPoints.loadPoints({ atoll: 'Nanumaga' });
```

### Hide/Show Toggle
```javascript
inundationPoints.toggleVisibility();
```

### Clear Points
```javascript
inundationPoints.clearPoints();
```

### Check Loading State
```javascript
const { isLoading, error, stats } = inundationPoints;
if (isLoading) console.log('Loading...');
if (error) console.error('Error:', error);
if (stats) console.log('Points loaded:', stats.total);
```

## UI Controls

### Position
- Default: Top right (below compass)
- Configurable via `position` prop: `"topright"`, `"topleft"`, `"bottomright"`, `"bottomleft"`

### Toggle Button States
- **Hidden**: Gray with "Show Inundation" text
- **Visible**: Blue with "Hide Inundation" text
- **Loading**: Spinner icon

### Atoll Selector
- Dropdown with all 9 Tuvalu atolls
- "All Atolls" option to show everything
- Automatically reloads points when changed

### Statistics Panel
- Toggle with "Show/Hide Statistics" button
- Displays total points and breakdown by risk level
- Color-coded indicators for each risk level

## Performance Tips

1. **Use Atoll Filtering**: Better performance with fewer points
2. **Monitor Point Count**: Keep visible points < 100 for smooth navigation
3. **Cache Enabled**: Data cached for 5 minutes
4. **Lazy Loading**: Points only load when layer is active

## Troubleshooting

### Points Not Showing
1. Check browser console for errors
2. Verify network connectivity to THREDDS server
3. Enable debug mode in service options

### Images Not Loading
1. Check CORS settings
2. Verify image URLs in JSON data
3. Test image URL directly in browser

### Slow Performance
1. Filter by specific atoll instead of showing all
2. Check total point count
3. Clear browser cache

## Debug Mode

Enable detailed logging:
```javascript
const inundationPoints = useInundationPoints(mapInstance, {
  debugMode: true
});
```

Console output will show:
- Service initialization
- Data fetching progress
- Point rendering details
- Click events
- Error messages

## Example JSON Point

```json
{
  "latitude": -6.2833,
  "longitude": 176.3167,
  "location": "Nanumaga",
  "max_inundation": 0.65,
  "forecast_time": "2025-11-04T12:00:00Z",
  "primary_image_url": "http://192.168.0.207:8080/ds_tv/Figures/Nanumaga_t_2_forecast.png"
}
```

## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers

## Key Features

- ✅ Color-coded risk levels
- ✅ Interactive popups with images
- ✅ Atoll-based filtering
- ✅ Statistics display
- ✅ Performance optimized
- ✅ Responsive design
- ✅ Dark mode support
- ✅ Error handling
- ✅ Loading states
- ✅ Data caching

---

**Last Updated**: November 4, 2025
