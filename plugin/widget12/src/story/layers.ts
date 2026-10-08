// Layers available in the workbench and story, in workbench order.
// Story chapters (story.json) refer to these by `id`.
import type { ZarrLayerConfig } from "@/lib/zarr/zarrOverlay";
import type { ZarrExtra } from "@/components/ZarrLayerControl";
import type { TimeStep } from "@/lib/time";
import { withBasePath } from "@/lib/basePath";

// Workbench sections, in order. Each layer names its `group`. Only one layer
// is on at a time, across all groups (radio buttons; see showLayer).
export const LAYER_GROUPS = [
  { id: "current", title: "Current Conditions" },
  { id: "outlook", title: "Outlook" },
  { id: "impact", title: "Impact" },
] as const;

export type LayerGroupId = (typeof LAYER_GROUPS)[number]["id"];

export type StoryLayer = {
  /** Workbench section this layer is listed under. */
  group: LayerGroupId;
  /**
   * Timestep shown when the layer opens (and after Animate stops). Defaults to
   * "first" for outlooks (the nearest forecast) and "latest" otherwise.
   */
  defaultTime?: "first" | "latest";
} & (
  | {
      id: string;
      /** WMS layer from the SPC ocean middleware (title, times and legend come from it). */
      kind: "wms";
      middlewareId: number;
    }
  | {
      id: string;
      /**
       * Countries' EEZs shaded by a status from public/drought.json (its
       * `layers[droughtKey]`), over the shapes in public/pacific-eez.json.
       */
      kind: "eez";
      /** Shown until drought.json loads (then its layer title is used). */
      title: string;
      droughtKey: string;
    }
  | {
      id: string;
      /** Zarr dataset rendered client-side with deck.gl. */
      kind: "zarr";
      title: string;
      step: TimeStep;
      legendUrl?: string;
      /** Show the ENSO gauge (public/enso.json) for this layer's month while it's on. */
      ensoGauge?: boolean;
      /** Show the relative Niño3.4 outlook card (BOM + NOAA RONI) while it's on. */
      ninoOutlook?: boolean;
      /** Label irregular monthly timesteps as the 15th of their month. */
      midMonth?: boolean;
      /** step "custom": label for each timestep, in order (e.g. "4 weeks"). */
      stepLabels?: string[];
      zarr: ZarrLayerConfig;
      /**
       * More variables drawn on top, sharing visibility and time (e.g.
       * contours). An extra with `toggle` gets its own checkbox in the card.
       */
      extras?: ZarrExtra[];
      /** Heading for the extras' checkboxes. */
      togglesTitle?: string;
      /** Legend keys for the extras, shown under the legend image. */
      legendItems?: { label: string; color: string }[];
    }
);

const SPC_ZARR = "https://s3.ap-southeast-2.wasabisys.com/spc-zarr-file/";

// Ocean portal SST anomaly legend (RdBu_r, -4 to 4 °C).
const SST_ANOMALY_LEGEND =
  "https://ocean-plotter.spc.int/plotter/GetLegendGraphic?layer_map=38&mode=standard&min_color=-4&max_color=4&step=1&color=RdBu_r&unit=%C2%B0C&no_zero=True";

// Portal-style legend: PuOr_r, -300 to 300 mm, ticks every 100.
const SEA_LEVEL_ANOMALY_LEGEND =
  "https://ocean-plotter.spc.int/plotter/GetLegendGraphic?layer_map=38&mode=standard&min_color=-300&max_color=300&step=100&color=PuOr_r&unit=mm";

// Marine heatwave category legend (No heatwave → Beyond Extreme).
const MARINE_HEATWAVE_LEGEND =
  "https://ocean-plotter.spc.int/plotter/GetLegendGraphic?layer_map=30&mode=marine_heat_wave&min_color=7.8&max_color=8.2&step=0.05&color=jet&unit=pH";

// Coral bleaching alert legend (No Stress → Alert Level 2).
const CORAL_BLEACHING_LEGEND =
  "https://ocean-plotter.spc.int/plotter/GetLegendGraphic?layer_map=4&mode=coral_bleaching&min_color=32.5&max_color=37.0&step=0.5&color=jet&unit=ppt";

// Chlorophyll legend: jet, 0.01 to 11 mg m-3.
const CHLOROPHYLL_LEGEND =
  "https://ocean-plotter.spc.int/plotter/GetLegendGraphic?layer_map=8&mode=standard&min_color=0.01&max_color=11&step=1&color=jet&unit=mg-m%C2%B3";

