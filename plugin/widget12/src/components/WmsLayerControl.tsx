"use client";

import { useEffect, useState } from "react";
import type { Map as MaplibreMap, RasterTileSource } from "maplibre-gl";
import {
  fetchLayerConfig,
  fetchLayerTimes,
  timeStep,
  wmsLayerId,
  wmsTileUrl,
  type WmsLayerConfig,
} from "@/lib/wmsLayer";
import { startTime } from "@/lib/time";
import { DATA_BEFORE_ID } from "@/lib/referenceLayers";
import LayerCard from "./LayerCard";

type Props = {
  map: MaplibreMap | null;
  /** Middleware layer_web_map id. */
  layerId: number;
  visible: boolean;
  onVisibleChange?: (visible: boolean) => void;
  /** Radio group name: one layer on at a time (see LayerCard). */
  radioGroup?: string;
  /** Play through time automatically (from initialTime, looping back to it). */
  autoplay?: boolean;
  /** Starting time: a date ("2015-12") or offset from the latest ("-10y"). Defaults to latest. */
  initialTime?: string;
  /** Called once the layer has been added to the map. */
  onAdded?: () => void;
};

/** A WMS layer from the SPC ocean middleware, drawn as MapLibre raster tiles. */
export default function WmsLayerControl({
  map,
  layerId,
  visible,
  onVisibleChange,
  radioGroup,
  initialTime,
  autoplay = false,
  onAdded,
}: Props) {
  const [cfg, setCfg] = useState<WmsLayerConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [times, setTimes] = useState<string[]>([]);

  // Jump to a new starting time when the story asks for one.
  const [prevInitial, setPrevInitial] = useState(initialTime);
  if (initialTime !== prevInitial) {
    setPrevInitial(initialTime);
    if (initialTime && times.length) setTime(startTime(times, initialTime));
  }

  const sourceId = wmsLayerId(layerId);

  useEffect(() => {
    fetchLayerConfig(layerId)
      .then(async (c) => {
        const t = await fetchLayerTimes(c);
        setTimes(t);
        setTime(startTime(t, initialTime));
        setCfg(c);
      })
      .catch((e: Error) => setError(e.message));
    // initialTime changes are handled above; only reload for a new layer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layerId]);

  // Add the layer once, remove on unmount.
  useEffect(() => {
    if (!map || !cfg || !time || map.getSource(sourceId)) return;
    map.addSource(sourceId, {
      type: "raster",
      tiles: [wmsTileUrl(cfg, time)],
      tileSize: 256,
      attribution: "SST anomalies &copy; NOAA / SPC",
    });
    map.addLayer(
      {
        id: sourceId,
        type: "raster",
        source: sourceId,
        layout: { visibility: visible ? "visible" : "none" },
        paint: { "raster-opacity": cfg.opacity ?? 1 },
      },
      DATA_BEFORE_ID, // keep reference overlays on top
    );
    onAdded?.();
    return () => {
      if (!map.getStyle()) return;
      if (map.getLayer(sourceId)) map.removeLayer(sourceId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
    // Only (re)create when the map or config changes; time and visibility are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, cfg, sourceId]);

  useEffect(() => {
    const src = map?.getSource<RasterTileSource>(sourceId);
    if (src && cfg && time) src.setTiles([wmsTileUrl(cfg, time)]);
  }, [map, cfg, time, sourceId]);

  useEffect(() => {
    if (map?.getLayer(sourceId)) {
      map.setLayoutProperty(
        sourceId,
        "visibility",
        visible ? "visible" : "none",
      );
    }
  }, [map, visible, sourceId, cfg]);

  return (
    <LayerCard
      title={cfg?.layer_title ?? "Loading layer…"}
      visible={visible}
      onVisibleChange={onVisibleChange}
      radioGroup={radioGroup}
      step={cfg ? timeStep(cfg) : "daily"}
      times={times}
      time={time}
      onTimeChange={setTime}
      autoplay={autoplay}
      // Loop back to the animation's start; "latest" isn't a loop start.
      loopStart={
        initialTime && initialTime !== "latest"
          ? startTime(times, initialTime)
          : null
      }
      legendUrl={cfg?.legend_url}
      status={error ? { text: error, error: true } : null}
    />
  );
}
