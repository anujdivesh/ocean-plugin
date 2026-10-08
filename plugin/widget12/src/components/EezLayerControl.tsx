"use client";

import { useEffect, useState } from "react";
import {
  Popup,
  type ExpressionSpecification,
  type Map as MaplibreMap,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import { withBasePath } from "@/lib/basePath";
import { DATA_BEFORE_ID } from "@/lib/referenceLayers";
import LayerCard from "./LayerCard";
import styles from "./EezLayerControl.module.css";

// EEZs shaded by a per-country status from public/drought.json, over the
// shapes in public/pacific-eez.json (built by scripts/build-eez.mjs).

type Category = { id: string; label: string; color: string };
type DroughtLayer = {
  title: string;
  categories: Category[];
  /** Country code -> category id. */
  countries: Record<string, string>;
};
type DroughtConfig = {
  updated?: string;
  note?: string;
  /** Fill and legend entry for countries a layer doesn't list. */
  noInfo?: { label: string; color: string };
  layers: Record<string, DroughtLayer>;
};

const EEZ_SOURCE = "pacific-eez";
const NO_FILL = "rgba(0, 0, 0, 0)";
/** Used when drought.json has no `noInfo`: unlisted countries left unshaded. */
const DEFAULT_NO_INFO = { label: "No data", color: NO_FILL };

/** Drought-related impact entries by country (scripts/build_impacts.py). */
type Impact = {
  title: string;
  month: string; // "YYYY-MM"
  source: string | null;
  link: string | null;
};
type Impacts = { source: string; countries: Record<string, Impact[]> };

/** Impacts listed in a popup; the rest are counted. */
const POPUP_IMPACTS = 3;
const MONTH_YEAR = new Intl.DateTimeFormat("en", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

let impactsCache: Promise<Impacts | null> | null = null;
/** Load (once) public/drought-impacts.json; null if it's missing. */
const loadImpacts = () =>
  (impactsCache ??= fetch(withBasePath("/drought-impacts.json"))
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null));

/** Popup body: country, this layer's status, then its recent impacts. */
function popupContent(
  name: string,
  layerTitle: string,
  status: string,
  impacts: Impact[],
  source: string | undefined,
) {
  const el = document.createElement("div");
  el.className = styles.popup;
  const heading = document.createElement("strong");
  heading.textContent = name;
  const statusLine = document.createElement("p");
  statusLine.textContent = `${layerTitle}: ${status}`;
  el.append(heading, statusLine);
  if (!impacts.length) return el;

  const label = document.createElement("p");
  label.className = styles.impactsLabel;
  label.textContent = "Recent impacts";
  const list = document.createElement("ul");
  list.className = styles.impacts;
  for (const impact of impacts.slice(0, POPUP_IMPACTS)) {
    const item = document.createElement("li");
    const when = document.createElement("span");
    when.className = styles.impactMonth;
    when.textContent = MONTH_YEAR.format(
      new Date(`${impact.month}-01T00:00:00Z`),
    );
    const title = document.createElement(impact.link ? "a" : "span");
    title.textContent = impact.title;
    if (impact.link && title instanceof HTMLAnchorElement) {
      title.href = impact.link;
      title.target = "_blank";
      title.rel = "noopener noreferrer";
    }
    item.append(when, title);
    if (impact.source) {
      const by = document.createElement("span");
      by.className = styles.impactSource;
      by.textContent = ` · ${impact.source}`;
      item.append(by);
    }
    list.append(item);
  }
  el.append(label, list);
  const more = impacts.length - POPUP_IMPACTS;
  if (more > 0 || source) {
    const foot = document.createElement("p");
    foot.className = styles.impactsFoot;
    foot.textContent = [more > 0 && `+${more} more`, source]
      .filter(Boolean)
      .join(" · ");
    el.append(foot);
  }
  return el;
}

let configCache: Promise<DroughtConfig> | null = null;
const loadConfig = () =>
  (configCache ??= fetch(withBasePath("/drought.json")).then((r) => {
    if (!r.ok) throw new Error(`drought.json: ${r.status}`);
    return r.json();
  }));

type Props = {
  map: MaplibreMap | null;
  /** Workbench title until drought.json loads. */
  title: string;
  /** Key of this layer in drought.json's `layers`. */
  droughtKey: string;
  visible: boolean;
  onVisibleChange?: (visible: boolean) => void;
  /** Radio group name when only one layer of its group can be on. */
  radioGroup?: string;
};

/** Fill colour per feature: its country's category colour, else `fallback`. */
function fillColor(
  layer: DroughtLayer,
  fallback: string,
): ExpressionSpecification | string {
  const colors = new Map(layer.categories.map((c) => [c.id, c.color]));
  const pairs = Object.entries(layer.countries).flatMap(([code, cat]) =>
    colors.has(cat) ? [code, colors.get(cat)!] : [],
  );
  return pairs.length
    ? // At least one code/colour pair, so this is a valid "match".
      ([
        "match",
        ["get", "code"],
        ...pairs,
        fallback,
      ] as unknown as ExpressionSpecification)
    : fallback;
}

export default function EezLayerControl({
  map,
  title,
  droughtKey,
  visible,
  onVisibleChange,
  radioGroup,
}: Props) {
  const [config, setConfig] = useState<DroughtConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const layer = config?.layers[droughtKey];
  const noInfo = config?.noInfo ?? DEFAULT_NO_INFO;
  const layerId = `drought-${droughtKey}`;

  useEffect(() => {
    loadConfig()
      .then((c) => {
        setConfig(c);
        if (!c.layers[droughtKey])
          setError(`No "${droughtKey}" layer in drought.json`);
      })
      .catch((e: Error) => setError(e.message));
  }, [droughtKey]);

  // Add the fill once the config is in; remove it on unmount. The EEZ source
  // is shared by every drought layer and left on the map.
  useEffect(() => {
    if (!map || !layer || map.getLayer(layerId)) return;
    if (!map.getSource(EEZ_SOURCE)) {
      map.addSource(EEZ_SOURCE, {
        type: "geojson",
        data: withBasePath("/pacific-eez.json"),
        attribution: "EEZs &copy; Pacific Data Hub",
      });
    }
    const color = fillColor(layer, noInfo.color);
    map.addLayer(
      {
        id: layerId,
        type: "fill",
        source: EEZ_SOURCE,
        layout: { visibility: visible ? "visible" : "none" },
        // Outline in the fill colour hides seams where an EEZ is split at 180°.
        paint: {
          "fill-color": color,
          "fill-outline-color": color,
          "fill-opacity": 0.7,
        },
      },
      DATA_BEFORE_ID, // keep reference overlays (EEZ lines, names) on top
    );

    // Click an EEZ for its country, status and recent impacts.
    const labels = new Map(layer.categories.map((c) => [c.id, c.label]));
    const onClick = async (e: MapLayerMouseEvent) => {
      const props = e.features?.[0]?.properties;
      if (!props) return;
      const status = labels.get(layer.countries[props.code]) ?? noInfo.label;
      const impacts = await loadImpacts();
      const el = popupContent(
        props.name,
        layer.title,
        status,
        impacts?.countries[props.code] ?? [],
        impacts?.source,
      );
      new Popup({ closeButton: false, maxWidth: "300px" })
        .setLngLat(e.lngLat)
        .setDOMContent(el)
        .addTo(map);
    };
    const onEnter = () => (map.getCanvas().style.cursor = "pointer");
    const onLeave = () => (map.getCanvas().style.cursor = "");
    map.on("click", layerId, onClick);
    map.on("mouseenter", layerId, onEnter);
    map.on("mouseleave", layerId, onLeave);

    return () => {
      map.off("click", layerId, onClick);
      map.off("mouseenter", layerId, onEnter);
      map.off("mouseleave", layerId, onLeave);
      if (map.getStyle() && map.getLayer(layerId)) map.removeLayer(layerId);
    };
    // Visibility is synced below; only rebuild for a new map or config.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, layer, layerId, noInfo.color, noInfo.label]);

  useEffect(() => {
    if (map?.getLayer(layerId)) {
      map.setLayoutProperty(
        layerId,
        "visibility",
        visible ? "visible" : "none",
      );
    }
  }, [map, visible, layerId, layer]);

  const status = error
    ? { text: error, error: true }
    : config
      ? {
          text: [config.updated && `Updated ${config.updated}`, config.note]
            .filter(Boolean)
            .join(" · "),
        }
      : null;

  return (
    <LayerCard
      title={layer?.title ?? title}
      visible={visible}
      onVisibleChange={onVisibleChange}
      radioGroup={radioGroup}
      step="monthly"
      times={[]}
      time={null}
      onTimeChange={() => {}}
      legendItems={
        layer && [
          ...layer.categories.map((c) => ({
            label: c.label,
            color: c.color,
            box: true,
          })),
          // Countries the layer doesn't list (only if they're shaded).
          ...(noInfo.color === NO_FILL
            ? []
            : [{ label: noInfo.label, color: noInfo.color, box: true }]),
        ]
      }
      status={status?.text ? status : null}
    />
  );
}