// Fisheries SST legend: jet, 0 to 33 °C.
const FISHERIES_SST_LEGEND =
  "https://ocean-plotter.spc.int/plotter/GetLegendGraphic?layer_map=18&mode=standard&min_color=0&max_color=33&step=2&color=jet&unit=%C2%B0C";

const TUNA_ZONE_COLOR = "#7e22ce"; // purple: current 29 °C (tuna convergence zone)
const CLIM_29C_COLOR = "#16a34a"; // green: climatological 29 °C

/**
 * Species temperature zone: where sst_total is within [min, max], filled with
 * a dashed hatch (one angle per species, so overlaps stay readable) and edged
 * with a solid line, with an on/off checkbox. Colours avoid the jet ramp.
 */
function speciesZone(
  id: string,
  label: string,
  min: number,
  max: number,
  color: string,
  drawOrder: number,
  hatch: "diagonal" | "antidiagonal" | "horizontal" | "vertical",
): ZarrExtra {
  return {
    id,
    name: label,
    datasetName: "fisheries.zarr",
    zarrBaseUrl: SPC_ZARR,
    heightVariable: "sst_total",
    zone: { min, max, hatch },
    categoryColors: [null, color],
    dilate: 1,
    opacity: 1,
    drawOrder,
    showArrows: false,
    autoFit: false,
    // Disabled for now: shown greyed out, can't be ticked.
    toggle: { label: `${label} (${min}–${max} °C)`, color, disabled: true },
  };
}

// Coral bleaching outlook legend (No Stress → Alert Level 2).
const CORAL_BLEACHING_OUTLOOK_LEGEND =
  "https://ocean-plotter.spc.int/plotter/GetLegendGraphic?layer_map=19&mode=coral_bleaching&min_color=0&max_color=33&step=2&color=jet&unit=m";

/** Radio-button group shared by every layer card (one layer on at a time). */
export const LAYER_RADIO_GROUP = "story-layers";

/**
 * Layers on after switching `id` on: only `id`, as one layer is shown at a
 * time. (Takes the current list so it can be used as a state updater/reducer.)
 */
export function showLayer(visible: string[], id: string): string[] {
  return [id];
}

/** Timestep a layer opens on: see StoryLayer.defaultTime. */
export function layerDefaultTime(layer: StoryLayer): "first" | "latest" {
  return layer.defaultTime ?? (layer.group === "outlook" ? "first" : "latest");
}

