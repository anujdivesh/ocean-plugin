"use client";

import { useCallback, useEffect, useState } from "react";
import type { Map as MaplibreMap } from "maplibre-gl";
import {
  EXPLORE,
  STORIES,
  STORY_HOME,
  type Chapter,
  type ExploreTile,
} from "@/story/chapters";
import {
  LAYER_GROUPS,
  STORY_LAYERS,
  layerDefaultTime,
  LAYER_RADIO_GROUP,
  showLayer,
} from "@/story/layers";
import { wmsLayerId } from "@/lib/wmsLayer";
import { DATA_BEFORE_ID } from "@/lib/referenceLayers";
import ReferenceLayerToggles from "./ReferenceLayerToggles";
import EnsoGauge, {
  ENSO_CATEGORY,
  EnsoDial,
  OUTLOOK_CATEGORY,
  OutlookDial,
} from "./EnsoGauge";
import MapView from "./MapView";
import NinoOutlook, { loadOutlook, outlookPeriod } from "./NinoOutlook";
import EezLayerControl from "./EezLayerControl";
import Workbench from "./Workbench";
import WmsLayerControl from "./WmsLayerControl";
import ZarrLayerControl from "./ZarrLayerControl";
import LayerGroup from "./LayerGroup";
import { themeFor } from "@/story/themes";
import { useDraggable } from "@/lib/useDraggable";
import styles from "./StoryMap.module.css";

/**
 * Layers showing at a chapter: only its own. A text-only chapter (no layers)
 * keeps the most recent earlier chapter's layers so the map doesn't go blank.
 */
const layersAt = (chapters: Chapter[], i: number) => {
  for (let j = i; j >= 0; j--) {
    if (chapters[j].layers.length) return chapters[j].layers;
  }
  return [];
};

/** Story and chapter index for a chapter id (from the URL hash). */
const findChapter = (id: string) => {
  for (let s = 0; s < STORIES.length; s++) {
    const i = STORIES[s].chapters.findIndex((c) => c.id === id);
    if (i >= 0) return { story: s, step: i };
  }
  return null;
};

