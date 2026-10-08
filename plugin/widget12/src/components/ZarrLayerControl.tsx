"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MaplibreMap } from "maplibre-gl";
import type { ZarrOverlay, ZarrLayerConfig } from "@/lib/zarr/zarrOverlay";
import { startTime, type TimeStep } from "@/lib/time";
import { DATA_BEFORE_ID } from "@/lib/referenceLayers";
import LayerCard from "./LayerCard";

/** An extra variable drawn with the main one; `toggle` gives it a checkbox. */
export type ZarrExtra = ZarrLayerConfig & {
  /** Optional on/off checkbox in the layer card (off unless defaultOn). */
  toggle?: {
    label: string;
    color: string;
    defaultOn?: boolean;
    /** Greyed out and can't be ticked (stays off unless defaultOn). */
    disabled?: boolean;
  };
};

type Props = {
  map: MaplibreMap | null;
  title: string;
  step: TimeStep;
  config: ZarrLayerConfig;
  /**
   * More variables drawn with the main one (same dataset or time axis), e.g.
   * contour masks over a raster. They share its visibility and timestep.
   */
  extras?: ZarrExtra[];
  /** Heading for the extras' checkboxes (e.g. "Species zones"). */
  togglesTitle?: string;
  legendUrl?: string;
  /** step "custom": label for each timestep, in order. */
  stepLabels?: string[];
  /** Extra legend keys (e.g. contour lines) shown under the legend image. */
  legendItems?: { label: string; color: string }[];
  visible: boolean;
  onVisibleChange?: (visible: boolean) => void;
  /** Radio group name: one layer on at a time (see LayerCard). */
  radioGroup?: string;
  /**
   * Show each timestep as the 15th of its month (for monthly products sampled
   * on irregular days, e.g. "the day closest to the 15th").
   */
  midMonth?: boolean;
  /** Reports the selected timestep whenever it changes. */
  onTimeChange?: (time: string | null) => void;
  /** Reports whether the layer is fetching data from S3. */
  onLoadingChange?: (loading: boolean) => void;
  /** Play through time automatically (from initialTime, looping back to it). */
  autoplay?: boolean;
  /** Timestep to open on when no initialTime is given (default "latest"). */
  defaultTime?: "first" | "latest";
  /** Starting time: a date ("2015-12") or offset from the latest ("-10y"). Defaults to latest. */
  initialTime?: string;
};