export const STORY_LAYERS: StoryLayer[] = [
  {
    id: "sst-anomaly-monthly",
    group: "current",
    kind: "zarr",
    title: "Sea Surface Temperature Anomalies - Monthly",
    step: "monthly",
    legendUrl: SST_ANOMALY_LEGEND,
    ensoGauge: true,
    zarr: {
      id: "sst-anomaly-monthly",
      name: "Sea Surface Temperature Anomalies - Monthly",
      datasetName: "sst_anomalies.zarr",
      zarrBaseUrl: SPC_ZARR,
      heightVariable: "anom",
      colorRange: { min: -4, max: 4 },
      colormap: "rdbu-r",
      showRaster: true,
      showArrows: false,
      autoFit: false, // the story controls the camera
    },
  },
  {
    id: "sea-level-anomaly-monthly",
    group: "current",
    kind: "zarr",
    title: "Sea Level Anomalies - Monthly",
    step: "monthly",
    legendUrl: SEA_LEVEL_ANOMALY_LEGEND,
    zarr: {
      id: "sea-level-anomaly-monthly",
      name: "Sea Level Anomalies - Monthly",
      datasetName: "ssh.zarr",
      zarrBaseUrl: SPC_ZARR,
      heightVariable: "sla", // mm
      colorRange: { min: -300, max: 300 },
      colormap: "puor-r",
      showRaster: true,
      showArrows: false,
      autoFit: false,
    },
  },
  {
    id: "coral-bleaching-monthly",
    group: "current",
    kind: "zarr",
    title: "Coral Bleaching Alert - Daily",
    // Date picker rather than month/year selects: each step is a single day.
    step: "daily",
    // One day per month (usually the 15th, a few exceptions): show as mid-month.
    midMonth: true,
    legendUrl: CORAL_BLEACHING_LEGEND,
    zarr: {
      id: "coral-bleaching-monthly",
      name: "Coral Bleaching Alert - Daily",
      datasetName: "coral_bleaching.zarr",
      zarrBaseUrl: SPC_ZARR,
      heightVariable: "bleaching_alert_area",
      // 0 no stress, 1 watch, 2 warning, 3 alert level 1, 4 alert level 2
      categoryColors: ["#ADD8E6", "#FFFF00", "#FFA500", "#FF0000", "#800000"],
      showRaster: true,
      showArrows: false,
      autoFit: false,
    },
  },
  {
    id: "marine-heatwave-daily",
    group: "current",
    kind: "zarr",
    title: "Marine Heatwave - Daily",
    step: "daily",
    legendUrl: MARINE_HEATWAVE_LEGEND,
    zarr: {
      id: "marine-heatwave-daily",
      name: "Marine Heatwave - Daily",
      datasetName: "mhw.zarr",
      zarrBaseUrl: SPC_ZARR,
      heightVariable: "heatwave_category",
      // 0 none, 1 moderate, 2 strong, 3 severe, 4 extreme, 5 beyond extreme
      categoryColors: [
        "#b3f3ff",
        "#fcff7f",
        "#f7b333",
        "#f68101",
        "#cc4c00",
        "#981900",
      ],
      showRaster: true,
      showArrows: false,
      autoFit: false,
    },
  },
  {
    id: "chlorophyll-monthly",
    group: "current",
    kind: "zarr",
    title: "Chlorophyll-a - Monthly",
    step: "monthly",
    legendUrl: CHLOROPHYLL_LEGEND,
    zarr: {
      id: "chlorophyll-monthly",
      name: "Chlorophyll-a - Monthly",
      datasetName: "chlorophyll_map.zarr", // 2x2-averaged, one chunk per month
      zarrBaseUrl: SPC_ZARR,
      heightVariable: "chlor_a", // mg m-3
      colorRange: { min: 0.01, max: 10 },
      logScale: true,
      colormap: "jet",
      showRaster: true,
      showArrows: false,
      autoFit: false,
    },
  },
  {
    id: "seasonal-sst-outlook",
    group: "outlook",
    kind: "zarr",
    title: "Seasonal SST Anomaly Outlook",
    // 3-month means stamped with their centre month: shown as season ranges.
    step: "seasonal",
    ninoOutlook: true,
    // Same scale as the observed SST anomalies: RdBu_r, -4 to 4 °C, step 1.
    legendUrl: SST_ANOMALY_LEGEND,
    zarr: {
      id: "seasonal-sst-outlook",
      name: "Seasonal SST Anomaly Outlook (ACCESS-S2)",
      datasetName: "seasonal_sst.zarr",
      zarrBaseUrl: SPC_ZARR,
      heightVariable: "sst", // ensemble-mean anomaly, °C
      colorRange: { min: -4, max: 4 },
      colormap: "rdbu-r",
      showRaster: true,
      showArrows: false,
      autoFit: false,
    },
  },
  {
    id: "seasonal-ssh-outlook",
    group: "outlook",
    kind: "zarr",
    title: "Seasonal Sea Level Anomaly Outlook",
    // 3-month means stamped with their centre month: shown as season ranges.
    step: "seasonal",
    // Same scale as the observed sea level anomalies: PuOr_r, -300 to 300 mm, step 100.
    legendUrl: SEA_LEVEL_ANOMALY_LEGEND,
    zarr: {
      id: "seasonal-ssh-outlook",
      name: "Seasonal Sea Level Anomaly Outlook (ACCESS-S2)",
      datasetName: "ssh_seasonal.zarr",
      zarrBaseUrl: SPC_ZARR,
      heightVariable: "ssh_corrected", // ensemble-mean anomaly, mm
      colorRange: { min: -300, max: 300 },
      colormap: "puor-r",
      showRaster: true,
      showArrows: false,
      autoFit: false,
    },
  },
  {
    id: "coral-bleaching-outlook",
    group: "outlook",
    kind: "zarr",
    title: "Coral Bleaching Alert Outlook",
    // Four outlook steps, 4 weeks apart from the forecast start.
    step: "custom",
    stepLabels: ["4 weeks", "8 weeks", "12 weeks", "16 weeks"],
    legendUrl: CORAL_BLEACHING_OUTLOOK_LEGEND,
    zarr: {
      id: "coral-bleaching-outlook",
      name: "Coral Bleaching Alert Outlook (NOAA CRW, CFSv2)",
      datasetName: "coral_bleaching_outlook.zarr",
      zarrBaseUrl: SPC_ZARR,
      heightVariable: "CRW_BAA", // predicted alert level at 60% probability
      // 0 no stress, 1 watch, 2 warning, 3 alert level 1, 4 alert level 2
      categoryColors: ["#ADD8E6", "#FFFF00", "#FFA500", "#FF0000", "#800000"],
      showRaster: true,
      showArrows: false,
      autoFit: false,
    },
  },
  {
    id: "rainfall-outlook",
    group: "outlook",
    kind: "zarr",
    title: "Rainfall Anomaly Outlook - Monthly",
    step: "monthly",
    // Colour bar supplied with the dataset (public/legends).
    legendUrl: withBasePath("/legends/rain_forecast_anom.png"),
    zarr: {
      id: "rainfall-outlook",
      name: "Rainfall Anomaly Outlook (ACCESS-S2)",
      datasetName: "rain_forecast_anom.zarr",
      zarrBaseUrl: SPC_ZARR,
      heightVariable: "rain", // ensemble-mean anomaly, mm
      // Bins and colours from the legend: browns dry, white near normal,
      // teals wet; the outer colours are the legend's end arrows.
      levels: {
        bounds: [-200, -100, -50, -25, -10, -5, 5, 10, 25, 50, 100, 200],
        colors: [
          "#8d5127",
          "#a96a3c",
          "#bd8962",
          "#cfa88b",
          "#e2c9b7",
          "#f0e9e4",
          "#ffffff",
          "#cde6e5",
          "#9dcfcf",
          "#70b8b8",
          "#43a2a2",
          "#108d8d",
          "#126f6e",
        ],
      },
      showRaster: true,
      showArrows: false,
      autoFit: false,
    },
  },
  {
    id: "fisheries-monthly",
    group: "outlook",
    kind: "zarr",
    title: "Fisheries - Tuna Convergence Zone",
    step: "monthly",
    legendUrl: FISHERIES_SST_LEGEND,
    togglesTitle: "Show on map",
    zarr: {
      id: "fisheries-sst",
      name: "Total sea surface temperature",
      datasetName: "fisheries.zarr",
      zarrBaseUrl: SPC_ZARR,
      heightVariable: "sst_total", // °C
      colorRange: { min: 0, max: 32 },
      colormap: "jet",
      showRaster: true,
      showArrows: false,
      autoFit: false,
    },
    extras: [
      // 29 °C contour masks (1 on the contour, 0 elsewhere), drawn as lines.
      {
        id: "fisheries-current-29c",
        name: "Tuna convergence zone (current 29 °C)",
        datasetName: "fisheries.zarr",
        zarrBaseUrl: SPC_ZARR,
        heightVariable: "current_29C",
        categoryColors: [null, TUNA_ZONE_COLOR],
        dilate: 1,
        opacity: 1,
        drawOrder: 2,
        showArrows: false,
        autoFit: false,
        toggle: {
          label: "Tuna convergence zone (29 °C)",
          color: TUNA_ZONE_COLOR,
          defaultOn: true,
        },
      },
      {
        id: "fisheries-clim-29c",
        name: "Climatology 29 °C",
        datasetName: "fisheries.zarr",
        zarrBaseUrl: SPC_ZARR,
        heightVariable: "clim_29C",
        categoryColors: [null, CLIM_29C_COLOR],
        dilate: 1,
        opacity: 1,
        drawOrder: 1,
        showArrows: false,
        autoFit: false,
        toggle: {
          label: "Climatology 29 °C",
          color: CLIM_29C_COLOR,
          defaultOn: true,
        },
      },
      // Species temperature zones (off until ticked).
      speciesZone(
        "fisheries-zone-skj-yft",
        "Skipjack / Yellowfin",
        20,
        29,
        "#111827",
        3,
        "diagonal",
      ),
      speciesZone(
        "fisheries-zone-bigeye",
        "Bigeye",
        13,
        27,
        "#ffffff",
        3,
        "antidiagonal",
      ),
      speciesZone(
        "fisheries-zone-albacore",
        "Albacore",
        15,
        21,
        "#d946ef",
        3,
        "horizontal",
      ),
      speciesZone(
        "fisheries-zone-southern",
        "Southern bluefin",
        17,
        20,
        "#92400e",
        3,
        "vertical",
      ),
    ],
  },
  // Impact: EEZs shaded by drought status (public/drought.json).
  {
    id: "drought-meteorological",
    group: "impact",
    kind: "eez",
    title: "Meteorological Drought",
    droughtKey: "meteorological",
  },
  {
    id: "drought-agricultural",
    group: "impact",
    kind: "eez",
    title: "Agricultural Drought",
    droughtKey: "agricultural",
  },
];
