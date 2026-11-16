import { circle, ellipse, line, paint, polygon, roundedRect } from "../../../kit/src/canvas/pen.js";

function cloud(ctx, x, y, size, colour) {
  circle(ctx, x - size * 0.25, y, size * 0.22, colour);
  circle(ctx, x, y - size * 0.12, size * 0.3, colour);
  circle(ctx, x + size * 0.3, y, size * 0.24, colour);
  roundedRect(ctx, x - size * 0.45, y, size * 0.9, size * 0.2, size * 0.1);
  paint(ctx, colour);
}

function castle(ctx, { w, h, horizon, unit }, look, time) {
  ctx.fillStyle = look.sky;
  ctx.fillRect(0, 0, w, h);
  cloud(ctx, w * 0.18, horizon * 0.25, w * 0.09, look.cloud);
  cloud(ctx, w * 0.78, horizon * 0.37, w * 0.07, look.cloud);
  ctx.fillStyle = look.wall;
  ctx.fillRect(w * 0.06, horizon * 0.47, w * 0.88, horizon * 0.53);
  for (let at = 0; at < 8; at += 1) ctx.fillRect(w * (0.06 + at * 0.1164), horizon * 0.4, w * 0.065, horizon * 0.12);
  ctx.strokeStyle = look.brick;
  ctx.lineWidth = 2 * unit;
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 5; column += 1) ctx.strokeRect(w * (0.1 + column * 0.16 + (row % 2) * 0.05), horizon * (0.58 + row * 0.13), w * 0.1, horizon * 0.08);
  }
  line(ctx, [[w * 0.5, horizon * 0.43], [w * 0.5, horizon * 0.15]], look.line, 3 * unit);
  polygon(ctx, [[w * 0.5, horizon * 0.16], [w * 0.59 + Math.sin(time * 1.6) * w * 0.004, horizon * 0.21], [w * 0.5, horizon * 0.28]], look.flag, look.line, 2 * unit);
  ctx.fillStyle = look.grass;
  ctx.fillRect(0, horizon, w, h - horizon);
  ellipse(ctx, w * 0.5, horizon + (h - horizon) * 0.75, w * 0.43, (h - horizon) * 0.5, look.mound);
  for (let at = 0; at < 7; at += 1) {
    const x = w * (0.08 + at * 0.14);
    line(ctx, [[x, horizon + 8 * unit], [x - 4 * unit, horizon - 5 * unit]], look.blade, 2 * unit);
    line(ctx, [[x, horizon + 8 * unit], [x + 5 * unit, horizon - 3 * unit]], look.blade, 2 * unit);
  }
}

const CUSHIONS = [[0.04, 0.12, 0.24, "pillowAlt", -0.1], [0.72, 0.2, 0.25, "pillow", 0.12], [0.0, 0.62, 0.22, "rug", 0.08], [0.8, 0.7, 0.2, "pillowAlt", -0.08]];

function pillows(ctx, { w, h, horizon, unit }, look) {
  const floor = h - horizon;
  ctx.fillStyle = look.wall;
  ctx.fillRect(0, 0, w, h);
  polygon(ctx, [[w * 0.15, horizon], [w * 0.38, horizon * 0.35], [w * 0.62, horizon]], look.tent, look.line, 2 * unit);
  polygon(ctx, [[w * 0.4, horizon], [w * 0.68, horizon * 0.25], [w * 0.88, horizon]], look.sheet, look.line, 2 * unit);
  line(ctx, [[w * 0.68, horizon * 0.25], [w * 0.68, horizon]], look.line, 2 * unit);
  line(ctx, [[0, horizon * 0.18], [w, horizon * 0.26]], look.line, 2 * unit);
  for (let at = 0; at < 7; at += 1) {
    const x = w * (0.06 + at * 0.145);
    const y = horizon * (0.185 + at * 0.0115);
    polygon(ctx, [[x, y], [x + w * 0.07, y + 2 * unit], [x + w * 0.035, y + horizon * 0.085]], at % 2 ? look.flag : look.flagAlt, look.line, 1.5 * unit);
  }
  ctx.fillStyle = look.floor;
  ctx.fillRect(0, horizon, w, floor);
  ellipse(ctx, w * 0.5, horizon + floor * 0.6, w * 0.43, floor * 0.45, look.rug);
  for (const [px, py, size, colour, turn] of CUSHIONS) {
    const tall = Math.min(floor * 0.28, w * 0.12);
    ctx.save();
    ctx.translate(w * px, horizon + floor * py);
    ctx.rotate(turn);
    roundedRect(ctx, 0, 0, w * size, tall, tall * 0.35);
    paint(ctx, look[colour], look.line, 2.5 * unit);
    line(ctx, [[w * size * 0.1, tall / 2], [w * size * 0.9, tall / 2]], look.seam, 2 * unit);
    ctx.restore();
  }
}

