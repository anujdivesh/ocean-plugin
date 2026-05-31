# Inundation Threshold Setup: User Story Critique

## Executive Summary

The current threshold editor is **functionally sound for quick edits** but **lacks governance, traceability, and multi-user workflows**. This critique evaluates the system through five key user personas, revealing gaps in audit trails, test modes, profiles, and backend integration.

---

## 1. Emergency Manager / Rapid Response Team

### User Story
*"As an Emergency Manager, I need to rapidly adjust thresholds during an active event and be confident that changes align with established safety protocols."*

### Current State ✓ / ✗

| Capability | Status | Notes |
|-----------|--------|-------|
| Quick threshold adjustment | ✓ | Slide-over UI is responsive |
| Undo/Redo support | ✓ | 20-level history |
| **Preset profiles** | ✗ | No tsunami/surge/wind profiles |
| **Justification entry** | ✗ | Cannot document why change was made |
| **Approval workflow** | ✗ | Anyone can save—no review |
| **Alert integration** | ✗ | Changes don't trigger notifications |
| **Side-by-side comparison** | ✗ | Cannot compare old vs new impact |

### Pain Points

1. **No Context on Current State**
   - User opens editor without knowing: What were the thresholds yesterday? Why were they set that way?
   - The "Revert to defaults" button only goes to original Cook Islands defaults, not to "saved yesterday"

2. **No Guidance on What's Safe**
   - Descriptions are impact-focused ("ankle-to-knee depth") but lack decision criteria
   - No recommended ranges per hazard type (tsunami ≠ storm surge ≠ rainfall)

3. **Silent Activation**
   - Changes save automatically with no confirmation
   - No alert that forecasters need to re-run/re-issue forecasts
   - No timestamp on the map itself showing when legend was updated

### Recommended Improvements

```javascript
// FEATURE: Profile Presets
const THRESHOLD_PROFILES = {
  tsunami: { name: 'Tsunami', bands: [...], reason: 'Based on 2004 IOD patterns' },
  surge: { name: 'Storm Surge', bands: [...], reason: 'NH research 2020' },
  wind: { name: 'Wind-Driven Inundation', bands: [...], reason: 'Local analysis' },
};

// FEATURE: Change Annotation
interface ThresholdSnapshot {
  categories: Category[];
  changedBy: string;
  changedAt: ISO8601;
  reason: string;  // "Tsunami early warning threshold updated per PTWC guidance"
  approval?: { approverName: string; timestamp: ISO8601; };
  hazardType: 'tsunami' | 'surge' | 'wind' | 'other';
}
```

---

## 2. Domain Expert / Scientist

### User Story
*"As a domain expert, I need to document threshold changes with scientific justification, compare decisions, and maintain a versioned history of all threshold adjustments."*

### Current State ✓ / ✗

| Capability | Status | Notes |
|-----------|--------|-------|
| **Version tracking** | ✗ | Only current + undo stack in localStorage |
| **Change annotations** | ✗ | No fields for: source, citation, methodology |
| **Metadata export** | ✗ | JSON has no context—just bands |
| **Diff viewer** | ✗ | No way to see "what changed from v1 → v2" |
| **Citation/source** | ✗ | No fields for references (papers, models) |
| **Color justification** | ⚠️ | Auto-gradient but no scientific rationale |
| **Impact analysis** | ✗ | Cannot run "what-if" with historical data |

### Pain Points

1. **No Permanent Audit Trail**
   - Export JSON, close browser → undo history is lost
   - No record of which scientist changed what, when
   - Cannot reconstruct decision-making process 6 months later

2. **Color Scheme is Opaque**
   - Gradients computed from `getXSstColorAtDepth()` using X_SST_GRADIENT_RGB
   - Scientists cannot justify *why* that gradient was chosen
   - No link to visual perception research or accessibility standards

