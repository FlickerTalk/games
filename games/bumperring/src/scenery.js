import { TAU, ellipse, line, paint, roundedRect } from "../../../kit/src/canvas/pen.js";
import { BAR, ICE, TRAMPOLINE } from "./arena.js";
import { SQUASH } from "./layout.js";
import { rimmed } from "./rim.js";

const DESIGN_WIDTH = 384;

const unitOf = (area) => Math.min(1, Math.max(0.3, area.w / DESIGN_WIDTH));

function waves(ctx, { x, y, w, h }, look, unit, time) {
  ctx.save();
  ctx.strokeStyle = look.wave;
  ctx.lineWidth = Math.max(1.5, 3 * unit);
  ctx.lineCap = "round";
  const [across, down] = [105 * unit, 72 * unit];
  for (let row = 0; row * down + 46 * unit < h - 12 * unit; row += 1) {
    for (let col = 0; col * across < w; col += 1) {
      const px = x + col * across + (row % 2) * 42 * unit + Math.sin(time * 0.8 + row + col) * 8 * unit;
      if (px < x + 24 * unit || px > x + w - 24 * unit) continue;
      ctx.beginPath();
      ctx.arc(px, y + row * down + 46 * unit, 22 * unit, Math.PI * 0.12, Math.PI * 0.88);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function pond(ctx, { x, y, w, h }, look, ink, unit, time) {
  for (let at = 0; at < 5; at += 1) {
    const px = x + 30 * unit + ((at * 97 + 42) % Math.max(1, w - 60 * unit));
    const py = y + 16 * unit + ((at * 173 + 120) % Math.max(1, h - 32 * unit));
    ellipse(ctx, px, py, 23 * unit, 10 * unit, look.lily, ink, 2);
    line(ctx, [[px, py], [px + 18 * unit, py - 4 * unit]], look.vein, 2);
  }
  for (const side of [x + 18 * unit, x + w - 30 * unit]) {
    for (let at = 0; at < 3; at += 1) {
      const sway = Math.sin(time * 1.2 + at) * 3 * unit;
      line(ctx, [[side + at * 6 * unit, y + h * 0.23], [side + at * 6 * unit + sway, y + h * 0.17 - at * 8 * unit]], look.reed, Math.max(2, 5 * unit));
    }
  }
}

function pool(ctx, { x, y, w, h }, look, ink, unit) {
  const edge = 18 * unit;
  ctx.fillStyle = look.edge;
  ctx.fillRect(x, y, w, edge);
  ctx.fillRect(x, y + h - edge, w, edge);
  ctx.fillRect(x, y, edge, h);
  ctx.fillRect(x + w - edge, y, edge, h);
  for (let at = 0; 30 * unit + at * 54 * unit < w - 12 * unit; at += 1) {
    ellipse(ctx, x + 30 * unit + at * 54 * unit, y + edge, 8 * unit, 5 * unit, at % 2 ? look.float : look.floatAlt, ink, 1.5);
  }
}

function puff(ctx, x, y, size, look) {
  ellipse(ctx, x - size * 0.25, y, size * 0.28, size * 0.18, look.cloud);
  ellipse(ctx, x, y - size * 0.1, size * 0.34, size * 0.25, look.cloud);
  ellipse(ctx, x + size * 0.3, y, size * 0.3, size * 0.18, look.cloud);
  roundedRect(ctx, x - size * 0.48, y - size * 0.02, size * 0.96, size * 0.2, size * 0.1);
  paint(ctx, look.cloud, null, 0);
  line(ctx, [[x - size * 0.3, y + size * 0.19], [x + size * 0.3, y + size * 0.19]], look.shade, Math.max(1.5, size * 0.04));
}

function cloud(ctx, { x, y, w, h }, look, ink, unit, time) {
  for (let at = 0; at < 7; at += 1) {
    const size = (65 + (at % 3) * 18) * unit;
    const px = x + size * 0.6 + ((at * 193 + 50) % Math.max(1, w - size * 1.2)) + Math.sin(time * 0.3 + at) * 4 * unit;
    const py = y + size * 0.4 + ((at * 157 + 90) % Math.max(1, h - size * 0.8));
    puff(ctx, Math.min(x + w - size * 0.62, Math.max(x + size * 0.62, px)), py, size, look);
  }
}

const DETAILS = { pond, pool, cloud };

export function drawPlace(ctx, area, place, theme, time = 0) {
  const name = DETAILS[place] ? place : "pond";
  const look = theme.art.places[name];
  const unit = unitOf(area);
  ctx.save();
  ctx.lineJoin = "round";
  ctx.fillStyle = look.water;
  ctx.fillRect(area.x, area.y, area.w, area.h);
  if (name !== "cloud") waves(ctx, area, look, unit, time);
  rimmed(ctx, theme, () => DETAILS[name](ctx, area, look, theme.art.ink, unit, time));
  ctx.restore();
}

function ice(ctx, x, y, r, ry, look, turn) {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.9, ry * 0.84, 0, 0, TAU);
  ctx.clip();
  const [cx, cy] = [x + turn * ICE.x * r, y + turn * ICE.y * ry];
  ellipse(ctx, cx, cy, r * ICE.rx, ry * ICE.ry, look.ice, look.iceEdge, 3);
  line(ctx, [[cx - turn * r * 0.22, cy - ry * 0.12], [cx - turn * r * 0.06, cy + ry * 0.08], [cx - turn * r * 0.17, cy + ry * 0.35]], look.iceLight, 3);
  ctx.restore();
}

function trampoline(ctx, x, y, r, ry, look, ink) {
  ellipse(ctx, x, y, r * (TRAMPOLINE + 0.12), ry * (TRAMPOLINE + 0.12), look.rubber, ink, 3);
  ellipse(ctx, x, y, r * TRAMPOLINE, ry * TRAMPOLINE, look.pad, look.padEdge, 4);
}

function turningBar(ctx, x, y, r, ry, bar, theme) {
  const [dx, dy] = [bar.x * r * BAR.half, bar.y * ry * BAR.half];
  const thick = Math.max(6, r * 0.12);
  line(ctx, [[x - dx, y - dy], [x + dx, y + dy]], theme.art.ink, thick);
  line(ctx, [[x - dx, y - dy - thick * 0.12], [x + dx, y + dy - thick * 0.12]], theme.art.bar.body, thick * 0.62);
  ellipse(ctx, x, y, thick * 0.95, thick * 0.7, theme.art.bar.hub, theme.art.ink, 3);
}

export function drawPlatform(ctx, x, y, radius, theme, { variant = "plain", size = 1, bar = { x: 1, y: 0 }, turn = 1 } = {}) {
  const look = theme.art.platform;
  const { ink } = theme.art;
  const r = radius * size;
  const ry = r * SQUASH;
  ctx.save();
  ctx.lineJoin = "round";
  rimmed(ctx, theme, () => {
    ellipse(ctx, x, y + r * 0.12, r, ry, look.side, ink, 3);
    ctx.fillStyle = look.side;
    ctx.fillRect(x - r, y, r * 2, r * 0.12);
    ellipse(ctx, x, y, r, ry, variant === "trampoline" ? look.rubberLight : look.top, ink, 3);
  });
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.91, ry * 0.86, 0, 0, TAU);
  paint(ctx, null, look.edge, 4);
  if (variant === "ice") ice(ctx, x, y, r, ry, look, turn);
  if (variant === "trampoline") trampoline(ctx, x, y, r, ry, look, ink);
  if (variant === "bar") turningBar(ctx, x, y, r, ry, bar, theme);
  ctx.restore();
}
