import { drawAvatar, drawBadge } from "../../../kit/src/avatars/index.js";
import { drawVolume } from "./bar.js";
import { drawWrapped } from "./bursts.js";
import { drawButton } from "./buttons.js";
import { EMPTY } from "./court.js";
import { drawCourt } from "./court-art.js";
import { LOOKS, PROGRESS } from "./levels.js";
import { drawLineEffect } from "./line-effects.js";
import { homeLayout, looksLayout } from "../../../kit/src/canvas/menu-layout.js";
import { clamp, paint, roundedRect } from "../../../kit/src/canvas/pen.js";
import { drawScenery } from "./scenery.js";
import { drawTile } from "./tiles.js";
import { VARIANTS } from "./variants.js";

const VARIANT_LIST = ["main", "small", "big", "daily"];
const centreOf = (area) => [area.x + area.w / 2, area.y + area.h / 2];

export function drawCard(ctx, area, theme, { chosen = false, round = theme.ui.radius.slot } = {}) {
  const { ui, stroke } = theme;
  roundedRect(ctx, area.x + 3, area.y + 3, area.w - 6, area.h - 6, round);
  paint(ctx, chosen ? ui.accentSoft : ui.card, chosen ? ui.accent : ui.ink, chosen ? stroke.bold : stroke.base);
}

export function drawMiniCourt(ctx, area, variant, theme) {
  const { size, beds } = VARIANTS[variant] ?? VARIANTS.main;
  const span = Math.min(area.w, area.h) * 0.62;
  const cell = span / size;
  const cells = Array(size * size).fill(EMPTY);
  [0, 1, size, size + 1, size * size - 1, size * size - 2].forEach((at, order) => (cells[at] = order % 4));
  drawCourt(ctx, { x: area.x + (area.w - span) / 2, y: area.y + (area.h - span) / 2, cell, size }, cells, theme, { beds });
  if (variant === "daily") drawTile(ctx, area.x + area.w - 34, area.y + 8, 26, 2, theme);
}

function seatArt(ctx, area, seat, theme, time) {
  drawCard(ctx, area, theme);
  const [x, y] = centreOf(area);
  ctx.save();
  if (seat.away) ctx.globalAlpha = 0.45;
  drawBadge(ctx, x, y, area.w * 0.72, { ...seat.player, thinking: seat.calling, face: seat.here ? "happy" : "neutral", time });
  ctx.restore();
  if (!seat.here && !seat.calling) drawButton(ctx, "call", area.x + area.w - 18, area.y + 18, 32, theme, { fill: theme.ui.accent });
  if (seat.here) drawButton(ctx, "check", area.x + area.w - 18, area.y + 18, 32, theme, { fill: theme.ui.good });
}

function homeTarget(ctx, target, state, seat, theme, time) {
  const [x, y] = centreOf(target);
  const size = Math.min(target.w, target.h);
  if (target.kind === "avatar") {
    drawCard(ctx, target, theme, { round: size / 2 });
    drawAvatar(ctx, x, y + size * 0.05, size * 0.66, { ...state.player, face: "happy", time });
  } else if (target.kind === "looks") drawButton(ctx, "mosaic", x, y, size - 8, theme, { fill: theme.ui.accent });
  else if (target.kind === "variant") {
    drawCard(ctx, target, theme, { chosen: state.variant === target.value });
    drawMiniCourt(ctx, target, target.value, theme);
  } else if (target.kind === "rival" && seat) seatArt(ctx, target, seat, theme, time);
  else if (target.kind === "play") drawButton(ctx, "play", x, y, size, theme);
  else if (target.kind === "speaker") drawButton(ctx, "speaker", x, y, Math.min(44, size - 12), theme, { level: state.sound.level });
  else if (target.kind === "music") drawButton(ctx, "music", x, y, Math.min(44, size - 12), theme, { off: !state.sound.music });
}

export function drawHome(ctx, state, seat, theme, time) {
  const { width, height } = state;
  ctx.save();
  drawScenery(ctx, state.progress.chosen.court, { w: width, h: height }, { x: 0, y: 0, w: width, h: Math.min(150, height * 0.2) }, theme, time);
  const { targets } = homeLayout(width, height, { variants: VARIANT_LIST, rival: Boolean(seat), fill: state.fill });
  for (const target of targets) homeTarget(ctx, target, state, seat, theme, time);
  if (state.sound.open && state.layout) drawVolume(ctx, state.layout.volume, state.sound.volume, theme);
  ctx.restore();
}

function lookArt(ctx, area, kind, look, theme, time) {
  const [x, y] = centreOf(area);
  if (kind === "effect") {
    drawLineEffect(ctx, look, x, y, area.w * 0.62, (time * 0.4) % 1, theme);
    return;
  }
  ctx.save();
  roundedRect(ctx, area.x + 6, area.y + 6, area.w - 12, area.h - 12, theme.ui.radius.slot - 4);
  ctx.clip();
  drawScenery(ctx, look, { w: area.x + area.w, h: area.y + area.h }, { x: area.x, y: area.y, w: area.w, h: area.h * 0.5 }, theme, time);
  ctx.restore();
  drawMiniCourt(ctx, { x: area.x, y: area.y + area.h * 0.28, w: area.w, h: area.h * 0.7 }, "main", theme);
}

function shakeOf(state, index, time) {
  const moment = state.moments.find((one) => one.kind === "shake" && one.index === index);
  return moment ? clamp((time * 1000 - moment.start) / moment.duration) : 0;
}

function tab(ctx, target, state, theme, time) {
  drawCard(ctx, target, theme, { chosen: state.looks === target.value });
  const [x, y] = centreOf(target);
  if (target.value === "effect") drawLineEffect(ctx, "lanterns", x, y, target.w * 0.55, 0.3, theme);
  else drawMiniCourt(ctx, target, "main", theme);
}

export function drawLooks(ctx, state, theme, time) {
  const { width, height } = state;
  const kind = state.looks;
  const looks = LOOKS[kind];
  const owned = PROGRESS.owned(state.progress);
  ctx.save();
  drawScenery(ctx, state.progress.chosen.court, { w: width, h: height }, { x: 0, y: 0, w: 0, h: 0 }, theme, time);
  for (const target of looksLayout(width, height, { kind, count: looks.length, fill: state.fill }).targets) {
    if (target.kind === "done") drawButton(ctx, "check", ...centreOf(target), target.w - 8, theme, { fill: theme.ui.good });
    if (target.kind === "tab") tab(ctx, target, state, theme, time);
    if (target.kind !== "look") continue;
    const look = looks[target.value];
    const chosen = state.progress.chosen[kind] === look;
    drawCard(ctx, target, theme, { chosen });
    if (owned.includes(look)) lookArt(ctx, target, kind, look, theme, time);
    else drawWrapped(ctx, { x: target.x + target.w * 0.18, y: target.y + target.h * 0.14, w: target.w * 0.64, h: target.h * 0.68 }, shakeOf(state, target.value, time), theme);
    if (chosen) drawButton(ctx, "check", target.x + target.w - 16, target.y + 16, 28, theme, { fill: theme.ui.good });
  }
  ctx.restore();
}
