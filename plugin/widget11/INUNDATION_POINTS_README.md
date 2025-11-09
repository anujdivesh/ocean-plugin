# Inundation Points Feature 🌊

> Interactive inundation forecast visualization for Tuvalu Marine Forecast Application

## Quick Links

- 📖 [Implementation Guide](./INUNDATION_POINTS_IMPLEMENTATION.md) - Complete technical documentation
- 🚀 [Quick Reference](./INUNDATION_QUICK_REFERENCE.md) - Developer quick start
- 🎨 [Visual Guide](./INUNDATION_VISUAL_GUIDE.md) - UI/UX design reference
- 📊 [Summary](./INUNDATION_IMPLEMENTATION_SUMMARY.md) - Implementation overview

## What Is This?

This feature adds interactive inundation forecast points to the Tuvalu marine forecast map. It fetches real-time data from the SPC THREDDS server, displays color-coded risk markers, and shows detailed forecast images when users click on points.

## Features at a Glance

✅ **Real-time Data** - Fetches from SPC THREDDS server  
✅ **Risk Color Coding** - Blue (low), Orange (medium), Red (high)  
✅ **Interactive Popups** - Detailed info with forecast images  
✅ **Atoll Filtering** - Filter by specific atolls for better performance  
✅ **Statistics Display** - See point distribution by risk level  
✅ **Performance Optimized** - Caching, lazy loading, efficient rendering  
✅ **Responsive Design** - Works on desktop and mobile  
✅ **Dark Mode Support** - Automatic theme adaptation  

## Screenshot

```
┌─────────────────────────────────────────┐
│  MAP                    [Compass Rose]  │
│                                         │
│     🔵 Low Risk        ┌──────────────┐ │
│                        │ 🌧️ Show      │ │
│         🟠 Medium      │  Inundation  │ │
│                        └──────────────┘ │
│  🔴 High Risk                           │
│                                         │
│  [Wave Legend]                          │
└─────────────────────────────────────────┘
```

## Quick Start

### For Users

1. **Show Points**: Click the "Show Inundation" button (top right)
2. **Filter by Atoll**: Select from dropdown (recommended for performance)
3. **Click Points**: View detailed forecast information and images
4. **View Stats**: Click "Show Statistics" for risk breakdown

### For Developers

```javascript
// Already integrated in ForecastApp.jsx
import useInundationPoints from '../hooks/useInundationPoints';

const inundationPoints = useInundationPoints(mapInstance, {
  debugMode: true
});

// Load points
await inundationPoints.loadPoints({ atoll: 'Funafuti' });

// Get statistics
const stats = inundationPoints.getStats();
console.log(stats.total); // Total points
console.log(stats.byRiskLevel); // { low: 20, medium: 15, high: 10 }
```

## Risk Levels

| Level | Threshold | Color | Visual |
|-------|-----------|-------|--------|
| **Low** | ≤ 0.4m | Blue | 🔵 |
| **Medium** | 0.4-0.8m | Orange | 🟠 |
| **High** | > 0.8m | Red | 🔴 |

## Data Sources

### JSON Endpoint
```
https://gemthreddshpc.spc.int/thredds/fileServer/POP/model/country/spc/forecast/hourly/TUV/final.json
```

### Forecast Images
```
https://gemthreddshpc.spc.int/thredds/fileServer/POP/model/country/spc/forecast/hourly/TUV/{filename}.png
```

## Supported Atolls

1. Nanumaga
2. Nanumea
3. Niutao
4. Nui
5. Vaitupu
6. Nukufetau
7. **Funafuti** (capital)
8. Nukulaelae
9. Niulakita

## Architecture

```
┌──────────────────────────────────────────┐
│         ForecastApp.jsx                  │
│  ┌────────────────────────────────────┐  │
│  │   useInundationPoints Hook         │  │
│  │  ┌──────────────────────────────┐  │  │
│  │  │  InundationPointsService     │  │  │
│  │  │  - Fetch data                │  │  │
│  │  │  - Classify risk             │  │  │
│  │  │  - Create markers            │  │  │
│  │  │  - Manage popups             │  │  │
│  │  └──────────────────────────────┘  │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │   InundationControl Component      │  │
│  │  - Toggle visibility               │  │
│  │  - Atoll filter                    │  │
│  │  - Statistics display              │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
         │                    │
         ↓                    ↓
   Leaflet Map          THREDDS Server
```

## Files Structure

```
plugin/widget11/
├── src/
│   ├── components/
│   │   └── InundationControl.jsx       (UI component)
│   ├── hooks/
│   │   └── useInundationPoints.js      (React hook)
│   ├── services/
│   │   └── InundationPointsService.js  (Core service)
│   └── styles/
│       └── InundationPoints.css        (Styling)
└── docs/
    ├── INUNDATION_POINTS_IMPLEMENTATION.md
    ├── INUNDATION_QUICK_REFERENCE.md
    ├── INUNDATION_VISUAL_GUIDE.md
    └── INUNDATION_IMPLEMENTATION_SUMMARY.md
```