3. **No Metadata Standard**
   ```json
   // Current export
   { 
     "categories": [{ "id": "...", "thresholdM": 0.3, "label": "...", "color": "#..." }]
   }
   
   // Needed
   {
     "schema_version": 2,
     "metadata": {
       "created_by": "Dr. Smith",
       "created_at": "2026-06-01T14:30:00Z",
       "source_data": "SWAN hindcast 2010-2025, Cook Islands 50m resolution",
       "methodology": "Percentile-based classification (0th, 5th, 25th, 50th, 90th)",
       "citations": [
         { "doi": "10.1038/...", "title": "..." }
       ],
       "approved_by": "Dr. Jones (2026-06-01)",
       "valid_from": "2026-06-15",
       "notes": "Updated for improved SWAN model outputs"
     },
     "categories": [...]
   }
   ```

4. **No Test Mode**
   - Cannot overlay thresholds on historical storm data
   - Cannot see: "With these new thresholds, how many pixels would have been misclassified in 2015 event?"

### Recommended Improvements

```javascript
// Feature: Metadata-rich threshold set with provenance
interface ThresholdSet {
  id: string;
  version: number;
  categories: Category[];
  metadata: {
    createdBy: string;
    createdAt: ISO8601;
    description: string;
    hazardType: string;
    source: string;  // e.g., "SWAN hindcast v1.2"
    methodology: string;
    citations: Array<{ doi: string; title: string; url?: string }>;
    historicalValidation?: {
      testedAgainst: string;  // e.g., "2015 storm event hindcast"
      accuracy: number;  // e.g., 0.89
      notes: string;
    };
  };
  previousVersionId?: string;  // link to v1, v2, etc.
  approvals: Array<{ approverName: string; timestamp: ISO8601 }>;
}

// Feature: Diff tool
function computeThresholdDiff(oldSet, newSet) {
  return {
    added: newSet.categories.filter(c => !oldSet.categories.find(o => o.id === c.id)),
    removed: oldSet.categories.filter(c => !newSet.categories.find(n => n.id === c.id)),
    modified: newSet.categories
      .map(n => {
        const o = oldSet.categories.find(c => c.id === n.id);
        return o && (o.thresholdM !== n.thresholdM || o.color !== n.color || o.label !== n.label)
          ? { old: o, new: n }
          : null;
      })
      .filter(Boolean),
  };
}
```

---

## 3. System Administrator / Operator

### User Story
*"As a system administrator, I need to ensure thresholds are managed with proper governance, backed up securely, and accessible across all instances of the application."*

### Current State ✓ / ✗

| Capability | Status | Notes |
|-----------|--------|-------|
| **localStorage persistence** | ✓ | Auto-saves after validation |
| **Export/Import** | ✓ | JSON file-based |
| **Server-side storage** | ✗ | No backend; client-only |
| **Multi-device sync** | ✗ | Each browser instance independent |
| **Role-based access** | ✗ | No login/permissions |
| **Backup automation** | ✗ | Manual export only |
| **Audit logs** | ✗ | No record of who changed what |

### Pain Points

1. **Single Browser Instance**
   - User sets thresholds on laptop; mobile app doesn't see them
   - System admin cannot push thresholds to all user devices
   - New user gets defaults—no synchronization

2. **No Backup Strategy**
   - localStorage can be cleared by browser settings
   - No automatic backup to server or cloud
   - If user loses laptop, thresholds are gone

3. **No Governance**
   - Forecaster can accidentally save invalid thresholds (validation catches it, but UX is poor)
   - No approval flow—analyst changing thresholds without supervisor knowledge
   - No per-role permissions (e.g., "Forecasters can view, Scientists can edit, Director approves")

4. **Scaling Issues**
   ```
   Current: 1 browser = 1 copy of thresholds
   Needed:  1 server = 1 source of truth → N browsers
   ```

### Recommended Improvements

