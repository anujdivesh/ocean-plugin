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

// EEZs shaded by a per-country status from a config file (public/drought.json
// or public/enso-impacts.json), over the shapes in public/pacific-eez.json
// (built by scripts/build-eez.mjs).

type Category = { id: string; label: string; color: string };
type EezLayer = {
  title: string;
  categories: Category[];
  /** Country code -> category id. */
  countries: Record<string, string>;
  /** Report themes listed in the popup (enso-impacts.json `themes`). */
  impactThemes?: string[];
};
type EezConfig = {
  updated?: string;
  note?: string;
  /** Fill and legend entry for countries a layer doesn't list. */
  noInfo?: { label: string; color: string };
  layers: Record<string, EezLayer>;
};

const EEZ_SOURCE = "pacific-eez";
const NO_FILL = "rgba(0, 0, 0, 0)";
const DEFAULT_CONFIG = "/drought.json";
/** Used when the config has no `noInfo`: unlisted countries left unshaded. */
const DEFAULT_NO_INFO = { label: "No data", color: NO_FILL };

/** One report listed in a popup. */
type Impact = {
  title: string;
  month: string; // "YYYY-MM"
  source: string | null;
  link: string | null;
  location?: string | null;
  /** Social media / monitoring chat: not checked against an official source. */
  unverified?: boolean;
};
/** COSPPac impact log: drought-related entries (scripts/build_impacts.py). */
type DroughtImpacts = { source: string; countries: Record<string, Impact[]> };
/** Pacific Hazards & Impacts register: ENSO-related reports by theme. */
type RegisterImpacts = {
  source: string;
  impacts: Record<string, (Impact & { themes: string[] })[]>;
};

/** Impacts listed in a popup; the rest are counted. */
const POPUP_IMPACTS = 3;
const MONTH_YEAR = new Intl.DateTimeFormat("en", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const jsonCache = new Map<string, Promise<unknown>>();
/** Load (once per path) a public JSON file; null if it's missing. */
function loadOptional<T>(path: string): Promise<T | null> {
  if (!jsonCache.has(path))
    jsonCache.set(
      path,
      fetch(withBasePath(path))
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    );
  return jsonCache.get(path) as Promise<T | null>;
}

/**
 * A country's reports for a layer, newest first: register reports in the
 * layer's themes, plus the COSPPac log for drought. Also the sources used.
 */
async function impactsFor(code: string, themes: string[]) {
  if (!themes.length) return { impacts: [], sources: [] };
  const [register, drought] = await Promise.all([
    loadOptional<RegisterImpacts>("/enso-impacts.json"),
    themes.includes("drought")
      ? loadOptional<DroughtImpacts>("/drought-impacts.json")
      : null,
  ]);
  const fromRegister = (register?.impacts[code] ?? []).filter((i) =>
    i.themes.some((t) => themes.includes(t)),
  );
  const fromLog = drought?.countries[code] ?? [];
  return {
    impacts: [...fromRegister, ...fromLog].sort((a, b) =>
      b.month.localeCompare(a.month),
    ),
    sources: [
      fromRegister.length && register?.source,
      fromLog.length && drought?.source,
    ].filter((s): s is string => !!s),
  };
}

/** Popup body: country, this layer's status, then its recent reports. */
function popupContent(
  name: string,
  layerTitle: string,
  status: string,
  impacts: Impact[],
  sources: string[],
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
  label.textContent = `Recent reports (${impacts.length})`;
  const list = document.createElement("ul");
  list.className = styles.impacts;
  for (const impact of impacts.slice(0, POPUP_IMPACTS)) {
    const item = document.createElement("li");
    const when = document.createElement("span");
    when.className = styles.impactMonth;
    when.textContent = [
      MONTH_YEAR.format(new Date(`${impact.month}-01T00:00:00Z`)),
      impact.location,
    ]
      .filter(Boolean)
      .join(" · ");
    const title = document.createElement(impact.link ? "a" : "span");
    title.textContent = impact.title;
    if (impact.link && title instanceof HTMLAnchorElement) {
      title.href = impact.link;
      title.target = "_blank";
      title.rel = "noopener noreferrer";
    }
    item.append(when, title);
    const by = [impact.source, impact.unverified && "unverified"]
      .filter(Boolean)
      .join(", ");
    if (by) {
      const span = document.createElement("span");
      span.className = styles.impactSource;
      span.textContent = ` · ${by}`;
      item.append(span);
    }
    list.append(item);
  }
  el.append(label, list);
  const more = impacts.length - POPUP_IMPACTS;
  if (more > 0 || sources.length) {
    const foot = document.createElement("p");
    foot.className = styles.impactsFoot;
    foot.textContent = [more > 0 && `+${more} more`, ...sources]
      .filter(Boolean)
      .join(" · ");
    el.append(foot);
  }
  return el;
}

const configCache = new Map<string, Promise<EezConfig>>();
const loadConfig = (path: string) => {
  if (!configCache.has(path))
    configCache.set(
      path,
      fetch(withBasePath(path)).then((r) => {
        if (!r.ok) throw new Error(`${path.slice(1)}: ${r.status}`);
        return r.json();
      }),
    );
  return configCache.get(path)!;
};

type Props = {
  map: MaplibreMap | null;
  /** Workbench title until the config loads. */
  title: string;
  /** Public JSON holding the layer (default /drought.json). */
  config?: string;
  /** Key of this layer in the config's `layers`. */
  layerKey: string;
  visible: boolean;
  onVisibleChange?: (visible: boolean) => void;
  /** Radio group name when only one layer of its group can be on. */
  radioGroup?: string;
};

/** Fill colour per feature: its country's category colour, else `fallback`. */
function fillColor(
  layer: EezLayer,
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
  config: configPath = DEFAULT_CONFIG,
  layerKey,
  visible,
  onVisibleChange,
  radioGroup,
}: Props) {
  const [config, setConfig] = useState<EezConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const layer = config?.layers[layerKey];
  const noInfo = config?.noInfo ?? DEFAULT_NO_INFO;
  // Drought layers keep their original ids ("drought-<key>").
  const layerId =
    configPath === DEFAULT_CONFIG ? `drought-${layerKey}` : `eez-${layerKey}`;

  useEffect(() => {
    loadConfig(configPath)
      .then((c) => {
        setConfig(c);
        if (!c.layers[layerKey])
          setError(`No "${layerKey}" layer in ${configPath.slice(1)}`);
      })
      .catch((e: Error) => setError(e.message));
  }, [configPath, layerKey]);

  // Add the fill once the config is in; remove it on unmount. The EEZ source
  // is shared by every EEZ layer and left on the map.
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

    // Click an EEZ for its country, status and recent reports.
    const labels = new Map(layer.categories.map((c) => [c.id, c.label]));
    const onClick = async (e: MapLayerMouseEvent) => {
      const props = e.features?.[0]?.properties;
      if (!props) return;
      const status = labels.get(layer.countries[props.code]) ?? noInfo.label;
      const { impacts, sources } = await impactsFor(
        props.code,
        layer.impactThemes ?? [],
      );
      const el = popupContent(
        props.name,
        layer.title,
        status,
        impacts,
        sources,
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
