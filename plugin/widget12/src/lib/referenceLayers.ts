import type { LayerSpecification, StyleSpecification } from "maplibre-gl";

// Reference overlays drawn above all data layers. Each is a MapLibre style on
// S3 over a pmtiles archive, so it can change without a redeploy (built and
// uploaded by scripts/<name>/build_*.sh). Order here is bottom to top.
export type ReferenceLayer = { id: string; label: string; styleUrl: string };

const STYLE_BUCKET = "https://s3.ap-southeast-2.wasabisys.com/spc-zarr-file";

export const REFERENCE_LAYERS: ReferenceLayer[] = [
  {
    id: "ref-coastline",
    label: "Coastline",
    styleUrl: `${STYLE_BUCKET}/coastline/style.json`,
  },
  {
    id: "ref-eez",
    label: "EEZ",
    styleUrl: `${STYLE_BUCKET}/eez/style.json`,
  },
  {
    id: "ref-names",
    label: "Pacific names",
    styleUrl: `${STYLE_BUCKET}/pacific_names/style.json`,
  },
];

/**
 * Data layers are inserted below this map layer so the overlays stay on top.
 * It's an empty, hidden layer, so it exists even if an overlay style fails to load.
 */
export const DATA_BEFORE_ID = "data-anchor";

export const dataAnchorLayer: LayerSpecification = {
  id: DATA_BEFORE_ID,
  type: "background",
  layout: { visibility: "none" },
};

/** Map layers belonging to an overlay are tagged with its id in their metadata. */
const GROUP_KEY = "ref-group";

export function referenceGroup(layer: LayerSpecification): string | undefined {
  return (layer.metadata as Record<string, string> | undefined)?.[GROUP_KEY];
}

/** Fetch each overlay style; a failed one comes back null and is left off the map. */
export function fetchReferenceStyles(): Promise<(StyleSpecification | null)[]> {
  return Promise.all(
    REFERENCE_LAYERS.map(async (l) => {
      try {
        const response = await fetch(l.styleUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const style = (await response.json()) as StyleSpecification;
        return {
          ...style,
          layers: style.layers.map((layer) => ({
            ...layer,
            metadata: { ...(layer.metadata as object), [GROUP_KEY]: l.id },
          })),
        };
      } catch (error) {
        console.error(`Failed to load overlay style ${l.styleUrl}`, error);
        return null;
      }
    }),
  );
}
