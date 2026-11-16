import { circle, clamp, ellipse, line, paint, polygon, roundedRect, starPath } from "../../../kit/src/canvas/pen.js";
import { drawTile } from "./tiles.js";

export const LINE_EFFECTS = Object.freeze(["lanterns", "birds", "leaves", "bubbles", "water", "sparks"]);

const LIGHT_END = 0.22;
const LIFT_START = 0.12;
const STAGGER = 0.025;
const RISE = 0.55;
const LAYER = 0.08;

function lantern(ctx, size, t, { art, stroke }) {
  const bob = Math.sin(t * Math.PI * 2) * size * 0.03;
  roundedRect(ctx, -size * 0.28, -size * 0.38 + bob, size * 0.56, size * 0.65, size * 0.2);
  paint(ctx, art.effects.lantern, art.ink, Math.max(stroke.hair, size * 0.045));
  line(ctx, [[-size * 0.2, -size * 0.4 + bob], [size * 0.2, -size * 0.4 + bob]], art.ink, size * 0.05);
  line(ctx, [[0, size * 0.27 + bob], [0, size * 0.48 + bob]], art.ink, size * 0.04);
  line(ctx, [[-size * 0.12, -size * 0.22 + bob], [-size * 0.12, size * 0.12 + bob]], art.effects.paper, size * 0.045);
}

function bird(ctx, size, t, { art, stroke }) {
  const flap = Math.sin(t * Math.PI * 6) * size * 0.12;
  const points = [[-0.48, -0.12], [-0.08, -0.02], [0, 0.14], [0.08, -0.02], [0.48, -0.12], [0.22, 0.2], [0, 0.28], [-0.22, 0.2]];
  polygon(ctx, points.map(([x, y], at) => [x * size, y * size - (at === 0 || at === 4 ? flap : 0)]), art.effects.paper, art.ink, Math.max(stroke.hair, size * 0.04));
  line(ctx, [[-size * 0.08, size * 0.1], [0, size * 0.17], [size * 0.08, size * 0.1]], art.ink, size * 0.03);
}

function leafToken(ctx, size, t, { art, stroke }) {
  ctx.rotate(Math.sin(t * Math.PI * 4) * 0.3);
  ctx.beginPath();
  ctx.moveTo(-size * 0.35, size * 0.28);
  ctx.bezierCurveTo(-size * 0.5, -size * 0.32, size * 0.3, -size * 0.48, size * 0.4, -size * 0.24);
  ctx.bezierCurveTo(size * 0.52, size * 0.24, -size * 0.12, size * 0.5, -size * 0.35, size * 0.28);
  paint(ctx, art.effects.leaf, art.ink, Math.max(stroke.hair, size * 0.04));
  line(ctx, [[-size * 0.3, size * 0.3], [size * 0.26, -size * 0.2]], art.effects.paper, size * 0.045);
}

function bubble(ctx, size, t, { art, stroke }) {
  const sway = Math.sin(t * Math.PI * 3) * size * 0.04;
  circle(ctx, sway, 0, size * 0.35, art.effects.bubble, art.effects.water, Math.max(stroke.hair, size * 0.045));
  ctx.beginPath();
  ctx.arc(sway - size * 0.08, -size * 0.08, size * 0.18, Math.PI * 1.05, Math.PI * 1.55);
  ctx.strokeStyle = art.white;
  ctx.lineWidth = Math.max(stroke.hair, size * 0.05);
  ctx.stroke();
  ellipse(ctx, sway + size * 0.3, -size * 0.3, size * 0.1, size * 0.1, null, art.effects.waterLight, Math.max(1, size * 0.03));
}

function water(ctx, size, t, { art }) {
  const drift = Math.sin(t * Math.PI * 4) * size * 0.08;
  const curve = (from, to, rise, colour, width) => {
    ctx.beginPath();
    ctx.moveTo(-size * from, -size * 0.1);
    ctx.bezierCurveTo(-size * 0.2, -size * rise + drift, size * 0.16, size * 0.24 + drift, size * to, -size * 0.08);
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.stroke();
  };
  curve(0.5, 0.5, 0.38, art.effects.water, size * 0.18);
  curve(0.4, 0.38, 0.3, art.effects.waterLight, size * 0.055);
}