## Performance Tips

### ⚡ Recommended Practices

1. **Use Atoll Filtering** - Show only relevant points
2. **Monitor Point Count** - Keep visible points < 100
3. **Enable Caching** - Already enabled (5-minute expiry)
4. **Lazy Loading** - Points only load when activated

### 📊 Performance Metrics

| Point Count | Performance | Navigation | Recommendation |
|-------------|-------------|------------|----------------|
| < 50 | Excellent | Smooth | ✅ Optimal |
| 50-100 | Good | Acceptable | ⚠️ Consider filtering |
| > 100 | Poor | Sluggish | ❌ Use atoll filter |

## Troubleshooting

### Points Not Showing?

1. Check browser console for errors
2. Verify network connectivity
3. Test JSON endpoint directly
4. Enable debug mode

### Images Not Loading?

1. Check CORS settings on server
2. Verify image URLs in data
3. Test image URL in browser
4. Check for 404 errors

### Performance Issues?

1. Filter by specific atoll
2. Check total point count
3. Clear browser cache
4. Reduce map zoom level

## Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | ✅ Supported |
| Firefox | 88+ | ✅ Supported |
| Safari | 14+ | ✅ Supported |
| Edge | 90+ | ✅ Supported |
| Mobile | Modern | ✅ Supported |

## Development

### Build
```bash
npm run build
```

### Test
```bash
npm test
```

### Debug Mode
```javascript
const inundationPoints = useInundationPoints(mapInstance, {
  debugMode: true  // Enables console logging
});
```

## API Reference

### useInundationPoints Hook

```javascript
const {
  loadPoints,         // Function to load points
  clearPoints,        // Function to clear all points
  toggleVisibility,   // Function to show/hide
  getStats,          // Function to get statistics
  isLoading,         // Boolean: loading state
  error,             // String: error message (if any)
  stats,             // Object: point statistics
  isVisible,         // Boolean: visibility state
  service            // InundationPointsService instance
} = useInundationPoints(mapInstance, options);
```

### InundationPointsService

```javascript
// Initialize
const service = new InundationPointsService({ debugMode: true });
service.initialize(mapInstance);

// Load points
await service.loadAndDisplayPoints({ atoll: 'Funafuti' });

// Control visibility
service.setVisible(true);  // Show
service.setVisible(false); // Hide

// Get statistics
const stats = service.getStats();

// Cleanup
service.cleanup();
```

## Configuration

### Risk Thresholds
Edit in `InundationPointsService.js`:
```javascript
this.riskLevels = {
  low: { max: 0.4, color: '#2196F3', label: 'Low Risk' },
  medium: { max: 0.8, color: '#FF9800', label: 'Medium Risk' },
  high: { max: Infinity, color: '#F44336', label: 'High Risk' }
};
```

### Cache Duration
```javascript
this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
```

### Control Position
```jsx
<InundationControl
  position="topright"  // or "topleft", "bottomright", "bottomleft"
  ...
/>
```

## Contributing

### Adding New Features

1. Update `InundationPointsService.js` for core functionality
2. Update `useInundationPoints.js` if adding state/hooks
3. Update `InundationControl.jsx` for UI changes
4. Update CSS in `InundationPoints.css`
5. Update documentation

### Testing Checklist

- [ ] Points load correctly
- [ ] Risk colors match data
- [ ] Popups show correct info
- [ ] Images load (or fail gracefully)
- [ ] Atoll filtering works
- [ ] Statistics accurate
- [ ] Mobile responsive
- [ ] Dark mode works
- [ ] Performance acceptable

## Future Enhancements

### Planned Features

- [ ] Point clustering for dense areas
- [ ] Time-based animation
- [ ] Heatmap visualization
- [ ] Export to CSV/GeoJSON
- [ ] Real-time WebSocket updates
- [ ] Advanced filtering options
- [ ] Comparison mode
- [ ] Mobile bottom sheet

## Support

### Getting Help

1. 📖 Read the [Implementation Guide](./INUNDATION_POINTS_IMPLEMENTATION.md)
2. 🔍 Check the [Quick Reference](./INUNDATION_QUICK_REFERENCE.md)
3. 🐛 Enable debug mode for detailed logs
4. 💬 Contact development team
5. 🎫 File a GitHub issue

## License

Same as parent project (ocean-plugin)

## Credits

- **SPC THREDDS Server** - Data provider
- **Leaflet** - Mapping library
- **React** - UI framework
- **lucide-react** - Icons

---

**Version**: 1.0.0  
**Last Updated**: November 4, 2025  
**Status**: ✅ Production Ready  
**Maintained By**: Tuvalu Marine Forecast Team

---

<div align="center">

**Built with ❤️ for Tuvalu 🇹🇻**

[Documentation](./INUNDATION_POINTS_IMPLEMENTATION.md) • [Quick Start](./INUNDATION_QUICK_REFERENCE.md) • [Visual Guide](./INUNDATION_VISUAL_GUIDE.md) • [Summary](./INUNDATION_IMPLEMENTATION_SUMMARY.md)

</div>
