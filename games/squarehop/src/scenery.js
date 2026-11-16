import { circle, ellipse, hash, line, paint, polygon, roundedRect, starPath } from "../../../kit/src/canvas/pen.js";

function flower(ctx, x, y, size, petal, look) {
  line(ctx, [[x, y], [x, y + size * 1.3]], look.leafDark, size * 0.18);
  for (let at = 0; at < 5; at += 1) {
    const angle = (at * Math.PI * 2) / 5;
    circle(ctx, x + Math.cos(angle) * size * 0.35, y + Math.sin(angle) * size * 0.35, size * 0.28, petal);
  }
  circle(ctx, x, y, size * 0.23, look.heart);
}

function tree(ctx, x, y, size, look, ink) {
  roundedRect(ctx, x - size * 0.09, y, size * 0.18, size * 0.65, size * 0.06);
  paint(ctx, look.trunk, null, 0);
  ellipse(ctx, x, y, size * 0.48, size * 0.55, look.leafDark, ink, size * 0.05);
  ellipse(ctx, x - size * 0.27, y + size * 0.14, size * 0.34, size * 0.36, look.leaf, ink, size * 0.04);
  ellipse(ctx, x + size * 0.28, y + size * 0.16, size * 0.32, size * 0.35, look.leafLight, ink, size * 0.04);
}

function garden(ctx, { x, y, w, h }, look, ink, time) {
  ctx.fillStyle = look.ground;
  ctx.fillRect(x, y, w, h);
  ellipse(ctx, x + w * 0.16, y + h * 0.24, w * 0.18, h * 0.16, look.patch);
  ellipse(ctx, x + w * 0.85, y + h * 0.75, w * 0.22, h * 0.2, look.patch);
  tree(ctx, x + 26, y + 52, Math.min(42, w * 0.1), look, ink);
  tree(ctx, x + w - 25, y + h - 70, Math.min(38, w * 0.09), look, ink);
  for (let at = 0; at < 7; at += 1) flower(ctx, x + 15 + hash(at + 3) * (w - 30), y + 20 + hash(at + 19) * (h - 40), 4 + hash(at) * 2, at % 2 ? look.petal : look.petalAlt, look);
  const cloud = x + w * 0.72 + Math.sin(time * 0.15) * 4;
  ellipse(ctx, cloud, y + 24, 27, 10, look.cloud);
  ellipse(ctx, cloud - 12, y + 20, 13, 11, look.cloud);
}

function building(ctx, x, y, w, h, colour, seed, look, ink) {
  roundedRect(ctx, x, y - h, w, h, w * 0.08);
  paint(ctx, colour, ink, 2);
  const cols = Math.max(1, Math.floor(w / 20));
  const rows = Math.max(1, Math.floor(h / 25));
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      ctx.fillStyle = hash(seed + row * 7 + col) > 0.35 ? look.window : look.towerDark;
      ctx.fillRect(x + 7 + (col * (w - 12)) / cols, y - h + 9 + row * 23, 6, 9);
    }
  }
}

function city(ctx, { x, y, w, h }, look, ink) {
  ctx.fillStyle = look.ground;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = look.sky;
  ctx.fillRect(x, y, w, h * 0.28);
  building(ctx, x + 5, y + h * 0.37, w * 0.18, h * 0.25, look.tower, 2, look, ink);
  building(ctx, x + w * 0.76, y + h * 0.4, w * 0.2, h * 0.29, look.towerDark, 7, look, ink);
  building(ctx, x + w * 0.03, y + h * 0.88, w * 0.13, h * 0.23, look.towerDark, 12, look, ink);
  building(ctx, x + w * 0.85, y + h * 0.86, w * 0.12, h * 0.2, look.tower, 17, look, ink);
  line(ctx, [[x + 10, y + h * 0.55], [x + 10, y + h * 0.68]], ink, 3);
  ellipse(ctx, x + 10, y + h * 0.52, 8, 6, look.lamp, ink, 2);
}

function moon(ctx, { x, y, w, h }, look, ink) {
  ctx.fillStyle = look.ground;
  ctx.fillRect(x, y, w, h);
  for (let at = 0; at < 18; at += 1) {
    starPath(ctx, x + hash(at + 31) * w, y + hash(at + 61) * h, 2.5 + hash(at) * 2, 1);
    paint(ctx, look.star, null, 0);
  }
  circle(ctx, x + w * 0.12, y + h * 0.14, 32, look.rock, ink, 2);
  ellipse(ctx, x + w * 0.1, y + h * 0.13, 8, 6, look.rockDark);
  ellipse(ctx, x + w * 0.87, y + h * 0.82, 52, 20, look.rockDark);
  ellipse(ctx, x + w * 0.87, y + h * 0.8, 52, 18, look.rock, ink, 2);
  polygon(ctx, [[x + w * 0.85, y + 35], [x + w * 0.89, y + 35], [x + w * 0.87, y + 14]], look.flag, ink, 2);
  line(ctx, [[x + w * 0.87, y + 34], [x + w * 0.87, y + 61]], ink, 3);
}

const DRAW = { garden, city, moon };

export function drawScenery(ctx, name, area, theme, time = 0) {
  const known = DRAW[name] ? name : "garden";
  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.w, area.h);
  ctx.clip();
  DRAW[known](ctx, area, theme.art.sceneries[known], theme.art.ink, time);
  ctx.restore();
}
