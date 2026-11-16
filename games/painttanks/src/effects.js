import { clamp, ellipse, hash, line, paint, polygon, roundedRect, starPath } from "../../../kit/src/canvas/pen.js";

export const BALLS = Object.freeze(["normal", "triple", "bouncy", "big", "rainbow"]);

function rainbow(ctx, r, art) {
  const stripes = [art.coral, art.player, art.mint, art.azure, art.rival];
  ellipse(ctx, 0, 0, r, r, art.white, art.ink, Math.max(2, r * 0.2));
  stripes.forEach((stripe, at) => {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.7, at * Math.PI * 0.4, (at + 1) * Math.PI * 0.4);
    ctx.strokeStyle = stripe;
    ctx.lineWidth = r * 0.36;
    ctx.stroke();
  });
}

function plain(ctx, r, ball, colour, art) {
  ellipse(ctx, 0, 0, r, r, colour, art.ink, Math.max(2, r * 0.2));
  ellipse(ctx, -r * 0.25, -r * 0.3, r * 0.24, r * 0.17, art.white);
  if (ball === "bouncy") {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.67, -0.7, 0.7);
    ctx.strokeStyle = art.white;
    ctx.lineWidth = r * 0.25;
    ctx.stroke();
  }
  if (ball === "big") {
    starPath(ctx, 0, 0, r * 0.45);
    paint(ctx, art.white, art.ink, Math.max(2, r * 0.05));
  }
}

export function drawPaintBall(ctx, x, y, r, ball, colour, art, time = 0) {
  ctx.save();
  ctx.translate(x, y);
  if (ball === "bouncy" || ball === "rainbow") ctx.rotate(time * 2.5);
  if (ball === "triple") {
    for (const [dx, dy] of [[-0.65, 0.3], [0.55, 0.45], [0, -0.6]]) ellipse(ctx, dx * r, dy * r, r * 0.62, r * 0.62, colour, art.ink, Math.max(2, r * 0.18));
  } else if (ball === "rainbow") rainbow(ctx, r, art);
  else plain(ctx, r, ball, colour, art);
  ctx.restore();
}

export function drawDottedPath(ctx, points, colour, art, { faint = false, dot = 4 } = {}) {
  ctx.save();
  if (faint) ctx.globalAlpha *= 0.38;
  points.forEach(([x, y], at) => at % 2 === 0 && ellipse(ctx, x, y, dot, dot, at === 0 ? art.white : colour));
  ctx.restore();
}

export function drawSlingshot(ctx, { from, pull, points, colour, ball }, art) {
  const [fx, fy] = from;
  const [px, py] = pull;
  const length = Math.max(1, Math.hypot(px - fx, py - fy));
  const nx = (-(py - fy) / length) * 13;
  const ny = ((px - fx) / length) * 13;
  const band = [[fx + nx, fy + ny], [px, py], [fx - nx, fy - ny]];
  line(ctx, band, art.ink, 7);
  line(ctx, band, art.cork, 3);
  drawDottedPath(ctx, points, colour, art, { dot: 3.5 });
  drawPaintBall(ctx, px, py, 9, ball, colour, art);
}

function along(points, progress) {
  const position = clamp(progress) * (points.length - 1);
  const at = Math.min(points.length - 2, Math.floor(position));
  const mix = position - at;
  const [one, two] = [points[at], points[at + 1]];
  return { at, x: one[0] + (two[0] - one[0]) * mix, y: one[1] + (two[1] - one[1]) * mix, angle: Math.atan2(two[1] - one[1], two[0] - one[0]) };
}

function underwaterBall(ctx, x, y, r, colour, art, time) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(time * 3) * 0.12);
  ellipse(ctx, 0, 0, r * 1.08, r * 0.9, colour, art.sea, Math.max(2, r * 0.18));
  ellipse(ctx, -r * 0.25, -r * 0.25, r * 0.24, r * 0.16, art.white);
  for (let bubble = 0; bubble < 2; bubble += 1) {
    const size = r * (0.28 - bubble * 0.06);
    ellipse(ctx, -r * (1.5 + bubble * 0.8), -r * (0.5 + bubble * 0.45), size, size, art.bubble, art.foam, 1.5);
  }
  ctx.restore();
}

export function drawTorpedo(ctx, x, y, size, angle, colour, art, time = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  roundedRect(ctx, -size * 0.5, -size * 0.18, size, size * 0.36, size * 0.18);
  paint(ctx, colour, art.ink, Math.max(2, size * 0.08));
  polygon(ctx, [[-size * 0.36, 0], [-size * 0.58, -size * 0.25], [-size * 0.5, 0], [-size * 0.58, size * 0.25]], art.cork, art.ink, Math.max(1.5, size * 0.055));
  line(ctx, [[size * 0.08, -size * 0.14], [size * 0.08, size * 0.14]], art.white, size * 0.09);
  for (let bubble = 0; bubble < 3; bubble += 1) {
    const pulse = (time * 2 + bubble / 3) % 1;
    const r = size * (0.08 + pulse * 0.04);
    ellipse(ctx, -size * (0.65 + pulse * 0.7), Math.sin(bubble) * size * 0.08, r, r, art.bubble, art.foam, 1.2);
  }
  ctx.restore();
}

