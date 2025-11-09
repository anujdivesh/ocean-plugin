# Widget1 (Niue) Modernization - Copy from Widget5 Plan

## 🎯 **Simple Strategy: Copy Widget5 → Widget1 + Minimal Changes**

Since widget5 (Cook Islands) already has the modern UI working perfectly, we'll copy its code to widget1 and only change Niue-specific configurations.

**Timeline:** 2-3 days instead of 3-4 weeks!

---

## 📋 **Phase 1: Dependencies & Setup (Day 1 - Morning)**

### **Step 1.1: Update package.json**
Copy additional dependencies from widget5 to widget1:

```json
{
  "framer-motion": "^12.23.22",
  "html2canvas": "^1.4.1",
  "lucide-react": "^0.544.0"
}
```

**Action:**
```bash
cd /home/kishank/ocean-plugin/plugin/widget1
# The dependencies will be added to package.json
npm install
```

### **Step 1.2: Verify Build Still Works**
```bash
npm run build
```

---

## 📂 **Phase 2: Copy Component Files (Day 1 - Afternoon)**

### **Step 2.1: Copy Modern Components**
Copy these files/folders from widget5 to widget1:

```bash
# From widget5/src/components/ to widget1/src/components/
✅ ArrowSVG.jsx
✅ CompassRose.jsx
✅ CompassRose.css
✅ FancyIcon.jsx
✅ ForecastApp.jsx
✅ ForecastApp.css
✅ ModernHeader.jsx
✅ ProfessionalLegend.jsx
✅ ProfessionalLegend.css
✅ shared/ (entire folder)
✅ legend/ (entire folder if exists)
✅ ui/ (entire folder if exists)
```

### **Step 2.2: Copy Hooks**
Copy from widget5/src/hooks/ to widget1/src/hooks/:

```bash
✅ useForecast.js
✅ useForecastComposed.js
✅ useMapInteraction.js
✅ useLegendManagement.js
✅ useUIState.js
✅ useWindowSize.js
✅ useMapRendering.js
✅ (and any other modern hooks)
```

### **Step 2.3: Copy Configuration**
Copy from widget5/src/config/ to widget1/src/config/:

```bash
✅ uiConfig.js
✅ marineVariables.js
✅ UIConfig.js (if different from uiConfig.js)
```

### **Step 2.4: Copy Utilities**
Copy from widget5/src/utils/ to widget1/src/utils/:

```bash
✅ WorldClassVisualization.js
✅ WMSStyleManager.js
✅ NotificationManager.js
✅ ConsoleErrorSuppressor.js
✅ (and any other utilities widget5 uses)
```

### **Step 2.5: Copy Styles**
Copy from widget5/src/styles/ to widget1/src/styles/:

```bash
✅ MapMarker.css
✅ fancyIcons.css
✅ (any other style files)
```

---

## 🔧 **Phase 3: Minimal Configuration Changes (Day 1 - Evening)**

### **Step 3.1: Update Country-Specific Settings**

**File: `src/config/marineVariables.js` or `uiConfig.js`**
```javascript
// Change from:
const validCountries = ['COK'];
const countryName = 'Cook Islands';

// To:
const validCountries = ['NIU'];
const countryName = 'Niue';
```

### **Step 3.2: Update ModernHeader.jsx**
```javascript
// Change title from:
"High Resolution Wave and Inundation System - Cook Islands"

// To:
"High Resolution Wave and Inundation System - Niue"
```

### **Step 3.3: Update App.jsx**
Replace widget1's App.jsx with widget5's version, keeping authentication if needed:

**Option A:** Keep authentication (like current widget1)
- Use widget1's current App.jsx authentication logic
- Just update imports to use new components

**Option B:** Remove authentication (like widget5)
- Copy widget5's App.jsx entirely
- Change country from COK to NIU

---

## 🗺️ **Phase 4: Update Home.jsx Integration (Day 2 - Morning)**

### **Step 4.1: Update Home.jsx**
Copy widget5's Home.jsx structure but keep widget1's Niue-specific layers:

**Key changes needed:**
1. Import ForecastApp instead of old components
2. Import ModernHeader instead of old header
3. Keep Niue-specific WMS layer configurations
4. Update WAVE_FORECAST_LAYERS for Niue data sources

### **Step 4.2: Preserve Niue-Specific Data Layers**
Keep widget1's existing layer definitions but integrate them with the new ForecastApp component.

```javascript
const NIUE_WAVE_FORECAST_LAYERS = [
  // Keep widget1's current layer configurations
  // Just ensure they work with new ForecastApp
];
```

---

## 🎨 **Phase 5: Layer Configuration Mapping (Day 2 - Afternoon)**

### **Step 5.1: Map Widget1 Layers to New Format**

Widget5 uses this format:
```javascript
{
  label: "Significant Wave Height + Dir",
  value: "composite_hs_dirm",
  icon: Waves,
  color: "#00bcd4"
}
```

Ensure widget1's layers follow the same format for compatibility with ForecastApp.