/** A Zarr dataset on S3, rendered client-side with deck.gl over the map. */
export default function ZarrLayerControl({
  map,
  title,
  step,
  config,
  extras,
  togglesTitle,
  legendUrl,
  stepLabels,
  legendItems,
  visible,
  onVisibleChange,
  radioGroup,
  initialTime,
  autoplay = false,
  onTimeChange,
  onLoadingChange,
  midMonth = false,
  defaultTime = "latest",
}: Props) {
  // Main overlay first, then extras; all follow the same visibility and time.
  const overlaysRef = useRef<ZarrOverlay[]>([]);
  const timeIndexRef = useRef(0);
  const [times, setTimes] = useState<string[]>([]);
  const [time, setTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Timestep index each overlay last finished drawing.
  const [renderedIndex, setRenderedIndex] = useState<(number | null)[]>([]);
  const [error, setError] = useState<string | null>(null);
  // On/off state of extras that have a checkbox, by extra id.
  const [toggles, setToggles] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      (extras ?? [])
        .filter((e) => e.toggle)
        .map((e) => [e.id, !!e.toggle?.defaultOn]),
    ),
  );
  /** Whether overlay i (0 = main, then extras) should be drawn. */
  const shown = (i: number) => {
    const extra = i > 0 ? extras?.[i - 1] : undefined;
    return visible && (!extra?.toggle || !!toggles[extra.id]);
  };

  // Jump to a new starting time when the story asks for one.
  const [prevInitial, setPrevInitial] = useState(initialTime);
  if (initialTime !== prevInitial) {
    setPrevInitial(initialTime);
    if (initialTime && times.length) setTime(startTime(times, initialTime));
  }

  // Create the overlay once the map is ready. deck.gl and zarrita are loaded
  // lazily so they stay out of the server bundle.
  useEffect(() => {
    if (!map) return;
    let overlays: ZarrOverlay[] = [];
    let cancelled = false;

    import("@/lib/zarr/zarrOverlay").then(({ ZarrOverlay }) => {
      if (cancelled) return;
      overlays = [config, ...(extras ?? [])].map((cfg, i) => {
        const overlay = new ZarrOverlay(
          map,
          { beforeId: DATA_BEFORE_ID, ...cfg },
          { visible: shown(i) },
        );
        overlay.onTimeChange = (_label, idx) =>
          setRenderedIndex((r) => {
            const next = [...r];
            next[i] = idx;
            return next;
          });
        if (i === 0) {
          overlay.onLoadingChange = setLoading;
          overlay.onErrorChange = setError;
          overlay.onTimesLoaded = (raw) => {
            // Index i in `t` is still dataset timestep i; only the labels change.
            const t = midMonth ? raw.map(toMidMonth) : raw;
            const start = startTime(t, initialTime ?? defaultTime);
            // Render the starting step first rather than the first in the file.
            if (start) {
              timeIndexRef.current = t.indexOf(start);
              for (const o of overlays) o.setTimeIndex(timeIndexRef.current);
            }
            setTimes(t);
            setTime(start);
          };
        } else {
          // Extras may finish loading after the main layer picked its time.
          overlay.onErrorChange = (e) => e && setError(e);
          overlay.onTimesLoaded = () =>
            overlay.setTimeIndex(timeIndexRef.current);
        }
        return overlay;
      });
      overlaysRef.current = overlays;
    });

    return () => {
      cancelled = true;
      for (const o of overlays) o.destroy();
      overlaysRef.current = [];
    };
    // The overlay is rebuilt only for a new map or dataset; visibility and time are synced below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, config, extras]);

  useEffect(() => {
    overlaysRef.current.forEach((o, i) => o.setVisible(shown(i)));
    // `shown` only depends on these.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, toggles]);

  useEffect(() => {
    if (!time) return;
    timeIndexRef.current = times.indexOf(time);
    for (const o of overlaysRef.current) o.setTimeIndex(timeIndexRef.current);
  }, [time, times]);

  // Playback waits until every shown overlay has drawn the current timestep.
  const current = time === null ? -1 : times.indexOf(time);
  const layerCount = 1 + (extras?.length ?? 0);
  const frameReady =
    current >= 0 &&
    Array.from({ length: layerCount }, (_, i) => i)
      .filter(shown)
      .every((i) => renderedIndex[i] === current);

  const toggleItems = (extras ?? [])
    .filter((e) => e.toggle)
    .map((e) => ({
      id: e.id,
      label: e.toggle!.label,
      color: e.toggle!.color,
      checked: !!toggles[e.id],
      disabled: e.toggle!.disabled,
    }));

  useEffect(() => {
    onTimeChange?.(time);
    // Report time changes only, not handler identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time]);

  useEffect(() => {
    onLoadingChange?.(loading);
    // Report loading changes only, not handler identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  return (
    <LayerCard
      title={title}
      visible={visible}
      onVisibleChange={onVisibleChange}
      radioGroup={radioGroup}
      step={step}
      times={times}
      time={time}
      onTimeChange={setTime}
      autoplay={autoplay}
      // Loop back to the animation's start; "latest" isn't a loop start.
      loopStart={
        initialTime && initialTime !== defaultTime
          ? startTime(times, initialTime)
          : null
      }
      legendUrl={legendUrl}
      stepLabels={stepLabels}
      legendItems={legendItems}
      toggles={
        toggleItems.length
          ? {
              title: togglesTitle ?? "Show",
              items: toggleItems,
              onChange: (id, on) => setToggles((t) => ({ ...t, [id]: on })),
            }
          : undefined
      }
      status={error ? { text: error, error: true } : null}
      busy={loading}
      frameReady={frameReady}
    />
  );
}

/** "2026-10-03T00:00:00Z" -> "2026-10-15T00:00:00Z". */
function toMidMonth(iso: string) {
  return `${iso.slice(0, 7)}-15T00:00:00Z`;
}
