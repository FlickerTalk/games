import { themeFromTokens } from "../canvas/theme.js";
import { fromOklch, oklchOf } from "../canvas/tone.js";

const DUSK_TOP = 0.72;

export function duskBoard(palette, { dark, top = DUSK_TOP }) {
  if (!dark) return palette;
  const tones = Object.entries(palette).map(([key, colour]) => [key, oklchOf(colour)]);
  const shift = Math.max(0, ...tones.map(([, tone]) => tone.l)) - top;
  if (shift <= 0) return palette;
  return Object.freeze(Object.fromEntries(tones.map(([key, tone]) => [key, fromOklch({ ...tone, l: tone.l - shift })])));
}

export function tabletopTheme(tokens, { dark = false } = {}, { board = {}, ...art } = {}) {
  const ui = themeFromTokens(tokens, { dark });
  return Object.freeze({ ...art, ui, dark: ui.dark, rim: ui.dark ? ui.muted : null, board: duskBoard(board, { dark: ui.dark }) });
}
