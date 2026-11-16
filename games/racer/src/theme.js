import { readTokens, themeFromTokens } from '../../../kit/src/canvas/theme.js';
import { softStage } from '../../../kit/src/canvas/tone.js';
import { DAY_THEME, PALETTE } from './art-palette.js';

const made = new Map();

function hudFor(ui) {
  return Object.freeze({
    strip: ui.surface,
    card: ui.surface,
    edge: ui.dark ? ui.border : PALETTE.ink,
    text: ui.text,
    track: ui.track,
    off: ui.surface2,
    offText: ui.muted,
  });
}

export function themeFor(tokens, mode = {}) {
  const ui = themeFromTokens(tokens, mode);
  const key = JSON.stringify(ui);
  if (!made.has(key)) made.set(key, Object.freeze({ ui, ground: softStage(DAY_THEME.ground, { dark: ui.dark }), hud: hudFor(ui) }));
  return made.get(key);
}

export function pageTheme(root) {
  const tokens = readTokens(root);
  const dark = root.hasAttribute('data-dark') || (!tokens && Boolean(globalThis.matchMedia?.('(prefers-color-scheme: dark)')?.matches));
  return themeFor(tokens, { dark });
}

export function switchColours({ ground, hud }) {
  return {
    '--racer-sky': ground.sky,
    '--racer-panel': hud.strip,
    '--racer-edge': hud.edge,
    '--racer-text': hud.text,
    '--racer-off': hud.off,
    '--racer-off-text': hud.offText,
  };
}
