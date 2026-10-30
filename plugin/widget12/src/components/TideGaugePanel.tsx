"use client";

import { useEffect, useState } from "react";
import {
  TIDE_VARIABLES,
  defaultStation,
  describeVariable,
  loadTideGauges,
  type EnsoPhase,
  type TideGaugeData,
  type TideVariable,
} from "@/lib/tideGauges";
import styles from "./TideGaugePanel.module.css";

// Line colours per phase: bright red, grey and bright blue so the three
// lines stand apart.
const PHASES: { phase: EnsoPhase; color: string }[] = [
  { phase: "El Niño", color: "#dc2626" },
  { phase: "Neutral", color: "#9ca3af" },
  { phase: "La Niña", color: "#2563eb" },
];

/** Stations with fewer months of sea level data get a "not sufficient data" note (Niue). */
const SHORT_RECORD_MONTHS = 120;

/**
 * Plots for one tide gauge station: per variable, the Jan-Dec mean cycle in
 * each ENSO phase. One plot (the first variable) is open; the rest expand on
 * click.
 */
export default function TideGaugePanel({
  station,
}: {
  /** Station id (null: the default station). */
  station: string | null;
}) {
  const [data, setData] = useState<TideGaugeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(true);
  const [openVars, setOpenVars] = useState<string[]>([TIDE_VARIABLES[0].key]);

  useEffect(() => {
    loadTideGauges()
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  const id = station ?? (data && defaultStation(data));
  const s = id ? data?.tide_gauge[id] : null;
  const toggleVar = (key: string) =>
    setOpenVars((v) =>
      v.includes(key) ? v.filter((x) => x !== key) : [...v, key],
    );

  return (
    <aside className={styles.card} aria-label="Tide gauge plots">
      <div className={styles.header}>
        <button
          className={styles.headerToggle}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <span className={styles.logo} role="img" aria-label="COSPPaC" />
          <span className={styles.headerText}>
            <span className={styles.title}>COSPPaC tide gauge</span>
            <span className={styles.station}>
              {s ? s.station : error ? "Couldn't load stations" : "Loading…"}
            </span>
          </span>
        </button>
        <button
          className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Collapse plots" : "Expand plots"}
          aria-expanded={open}
        >
          ›
        </button>
      </div>

      {open && s && data && (
        <>
          {(s.variables.sea_level?.n_months ?? 0) < SHORT_RECORD_MONTHS && (
            <p className={styles.warning}>Not Sufficient Data</p>
          )}
          <p className={styles.hint}>
            Monthly averages in El Niño, Neutral and La Niña years.
          </p>
          <p className={styles.yearNote}>
            <strong>ENSO year = June to May.</strong> For example, 1997/98
            means June 1997 to May 1998.
          </p>
          <ul className={styles.key}>
            {PHASES.map((p) => (
              <li key={p.phase}>
                <span className={styles.keyLine} style={{ background: p.color }} />
                {p.phase}
              </li>
            ))}
            <li>
              <span className={styles.keySig}>*</span>
              Clear El Niño / La Niña difference
            </li>
          </ul>
          {TIDE_VARIABLES.filter((v) => s.variables[v.key]).map((v) => {
            const variable = s.variables[v.key];
            const isOpen = openVars.includes(v.key);
            return (
              <section key={v.key} className={styles.variable}>
                <button
                  className={styles.variableToggle}
                  onClick={() => toggleVar(v.key)}
                  aria-expanded={isOpen}
                >
                  <span
                    className={`${styles.chevronSmall} ${isOpen ? styles.chevronOpen : ""}`}
                  >
                    ›
                  </span>
                  <span className={styles.variableLabel}>
                    {v.label} ({variable.units})
                  </span>
                  <span className={styles.period}>
                    {variable.period[0].slice(0, 4)}–
                    {variable.period[1].slice(0, 4)}
                  </span>
                </button>
                {isOpen && (
                  <>
                    <Summary
                      summary={describeVariable(variable, v, data.months)}
                    />
                    <CycleChart
                      label={`${s.station} ${v.label}`}
                      months={data.months}
                      variable={variable}
                    />
                  </>
                )}
              </section>
            );
          })}
        </>
      )}
    </aside>
  );
}

/** El Niño / La Niña chips (e.g. "El Niño: lower") and a one-line summary. */
function Summary({
  summary,
}: {
  summary: ReturnType<typeof describeVariable>;
}) {
  if (!summary) return null;
  return (
    <div className={styles.summary}>
      {summary.elNino && summary.laNina && (
        <div className={styles.chips}>
          <span className={styles.chip} style={{ color: PHASES[0].color }}>
            El Niño: {summary.elNino}
          </span>
          <span className={styles.chip} style={{ color: PHASES[2].color }}>
            La Niña: {summary.laNina}
          </span>
        </div>
      )}
      <p className={styles.summaryText}>{summary.text}</p>
    </div>
  );
}

// Chart geometry (SVG units).
const W = 400;
const H = 180;
const PAD = { top: 18, right: 14, bottom: 26, left: 46 };
/** Axis tick length. */
const TICK = 4;

/** Jan-Dec lines per ENSO phase; significant months marked with "*". */
function CycleChart({
  label,
  months,
  variable,
}: {
  label: string;
  months: string[];
  variable: TideVariable;
}) {
  const values = PHASES.flatMap((p) =>
    (variable.phases[p.phase]?.monthly_mean ?? []).filter(
      (v): v is number => v !== null,
    ),
  );
  if (!values.length) return <p className={styles.note}>No data</p>;

  const ticks = niceTicks(Math.min(...values), Math.max(...values));
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  // Jan sits on the y-axis and Dec on the right edge.
  const x = (i: number) => PAD.left + (plotW * i) / (months.length - 1);
  const y = (v: number) => PAD.top + plotH - ((v - lo) / (hi - lo)) * plotH;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={styles.chart}
      role="img"
      aria-label={`${label}: monthly mean by ENSO phase`}
    >
      {/* Month gridlines. */}
      {months.map((m, i) => (
        <line
          key={`v-${m}`}
          x1={x(i)}
          x2={x(i)}
          y1={PAD.top}
          y2={PAD.top + plotH}
          className={styles.grid}
        />
      ))}
      {variable.el_nino_vs_la_nina.significant_p05.map(
        (sig, i) =>
          sig && (
            <text
              key={`sig-${i}`}
              x={x(i)}
              y={PAD.top - 3}
              className={styles.sig}
              textAnchor="middle"
            >
              *
            </text>
          ),
      )}
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(t)}
            y2={y(t)}
            className={styles.grid}
          />
          <line
            x1={PAD.left - TICK}
            x2={PAD.left}
            y1={y(t)}
            y2={y(t)}
            className={styles.axis}
          />
          <text
            x={PAD.left - TICK - 3}
            y={y(t)}
            className={styles.tick}
            textAnchor="end"
            dominantBaseline="middle"
          >
            {Number(t.toFixed(3))}
          </text>
        </g>
      ))}
      {months.map((m, i) => (
        <g key={m}>
          <line
            x1={x(i)}
            x2={x(i)}
            y1={PAD.top + plotH}
            y2={PAD.top + plotH + TICK}
            className={styles.axis}
          />
          <text
            x={x(i)}
            y={H - 4}
            className={styles.tick}
            textAnchor="middle"
          >
            {m}
          </text>
        </g>
      ))}
      {/* Axis lines. */}
      <path
        d={`M${PAD.left},${PAD.top}V${PAD.top + plotH}H${W - PAD.right}`}
        fill="none"
        className={styles.axis}
      />
      {PHASES.map(({ phase, color }) => {
        const series = variable.phases[phase]?.monthly_mean ?? [];
        const points = series.flatMap((v, i) =>
          v === null ? [] : [{ i, v }],
        );
        return (
          <g key={phase}>
            <path
              d={series
                .map((v, i) =>
                  v === null
                    ? ""
                    : `${i === 0 || series[i - 1] === null ? "M" : "L"}${x(i)},${y(v)}`,
                )
                .join("")}
              fill="none"
              stroke={color}
              strokeWidth={2}
            />
            {points.map(({ i, v }) => (
              <circle key={i} cx={x(i)} cy={y(v)} r={2.5} fill={color}>
                <title>
                  {`${phase}, ${months[i]}: ${v} ${variable.units}`}
                </title>
              </circle>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

/** About five evenly spaced round ticks covering [min, max]. */
function niceTicks(min: number, max: number) {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const raw = (max - min) / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step =
    [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => s >= raw) ?? 10 * mag;
  const start = Math.floor(min / step) * step;
  const ticks = [];
  for (let t = start; t <= max + step * 1e-9; t += step) {
    ticks.push(Number(t.toFixed(10)));
  }
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}
