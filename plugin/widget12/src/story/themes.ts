// Colours for each story, keyed by story id (matching the workbench group id).
// Used by the welcome-card tiles, the bottom story bar and the workbench
// group headers so they always match. Flat, softly muted tones; white text on
// `color`.
export type Theme = { color: string; dark: string };

export const THEMES: Record<string, Theme> = {
  // Climatology: teal.
  climatology: { color: "#2f8a7e", dark: "#257166" },
  // Current conditions: steel blue.
  current: { color: "#3d74a8", dark: "#325f8a" },
  // Outlook: terracotta.
  outlook: { color: "#b5652a", dark: "#955322" },
  // Impact: plum.
  impact: { color: "#8e5a88", dark: "#754a70" },
};

const FALLBACK: Theme = { color: "#5b6573", dark: "#4a535f" };

export const themeFor = (id: string): Theme => THEMES[id] ?? FALLBACK;
