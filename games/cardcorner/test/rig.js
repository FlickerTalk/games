import { vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { recorder } from "../../../kit/test/canvas/recorder.js";
import { initial } from "../src/rules.js";
import { TEXTS } from "../src/texts.js";
import { themeFor } from "../src/theme.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));
export const t = (key, vars) => translate("en", key, vars);
export const theme = themeFor(null, { dark: false });
export const SIZE = 343;
export const SIZES = [300, 343, 480, 720];

export const playing = (game, table, next = 1, extra = {}) => ({ ...initial(), phase: "play", game, commit: "x", seedB: "y", table, next, ...extra });

export function seat(view, state, { me = 1, size = SIZE, local = {}, canPlay = state.next === me && !state.end, ...extra } = {}) {
  const ctx = { state, mySide: me, canPlay, play: vi.fn(), sound: { play: vi.fn() }, t, pending: false, ...extra };
  return { ctx, state, me, local, size, t, canPlay, layout: view.layout(size, state, local), wake: vi.fn(), hidden: new Set(), ratio: 1 };
}

export function spy() {
  const drawn = [];
  return { drawn, clear() {}, draw: (ctx, key, box) => drawn.push({ key, box }) };
}

export function painted(view, at, sprites = spy()) {
  const pen = recorder();
  view.paint(pen, theme, { ...at, sprites });
  return { pen, keys: sprites.drawn.map((one) => one.key), drawn: sprites.drawn };
}

export const keyed = (list, key) => list.find((one) => one.key === key);
export const inside = (box, size = 1) => box.x >= -0.0001 && box.y >= -0.0001 && box.x + box.w <= size + 0.0001 && box.y + box.h <= size + 0.0001;
export const apart = (a, b) => a.x + a.w <= b.x + 0.01 || b.x + b.w <= a.x + 0.01 || a.y + a.h <= b.y + 0.01 || b.y + b.h <= a.y + 0.01;
