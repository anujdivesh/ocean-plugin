"use client";

import { useEffect, useState } from "react";
import type { Map as MaplibreMap } from "maplibre-gl";
import { REFERENCE_LAYERS, referenceGroup } from "@/lib/referenceLayers";
import styles from "./ReferenceLayerToggles.module.css";

/** Horizontal on/off bar for the reference overlays, top right of the map. */
export default function ReferenceLayerToggles({
  map,
}: {
  map: MaplibreMap | null;
}) {
  // All overlays start on (they're visible in the base style).
  const [on, setOn] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(REFERENCE_LAYERS.map((l) => [l.id, true])),
  );

  // Apply the checkboxes to the map, including any ticked before it loaded.
  // (The boxes are never disabled: Firefox restores form-control state on
  // reload, which made a `disabled` attribute mismatch on hydration.)
  useEffect(() => {
    if (!map) return;
    for (const layer of map.getStyle().layers) {
      const group = referenceGroup(layer);
      if (group !== undefined) {
        map.setLayoutProperty(
          layer.id,
          "visibility",
          on[group] ? "visible" : "none",
        );
      }
    }
  }, [map, on]);

  return (
    <div className={styles.bar} role="group" aria-label="Map overlays">
      {REFERENCE_LAYERS.map((l) => (
        <label key={l.id} className={styles.item}>
          <input
            type="checkbox"
            // Stop Firefox restoring a previous page's state over React's.
            autoComplete="off"
            checked={on[l.id]}
            onChange={(e) => setOn((s) => ({ ...s, [l.id]: e.target.checked }))}
          />
          {l.label}
        </label>
      ))}
    </div>
  );
}
