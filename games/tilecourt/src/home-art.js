import { centreOf, drawHome as drawHomeScreen, drawLooks as drawLooksScreen, homeLayout, looksLayout } from "../../../kit/src/canvas/index.js";
import { clamp, roundedRect } from "../../../kit/src/canvas/pen.js";
import { drawStage, rimmed } from "./board.js";
import { drawWrapped } from "./bursts.js";
import { EMPTY } from "./court.js";
import { drawCourt } from "./court-art.js";
import { LOOKS, PROGRESS } from "./levels.js";
import { drawLineEffect } from "./line-effects.js";
import { drawScenery } from "./scenery.js";
import { drawTile } from "./tiles.js";
import { VARIANTS } from "./variants.js";

export const VARIANT_LIST = Object.freeze(["main", "small", "big", "daily"]);
const TABS = ["court", "effect"];

export function drawMiniCourt(ctx, area, variant, theme) {
  const { size, beds } = VARIANTS[variant] ?? VARIANTS.main;
  const span = Math.min(area.w, area.h) * 0.62;
  const cell = span / size;
  const cells = Array(size * size).fill(EMPTY);
  [0, 1, size, size + 1, size * size - 1, size * size - 2].forEach((at, order) => (cells[at] = order % 4));
  rimmed(ctx, theme, () => {
    drawCourt(ctx, { x: area.x + (area.w - span) / 2, y: area.y + (area.h - span) / 2, cell, size }, cells, theme, { beds });
    if (variant === "daily") drawTile(ctx, area.x + area.w - 34, area.y + 8, 26, 2, theme);
  });
}

export function drawHome(ctx, state, seat, theme, time) {
  const { width, height } = state;
  const layout = homeLayout(width, height, { variants: VARIANT_LIST, rival: Boolean(seat), fill: state.fill });
  drawHomeScreen(ctx, state, theme.ui, time, {
    layout,
    seat,
    volume: state.layout?.volume,
    drawStage: (pen, band) => drawStage(pen, state, band, theme, time),
    drawVariant: (pen, target) => drawMiniCourt(pen, target, target.value, theme),
  });
}

export function drawLookArt(ctx, area, kind, look, theme, time) {
  const [x, y] = centreOf(area);
  if (kind === "effect") {
    rimmed(ctx, theme, () => drawLineEffect(ctx, look, x, y, area.w * 0.62, (time * 0.4) % 1, theme));
    return;
  }
  ctx.save();
  roundedRect(ctx, area.x + 6, area.y + 6, area.w - 12, area.h - 12, theme.ui.radius - 4);
  ctx.clip();
  rimmed(ctx, theme, () => drawScenery(ctx, look, { w: area.x + area.w, h: area.y + area.h }, { x: area.x, y: area.y, w: area.w, h: area.h * 0.5 }, theme, time));
  ctx.restore();
  drawMiniCourt(ctx, { x: area.x, y: area.y + area.h * 0.28, w: area.w, h: area.h * 0.7 }, "main", theme);
}

function shakeOf(state, index, time) {
  const moment = state.moments.find((one) => one.kind === "shake" && one.index === index);
  return moment ? clamp((time * 1000 - moment.start) / moment.duration) : 0;
}

function tabArt(ctx, area, value, theme) {
  const [x, y] = centreOf(area);
  if (value === "effect") rimmed(ctx, theme, () => drawLineEffect(ctx, "lanterns", x, y, area.w * 0.55, 0.3, theme));
  else drawMiniCourt(ctx, area, "main", theme);
}

export function drawLooks(ctx, state, theme, time) {
  const { width, height } = state;
  const kind = state.looks;
  const looks = LOOKS[kind];
  drawLooksScreen(ctx, state, theme.ui, time, {
    layout: looksLayout(width, height, { kind, count: looks.length, fill: state.fill, tabs: TABS }),
    kind,
    looks,
    owned: PROGRESS.owned(state.progress),
    chosen: state.progress.chosen[kind],
    shake: (index) => shakeOf(state, index, time),
    drawLook: (pen, area, look, now) => drawLookArt(pen, area, kind, look, theme, now),
    drawTab: (pen, area, value) => tabArt(pen, area, value, theme),
    drawWrapped: (pen, area, shake) => rimmed(pen, theme, () => drawWrapped(pen, area, shake, theme)),
  });
}