```javascript
// Feature: Server-side threshold management
interface ThresholdService {
  // Fetch current thresholds for the app
  async getThresholds(appId: string): Promise<ThresholdSet>;
  
  // Propose new thresholds (creates a draft/pending state)
  async proposeDraft(appId: string, categories: Category[], reason: string): Promise<draftId>;
  
  // Approve and activate (admin-only)
  async approve(draftId: string, approverName: string): Promise<activeThresholdSetId>;
  
  // Audit trail
  async getHistory(appId: string, limit: number = 50): Promise<Array<{
    id: string;
    version: number;
    changedBy: string;
    changedAt: ISO8601;
    action: 'created' | 'modified' | 'approved' | 'reverted';
    previousVersionId?: string;
    reason: string;
  }>>;
  
  // Revert to previous (admin-only)
  async revert(appId: string, toVersionId: string): Promise<activeThresholdSetId>;
}

// Feature: Multi-device sync
localStorage.setItem(`thresholds_${appId}`, JSON.stringify(thresholds));
window.addEventListener('storage', (e) => {
  if (e.key === `thresholds_${appId}`) {
    // Another tab updated thresholds—refresh
    reloadThresholds();
  }
});
```

---

## 4. Forecaster / End User

### User Story
*"As a forecaster, I need to see live previews of how threshold changes affect the map legend and understand the impact before committing the change."*

### Current State ✓ / ✗

| Capability | Status | Notes |
|-----------|--------|-------|
| **Live legend preview** | ✓ | Color/label updates in real-time |
| **Undo/Redo** | ✓ | Safe to experiment |
| **Revert to defaults** | ✓ | Confirmation dialog present |
| **Test mode** | ✗ | Changes go live immediately |
| **Impact visualization** | ✗ | Cannot see how current forecast changes |
| **Quick save/restore** | ✗ | No "favorite" profiles |
| **Before/after tooltip** | ✗ | No context on what changed |

### Pain Points

1. **No Test Mode**
   ```
   Forecaster workflow today:
   1. Open threshold editor
   2. Change threshold from 0.3m to 0.25m
   3. Save
   4. Map legend updates LIVE
   5. If it looks wrong, undo
   
   Better workflow:
   1. Open threshold editor
   2. Change threshold to 0.25m
   3. Click "Preview" → see map with new thresholds, no save
   4. If good, click "Commit"; if bad, click "Discard"
   ```

2. **No Impact Analysis**
   - Cannot see: "With the new 0.25m threshold, 450 additional pixels will be classified as 'Minor'—are you sure?"
   - Cannot overlay on today's forecast data

3. **Changes Are Too Silent**
   - Map updates but there's no "⚠️ Thresholds changed at 2:34 PM" indicator
   - Other forecasters don't know thresholds were modified

### Recommended Improvements

```javascript
// Feature: Test mode (draft state)
interface ThresholdEditorState {
  mode: 'saved' | 'draft' | 'preview';
  
  // In preview mode: show both thresholds and diff
  previewThresholds?: Category[];
  previewImpact?: {
    pixelsAdded: number;
    pixelsRemoved: number;
    worstCaseArea: string;  // e.g., "Southeast coast"
  };
}

// Feature: Quick profiles
interface FavoriteThresholds {
  name: string;  // "Morning conservative", "Afternoon aggressive"
  categories: Category[];
  description: string;
}

// Feature: Change notification
interface ThresholdChangeNotification {
  icon: "🔔";
  title: "Thresholds Updated";
  changedBy: string;
  summary: "0.3m → 0.25m (Moderate)";
  timestamp: ISO8601;
  action: { label: "View changes", handler: () => showDiff() };
}
```

---

## 5. GIS Analyst / Data Integration

### User Story
*"As a GIS analyst, I need threshold changes to automatically propagate to map layers, WMS servers, and external systems without manual reconfiguration."*

### Current State ✓ / ✗

| Capability | Status | Notes |
|-----------|--------|-------|
| **JSON export** | ✓ | Machine-readable format |
| **Legend sync** | ✓ | React component re-renders on change |
| **WMS integration** | ✗ | No automatic style/sld update |
| **Color ramp export** | ✗ | No standard GIS formats (SLD, ACE, etc.) |
| **Backend sync** | ✗ | No API to push to Geoserver/xpublish |
| **Layer update** | ✗ | Threshold changes don't refresh server layers |
| **Attribution** | ✗ | No data lineage in exported files |

### Pain Points

1. **Island of Thresholds**
   - Thresholds live in React app (browser localStorage)
   - Map layers live on xpublish server or Geoserver
   - Manual copy-paste needed to sync them