export default function StoryMap() {
  const [map, setMap] = useState<MaplibreMap | null>(null);
  const [visibleLayers, setVisibleLayers] = useState<string[]>([]);
  // Active story and chapter; null = exploring freely.
  const [pos, setPos] = useState<{ story: number; step: number } | null>(null);
  const story = pos ? STORIES[pos.story] : null;
  const step = pos?.step ?? null;
  const chapters = story?.chapters ?? [];
  const last = chapters.length - 1;
  const [promptOpen, setPromptOpen] = useState(true);
  // Current timestep of each layer, by layer id.
  const [layerTimes, setLayerTimes] = useState<Record<string, string | null>>(
    {},
  );
  // BOM forecast period for {outlookPeriod}, e.g. "October 2026 to March 2027".
  const [period, setPeriod] = useState<string | null>(null);
  useEffect(() => {
    loadOutlook()
      .then((o) => setPeriod(outlookPeriod(o)))
      .catch(() => {});
  }, []);
  // Zarr layers currently fetching from S3, by layer id.
  const [loadingLayers, setLoadingLayers] = useState<string[]>([]);
  const setLayerLoading = (id: string, on: boolean) =>
    setLoadingLayers((l) =>
      on ? (l.includes(id) ? l : [...l, id]) : l.filter((x) => x !== id),
    );
  // Bumped whenever a layer lands on the map, so stacking can be reapplied.
  const [addedCount, setAddedCount] = useState(0);
  const chapter = story && step !== null ? story.chapters[step] : null;
  // Chapter layers open on their latest timestep; the card's Animate button
  // jumps them back to the chapter's `times` and plays.
  const [animating, setAnimating] = useState(false);
  const [prevChapterId, setPrevChapterId] = useState(chapter?.id);
  if (chapter?.id !== prevChapterId) {
    setPrevChapterId(chapter?.id);
    setAnimating(!!chapter?.autoplay);
  }

  // Workbench groups: only Current Conditions starts open; a story opens its
  // own group (story ids match group ids). Readers can still toggle any group.
  const [openGroups, setOpenGroups] = useState<string[]>(["current"]);
  const toggleGroup = (id: string) =>
    setOpenGroups((g) =>
      g.includes(id) ? g.filter((x) => x !== id) : [...g, id],
    );

  /** Open chapter `i` of story `s` (clamped to the story). */
  const goTo = useCallback((s: number, i: number) => {
    const list = STORIES[s].chapters;
    const groupId = STORIES[s].id;
    setOpenGroups((g) => (g.includes(groupId) ? g : [...g, groupId]));
    const next = Math.min(Math.max(i, 0), list.length - 1);
    setPos({ story: s, step: next });
    setVisibleLayers(layersAt(list, next));
    window.history.replaceState(null, "", `#${list[next].id}`);
  }, []);
  const go = (i: number) => pos && goTo(pos.story, i);

  const [workbenchOpen, setWorkbenchOpen] = useState(true);

  /** Explore tile: no story; open its workbench group (and any listed layers). */
  const explore = (tile: ExploreTile) => {
    setPos(null);
    setPromptOpen(false);
    setWorkbenchOpen(true);
    setOpenGroups((g) => (g.includes(tile.id) ? g : [...g, tile.id]));
    setVisibleLayers((v) => (tile.layers ?? []).reduce(showLayer, v));
    window.history.replaceState(null, "", window.location.pathname);
  };

  const exit = () => {
    setPos(null);
    setPromptOpen(true);
    // Leaving a story switches its layers off and resets the groups: only
    // Current Conditions open.
    setVisibleLayers([]);
    setOpenGroups(["current"]);
    window.history.replaceState(null, "", window.location.pathname);
  };

  // Deep links: #<chapter-id> opens that chapter's story at that chapter.
  useEffect(() => {
    const onHash = () => {
      const found = findChapter(window.location.hash.slice(1));
      if (found) goTo(found.story, found.step);
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [goTo]);

  // Arrow keys step through the story (ignored while using a form control).
  useEffect(() => {
    if (!pos) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight") goTo(pos.story, pos.step + 1);
      if (e.key === "ArrowLeft") goTo(pos.story, pos.step - 1);
      if (e.key === "Escape") {
        setPos(null);
        setVisibleLayers([]);
        setOpenGroups(["current"]);
        window.history.replaceState(null, "", window.location.pathname);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, pos]);

  useEffect(() => {
    if (chapter)
      map?.flyTo({ ...chapter.camera, duration: 2000, essential: true });
  }, [map, chapter]);

  // Stack story WMS layers in chapter order, newest on top but below the
  // reference overlays. (Zarr layers stack in the order they were switched on.)
  useEffect(() => {
    if (!map || !story || step === null) return;
    for (const id of layersAt(story.chapters, step)) {
      const layer = STORY_LAYERS.find((l) => l.id === id);
      if (layer?.kind !== "wms") continue;
      const mapId = wmsLayerId(layer.middlewareId);
      if (map.getLayer(mapId)) map.moveLayer(mapId, DATA_BEFORE_ID);
    }
  }, [map, story, step, addedCount]);

  // A layer switched on/off by hand in the workbench means the reader is
  // exploring: close the welcome card and end any story. Layers stay as they
  // are; the story bar takes the welcome card's place.
  const toggleLayer = (id: string, on: boolean) => {
    setPromptOpen(false);
    if (pos) {
      setPos(null);
      window.history.replaceState(null, "", window.location.pathname);
    }
    setVisibleLayers((v) =>
      on ? showLayer(v, id) : v.filter((x) => x !== id),
    );
  };

  // ENSO gauge follows the month of the first visible layer that asks for it (SST).
  const ensoLayer = STORY_LAYERS.find(
    (l) => l.kind === "zarr" && l.ensoGauge && visibleLayers.includes(l.id),
  );
  // Niño3.4 outlook card for the seasonal SST outlook. Both cards sit in the
  // same place, so the ENSO card wins when both layers are on.
  const outlookCard =
    !ensoLayer &&
    STORY_LAYERS.some(
      (l) => l.kind === "zarr" && l.ninoOutlook && visibleLayers.includes(l.id),
    );
  const sidePanel = !!ensoLayer || outlookCard;

  // Hidden layers also load (their metadata) on startup; only shown ones count.
  const mapLoading = loadingLayers.some((id) => visibleLayers.includes(id));

  const [homeTitle, homeTag] = STORY_HOME.title.split(" - ");

  const centered = chapter?.layout === "center";
  // Story cards can be dragged by their top row (one position per layout).
  const { offset: cardOffset, handleProps: cardDrag } = useDraggable(
    centered ? "center" : "bottom",
  );
  const storyCard = chapter && story && step !== null && (
    <section
      className={`${styles.storyCard} ${centered ? styles.storyCardCenter : ""}`}
      style={{
        transform: `translate(${cardOffset.x}px, ${cardOffset.y}px)`,
      }}
      aria-live="polite"
    >
      <header
        className={`${styles.storyHeader} ${styles.dragHandle}`}
        {...cardDrag}
      >
        <div className={styles.headerStart}>
          <span className={styles.cardLogo} role="img" aria-label="COSPPaC" />
          <span className={styles.eyebrow}>
            {story.title}
            {chapters.length > 1 && ` · ${step + 1} of ${chapters.length}`}
          </span>
        </div>
        <button className={styles.close} onClick={exit} aria-label="Exit story">
          ×
        </button>
      </header>
      <h2 className={styles.title}>
        {fillPlaceholders(chapter.title, period)}
      </h2>
      {chapter.body.map((p) => (
        <p key={p} className={styles.text}>
          {fillPlaceholders(p, period)}
        </p>
      ))}
      {chapter.gauge?.scale === "outlook" ? (
        <div className={`${styles.gauge} ${styles.gaugeWide}`}>
          <OutlookDial category={chapter.gauge.category} />
          <p
            className={styles.gaugeLabel}
            style={{ color: OUTLOOK_CATEGORY[chapter.gauge.category].color }}
          >
            {chapter.gauge.label ??
              OUTLOOK_CATEGORY[chapter.gauge.category].label}
          </p>
        </div>
      ) : (
        chapter.gauge && (
          <div className={styles.gauge}>
            <EnsoDial category={chapter.gauge.category} />
            <p
              className={styles.gaugeLabel}
              style={{ color: ENSO_CATEGORY[chapter.gauge.category].ink }}
            >
              {chapter.gauge.label ??
                ENSO_CATEGORY[chapter.gauge.category].label}
            </p>
          </div>
        )
      )}
      {chapter.stats && (
        <ul className={styles.stats}>
          {chapter.stats.map((s) => (
            <li key={s.label} className={styles.stat}>
              <span className={styles.statValue}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </li>
          ))}
        </ul>
      )}
      {chapter.notes?.map((n) => (
        <p key={n} className={styles.note}>
          {n}
        </p>
      ))}
      {chapter.image && (
        <StoryImage key={chapter.image.src} {...chapter.image} />
      )}
      <div className={styles.nav}>
        <button
          className={styles.secondary}
          onClick={() => go(step - 1)}
          disabled={step === 0}
        >
          ← Back
        </button>
        <div className={styles.dots}>
          {chapters.map((c, i) => (
            <button
              key={c.id}
              className={`${styles.dot} ${i === step ? styles.dotActive : ""}`}
              onClick={() => go(i)}
              aria-label={`Go to ${fillPlaceholders(c.title, period)}`}
              aria-current={i === step ? "step" : undefined}
            />
          ))}
        </div>
        <div className={styles.navEnd}>
          {chapter.layers.length > 0 && (
            <button
              className={`${styles.animate} ${animating ? styles.animateOn : ""}`}
              onClick={() => setAnimating((a) => !a)}
              aria-pressed={animating}
            >
              {animating ? "■ Stop" : "▶ Animate"}
            </button>
          )}
          {step === last ? (
            <button className={styles.primary} onClick={exit}>
              Finish
            </button>
          ) : (
            <button className={styles.primary} onClick={() => go(step + 1)}>
              Next →
            </button>
          )}
        </div>
      </div>
    </section>
  );

  return (
    <main className={styles.main}>
      <MapView onLoad={setMap} />
      <ReferenceLayerToggles map={map} />
      {ensoLayer && <EnsoGauge time={layerTimes[ensoLayer.id] ?? null} />}
      {outlookCard && <NinoOutlook />}
      {mapLoading && (
        <div
          className={styles.mapLoading}
          role="status"
          aria-label="Loading layer"
        >
          <span className={styles.mapSpinner} />
        </div>
      )}

      <Workbench open={workbenchOpen} onOpenChange={setWorkbenchOpen}>
        <div className={styles.layers}>
          {LAYER_GROUPS.map((group) => (
            <LayerGroup
              key={group.id}
              title={group.title}
              theme={themeFor(group.id)}
              open={openGroups.includes(group.id)}
              onToggle={() => toggleGroup(group.id)}
              activeCount={
                STORY_LAYERS.filter(
                  (l) => l.group === group.id && visibleLayers.includes(l.id),
                ).length
              }
            >
              {STORY_LAYERS.filter((l) => l.group === group.id).map((layer) => {
                const common = {
                  map,
                  visible: visibleLayers.includes(layer.id),
                  onVisibleChange: (on: boolean) => toggleLayer(layer.id, on),
                  // The chapter's own layers: their default timestep (latest, or
                  // first for outlooks), or the animation's start while
                  // animating. Others keep whatever the reader chose.
                  initialTime: chapter?.layers.includes(layer.id)
                    ? animating
                      ? (chapter.times?.[layer.id] ?? "first")
                      : layerDefaultTime(layer)
                    : undefined,
                  autoplay: animating && !!chapter?.layers.includes(layer.id),
                  radioGroup: LAYER_RADIO_GROUP,
                };
                if (layer.kind === "eez") {
                  return (
                    <EezLayerControl
                      key={layer.id}
                      map={map}
                      title={layer.title}
                      droughtKey={layer.droughtKey}
                      visible={common.visible}
                      onVisibleChange={common.onVisibleChange}
                      radioGroup={common.radioGroup}
                    />
                  );
                }
                return layer.kind === "zarr" ? (
                  <ZarrLayerControl
                    key={layer.id}
                    {...common}
                    defaultTime={layerDefaultTime(layer)}
                    title={layer.title}
                    step={layer.step}
                    config={layer.zarr}
                    extras={layer.extras}
                    togglesTitle={layer.togglesTitle}
                    legendItems={layer.legendItems}
                    legendUrl={layer.legendUrl}
                    midMonth={layer.midMonth}
                    stepLabels={layer.stepLabels}
                    onTimeChange={(t) =>
                      setLayerTimes((s) => ({ ...s, [layer.id]: t }))
                    }
                    onLoadingChange={(on) => setLayerLoading(layer.id, on)}
                  />
                ) : (
                  <WmsLayerControl
                    key={layer.id}
                    {...common}
                    layerId={layer.middlewareId}
                    onAdded={() => setAddedCount((n) => n + 1)}
                  />
                );
              })}
            </LayerGroup>
          ))}
        </div>
      </Workbench>

      {centered && (
        <div
          className={`${styles.center} ${sidePanel ? styles.besideSidePanel : ""}`}
        >
          {storyCard}
        </div>
      )}

      {/* Welcome card: the first thing visitors see; pick a story or explore. */}
      {!pos && promptOpen && (
        <div className={styles.center}>
          <section className={styles.home} aria-labelledby="story-home-title">
            <div className={styles.homeHero}>
              <div className={styles.homeHeroTop}>
                <div className={styles.headerStart}>
                  <span
                    className={styles.cardLogo}
                    role="img"
                    aria-label="COSPPaC"
                  />
                  <span className={styles.homeEyebrow}>Story maps</span>
                </div>
                <button
                  className={styles.homeClose}
                  onClick={() => setPromptOpen(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              {/* "Main title - Tag": the part after " - " becomes an accent pill. */}
              <h1 id="story-home-title" className={styles.homeTitle}>
                {homeTitle}
                {homeTag && <span className={styles.homeTag}>{homeTag}</span>}
              </h1>
              {STORY_HOME.subtitle && (
                <p className={styles.homeSubtitle}>{STORY_HOME.subtitle}</p>
              )}
            </div>

            <div className={styles.homeBody}>
              <div className={styles.storyChoices}>
                {STORIES.map((st, i) => {
                  const theme = themeFor(st.id);
                  return (
                    <button
                      key={st.id}
                      className={styles.storyChoice}
                      style={
                        {
                          "--color": theme.color,
                          "--dark": theme.dark,
                        } as React.CSSProperties
                      }
                      onClick={() => goTo(i, 0)}
                    >
                      <span className={styles.choiceBanner}>
                        <span className={styles.choiceTitle}>{st.title}</span>
                      </span>
                      <span className={styles.choiceBody}>
                        {st.description && (
                          <span className={styles.choiceText}>
                            {st.description}
                          </span>
                        )}
                        <span className={styles.choiceMeta}>
                          <span className={styles.choiceGo}>Start →</span>
                        </span>
                      </span>
                    </button>
                  );
                })}
                {EXPLORE.map((tile) => {
                  const theme = themeFor(tile.id);
                  return (
                    <button
                      key={tile.id}
                      className={styles.storyChoice}
                      style={
                        {
                          "--color": theme.color,
                          "--dark": theme.dark,
                        } as React.CSSProperties
                      }
                      onClick={() => explore(tile)}
                    >
                      <span className={styles.choiceBanner}>
                        <span className={styles.choiceTitle}>{tile.title}</span>
                      </span>
                      <span className={styles.choiceBody}>
                        {tile.description && (
                          <span className={styles.choiceText}>
                            {tile.description}
                          </span>
                        )}
                        <span className={styles.choiceMeta}>
                          <span className={styles.choiceGo}>Explore →</span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                className={styles.explore}
                onClick={() => setPromptOpen(false)}
              >
                Or explore the map layers yourself
              </button>
            </div>
          </section>
        </div>
      )}

      <div
        className={`${styles.dock} ${sidePanel ? styles.besideSidePanel : ""}`}
      >
        {chapter && step !== null ? (
          !centered && storyCard
        ) : promptOpen ? null : (
          // Welcome card closed: quick access to each story.
          <nav className={styles.storyBar} aria-label="Story maps">
            <button
              className={styles.storyBarLabel}
              onClick={() => setPromptOpen(true)}
            >
              Story maps
            </button>
            {STORIES.map((st, i) => {
              const theme = themeFor(st.id);
              return (
                <button
                  key={st.id}
                  className={styles.storyBarButton}
                  style={{
                    background: theme.color,
                  }}
                  onClick={() => goTo(i, 0)}
                >
                  ▶ {st.title}
                </button>
              );
            })}
            {EXPLORE.map((tile) => (
              <button
                key={tile.id}
                className={styles.storyBarButton}
                style={{ background: themeFor(tile.id).color }}
                onClick={() => explore(tile)}
              >
                {tile.title}
              </button>
            ))}
          </nav>
        )}
      </div>
    </main>
  );
}

const MONTH_YEAR_FMT = new Intl.DateTimeFormat("en", {
  month: "long",
  year: "numeric",
});

/**
 * Story text placeholders (chapter titles and body):
 * - {previousMonth} -> last month, e.g. "September 2026".
 * - {outlookPeriod} -> the BOM ACCESS-S2 forecast period, e.g. "October 2026
 *   to March 2027". Until it loads (or if it can't), it's dropped along with
 *   a separator before it ("ENSO Outlook - {outlookPeriod}" -> "ENSO Outlook").
 */
function fillPlaceholders(text: string, period: string | null = null) {
  const now = new Date();
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const filled = text.replaceAll(
    "{previousMonth}",
    MONTH_YEAR_FMT.format(previous),
  );
  return period
    ? filled.replaceAll("{outlookPeriod}", period)
    : filled.replace(/\s*[-–—:]?\s*\{outlookPeriod\}/g, "");
}

/** Story image, with a placeholder until the file exists in /public. */
function StoryImage({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className={styles.figure}>
      {failed ? (
        <div className={styles.imagePlaceholder}>
          Plot coming soon
          <code>public{src}</code>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} onError={() => setFailed(true)} />
      )}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