function spark(ctx, size, t, { art, stroke }) {
  starPath(ctx, 0, 0, (size * (0.18 + t * 0.34)) / 2);
  paint(ctx, t > 0.35 ? art.effects.spark : art.effects.paper, art.ink, Math.max(stroke.thin, size * 0.03));
  if (t >= 0.5) return;
  for (let ray = 0; ray < 4; ray += 1) {
    const angle = (ray * Math.PI) / 2 + t;
    const at = (reach) => [Math.cos(angle) * size * reach, Math.sin(angle) * size * reach];
    line(ctx, [at(0.25), at(0.42)], art.effects.sparkRay, stroke.thin);
  }
}

const TOKENS = { lanterns: lantern, birds: bird, leaves: leafToken, bubbles: bubble, water, sparks: spark };

export function drawLineEffect(ctx, effect, x, y, size, progress, theme, { column = false } = {}) {
  const token = TOKENS[effect] ?? lantern;
  ctx.save();
  ctx.translate(x, y);
  if (column && effect === "water") ctx.rotate(Math.PI / 2);
  token(ctx, size, clamp(progress), theme);
  ctx.restore();
}

function light(ctx, { x, y, cell, size }, { kind, index }, t, theme) {
  const along = clamp(t / LIGHT_END);
  const span = cell * size;
  const row = kind === "row";
  ctx.save();
  ctx.globalAlpha = (1 - clamp((t - LIGHT_END) / 0.2)) * 0.8;
  ctx.fillStyle = theme.art.glowSoft;
  if (row) ctx.fillRect(x, y + index * cell, span * along, cell);
  else ctx.fillRect(x + index * cell, y, cell, span * along);
  const middle = (index + 0.5) * cell;
  line(ctx, row ? [[x, y + middle], [x + span * along, y + middle]] : [[x + middle, y], [x + middle, y + span * along]], theme.art.effects.paper, Math.max(2, cell * 0.08));
  ctx.restore();
}

function lifted(ctx, where, at, family, local, theme) {
  const { x, y, cell, size } = where;
  ctx.save();
  ctx.globalAlpha = 1 - clamp(local / 0.82);
  drawTile(ctx, x + (at % size) * cell, y + Math.floor(at / size) * cell - Math.sin((local * Math.PI) / 2) * cell * 0.5, cell, family, theme);
  ctx.restore();
}

function drifting(ctx, where, at, effect, local, column, theme) {
  const { x, y, cell, size } = where;
  const high = effect === "lanterns" || effect === "bubbles" ? 2.1 : 1.25;
  const drift = Math.sin(local * Math.PI) * cell * 0.25 + local * cell * 0.65;
  const px = x + ((at % size) + 0.5) * cell + drift;
  const py = y + (Math.floor(at / size) + 0.5) * cell - local * cell * high;
  ctx.save();
  ctx.globalAlpha = clamp((1 - local) * 2.5);
  drawLineEffect(ctx, effect, px, py, cell * 0.82, local, theme, { column });
  ctx.restore();
}

export function drawLineClear(ctx, where, cleared, effect, progress, theme) {
  const t = clamp(progress);
  if (t <= 0 || t >= 1) return;
  if (cleared.kind !== "bed" && t < 0.42) light(ctx, where, cleared, t, theme);
  cleared.cells.forEach(({ at, family }, order) => {
    const local = clamp((t - LIFT_START - order * STAGGER) / RISE);
    if (local < 0.82) lifted(ctx, where, at, family, local, theme);
    if (local > 0.16 && local < 1) drifting(ctx, where, at, effect, local, cleared.kind === "column", theme);
  });
}

export function drawLayeredClear(ctx, where, lines, effect, progress, theme) {
  lines.forEach((cleared, order) => {
    const delay = Math.min(order * LAYER, 0.5);
    drawLineClear(ctx, where, cleared, effect, clamp((progress - delay) / (1 - delay)), theme);
  });
}
