"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  ENSO_CHART_MONTHS,
  ENSO_INDICES,
  ENSO_STATUS_INFO,
} from "@/story/ensoIndices";
import styles from "./EnsoGauge.module.css";
import { withBasePath } from "@/lib/basePath";

// ENSO state per month, read from /public/enso.json:
// {
//   "thresholds": { "laNina": -0.5, "elNino": 0.5 },   // index thresholds
//   "range": [-2.5, 2.5],                              // dial extent
//   "units": "°C",
//   "months": { "2015-12": 2.64, ... }                 // "YYYY-MM": index value
// }
// Works for indices in either direction: ONI-style (El Niño high, laNina <
// elNino) or SOI-style (El Niño low, laNina > elNino, e.g. +7 / -7). The dial
// always draws La Niña on the left and El Niño on the right.
// A month may also be { "value": 1.2, "category": "elNino" } to override the
// category the thresholds would give.
export type EnsoCategory = "laNina" | "neutral" | "elNino";
type Category = EnsoCategory;
type MonthEntry = number | { value?: number; category?: Category };
export type EnsoData = {
  thresholds: { laNina: number; elNino: number };
  range: [number, number];
  units?: string;
  source?: string;
  months: Record<string, MonthEntry>;
};

// Band colours match the outlook dial's end and middle bands. `ink` colours
// the state written under a dial (grey neutral would be unreadable as text).
export const ENSO_CATEGORY: Record<
  Category,
  { label: string; color: string; ink: string }
> = {
  laNina: { label: "La Niña", color: "#1d3461", ink: "#1d3461" },
  neutral: { label: "Neutral", color: "#e5e7eb", ink: "#4b5563" },
  elNino: { label: "El Niño", color: "#8b2f35", ink: "#8b2f35" },
};


// Dial geometry (SVG units): semicircle centred at (CX, CY).
const CX = 100;
const CY = 100;
const R = 78;
const WIDTH = 30;
// Arrow pointing left (at `min`), drawn around its pivot at (0, 0); it is
// translated to the dial centre and rotated to the value.
const ARROW_TIP = R - WIDTH / 2 - 4;
const ARROW_POINTS = [
  [-ARROW_TIP, 0],
  [-ARROW_TIP + 18, -10],
  [-ARROW_TIP + 18, -3.5],
  [10, -3.5],
  [10, 3.5],
  [-ARROW_TIP + 18, 3.5],
  [-ARROW_TIP + 18, 10],
]
  .map((p) => p.join(","))
  .join(" ");

// Used until enso.json has loaded (or if it fails).
const DEFAULT_RANGE: [number, number] = [-2.5, 2.5];
const DEFAULT_THRESHOLDS = { laNina: -0.5, elNino: 0.5 };

type Thresholds = { laNina: number; elNino: number };

/**
 * Share of the dial taken by the Neutral band on every three-band dial
 * (Niño3.4's ±0.8 of ±3.0), so dials for indices on different scales match.
 */
const NEUTRAL_FRACTION = 1.6 / 6;

/** Category for an index value, for either index direction. */
function classify(value: number, t: Thresholds): Category {
  const elNinoHigh = t.laNina < t.elNino;
  if (elNinoHigh ? value <= t.laNina : value >= t.laNina) return "laNina";
  if (elNinoHigh ? value >= t.elNino : value <= t.elNino) return "elNino";
  return "neutral";
}

const cache = new Map<string, Promise<EnsoData>>();
/** Load (once) an index file from /public. */
export const loadIndex = (url: string) => {
  let p = cache.get(url);
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`${url}: ${r.status}`);
      return r.json();
    });
    cache.set(url, p);
  }
  return p;
};

/** Value and category for a "YYYY-MM" month. */
function readMonth(data: EnsoData, month: string) {
  const entry = data.months[month];
  const value = typeof entry === "number" ? entry : entry?.value;
  const category: Category | null =
    (typeof entry === "object" && entry.category) ||
    (value === undefined ? null : classify(value, data.thresholds));
  return { value, category };
}

