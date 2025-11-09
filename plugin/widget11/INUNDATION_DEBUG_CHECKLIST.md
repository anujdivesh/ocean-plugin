# Inundation Points Debug Checklist
**Updated:** November 4, 2025

## ✅ Changes Made

1. **Fixed toggleVisibility()** - Now always calls `loadPoints()` when showing (not just first time)
2. **Added detailed logging** - Console will show exactly what's happening
3. **Improved error messages** - Better visibility into failures

---

## 🔍 Testing Instructions

### Step 1: Open the Application
```bash
cd /home/kishank/ocean-plugin/plugin/widget11
npm start
```

### Step 2: Open Browser Console
- Press **F12**
- Go to **Console** tab
- Clear any existing messages

### Step 3: Click "Show Inundation" Button
Look for the button in the top-right corner of the map.

### Step 4: Watch Console Output

#### ✅ **Expected Success Output:**
```
🌊 InundationPoints: loadPoints called {mapReady: true, hasService: true, hasMapInstance: true, loadOptions: {…}}
🚀 InundationPoints: Starting fetch...
InundationPointsService: Using data URL: /api/thredds/fileServer/POP/model/country/spc/forecast/hourly/TUV/final.json
InundationPointsService: Fetching inundation data from: /api/thredds/...
InundationPointsService: ✅ Successfully fetched 2905 inundation points
InundationPointsService: Added 2905 inundation points to map
✅ InundationPoints: Load successful {total: 2905, displayed: 2905, filtered: 2905}
```

#### ❌ **If You See This:**
```
🌊 InundationPoints: loadPoints called {mapReady: false, ...}
InundationPoints: Map not ready yet, deferring load
```
**Solution:** Wait a few seconds for map to load, then click button again.

#### ❌ **If You See Network Error:**
```
❌ Failed to fetch inundation data
Network error: Unable to reach THREDDS server
```
**Check:**
1. Network tab - Is there a request to `final.json`?
2. Is the proxy running in development mode?
3. Is THREDDS server accessible?

### Step 5: Check Network Tab
- Go to **Network** tab in DevTools
- Click "Show Inundation" again
- Look for request to: `/api/thredds/fileServer/POP/model/country/spc/forecast/hourly/TUV/final.json`

**Expected:**
- Status: **200 OK**
- Type: **json**
- Size: **~910 KB**
- Response: `{"metadata": {...}, "flood_risk_data": [...]}`

### Step 6: Verify Points on Map
After successful load, you should see:
- **2,905 small blue circles** scattered across Tuvalu coastlines
- Points more concentrated on inhabited atolls
- Each point clickable with popup

---

## 🐛 Troubleshooting

### Problem: Button doesn't do anything

**Check Console:**
```javascript
// In browser console:
document.querySelector('.inundation-toggle')
```

- If returns `null` → Button not rendered, check React mounting
- If returns element → Button exists, check click handler

**Manual trigger:**
```javascript
// Force click:
document.querySelector('.inundation-toggle').click()
```

### Problem: "Map not ready yet"

**Wait for map initialization:**
```javascript
// Check map status:
const mapEl = document.querySelector('#map');
console.log('Map loaded:', mapEl?._leaflet_id ? 'YES' : 'NO');
```

**Solution:** Wait 2-3 seconds after page load before clicking button.

### Problem: Network request not appearing

**Check if loadPoints is called:**
- Look for console message: `🌊 InundationPoints: loadPoints called`
- If missing → Hook not connected properly
- If present but no network → Check URL construction

**Manual fetch test:**
```javascript
// Test direct fetch:
fetch('/api/thredds/fileServer/POP/model/country/spc/forecast/hourly/TUV/final.json')
  .then(r => r.json())
  .then(d => console.log('SUCCESS:', d.flood_risk_data.length, 'points'))
  .catch(e => console.error('FAILED:', e))
```

### Problem: 502 Bad Gateway / CORS Error

**Development Mode:**
- Proxy should handle CORS
- Check `setupProxy.js` is working
- Restart dev server if needed

**Production Mode:**
- THREDDS server must allow CORS
- Check server availability: `https://gemthreddshpc.spc.int`

---

## 📊 What Success Looks Like

### In Console:
```
✅ 7 log messages showing successful load
✅ No error messages
✅ "Added 2905 inundation points to map"
```

### In Network Tab:
```
✅ Request to final.json
✅ Status 200 OK
✅ Size ~910 KB
```

### On Map:
```
✅ 2,905 blue circle markers visible
✅ Concentrated along coastlines
✅ Clickable with popups showing risk info
```

### Button State:
```
Before: [☁️ Show Inundation]
After:  [☁️ Hide Inundation 👁️]  (active state)
```

---

## 🔧 Quick Commands

```javascript
// Check if service initialized
console.log('Service:', window.inundationPoints?.service)

// Check map ready
console.log('Map ready:', document.querySelector('#map')?._leaflet_id)

// Count markers
console.log('Markers:', document.querySelectorAll('.inundation-point-icon').length)

// Manual load
// (If you set up debugging tools)
debugInundation?.clickButton()
```

---

## 📝 Report Template

If it's still not working, please provide:

1. **Console Output** (copy all messages after clicking button)
2. **Network Tab Screenshot** (showing requests or lack thereof)
3. **Map Screenshot** (showing what's visible)
4. **Browser Info** (Chrome version, OS)

Example report:
```
Console shows: "loadPoints called {mapReady: true, ...}"
Network shows: No request to final.json
Map shows: No markers
Browser: Chrome 142 on Windows 11
```

---

**Last Updated:** November 4, 2025  
**Status:** Enhanced logging added, ready for testing