export function drawFlight(ctx, { points, progress, ball = "normal", colour, torpedo = false, sea = null }, art, time = 0) {
  if (points.length < 2) return;
  const { at, x, y, angle } = along(points, progress);
  if (torpedo) {
    drawTorpedo(ctx, x, y, 30, angle, colour, art, time);
    return;
  }
  const trail = points.slice(Math.max(0, at - 5), at + 1);
  if (sea !== null && y > sea) {
    trail.forEach(([px, py], index) => ellipse(ctx, px, py - index * 1.5, 3 + index * 0.25, 3 + index * 0.25, art.bubble, art.foam, 1.2));
    underwaterBall(ctx, x, y, 10, colour, art, time);
    return;
  }
  drawDottedPath(ctx, trail, colour, art, { faint: true, dot: 2.5 });
  drawPaintBall(ctx, x, y, ball === "big" ? 13 : ball === "triple" ? 10 : 9, ball, colour, art, time);
}

export function drawPaintStain(ctx, x, y, size, colour, art, seed = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.42);
  ctx.beginPath();
  for (let point = 0; point < 18; point += 1) {
    const turn = (point / 18) * Math.PI * 2;
    const reach = size * (0.66 + hash(seed + point) * 0.34);
    if (point) ctx.lineTo(Math.cos(turn) * reach, Math.sin(turn) * reach);
    else ctx.moveTo(Math.cos(turn) * reach, Math.sin(turn) * reach);
  }
  ctx.closePath();
  paint(ctx, colour, art.ink, Math.max(1.5, size * 0.05));
  for (let drop = 0; drop < 4; drop += 1) {
    const turn = hash(seed * 3 + drop) * Math.PI * 2;
    ellipse(ctx, Math.cos(turn) * size * 1.2, Math.sin(turn) * size * 1.2, size * 0.12, size * 0.1, colour);
  }
  ctx.restore();
}

export function drawSplash(ctx, x, y, size, progress, colour, art, seed = 1) {
  const p = clamp(progress);
  if (p <= 0 || p >= 1) return;
  ctx.save();
  ctx.globalAlpha *= 1 - p * p;
  drawPaintStain(ctx, x, y, size * (0.25 + p * 0.45), colour, art, seed);
  for (let drop = 0; drop < 12; drop += 1) {
    const turn = (drop / 12) * Math.PI * 2 + hash(seed) * 0.4;
    const reach = size * p * (0.65 + hash(seed + drop) * 0.8);
    const r = Math.max(1, size * 0.07 * (1 - p * 0.6));
    ellipse(ctx, x + Math.cos(turn) * reach, y + Math.sin(turn) * reach + p * p * size * 0.35, r, r * 1.25, colour);
  }
  ctx.restore();
}

export function drawWaterStain(ctx, x, y, size, colour, art, life = 0, seed = 1) {
  const p = clamp(life);
  if (p >= 1) return;
  ctx.save();
  ctx.globalAlpha *= (1 - p) * 0.72;
  for (let ring = 0; ring < 5; ring += 1) {
    const offset = (hash(seed + ring) - 0.5) * size * 1.4;
    ellipse(ctx, x + offset, y + Math.sin(ring + seed) * size * 0.08, size * (0.32 + hash(seed * 2 + ring) * 0.3) * (1 + p * 0.5), size * 0.1, colour);
  }
  ctx.restore();
}

export function drawWaterSplash(ctx, x, y, size, progress, colour, art, seed = 1) {
  const p = clamp(progress);
  if (p <= 0 || p >= 1) return;
  ctx.save();
  ctx.globalAlpha *= 1 - p;
  for (let drop = 0; drop < 9; drop += 1) {
    const spread = (drop / 8 - 0.5) * 1.7;
    const reach = size * p * (0.35 + Math.abs(spread));
    const rise = Math.cos(spread) * Math.sin(p * Math.PI) * size * (0.55 + hash(seed + drop) * 0.5);
    ellipse(ctx, x + Math.sin(spread) * reach, y - rise, size * 0.065, size * 0.12, drop % 3 === 0 ? art.foam : colour);
  }
  for (let ring = 0; ring < 3; ring += 1) {
    ctx.beginPath();
    ctx.ellipse(x, y, size * (0.25 + p * 0.35 + ring * 0.16), size * 0.08, 0, 0, Math.PI * 2);
    ctx.strokeStyle = ring === 1 ? colour : art.foam;
    ctx.lineWidth = Math.max(1.5, size * 0.035);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawConfetti(ctx, area, progress, art, seed = 1) {
  const p = clamp(progress);
  ctx.save();
  for (let piece = 0; piece < 24; piece += 1) {
    ctx.save();
    ctx.translate(area.x + hash(seed + piece * 2) * area.w, area.y + hash(seed + piece * 2 + 1) * area.h * 0.45 + p * area.h * 0.55);
    ctx.rotate(p * 5 + piece);
    ctx.globalAlpha *= 1 - p * 0.55;
    roundedRect(ctx, -3, -7, 6, 14, 2);
    paint(ctx, art.confetti[piece % art.confetti.length]);
    ctx.restore();
  }
  ctx.restore();
}