2. **No Standard Export Formats**
   ```
   Needed formats:
   - SLD (Styled Layer Descriptor) for WMS/Geoserver
   - ACE (ArcGIS Color Export)
   - GDAL color table for GeoTIFF
   - QGIS style file
   ```

3. **Color Scheme Opacity**
   - Current gradient is `X_SST_GRADIENT_RGB` (looks like temperature scale)
   - GIS tools cannot replicate or validate this gradient
   - No ColorBrewer or Viridis equivalent

### Recommended Improvements

```javascript
// Feature: Multi-format export
interface ThresholdExporter {
  async toSLD(thresholds: Category[]): Promise<string>;  // WMS/Geoserver
  async toGDALColorTable(thresholds: Category[]): Promise<string>;
  async toQgis(thresholds: Category[]): Promise<string>;
  async toColorBrewer(thresholds: Category[], palette: 'viridis' | 'plasma'): Promise<string>;
}

// Feature: Server synchronization
interface ThresholdSync {
  // Push thresholds to backend
  async syncToServer(url: string, thresholds: Category[]): Promise<{ ok: boolean; error?: string }>;
  
  // Get thresholds from server (authoritative source)
  async syncFromServer(url: string): Promise<{ categories: Category[]; updatedAt: ISO8601 }>;
  
  // Watch for changes on server (WebSocket)
  onRemoteChange(callback: (categories: Category[]) => void): unsubscribe;
}

// Feature: WMS layer update
async function updateWmsLayerStyles(layerName: string, thresholds: Category[]) {
  const sld = await thresholdExporter.toSLD(thresholds);
  return geoserverClient.updateLayerStyle(layerName, sld);
}
```

---

## Summary of Critical Gaps

| Feature | Priority | Impact | Effort |
|---------|----------|--------|--------|
| **Audit trail (who/what/when/why)** | 🔴 Critical | Governance, compliance | High |
| **Test/preview mode** | 🔴 Critical | Safety, confidence | Medium |
| **Server-side storage** | 🔴 Critical | Multi-device sync, reliability | High |
| **Metadata/provenance** | 🟠 High | Scientific rigor, traceability | Medium |
| **Role-based access** | 🟠 High | Governance | Medium |
| **Threshold profiles** | 🟠 High | Quick switching | Low |
| **WMS/export formats** | 🟠 High | GIS integration | Medium |
| **Change notifications** | 🟡 Medium | Awareness | Low |
| **Impact visualization** | 🟡 Medium | Confidence | High |

---

## Recommended Phased Rollout

### Phase 1 (Weeks 1–2): Audit & Safety
- [ ] Add metadata fields: `changedBy`, `reason`, `timestamp`
- [ ] Save full history to localStorage with versions
- [ ] Add test/preview mode with discard option
- [ ] Show "last edited X minutes ago by Person Y" on editor open

### Phase 2 (Weeks 3–4): Governance
- [ ] Simple approval workflow: Draft → Pending → Approved
- [ ] Role-based UI (read-only for forecasters, edit for analysts, approve for director)
- [ ] Export with metadata included

### Phase 3 (Weeks 5–6): Integration
- [ ] Server endpoint to read/write thresholds
- [ ] Multi-device sync via localStorage events + polling
- [ ] WMS SLD export for Geoserver integration
- [ ] Threshold profiles (tsunami, surge, wind)

### Phase 4 (Weeks 7–8): Intelligence
- [ ] Impact analysis: run new thresholds against historical forecast data
- [ ] Scientific metadata: source, methodology, citations
- [ ] Diff viewer for side-by-side comparison

---

## Questions for Stakeholders

1. **Who should be allowed to change thresholds?** (Anyone vs. trained analysts vs. director only)
2. **How long should change history be retained?** (6 months? 2 years? Permanent?)
3. **Should threshold changes require approval before going live?** (For operational resilience)
4. **Do you need to compare thresholds across regions?** (e.g., Cook Islands vs. Samoa)
5. **Is localStorage acceptable for production, or must thresholds be server-side?**
