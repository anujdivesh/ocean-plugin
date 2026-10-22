"use client";

import { useEffect, useRef } from "react";
import type { Map as MaplibreMap, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import { layers, namedFlavor } from "@protomaps/basemaps";
import {
  dataAnchorLayer,
  fetchReferenceStyles,
} from "@/lib/referenceLayers";
import { registerPmtilesSources } from "@/lib/pmtilesSource";

// Single base map: Protomaps "light" from a pmtiles archive on S3, without its
// labels (the Pacific place names overlay labels the map instead). Reference
// overlays (coastline, EEZ, names) sit at the top; data layers go below them.
const PMTILES_URL =
  "https://s3.ap-southeast-2.wasabisys.com/spc-zarr-file/20261012.pmtiles/20261012.pmtiles";

function buildStyle(overlays: (StyleSpecification | null)[]): StyleSpecification {
  const loaded = overlays.filter((o): o is StyleSpecification => o !== null);
  return {
    version: 8,
    // Only the overlays draw text, so their glyph server is the only one needed.
    glyphs: loaded.find((o) => o.glyphs)?.glyphs,
    sources: {
      protomaps: {
        type: "vector",
        url: `pmtiles://${PMTILES_URL}`,
        attribution:
          '<a href="https://protomaps.com">Protomaps</a> &copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
      },
      ...Object.assign({}, ...loaded.map((o) => o.sources)),
    },
    layers: [
      ...layers("protomaps", namedFlavor("light")).filter(
        (l) => l.type !== "symbol",
      ),
      dataAnchorLayer,
      ...loaded.flatMap((o) => o.layers),
    ],
  };
}

type Props = {
  onLoad?: (map: MaplibreMap) => void;
};

export default function MapView({ onLoad }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: MaplibreMap | undefined;
    let cancelled = false;
    let removeProtocol: (() => void) | undefined;

    // MapLibre v5 (not v6): deck.gl's interleaved mode, used for the Zarr
    // layers, relies on map internals that v6 changed.
    Promise.all([import("maplibre-gl"), fetchReferenceStyles()]).then(
      ([maplibregl, overlays]) => {
        if (cancelled || !containerRef.current) return;
        const { Map, NavigationControl, ScaleControl } = maplibregl;

        // Read pmtiles:// sources via HTTP range requests, retrying transient
        // S3 failures so a single 503 doesn't leave a tile or layer blank.
        const protocol = new Protocol();
        maplibregl.addProtocol("pmtiles", protocol.tile);
        removeProtocol = () => maplibregl.removeProtocol("pmtiles");
        const style = buildStyle(overlays);
        registerPmtilesSources(protocol, style.sources);

        map = new Map({
          container: containerRef.current,
          style,
          center: [170, -10], // Pacific
          zoom: 2,
        });
        map.addControl(new NavigationControl(), "top-right");
        map.addControl(new ScaleControl(), "bottom-right");
        map.on("load", () => onLoad?.(map!));
      },
    );

    return () => {
      cancelled = true;
      map?.remove();
      removeProtocol?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
}
