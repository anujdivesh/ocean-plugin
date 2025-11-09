// ExportUtils.js - Data export and permalink utilities

export class ExportUtils {
  // Export current data as CSV
  static exportCSV(data, filename = 'ocean-data') {
    if (!data || !Array.isArray(data)) {
      throw new Error('Invalid data for CSV export');
    }

    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle strings with commas or quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    this.downloadFile(csvContent, `${filename}.csv`, 'text/csv');
  }

  // Export current data as JSON
  static exportJSON(data, filename = 'ocean-data') {
    const jsonContent = JSON.stringify(data, null, 2);
    this.downloadFile(jsonContent, `${filename}.json`, 'application/json');
  }

  // Export map view as PNG (using html2canvas)
  static async exportMapPNG(mapElement, filename = 'ocean-map') {
    try {
      // Dynamic import to avoid bundling if not needed
      const html2canvas = await import('html2canvas');
      
      const canvas = await html2canvas.default(mapElement, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: mapElement.offsetWidth,
        height: mapElement.offsetHeight
      });

      canvas.toBlob((blob) => {
        this.downloadBlob(blob, `${filename}.png`);
      }, 'image/png');
    } catch (error) {
      console.error('Error exporting map:', error);
      throw new Error('Failed to export map image');
    }
  }

  // Download file helper
  static downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    this.downloadBlob(blob, filename);
  }

  // Download blob helper
  static downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Generate export data from current state
  static prepareExportData(forecastData, selectedLocation, currentTime) {
    const data = [];
    
    if (forecastData && forecastData.length > 0) {
      forecastData.forEach((timeStep, timeIndex) => {
        if (timeStep.gridData && Array.isArray(timeStep.gridData)) {
          timeStep.gridData.forEach((point, pointIndex) => {
            data.push({
              timestamp: timeStep.time || currentTime,
              timeIndex,
              pointIndex,
              latitude: point.lat || point.latitude,
              longitude: point.lon || point.longitude,
              waveHeight: point.waveHeight,
              waveEnergy: point.waveEnergy,
              wavePeriod: point.wavePeriod,
              waveDirection: point.waveDirection,
              isSelectedLocation: selectedLocation && 
                point.lat === selectedLocation.lat && 
                point.lon === selectedLocation.lon
            });
          });
        }
      });
    }
    
    return data;
  }
}

export class PermalinkUtils {
  // Generate permalink for current state
  static generatePermalink(state) {
    const params = new URLSearchParams();
    
    // Add state parameters
    if (state.selectedLocation) {
      params.set('lat', state.selectedLocation.lat.toString());
      params.set('lon', state.selectedLocation.lon.toString());
    }
    
    if (state.currentTimeIndex !== undefined) {
      params.set('time', state.currentTimeIndex.toString());
    }
    
    if (state.selectedVariable) {
      params.set('var', state.selectedVariable);
    }
    
    if (state.isPlaying) {
      params.set('play', 'true');
    }
    
    if (state.playbackSpeed) {
      params.set('speed', state.playbackSpeed.toString());
    }
    
    if (state.colorPalette) {
      params.set('palette', state.colorPalette);
    }
    
    if (state.mapView) {
      params.set('zoom', state.mapView.zoom?.toString() || '');
      params.set('center', `${state.mapView.center?.lat || 0},${state.mapView.center?.lng || 0}`);
    }
    
    if (state.sidebarCollapsed !== undefined) {
      params.set('sidebar', state.sidebarCollapsed ? 'collapsed' : 'expanded');
    }
    
    if (state.bottomDrawerHeight) {
      params.set('drawer', state.bottomDrawerHeight.toString());
    }

    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}${params.toString() ? '?' + params.toString() : ''}`;
  }

  // Parse permalink parameters
  static parsePermalink(url = window.location.href) {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;
    
    const state = {};
    
    // Parse location
    const lat = params.get('lat');
    const lon = params.get('lon');
    if (lat && lon) {
      state.selectedLocation = {
        lat: parseFloat(lat),
        lon: parseFloat(lon)
      };
    }
    
    // Parse time
    const time = params.get('time');
    if (time) {
      state.currentTimeIndex = parseInt(time, 10);
    }
    
    // Parse variable
    const variable = params.get('var');
    if (variable) {
      state.selectedVariable = variable;
    }
    
    // Parse playback
    const play = params.get('play');
    if (play === 'true') {
      state.isPlaying = true;
    }
    
    const speed = params.get('speed');
    if (speed) {
      state.playbackSpeed = parseFloat(speed);
    }
    
    // Parse color palette
    const palette = params.get('palette');
    if (palette) {
      state.colorPalette = palette;
    }
    
    // Parse map view
    const zoom = params.get('zoom');
    const center = params.get('center');
    if (zoom || center) {
      state.mapView = {};
      if (zoom) {
        state.mapView.zoom = parseInt(zoom, 10);
      }
      if (center) {
        const [centerLat, centerLng] = center.split(',').map(parseFloat);
        if (!isNaN(centerLat) && !isNaN(centerLng)) {
          state.mapView.center = { lat: centerLat, lng: centerLng };
        }
      }
    }
    
    // Parse UI state
    const sidebar = params.get('sidebar');
    if (sidebar) {
      state.sidebarCollapsed = sidebar === 'collapsed';
    }
    
    const drawer = params.get('drawer');
    if (drawer) {
      state.bottomDrawerHeight = parseInt(drawer, 10);
    }
    
    return state;
  }

  // Copy permalink to clipboard
  static async copyPermalink(state) {
    const permalink = this.generatePermalink(state);
    
    try {
      await navigator.clipboard.writeText(permalink);
      return { success: true, url: permalink };
    } catch (error) {
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = permalink;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return { success: true, url: permalink };
      } catch (fallbackError) {
        console.error('Failed to copy permalink:', fallbackError);
        return { success: false, error: 'Failed to copy to clipboard' };
      }
    }
  }

  // Share permalink via Web Share API (if available)
  static async sharePermalink(state, title = 'Ocean Data Visualization') {
    const permalink = this.generatePermalink(state);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: 'Check out this ocean data visualization',
          url: permalink
        });
        return { success: true, method: 'native' };
      } catch (error) {
        if (error.name === 'AbortError') {
          return { success: false, error: 'Share cancelled by user' };
        }
        console.error('Share failed:', error);
      }
    }
    
    // Fallback to copying
    return this.copyPermalink(state);
  }

  // Update URL without page reload
  static updateURL(state, replace = false) {
    const permalink = this.generatePermalink(state);
    
    if (replace) {
      window.history.replaceState(state, '', permalink);
    } else {
      window.history.pushState(state, '', permalink);
    }
  }

  // Handle browser back/forward
  static setupHistoryHandler(onStateChange) {
    window.addEventListener('popstate', (event) => {
      const state = event.state || this.parsePermalink();
      onStateChange(state);
    });
  }
}

// Export formats configuration
export const ExportFormats = {
  CSV: 'csv',
  JSON: 'json',
  PNG: 'png'
};

// Default export options
export const DefaultExportOptions = {
  includeMetadata: true,
  includeTimestamp: true,
  filenamePrefix: 'ocean-data',
  dateFormat: 'YYYY-MM-DD-HH-mm'
};