### **Step 5.2: Update WMS Endpoints**
If Niue uses different WMS servers than Cook Islands, update in:
- `src/pages/addWMSTileLayer.js`
- Layer configuration files

---

## ✅ **Phase 6: Testing & Validation (Day 2 - Evening to Day 3)**

### **Step 6.1: Build Test**
```bash
cd /home/kishank/ocean-plugin/plugin/widget1
npm run build
```

### **Step 6.2: Visual Verification**
- [ ] Modern header displays "Niue" correctly
- [ ] ForecastApp layout renders properly
- [ ] Map shows Niue region
- [ ] All variable buttons work
- [ ] Time slider functions
- [ ] Legend displays correctly
- [ ] Compass rose shows (if wind layers present)

### **Step 6.3: Functionality Check**
- [ ] Layer switching works
- [ ] Time animation works
- [ ] Map interaction (zoom, pan) works
- [ ] Mobile responsive design works
- [ ] All original features preserved

### **Step 6.4: Docker Integration**
Rebuild widget1 container:
```bash
cd /home/kishank/ocean-plugin
docker-compose build plugin-widget1
docker-compose up plugin-widget1
```

---

## 📝 **Files to Modify (Summary)**

### **Files to COPY (no changes needed):**
- Most component files from widget5
- All hook files
- All utility files
- Style files

### **Files to MODIFY (minimal changes):**
1. **package.json** - Add 3 dependencies
2. **src/config/marineVariables.js** - Change COK → NIU
3. **src/components/ModernHeader.jsx** - Update title
4. **src/App.jsx** - Update country references
5. **src/pages/Home.jsx** - Integrate ForecastApp with Niue layers

### **Files to KEEP from widget1:**
- Niue-specific WMS layer configurations
- Authentication logic (if required)
- Niue-specific data endpoints

---

## 🎯 **Quick Checklist**

### **Day 1:**
- [ ] Install 3 new dependencies
- [ ] Copy all component files from widget5
- [ ] Copy all hooks from widget5
- [ ] Copy all config files from widget5
- [ ] Copy all utils from widget5
- [ ] Copy all styles from widget5
- [ ] Change "Cook Islands" → "Niue" in configs
- [ ] Change COK → NIU in country settings

### **Day 2:**
- [ ] Update Home.jsx to use ForecastApp
- [ ] Map widget1 layers to new format
- [ ] Test build
- [ ] Visual verification
- [ ] Functionality testing

### **Day 3:**
- [ ] Final testing and bug fixes
- [ ] Docker container rebuild
- [ ] Documentation update
- [ ] Deploy

---

## 🚀 **Simplified File Copy Commands**

```bash
# Navigate to plugin directory
cd /home/kishank/ocean-plugin/plugin

# Copy component files
cp widget5/src/components/ArrowSVG.jsx widget1/src/components/
cp widget5/src/components/CompassRose.jsx widget1/src/components/
cp widget5/src/components/CompassRose.css widget1/src/components/
cp widget5/src/components/FancyIcon.jsx widget1/src/components/
cp widget5/src/components/ForecastApp.jsx widget1/src/components/
cp widget5/src/components/ForecastApp.css widget1/src/components/
cp widget5/src/components/ModernHeader.jsx widget1/src/components/
cp widget5/src/components/ProfessionalLegend.jsx widget1/src/components/
cp widget5/src/components/ProfessionalLegend.css widget1/src/components/

# Copy shared components folder
cp -r widget5/src/components/shared widget1/src/components/

# Copy hooks
mkdir -p widget1/src/hooks
cp widget5/src/hooks/useForecast.js widget1/src/hooks/ 2>/dev/null || true
cp widget5/src/hooks/useMapInteraction.js widget1/src/hooks/ 2>/dev/null || true
cp widget5/src/hooks/useUIState.js widget1/src/hooks/ 2>/dev/null || true
cp widget5/src/hooks/useWindowSize.js widget1/src/hooks/ 2>/dev/null || true

# Copy config files
mkdir -p widget1/src/config
cp widget5/src/config/uiConfig.js widget1/src/config/ 2>/dev/null || true
cp widget5/src/config/marineVariables.js widget1/src/config/ 2>/dev/null || true

# Copy utils
mkdir -p widget1/src/utils
cp widget5/src/utils/WorldClassVisualization.js widget1/src/utils/ 2>/dev/null || true
cp widget5/src/utils/WMSStyleManager.js widget1/src/utils/ 2>/dev/null || true
cp widget5/src/utils/NotificationManager.js widget1/src/utils/ 2>/dev/null || true
cp widget5/src/utils/ConsoleErrorSuppressor.js widget1/src/utils/ 2>/dev/null || true

# Copy styles
mkdir -p widget1/src/styles
cp widget5/src/styles/*.css widget1/src/styles/ 2>/dev/null || true
```

---

## 💡 **Key Principle**

> **"Don't reinvent the wheel - copy working code, change country labels"**

Widget5 is already production-ready with modern UI. Widget1 just needs the same code with "Niue" instead of "Cook Islands" and Niue-specific data layers.

**Estimated Time:** 2-3 days vs 3-4 weeks building from scratch!
