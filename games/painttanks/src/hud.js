import { DIGITS, drawDigits, drawPortrait, formatNumber } from "../../../kit/src/canvas/index.js";
import { centreOf } from "../../../kit/src/canvas/layout.js";
import { circle, clamp, ellipse, line, polygon } from "../../../kit/src/canvas/pen.js";

const WAITING = 0.45;
const RANGE = { angle: [0, 90], power: [0, 99], torpedo: [-45, 45] };

function surface(ui, pressed) {
  return pressed ? { fill: ui.pressed, edge: ui.accent } : { fill: ui.surface, edge: ui.border };
}

function ticks(ctx, x, y, r, ui) {
  for (let tick = 0; tick <= 10; tick += 1) {
    const turn = Math.PI * 0.75 + (tick / 10) * Math.PI * 1.5;
    const inner = r * (tick % 5 === 0 ? 0.7 : 0.78);
    line(ctx, [[x + Math.cos(turn) * inner, y + Math.sin(turn) * inner], [x + Math.cos(turn) * r * 0.88, y + Math.sin(turn) * r * 0.88]], ui.muted, ui.line);
  }
}

function sign(ctx, kind, x, y, r, ui) {
  if (kind === "power") {
    polygon(ctx, [[x - 3, y + r * 0.42], [x + 6, y + r * 0.42], [x, y + r * 0.55], [x + 7, y + r * 0.55], [x - 5, y + r * 0.74], [x - 1, y + r * 0.6], [x - 8, y + r * 0.6]], ui.accent);
    return;
  }
  line(ctx, [[x - r * 0.26, y + r * 0.66], [x + r * 0.26, y + r * 0.66]], ui.text, ui.line);
  line(ctx, [[x - r * 0.26, y + r * 0.66], [x + r * 0.16, y + r * 0.42]], ui.text, ui.line);
}

export function drawDial(ctx, area, value, kind, ui, { pressed = false, lang = "en" } = {}) {
  const [x, y] = centreOf(area);
  const r = Math.min(area.w, area.h) / 2 - ui.line;
  const [low, high] = RANGE[kind] ?? RANGE.angle;
  const share = clamp((value - low) / (high - low));
  const look = surface(ui, pressed);
  ctx.save();
  circle(ctx, x, y, r, look.fill, look.edge, ui.line);
  ticks(ctx, x, y, r, ui);
  const turn = Math.PI * 0.75 + share * Math.PI * 1.5;
  line(ctx, [[x + Math.cos(turn) * r * 0.5, y + Math.sin(turn) * r * 0.5], [x + Math.cos(turn) * r * 0.86, y + Math.sin(turn) * r * 0.86]], ui.accent, ui.line * 2);
  drawDigits(ctx, formatNumber(Math.round(value), lang), x, y - r * 0.06, Math.max(DIGITS.best, Math.round(r * 0.5)), ui.text, "center");
  sign(ctx, kind, x, y, r, ui);
  ctx.restore();
}

function crosshair(ctx, x, y, d, colour, ui) {
  circle(ctx, x, y, d * 0.23, null, colour, ui.line);
  circle(ctx, x, y, d * 0.1, null, colour, ui.line);
  for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) line(ctx, [[x + dx * d * 0.19, y + dy * d * 0.19], [x + dx * d * 0.34, y + dy * d * 0.34]], colour, ui.line);
}

export function drawFireButton(ctx, area, ui, { pressed = false, waiting = false } = {}) {
  const [x, y] = centreOf(area);
  const d = Math.min(area.w, area.h);
  const held = pressed && !waiting;
  ctx.save();
  if (waiting) ctx.globalAlpha = WAITING;
  circle(ctx, x, y, d / 2 - ui.line, held ? ui.pressed : ui.accent, ui.accent, ui.line);
  crosshair(ctx, x, y, d, held ? ui.accent : ui.onAccent, ui);
  ctx.restore();
}

export function drawDiveButton(ctx, area, ui, { under = false, pressed = false, time = 0 } = {}) {
  const [x, y] = centreOf(area);
  const d = Math.min(area.w, area.h);
  const look = surface(ui, pressed);
  const way = under ? -1 : 1;
  const tip = y - d * 0.1 + way * d * 0.15;
  ctx.save();
  circle(ctx, x, y, d / 2 - ui.line, look.fill, look.edge, ui.line);
  line(ctx, [[x, y - d * 0.1 - way * d * 0.14], [x, tip]], ui.text, ui.line);
  line(ctx, [[x - d * 0.11, tip - way * d * 0.11], [x, tip], [x + d * 0.11, tip - way * d * 0.11]], ui.text, ui.line);
  for (let wave = 0; wave < 3; wave += 1) {
    const rise = Math.sin(time * 2 + wave) * 2;
    line(ctx, [[x - d * 0.3 + wave * d * 0.2, y + d * 0.22 + rise], [x - d * 0.16 + wave * d * 0.2, y + d * 0.22 + rise]], ui.accent, ui.line);
  }
  ctx.restore();
}

export function drawWindFlag(ctx, x, y, size, wind, time, ui) {
  const way = wind < 0 ? -1 : 1;
  const strength = clamp(Math.abs(wind), 0.15, 1);
  const wave = Math.sin(time * 4) * size * 0.045 * strength;
  ctx.save();
  ctx.translate(x, y);
  line(ctx, [[0, 0], [0, -size]], ui.text, ui.line);
  ellipse(ctx, 0, -size * 1.035, size * 0.07, size * 0.07, ui.accent, ui.text, ui.line);
  polygon(ctx, [[0, -size * 0.94], [way * size * 0.65 * strength, -size * 0.8 + wave], [way * size * 0.48 * strength, -size * 0.57], [0, -size * 0.65]], ui.accent, ui.text, ui.line);
  line(ctx, [[way * size * 0.12, -size * 0.86], [way * size * 0.39 * strength, -size * 0.77 + wave]], ui.onAccent, ui.line);
  ctx.restore();
}

export function drawOwnerMark(ctx, x, y, size, player, ui, { turn = false, thinking = false, time = 0 } = {}) {
  const lift = turn ? Math.sin(time * 4) * size * 0.06 : 0;
  ctx.save();
  ctx.translate(x, y + lift);
  if (turn) polygon(ctx, [[-size * 0.24, size * 0.46], [size * 0.24, size * 0.46], [0, size * 0.8]], ui.accent, ui.page, ui.line);
  drawPortrait(ctx, 0, 0, size, { player, thinking }, ui, { time });
  if (turn) circle(ctx, 0, 0, size * 0.5, null, ui.accent, ui.line * 1.5);
  ctx.restore();
}
