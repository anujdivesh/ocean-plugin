/**
 * Test script to verify inundation data can be fetched and parsed
 * Run with: node test-inundation-data.js
 */

const https = require('https');

const dataUrl = 'https://gemthreddshpc.spc.int/thredds/fileServer/POP/model/country/spc/forecast/hourly/TUV/final.json';

console.log('Fetching inundation data from:', dataUrl);
console.log('---');

https.get(dataUrl, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const jsonData = JSON.parse(data);
      
      console.log('✅ Successfully fetched and parsed JSON');
      console.log('---');
      
      // Check structure
      if (jsonData.metadata) {
        console.log('Metadata:', jsonData.metadata);
        console.log('---');
      }
      
      let points;
      if (jsonData.flood_risk_data && Array.isArray(jsonData.flood_risk_data)) {
        points = jsonData.flood_risk_data;
        console.log('Structure: New format (flood_risk_data array)');
      } else if (Array.isArray(jsonData)) {
        points = jsonData;
        console.log('Structure: Old format (direct array)');
      } else {
        console.error('❌ Unknown structure:', Object.keys(jsonData));
        return;
      }
      
      console.log(`Total points: ${points.length}`);
      console.log('---');
      
      // Analyze first point
      if (points.length > 0) {
        console.log('Sample point structure:');
        console.log(JSON.stringify(points[0], null, 2));
        console.log('---');
        
        // Check fields
        const firstPoint = points[0];
        console.log('Field analysis:');
        console.log(`  - latitude: ${firstPoint.latitude} (${typeof firstPoint.latitude})`);
        console.log(`  - longitude: ${firstPoint.longitude} (${typeof firstPoint.longitude})`);
        console.log(`  - coastal_inundation_hazard_level: ${firstPoint.coastal_inundation_hazard_level}`);
        console.log(`  - station_name: ${firstPoint.station_name}`);
        console.log(`  - primary_image_url: ${firstPoint.primary_image_url}`);
        console.log('---');
      }
      
      // Count by risk level
      const riskCounts = {
        low: 0,
        medium: 0,
        high: 0,
        unknown: 0
      };
      
      points.forEach(point => {
        const level = (point.coastal_inundation_hazard_level || '').toLowerCase();
        if (level.includes('low')) {
          riskCounts.low++;
        } else if (level.includes('medium') || level.includes('moderate')) {
          riskCounts.medium++;
        } else if (level.includes('high') || level.includes('severe')) {
          riskCounts.high++;
        } else {
          riskCounts.unknown++;
        }
      });
      
      console.log('Risk level distribution:');
      console.log(`  🔵 Low Risk: ${riskCounts.low}`);
      console.log(`  🟠 Medium Risk: ${riskCounts.medium}`);
      console.log(`  🔴 High Risk: ${riskCounts.high}`);
      console.log(`  ❓ Unknown: ${riskCounts.unknown}`);
      console.log('---');
      
      // Check image URLs
      const imageUrls = points.slice(0, 5).map(p => {
        if (p.primary_image_url) {
          const parts = p.primary_image_url.split('/');
          return parts[parts.length - 1];
        }
        return null;
      }).filter(Boolean);
      
      console.log('Sample image filenames:');
      imageUrls.forEach(url => console.log(`  - ${url}`));
      console.log('---');
      
      console.log('✅ Data structure is valid and ready for use!');
      
    } catch (error) {
      console.error('❌ Failed to parse JSON:', error.message);
    }
  });

}).on('error', (error) => {
  console.error('❌ Failed to fetch data:', error.message);
});