function treehouse(ctx, { w, h, horizon, unit }, look, time) {
  const plank = Math.max(10 * unit, (h - horizon) * 0.22);
  ctx.fillStyle = look.sky;
  ctx.fillRect(0, 0, w, h);
  for (let at = 0; at < 6; at += 1) ellipse(ctx, w * (0.06 + at * 0.19), horizon * (0.55 + (at % 2) * 0.12), w * 0.15, horizon * 0.29, at % 2 ? look.leaf : look.leafLight);
  ctx.fillStyle = look.water;
  ctx.fillRect(0, horizon, w, h - horizon);
  for (let at = 0; at < 5; at += 1) line(ctx, [[w * (0.1 + at * 0.2), h - (h - horizon) * 0.2], [w * (0.16 + at * 0.2), h - (h - horizon) * 0.2]], look.ripple, 3 * unit);
  for (let at = 0; at < 10; at += 1) {
    const x = (at * w) / 9 - w * 0.04;
    roundedRect(ctx, x, horizon, w / 9 - 3 * unit, plank, 4 * unit);
    paint(ctx, at % 2 ? look.plank : look.wood, look.line, 2 * unit);
    circle(ctx, x + 8 * unit, horizon + plank / 2, 2 * unit, look.line);
  }
  line(ctx, [[0, horizon * 0.7], [w * 0.5, horizon * 0.83], [w, horizon * 0.7]], look.rope, 6 * unit);
  for (let at = 0; at < 6; at += 1) line(ctx, [[(w * at) / 5, horizon * (0.7 + 0.13 * (1 - Math.abs(at - 2.5) / 2.5))], [(w * at) / 5, horizon]], look.line, 2.5 * unit);
  const sway = Math.sin(time * 1.2) * w * 0.006;
  ellipse(ctx, w * 0.08 + sway, horizon * 0.2, w * 0.16, horizon * 0.19, look.leaf, look.line, 2.5 * unit);
  ellipse(ctx, w * 0.93 - sway, horizon * 0.17, w * 0.18, horizon * 0.2, look.leafLight, look.line, 2.5 * unit);
}

const PLACES = { castle, pillows, treehouse };

// horizon: where the ground starts, in px from the top of the area
export function drawScenery(ctx, area, scenery, theme, time, { horizon = area.h * 0.64 } = {}) {
  const look = theme.art.sceneries[scenery] ?? theme.art.sceneries.castle;
  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.w, area.h);
  ctx.clip();
  ctx.translate(area.x, area.y);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  (PLACES[scenery] ?? castle)(ctx, { w: area.w, h: area.h, horizon, unit: Math.min(1, area.w / 360) }, look, time);
  ctx.restore();
}

export function drawGroundShade(ctx, x, y, size, scenery, theme) {
  const look = theme.art.sceneries[scenery] ?? theme.art.sceneries.castle;
  ctx.save();
  ctx.globalAlpha = 0.2;
  ellipse(ctx, x, y + size * 0.02, size * 0.3, size * 0.06, look.shade);
  ctx.restore();
}