/**
 * Like readMonth, but when `month` is newer than the index's latest month
 * (the index files lag the SST data), falls back to that latest month.
 * `month` in the result is the month actually shown.
 */
function readMonthOrLatest(data: EnsoData, month: string) {
  const own = readMonth(data, month);
  if (own.category) return { ...own, month };
  const latest = Object.keys(data.months).sort().at(-1);
  if (latest && latest < month)
    return { ...readMonth(data, latest), month: latest };
  return { ...own, month };
}

/** 850 hPa trade wind anomalies (m/s) by "YYYY-MM", from /api/trade-winds. */
type TradeWinds = {
  west: Record<string, number>;
  central: Record<string, number>;
};

// Trade wind bars: blue for stronger trades (La Niña-like), red for weaker
// (El Niño-like); lighter for the West Pacific, darker for the Central.
const TRADE_COLORS = {
  west: { stronger: "#8fa6c8", weaker: "#d99a9f" },
  central: {
    stronger: ENSO_CATEGORY.laNina.color,
    weaker: ENSO_CATEGORY.elNino.color,
  },
};

let tradeWindsCache: Promise<TradeWinds> | null = null;
/** Load (once) the trade wind anomalies. */
const loadTradeWinds = () =>
  (tradeWindsCache ??= fetch(withBasePath("/api/trade-winds")).then((r) => {
    if (!r.ok) throw new Error(`trade winds: ${r.status}`);
    return r.json();
  }));

const monthIndex = (ym: string) =>
  Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7)) - 1;
const monthKey = (i: number) =>
  `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`;
