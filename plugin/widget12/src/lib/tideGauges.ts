// COSPPaC tide gauge climatology from public/tide_gauge.json: per station and
// variable, the Jan-Dec mean cycle in each ENSO phase plus the El Niño minus
// La Niña difference and its per-month significance.
import { withBasePath } from "./basePath";

export type EnsoPhase = "El Niño" | "Neutral" | "La Niña";

export type TideVariable = {
  units: string;
  period: [string, string];
  n_months: number;
  detrended: boolean;
  trend_per_decade?: number;
  value?: string;
  phases: Record<
    EnsoPhase,
    { n_seasons: number; monthly_mean: (number | null)[]; n_months: number[] }
  >;
  el_nino_vs_la_nina: {
    difference: (number | null)[];
    p_value: (number | null)[];
    significant_p05: boolean[];
  };
};

export type TideStation = {
  station: string;
  site: string;
  station_id: string;
  /** lon in degrees east, 0-360. */
  coordinates: { lon: number; lat: number };
  variables: Record<string, TideVariable>;
};

export type TideGaugeData = {
  description?: string;
  months: string[];
  tide_gauge: Record<string, TideStation>;
  sources?: Record<string, string>;
};

/**
 * Variables plotted, in order (the first is open by default), with their
 * display names and the words used in their summary for a higher / lower
 * value.
 */
export const TIDE_VARIABLES: {
  key: string;
  label: string;
  more: string;
  less: string;
}[] = [
  {
    key: "wind_speed",
    label: "Trade winds",
    more: "stronger",
    less: "weaker",
  },
  { key: "sea_level", label: "Sea level", more: "higher", less: "lower" },
  {
    key: "water_temperature",
    label: "SST",
    more: "warmer",
    less: "cooler",
  },
  {
    key: "air_temperature",
    label: "Air temperature",
    more: "warmer",
    less: "cooler",
  },
  { key: "pressure", label: "Air pressure", more: "higher", less: "lower" },
];

const round = (v: number) => Number(v.toFixed(Math.abs(v) < 1 ? 2 : 1));

/** "Nov–Apr, Jul": significant months as ranges, wrapping Dec into Jan. */
function monthRanges(sig: boolean[], months: string[]) {
  const ranges: [number, number][] = [];
  sig.forEach((s, i) => {
    if (!s) return;
    const last = ranges[ranges.length - 1];
    if (last && last[1] === i - 1) last[1] = i;
    else ranges.push([i, i]);
  });
  // A run ending in Dec continues into one starting in Jan.
  if (
    ranges.length > 1 &&
    ranges[0][0] === 0 &&
    ranges[ranges.length - 1][1] === sig.length - 1
  ) {
    const first = ranges.shift()!;
    ranges[ranges.length - 1][1] = first[1];
  }
  return ranges
    .map(([a, b]) => (a === b ? months[a] : `${months[a]}–${months[b]}`))
    .join(", ");
}

/**
 * Plain-language summary of El Niño vs La Niña for one variable: which phase
 * is higher (in the variable's own words), by how much on average, and in
 * which months the difference is significant.
 */
export function describeVariable(
  variable: TideVariable,
  words: { label: string; more: string; less: string },
  months: string[],
) {
  const { difference, significant_p05 } = variable.el_nino_vs_la_nina;
  const diffs = difference.filter((v): v is number => v !== null);
  if (!diffs.length) return null;
  const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  // Significant months that agree with the overall direction.
  const sig = significant_p05.map(
    (s, i) => s && difference[i] !== null && difference[i]! * mean > 0,
  );
  const nSig = sig.filter(Boolean).length;
  // Lower-case for mid-sentence, but keep acronyms like SST.
  const name =
    words.label === words.label.toUpperCase()
      ? words.label
      : words.label.toLowerCase();
  if (nSig === 0 || round(mean) === 0) {
    return {
      elNino: null,
      laNina: null,
      text: `Little difference in ${name} between El Niño and La Niña years.`,
    };
  }
  const elNinoWord = mean > 0 ? words.more : words.less;
  const laNinaWord = mean > 0 ? words.less : words.more;
  return {
    elNino: elNinoWord,
    laNina: laNinaWord,
    text: `About ${Math.abs(round(mean))} ${variable.units} ${elNinoWord} in El Niño years than in La Niña years, mostly ${monthRanges(sig, months)}.`,
  };
}

let cache: Promise<TideGaugeData> | null = null;
/** Load (once) public/tide_gauge.json. */
export const loadTideGauges = () =>
  (cache ??= fetch(withBasePath("/tide_gauge.json")).then((r) => {
    if (!r.ok) throw new Error(`tide_gauge.json: ${r.status}`);
    return r.json();
  }));

/** Station shown before the reader picks one. */
const DEFAULT_STATION = "Tonga";

/** DEFAULT_STATION, or the first in the file if it's missing. */
export const defaultStation = (data: TideGaugeData) =>
  DEFAULT_STATION in data.tide_gauge
    ? DEFAULT_STATION
    : (Object.keys(data.tide_gauge)[0] ?? null);
