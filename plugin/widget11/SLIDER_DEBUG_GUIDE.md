# Slider Position Debug Guide

## What to Check in Browser Console

After refreshing Widget 11, look for these log messages in order:

### 1. WMS Capabilities (from useWMSCapabilities.js)
```
📅 Found XXX available timestamps for Hs
📅 First timestamp: 2025-XX-XXTXX:XX:XX.XXXZ
📅 Last timestamp: 2025-XX-XXTXX:XX:XX.XXXZ
⏰ Time Range: ... Total Steps: XXX
```

### 2. Slider Initialization (from useTimeAnimation.js)
```
🎯 Slider Initialization (last-7days):
   Last time: 2025-XX-XXTXX:XX:XX.XXXZ
   Target time (last-7d): 2025-XX-XXTXX:XX:XX.XXXZ
   Using index: XX/XXX
   Selected time: 2025-XX-XXTXX:XX:XX.XXXZ
```

### 3. TimeControl Render (from ForecastComponents.jsx)
```
🎚️ TimeControl Render - Slider values:
   sliderIndex: XX
   minIndex: XX
   totalSteps: XXX
   calculatedPosition: XX.X%
```

### 4. AccessibleSlider Render (from SharedComponents.jsx)
```
🎚️ AccessibleSlider (Time) rendering with:
   value: XX
   min: XX
   max: XXX
   visualPosition: XX.X%
```

## What Should Happen

- **sliderIndex** should be ~59 (for last-7days from Oct 28)
- **minIndex** should also be ~59 (preventing going before last-7days)
- **totalSteps** should be 227
- **Slider HTML attributes** should be:
  - value="59"
  - min="59" ← **CRITICAL: This should match sliderIndex**
  - max="227"

## Expected Visual Position

With value=59, min=59, max=227:
- Visual position = (59-59)/(227-59) = 0/168 = **0%** (slider at far left)

## Problem Diagnosis

If you see:
- ✅ sliderIndex=59, minIndex=59 in logs
- ✅ Slider shows value=59, min=59 in HTML
- ❌ But slider visual position is in the middle/right

**Then the issue is:** The slider HTML `<input type="range">` is correctly set, but you're seeing the **visual representation of sliderIndex/totalSteps** (59/227 ≈ 26%) instead of the position relative to the allowed range.

## Solution

The slider should show position **relative to the allowed range** (minIndex to totalSteps), not absolute position (0 to totalSteps).

Current visual: `value / totalSteps` → 59/227 ≈ 26%  
Should be: `(value - min) / (max - min)` → (59-59)/(227-59) = 0%