const SHORT_MONTH_FMT = new Intl.DateTimeFormat("en", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const formatMonth = (i: number) =>
  SHORT_MONTH_FMT.format(new Date(Date.UTC(Math.floor(i / 12), i % 12, 1)));

/**
 * ENSO panel for `time`'s month: a dial per index (e.g. Atmosphere - SOI,
 * Ocean - Niño3.4) and a monthly bar chart per index with that month highlighted.
 */
export default function EnsoGauge({ time }: { time: string | null }) {
  const [indices, setIndices] = useState<(EnsoData | null)[] | null>(null);
  // Trade winds: undefined while loading, null if they couldn't be loaded.
  const [tradeWinds, setTradeWinds] = useState<TradeWinds | null>();
  const [open, setOpen] = useState(true);
  // Info (ⓘ) popup; closes on Escape or a click outside it and its button.
  const [infoOpen, setInfoOpen] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);
  const infoButtonRef = useRef<HTMLButtonElement>(null);
  const infoId = useId();

  useEffect(() => {
    if (!infoOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (infoRef.current?.contains(t) || infoButtonRef.current?.contains(t))
        return;
      setInfoOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInfoOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [infoOpen]);

  useEffect(() => {
    Promise.all(
      ENSO_INDICES.map((ix) => loadIndex(ix.url).catch(() => null)),
    ).then(setIndices);
    loadTradeWinds()
      .then(setTradeWinds)
      .catch(() => setTradeWinds(null));
  }, []);

  if (!indices || !time) return null;

  const month = time.slice(0, 7);
  const current = monthIndex(month);

  // One shared window for all charts so their bars line up: pages of
  // ENSO_CHART_MONTHS ending at the latest month in any index file, or at the
  // selected month when the map is ahead of the index files.
  const latest = Math.max(
    current,
    ...indices.flatMap((d) => (d ? Object.keys(d.months).map(monthIndex) : [])),
  );
  const page = Math.floor((latest - current) / ENSO_CHART_MONTHS);
  const windowEnd = latest - page * ENSO_CHART_MONTHS;
  const windowStart = windowEnd - ENSO_CHART_MONTHS + 1;

  // Combined state: El Niño / La Niña only when every index agrees (both the
  // atmosphere and ocean thresholds are met); otherwise Neutral. Unknown if
  // any index has no value this month.
  const reads = indices.map((d) => (d ? readMonthOrLatest(d, month) : null));
  const states = reads.map((r) => r?.category ?? null);
  const combined: Category | null = states.some((c) => !c)
    ? null
    : states.every((c) => c === "elNino")
      ? "elNino"
      : states.every((c) => c === "laNina")
        ? "laNina"
        : "neutral";

  return (
    <aside className={styles.card} aria-label="ENSO status">
      {/* Header toggles the panel; collapsed it shows the combined state only.
          The info button sits between the title and the chevron, so both
          are their own toggle buttons (buttons can't nest). */}
      <div className={styles.header}>
        <button
          className={styles.headerToggle}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <span className={styles.logo} role="img" aria-label="COSPPaC" />
          <span className={styles.headerText}>
            <span className={styles.title}>ENSO status</span>
          </span>
          {!open && combined && (
            <span
              className={styles.headerState}
              style={{ color: ENSO_CATEGORY[combined].ink }}
            >
              {ENSO_CATEGORY[combined].label}
            </span>
          )}
        </button>
        <button
          ref={infoButtonRef}
          className={`${styles.infoButton} ${infoOpen ? styles.infoButtonOn : ""}`}
          onClick={() => setInfoOpen((o) => !o)}
          aria-label="About ENSO alert stages"
          aria-expanded={infoOpen}
          aria-controls={infoId}
        >
          i
        </button>
        <button
          className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Collapse ENSO status" : "Expand ENSO status"}
          aria-expanded={open}
        >
          ›
        </button>
      </div>

      {infoOpen && (
        <div
          ref={infoRef}
          id={infoId}
          className={styles.infoPopup}
          role="dialog"
          aria-label={ENSO_STATUS_INFO.title}
        >
          <div className={styles.infoHeader}>
            <h3 className={styles.infoTitle}>{ENSO_STATUS_INFO.title}</h3>
            <button
              className={styles.infoClose}
              onClick={() => setInfoOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          {ENSO_STATUS_INFO.paragraphs.map((p) => (
            <p key={p} className={styles.infoText}>
              {p}
            </p>
          ))}
          <p className={styles.infoSource}>
            Source:{" "}
            {ENSO_STATUS_INFO.source.url ? (
              <a
                href={ENSO_STATUS_INFO.source.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {ENSO_STATUS_INFO.source.label}
              </a>
            ) : (
              ENSO_STATUS_INFO.source.label
            )}
          </p>
        </div>
      )}

      {open && (
        <>
          {/* Coupled dial: moves only when both indices meet the thresholds. */}
          <section className={styles.combined}>
            <p className={styles.indexLabel}>Coupled (Ocean + Atmosphere)</p>
            <div className={styles.combinedDial}>
              <EnsoDial category={combined} />
            </div>
            {combined ? (
              <p
                className={styles.state}
                style={{ color: ENSO_CATEGORY[combined].ink }}
              >
                {ENSO_CATEGORY[combined].label}
              </p>
            ) : (
              <p className={styles.muted}>No data this month</p>
            )}
          </section>

          {/* One row per index: dial + state on the left, monthly bars on the right. */}
          {ENSO_INDICES.map((ix, i) => {
            const data = indices[i];
            const read = reads[i];
            const value = read?.value;
            const category = read?.category ?? null;
            const shown = read ? monthIndex(read.month) : current;
            return (
              <section key={ix.id} className={styles.indexRow}>
                <p className={styles.indexLabel}>{ix.label}</p>
                {data ? (
                  <div className={styles.rowBody}>
                    <div className={styles.dialCell}>
                      <EnsoDial
                        category={category}
                        value={value}
                        range={data.range}
                        thresholds={data.thresholds}
                        units={data.units}
                      />
                      {category ? (
                        <p
                          className={styles.state}
                          style={{ color: ENSO_CATEGORY[category].ink }}
                        >
                          {ENSO_CATEGORY[category].label}
                        </p>
                      ) : (
                        <p className={styles.muted}>No data this month</p>
                      )}
                    </div>
                    <div className={styles.chartCell}>
                      <IndexBars
                        label={ix.label}
                        data={data}
                        start={windowStart}
                        end={windowEnd}
                        current={shown}
                      />
                      <div className={styles.chartRange}>
                        <span>{formatMonth(windowStart)}</span>
                        <span>{formatMonth(windowEnd)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className={styles.muted}>Couldn&apos;t load {ix.url}</p>
                )}
              </section>
            );
          })}

          {/* Trade winds under SOI: full-width paired monthly bars over the same
              months as the index charts above. */}
          <section className={styles.indexRow}>
            <p className={styles.indexLabel}>Atmosphere - Trade winds</p>
            {tradeWinds ? (
              <>
                <div className={styles.tradeChart}>
                  <TradeWindBars
                    data={tradeWinds}
                    start={windowStart}
                    end={windowEnd}
                    current={current}
                  />
                  <div className={styles.chartRange}>
                    <span>{formatMonth(windowStart)}</span>
                    <span>{formatMonth(windowEnd)}</span>
                  </div>
                </div>
                <ul className={styles.tradeLegend}>
                  {(
                    [
                      ["West", "west"],
                      ["Central", "central"],
                    ] as const
                  ).map(([label, key]) => (
                    <li key={key}>
                      <span
                        className={styles.tradeSwatch}
                        style={{
                          background: `linear-gradient(90deg, ${TRADE_COLORS[key].stronger} 50%, ${TRADE_COLORS[key].weaker} 50%)`,
                        }}
                      />
                      {label}
                    </li>
                  ))}
                  <li>
                    <span style={{ color: TRADE_COLORS.central.stronger }}>
                      Stronger
                    </span>
                    /
                    <span style={{ color: TRADE_COLORS.central.weaker }}>
                      weaker
                    </span>
                    &nbsp;trades
                  </li>
                </ul>
              </>
            ) : (
              <p className={styles.muted}>
                {tradeWinds === null
                  ? "Couldn't load trade winds"
                  : "Loading trade winds…"}
              </p>
            )}
          </section>
        </>
      )}
    </aside>
  );
}

/** Monthly bars for months [start, end], coloured by category, `current` highlighted. */
function IndexBars({
  label,
  data,
  start,
  end,
  current,
}: {
  label: string;
  data: EnsoData;
  start: number;
  end: number;
  current: number;
}) {
  const n = end - start + 1;
  const H = 40;
  // Scale to the largest value in the window (at least past the thresholds)
  // so the bars use the chart's full height.
  let extent =
    Math.max(
      Math.abs(data.thresholds.laNina),
      Math.abs(data.thresholds.elNino),
    ) * 1.5;
  for (let i = start; i <= end; i++) {
    const { value } = readMonth(data, monthKey(i));
    if (value !== undefined) extent = Math.max(extent, Math.abs(value));
  }
  const y = (v: number) =>
    H / 2 - (Math.max(-extent, Math.min(extent, v)) / extent) * (H / 2);

  const bars = [];
  for (let i = start; i <= end; i++) {
    const { value, category } = readMonth(data, monthKey(i));
    if (value === undefined || !category) continue;
    const top = Math.min(y(value), H / 2);
    const isCurrent = i === current;
    bars.push(
      <rect
        key={i}
        x={i - start + 0.1}
        width={0.8}
        y={top}
        height={Math.max(Math.abs(y(value) - H / 2), 0.3)}
        // Neutral bars a shade darker than the dial band so they show on white.
        fill={
          category === "neutral" ? "#c4c8cf" : ENSO_CATEGORY[category].color
        }
        className={isCurrent ? styles.currentBar : undefined}
      />,
    );
  }
  const cx = current - start + 0.5;

  return (
    <div className={styles.chart}>
      <svg
        viewBox={`0 0 ${n} ${H}`}
        preserveAspectRatio="none"
        className={styles.bars}
        role="img"
        aria-label={`${label} monthly index`}
      >
        <line x1={0} x2={n} y1={H / 2} y2={H / 2} className={styles.zero} />
        {bars}
        {current >= start && current <= end && (
          <line x1={cx} x2={cx} y1={0} y2={H} className={styles.marker} />
        )}
      </svg>
    </div>
  );
}

/**
 * Trade wind anomalies for months [start, end]: a West (left) and Central
 * (right) bar per month, blue above zero (stronger trades), red below.
 */
function TradeWindBars({
  data,
  start,
  end,
  current,
}: {
  data: TradeWinds;
  start: number;
  end: number;
  current: number;
}) {
  const n = end - start + 1;
  const H = 40;
  // Symmetric scale to the largest anomaly in the window (at least ±2 m/s).
  let extent = 2;
  for (let i = start; i <= end; i++) {
    for (const v of [data.west[monthKey(i)], data.central[monthKey(i)]]) {
      if (v !== undefined) extent = Math.max(extent, Math.abs(v));
    }
  }
  const y = (v: number) => H / 2 - (v / extent) * (H / 2);

  const bars: React.ReactElement[] = [];
  for (let i = start; i <= end; i++) {
    const key = monthKey(i);
    (["west", "central"] as const).forEach((series, s) => {
      const v = data[series][key];
      if (v === undefined) return;
      bars.push(
        <rect
          key={`${series}-${i}`}
          x={i - start + 0.08 + s * 0.44}
          width={0.4}
          y={Math.min(y(v), H / 2)}
          height={Math.max(Math.abs(y(v) - H / 2), 0.3)}
          fill={TRADE_COLORS[series][v >= 0 ? "stronger" : "weaker"]}
          className={i === current ? styles.currentBar : undefined}
        />,
      );
    });
  }
  const cx = current - start + 0.5;

  return (
    <div className={styles.chart}>
      <svg
        viewBox={`0 0 ${n} ${H}`}
        preserveAspectRatio="none"
        className={styles.bars}
        role="img"
        aria-label="Monthly 850 hPa trade wind anomalies, West and Central Pacific"
      >
        <line x1={0} x2={n} y1={H / 2} y2={H / 2} className={styles.zero} />
        {bars}
        {current >= start && current <= end && (
          <line x1={cx} x2={cx} y1={0} y2={H} className={styles.marker} />
        )}
      </svg>
    </div>
  );
}

/**
 * The dial: three coloured bands (La Niña / Neutral / El Niño) and an arrow
 * pointing at `value`, or at the middle of `category`'s band when there's no value.
 */
export function EnsoDial({
  category,
  value,
  range: rangeProp,
  thresholds: thresholdsProp,
  units,
  className,
}: {
  category: Category | null;
  value?: number;
  /** Defaults to enso.json's range (so every dial has the same bands). */
  range?: [number, number];
  thresholds?: Thresholds;
  units?: string;
  className?: string;
}) {
  // Without explicit settings, use enso.json's so all dials match.
  const [fileSettings, setFileSettings] = useState<Pick<
    EnsoData,
    "range" | "thresholds"
  > | null>(null);
  useEffect(() => {
    if (rangeProp && thresholdsProp) return;
    loadIndex(withBasePath("/enso.json"))
      .then(setFileSettings)
      .catch(() => {});
  }, [rangeProp, thresholdsProp]);
  const range = rangeProp ?? fileSettings?.range ?? DEFAULT_RANGE;
  const thresholds =
    thresholdsProp ?? fileSettings?.thresholds ?? DEFAULT_THRESHOLDS;

  const [min, max] = [Math.min(...range), Math.max(...range)];
  // Unique, URL-safe id for the label paths (useId may contain ":" or "«»").
  const uid = `enso${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  // Dial positions run left (La Niña) to right (El Niño). SOI-style indices,
  // where El Niño is negative, are mirrored onto that layout.
  const elNinoHigh = thresholds.laNina < thresholds.elNino;
  const toDial = (v: number) => (elNinoHigh ? v : min + max - v);
  const lo = toDial(thresholds.laNina);
  const hi = toDial(thresholds.elNino);

  // Every dial uses the same band layout (see NEUTRAL_FRACTION) whatever its
  // index's scale, so SOI and Niño3.4 dials look alike. Values map linearly
  // within their band onto 0..1 (left to right).
  const edge = (1 - NEUTRAL_FRACTION) / 2;
  const toPosition = (v: number) => {
    const d = Math.min(max, Math.max(min, v));
    if (d <= lo) return (edge * (d - min)) / (lo - min || 1);
    if (d <= hi) return edge + (NEUTRAL_FRACTION * (d - lo)) / (hi - lo || 1);
    return 1 - edge + (edge * (d - hi)) / (max - hi || 1);
  };

  // Arrow: 0° points left (strongest La Niña), 180° right (strongest El Niño).
  const position =
    value !== undefined
      ? toPosition(toDial(value))
      : category === "laNina"
        ? edge / 2
        : category === "elNino"
          ? 1 - edge / 2
          : 0.5;
  const needleDeg = position * 180;

  // Bands on the 0..1 dial scale.
  const sectors: [number, number, Category][] = [
    [0, edge, "laNina"],
    [edge, 1 - edge, "neutral"],
    [1 - edge, 1, "elNino"],
  ];

  return (
    <svg
      viewBox="0 0 200 112"
      className={`${styles.dial} ${className ?? ""}`}
      role="img"
      aria-label={
        category
          ? `${ENSO_CATEGORY[category].label}${value !== undefined ? `, ${value} ${units ?? ""}` : ""}`
          : "No data"
      }
    >
      {sectors.map(([from, to, cat]) => (
        <g key={cat}>
          <path
            id={`${uid}-${cat}`}
            d={arc(from, to, 0, 1)}
            fill="none"
            stroke={ENSO_CATEGORY[cat].color}
            strokeWidth={WIDTH}
          />
          {/* Category name written along its band. */}
          <text
            className={styles.bandLabel}
            fill={cat === "neutral" ? "#1f2328" : "#ffffff"}
            fontSize={labelSize(from, to, 0, 1, ENSO_CATEGORY[cat].label)}
            dy="0.35em"
          >
            <textPath
              href={`#${uid}-${cat}`}
              startOffset="50%"
              textAnchor="middle"
            >
              {ENSO_CATEGORY[cat].label}
            </textPath>
          </text>
        </g>
      ))}
      {/* Yellow edge on the current state's band. */}
      {category &&
        sectors
          .filter(([, , cat]) => cat === category)
          .map(([from, to]) => (
            <path
              key="current"
              d={arcAt(from, to, 0, 1, R + WIDTH / 2 + 3)}
              fill="none"
              stroke="#fcd34d"
              strokeWidth={4}
            />
          ))}
      {category && (
        // Plain SVG translate to the pivot, then a CSS rotate about (0, 0) so
        // it animates; no transform-origin maths that varies by browser/scale.
        <g transform={`translate(${CX} ${CY})`}>
          <g
            className={styles.needle}
            style={{ transform: `rotate(${needleDeg}deg)` }}
          >
            <polygon points={ARROW_POINTS} />
          </g>
        </g>
      )}
    </svg>
  );
}

// ENSO Outlook states (BoM-style seven-step scale), left to right.
export type OutlookCategory =
  | "laNina"
  | "laNinaAlert"
  | "laNinaWatch"
  | "neutral"
  | "elNinoWatch"
  | "elNinoAlert"
  | "elNino";

export const OUTLOOK_CATEGORY: Record<
  OutlookCategory,
  { label: string; band: string; color: string; text: string }
> = {
  laNina: {
    label: "La Niña",
    band: "La Niña",
    color: "#1d3461",
    text: "#ffffff",
  },
  laNinaAlert: {
    label: "La Niña Alert",
    band: "Alert",
    color: "#6787c8",
    text: "#ffffff",
  },
  laNinaWatch: {
    label: "La Niña Watch",
    band: "Watch",
    color: "#c8d8ee",
    text: "#1f2328",
  },
  neutral: {
    label: "Neutral",
    band: "Neutral",
    color: "#e5e7eb",
    text: "#1f2328",
  },
  elNinoWatch: {
    label: "El Niño Watch",
    band: "Watch",
    color: "#e6c4c4",
    text: "#1f2328",
  },
  elNinoAlert: {
    label: "El Niño Alert",
    band: "Alert",
    color: "#cb7d7d",
    text: "#ffffff",
  },
  elNino: {
    label: "El Niño",
    band: "El Niño",
    color: "#8b2f35",
    text: "#ffffff",
  },
};

const OUTLOOK_ORDER = Object.keys(OUTLOOK_CATEGORY) as OutlookCategory[];

export const isOutlookCategory = (c: string): c is OutlookCategory =>
  c in OUTLOOK_CATEGORY;

/**
 * ENSO Outlook dial: seven equal bands (La Niña … Neutral … El Niño) with the
 * arrow pointing at `category`, whose band is edged in yellow.
 */
export function OutlookDial({
  category,
  className,
}: {
  category: OutlookCategory;
  className?: string;
}) {
  const uid = `outlook${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const n = OUTLOOK_ORDER.length;
  const i = OUTLOOK_ORDER.indexOf(category);
  // Band i spans [i, i + 1] on a 0..n scale; the arrow points at its middle.
  const needleDeg = ((i + 0.5) / n) * 180;
  const outer = R + WIDTH / 2 + 3;

  return (
    <svg
      viewBox="0 0 200 112"
      className={`${styles.dial} ${className ?? ""}`}
      role="img"
      aria-label={`ENSO: ${OUTLOOK_CATEGORY[category].label}`}
    >
      {OUTLOOK_ORDER.map((cat, k) => (
        <g key={cat}>
          <path
            id={`${uid}-${cat}`}
            d={arc(k, k + 1, 0, n)}
            fill="none"
            stroke={OUTLOOK_CATEGORY[cat].color}
            strokeWidth={WIDTH}
          />
          <text
            className={styles.bandLabel}
            fill={OUTLOOK_CATEGORY[cat].text}
            fontSize={labelSize(k, k + 1, 0, n, OUTLOOK_CATEGORY[cat].band)}
            dy="0.35em"
          >
            <textPath
              href={`#${uid}-${cat}`}
              startOffset="50%"
              textAnchor="middle"
            >
              {OUTLOOK_CATEGORY[cat].band}
            </textPath>
          </text>
        </g>
      ))}
      {/* Yellow edge on the chosen band. */}
      <path
        d={arcAt(i, i + 1, 0, n, outer)}
        fill="none"
        stroke="#fcd34d"
        strokeWidth={4}
      />
      <g transform={`translate(${CX} ${CY})`}>
        <g
          className={styles.needle}
          style={{ transform: `rotate(${needleDeg}deg)` }}
        >
          <polygon points={ARROW_POINTS} />
        </g>
      </g>
    </svg>
  );
}

/** Font size that fits `label` along the arc from `from` to `to` (max 10). */
function labelSize(
  from: number,
  to: number,
  min: number,
  max: number,
  label: string,
) {
  const arcLength = (Math.abs(to - from) / (max - min)) * Math.PI * R;
  // Bold sans glyphs average ~0.62em wide; leave a little padding.
  return Math.min(10, (arcLength - 4) / (label.length * 0.62));
}

/** Point on the dial for value `v` at radius `r`. */
function polar(v: number, min: number, max: number, r: number) {
  const theta = Math.PI - ((v - min) / (max - min)) * Math.PI;
  return [CX + r * Math.cos(theta), CY - r * Math.sin(theta)] as const;
}

/** SVG arc along the dial between two values. */
function arc(from: number, to: number, min: number, max: number) {
  return arcAt(from, to, min, max, R);
}

/** SVG arc between two values at radius `r`. */
function arcAt(from: number, to: number, min: number, max: number, r: number) {
  const [x1, y1] = polar(from, min, max, r);
  const [x2, y2] = polar(to, min, max, r);
  return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
}
