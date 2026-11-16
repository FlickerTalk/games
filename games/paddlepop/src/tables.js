import { circle, ellipse, line, paint, roundedRect, starPath } from "../../../kit/src/canvas/pen.js";
import { rimmed } from "./paddles.js";

const DESIGN_WIDTH = 348;
const PADS = [[0.12, 0.2, 18], [0.86, 0.24, 22], [0.15, 0.72, 23], [0.85, 0.76, 17], [0.3, 0.48, 12], [0.72, 0.55, 13]];
const SKY = [[0.1, 0.14], [0.27, 0.24], [0.75, 0.15], [0.91, 0.37], [0.13, 0.55], [0.88, 0.65], [0.2, 0.85], [0.68, 0.88], [0.48, 0.18], [0.51, 0.78]];

function lily(ctx, x, y, size, turn, look, ink) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(turn);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, size, 0.22, Math.PI * 1.85);
  ctx.closePath();
  paint(ctx, look.lily, ink, 2);
  line(ctx, [[0, 0], [size * 0.7, size * 0.35]], look.lilyLight, 2);
  ctx.restore();
}

function pond(ctx, { x, y, w, h }, look, ink, unit, time) {
  PADS.forEach(([px, py, size], at) => lily(ctx, x + w * px, y + h * py, size * unit, at + Math.sin(time + at) * 0.03, look, ink));
  for (const side of [-1, 1]) {
    const rx = x + w * (side < 0 ? 0.06 : 0.94);
    line(ctx, [[rx, y + h * 0.43], [rx + side * 4 * unit, y + h * 0.36]], look.reed, 4 * unit);
    line(ctx, [[rx, y + h * 0.47], [rx - side * 3 * unit, y + h * 0.4]], look.reed, 4 * unit);
  }
}

function ice(ctx, { x, y, w, h }, look, ink, unit) {
  ctx.save();
  ctx.strokeStyle = look.mark;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  for (let at = 0; at < 5; at += 1) {
    ctx.beginPath();
    ctx.arc(x + w * (0.15 + at * 0.17), y + h * (0.2 + (at % 3) * 0.25), (22 + at * 2) * unit, Math.PI * 0.2, Math.PI * 0.95);
    ctx.stroke();
  }
  ctx.restore();
  for (const [px, py] of [[0.09, 0.12], [0.9, 0.16], [0.1, 0.87], [0.9, 0.86]]) {
    ctx.save();
    ctx.translate(x + w * px, y + h * py);
    ctx.rotate(0.2);
    starPath(ctx, 0, 0, 7 * unit, 3.4 * unit);
    paint(ctx, look.sparkle, ink, 2);
    ctx.restore();
  }
}

function skyPlanet(ctx, x, y, radius, fill, look, ink) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.28);
  ellipse(ctx, 0, 0, radius * 1.55, radius * 0.48, null, look.ring, 4);
  ctx.restore();
  circle(ctx, x, y, radius, fill, ink, 2);
}

function space(ctx, { x, y, w, h }, look, ink, unit, time) {
  SKY.forEach(([px, py], at) => circle(ctx, x + w * px, y + h * py, (2.5 + Math.sin(time * 2 + at) * 0.7) * unit, at % 3 ? look.star : look.starCool));
  skyPlanet(ctx, x + w * 0.12, y + h * 0.35, 17 * unit, look.planet, look, ink);
  skyPlanet(ctx, x + w * 0.86, y + h * 0.56, 20 * unit, look.planetWarm, look, ink);
}

function dashes(ctx, { x, y, w, h }, look, unit) {
  ctx.save();
  roundedRect(ctx, x, y, w, h, Math.min(w, h) * 0.055);
  ctx.clip();
  ctx.setLineDash([10 * unit, 10 * unit]);
  line(ctx, [[x + 12 * unit, y + h / 2], [x + w - 12 * unit, y + h / 2]], look.line, 3 * unit);
  line(ctx, [[x + w * 0.25, y + 13 * unit], [x + w * 0.75, y + 13 * unit]], look.far, 6 * unit);
  line(ctx, [[x + w * 0.25, y + h - 13 * unit], [x + w * 0.75, y + h - 13 * unit]], look.near, 6 * unit);
  ctx.setLineDash([]);
  ctx.restore();
}

const SCENES = { pond, ice, space };

export function drawTable(ctx, area, lookName, theme, time = 0, { detail = 1 } = {}) {
  const look = theme.art.tables[lookName] ?? theme.art.tables.pond;
  const scene = SCENES[lookName] ?? pond;
  const { ink } = theme.art;
  const unit = (area.w / DESIGN_WIDTH) * detail;
  const { x, y, w, h } = area;
  ctx.save();
  ctx.lineJoin = "round";
  rimmed(ctx, theme, () => {
    roundedRect(ctx, x - 6, y - 6, w + 12, h + 12, Math.min(w, h) * 0.065);
    paint(ctx, look.frame, ink, theme.stroke.base);
    roundedRect(ctx, x, y, w, h, Math.min(w, h) * 0.055);
    paint(ctx, look.ground, ink, theme.stroke.base);
    scene(ctx, area, look, ink, unit, time);
  });
  dashes(ctx, area, look, Math.max(0.5, unit / detail));
  ctx.restore();
}

export function drawTableIcon(ctx, lookName, box, theme, time = 0) {
  const w = box.w - 20;
  const h = Math.min(box.h - 20, w * 0.72);
  drawTable(ctx, { x: box.x + 10, y: box.y + (box.h - h) / 2, w, h }, lookName, theme, time, { detail: 2.2 });
}
