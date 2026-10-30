"use client";

import { useEffect, useState } from "react";
import {
  Popup,
  type Map as MaplibreMap,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import {
  defaultStation,
  loadTideGauges,
  type TideGaugeData,
} from "@/lib/tideGauges";
import LayerCard from "./LayerCard";

// Tide gauge stations (public/tide_gauge.json) as points; clicking one picks
// the station whose plots the TideGaugePanel shows.

const SOURCE = "tide-gauges";
const LAYER = "tide-gauges-points";
const POINT_COLOR = "#0f766e";
const SELECTED_COLOR = "#f59e0b";

type Props = {
  map: MaplibreMap | null;
  title: string;
  visible: boolean;
  onVisibleChange?: (visible: boolean) => void;
  radioGroup?: string;
  /** Station id shown in the panel (null: the default station). */
  selected: string | null;
  onSelect: (id: string) => void;
};

/** Stations as GeoJSON points, with longitudes moved into -180..180. */
function toGeoJson(data: TideGaugeData): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: Object.entries(data.tide_gauge).map(([id, s]) => ({
      type: "Feature",
      properties: { id, name: s.station },
      geometry: {
        type: "Point",
        coordinates: [
          s.coordinates.lon > 180 ? s.coordinates.lon - 360 : s.coordinates.lon,
          s.coordinates.lat,
        ],
      },
    })),
  };
}

export default function TideGaugeLayerControl({
  map,
  title,
  visible,
  onVisibleChange,
  radioGroup,
  selected,
  onSelect,
}: Props) {
  const [data, setData] = useState<TideGaugeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = selected ?? (data && defaultStation(data));

  useEffect(() => {
    loadTideGauges()
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  // Add the points once the data is in; remove them on unmount. Drawn above
  // the reference overlays so they stay clickable.
  useEffect(() => {
    if (!map || !data || map.getLayer(LAYER)) return;
    if (!map.getSource(SOURCE)) {
      map.addSource(SOURCE, { type: "geojson", data: toGeoJson(data) });
    }
    map.addLayer({
      id: LAYER,
      type: "circle",
      source: SOURCE,
      layout: { visibility: visible ? "visible" : "none" },
      paint: {
        "circle-radius": 7,
        "circle-color": POINT_COLOR,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
      },
    });

    // Hover for the station name, click to plot it.
    const hover = new Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 10,
    });
    const onClick = (e: MapLayerMouseEvent) => {
      const id = e.features?.[0]?.properties?.id;
      if (id) onSelect(id);
    };
    const onMove = (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f) return;
      map.getCanvas().style.cursor = "pointer";
      hover
        .setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
        .setText(f.properties?.name ?? "")
        .addTo(map);
    };
    const onLeave = () => {
      map.getCanvas().style.cursor = "";
      hover.remove();
    };
    map.on("click", LAYER, onClick);
    map.on("mousemove", LAYER, onMove);
    map.on("mouseleave", LAYER, onLeave);

    return () => {
      map.off("click", LAYER, onClick);
      map.off("mousemove", LAYER, onMove);
      map.off("mouseleave", LAYER, onLeave);
      hover.remove();
      if (map.getStyle() && map.getLayer(LAYER)) map.removeLayer(LAYER);
      if (map.getStyle() && map.getSource(SOURCE)) map.removeSource(SOURCE);
    };
    // Visibility and the selection are synced below; only rebuild for a new
    // map or data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, data]);

  useEffect(() => {
    if (map?.getLayer(LAYER)) {
      map.setLayoutProperty(LAYER, "visibility", visible ? "visible" : "none");
      // Keep the points above layers added after them.
      if (visible) map.moveLayer(LAYER);
    }
  }, [map, visible, data]);

  // Highlight the station being plotted.
  useEffect(() => {
    if (!map?.getLayer(LAYER)) return;
    map.setPaintProperty(LAYER, "circle-color", [
      "case",
      ["==", ["get", "id"], current ?? ""],
      SELECTED_COLOR,
      POINT_COLOR,
    ]);
    map.setPaintProperty(LAYER, "circle-radius", [
      "case",
      ["==", ["get", "id"], current ?? ""],
      9,
      7,
    ]);
  }, [map, current, data]);

  return (
    <LayerCard
      title={title}
      visible={visible}
      onVisibleChange={onVisibleChange}
      radioGroup={radioGroup}
      step="monthly"
      times={[]}
      time={null}
      onTimeChange={() => {}}
      legendItems={[
        { label: "Tide gauge (click for plots)", color: POINT_COLOR, box: true },
        { label: "Selected station", color: SELECTED_COLOR, box: true },
      ]}
      status={
        error
          ? { text: error, error: true }
          : data
            ? { text: `${Object.keys(data.tide_gauge).length} stations` }
            : null
      }
    />
  );
}
