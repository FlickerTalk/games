import { TAU, circle, clamp, ellipse, line, paint, polygon, roundedRect, starPath } from "../../../kit/src/canvas/pen.js";

export const SCENERIES = Object.freeze(["valley", "desert", "night"]);

function cloud(ctx, x, y, scale, colour) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.arc(-18, 4, 14, Math.PI * 0.7, Math.PI * 1.9);
  ctx.arc(0, -5, 20, Math.PI, TAU);
  ctx.arc(20, 5, 13, Math.PI * 1.2, Math.PI * 0.3);
  ctx.closePath();
  paint(ctx, colour, null, 0);
  ctx.restore();
}

function tree(ctx, x, y, scale, look, ink) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  roundedRect(ctx, -4, 0, 8, 28, 3);
  paint(ctx, look.trunk, ink, 2);
  ellipse(ctx, 0, -7, 22, 27, look.tree, ink, 2);
  ellipse(ctx, -12, 2, 15, 18, look.treeLight, ink, 2);
  ctx.restore();
}

function cactus(ctx, x, y, scale, look, ink) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  for (const [left, top, wide, tall, radius] of [[-8, -34, 16, 66, 8], [-25, -17, 19, 13, 6], [-25, -31, 12, 25, 6], [5, -8, 22, 13, 6], [16, -23, 12, 25, 6]]) {
    roundedRect(ctx, left, top, wide, tall, radius);
    paint(ctx, look.tree, ink, 2);
  }
  ctx.restore();
}

function station(ctx, x, base, scale, look, ink) {
  ctx.save();
  ctx.translate(x, base - 57 * scale);
  ctx.scale(scale, scale);
  roundedRect(ctx, -62, -25, 116, 82, 8);
  paint(ctx, look.wall, ink, 3);
  polygon(ctx, [[-72, -23], [-5, -67], [65, -23]], look.roof, ink, 3);
  roundedRect(ctx, -16, 10, 29, 47, 5);
  paint(ctx, look.door, ink, 2);
  roundedRect(ctx, -50, -6, 24, 24, 5);
  paint(ctx, look.window, ink, 2);
  line(ctx, [[-38, -5], [-38, 17]], ink, 2);
  roundedRect(ctx, 25, -6, 20, 24, 5);
  paint(ctx, look.window, ink, 2);
  circle(ctx, -4, -40, 12, look.clock, ink, 2);
  line(ctx, [[-4, -40], [-4, -48]], ink, 2);
  line(ctx, [[-4, -40], [3, -37]], ink, 2);
  ctx.restore();
}

function stars(ctx, width, horizon, look) {
  for (let star = 0; star < 18; star += 1) {
    const x = (star * 73 + 29) % width;
    const y = 20 + ((star * 47) % Math.max(40, horizon * 0.7));
    starPath(ctx, x, y, star % 3 === 0 ? 5 : 3, 1.5);
    paint(ctx, look.star, null, 0);
  }
}

function sky(ctx, name, width, horizon, look, ink) {
  const high = Math.max(34, horizon * 0.36);
  if (name === "night") {
    stars(ctx, width, horizon, look);
    circle(ctx, width * 0.18, high, 26, look.light);
    circle(ctx, width * 0.18 + 12, high - 7, 23, look.sky);
    return;
  }
  if (name === "desert") circle(ctx, width * 0.18, high, 26, look.light, ink, 2);
  else cloud(ctx, width * 0.18, high + 10, 0.8, look.cloud);
  cloud(ctx, width * 0.62, Math.max(26, horizon * 0.24), 0.58, look.cloud);
}

export function drawScenery(ctx, { w: width, h: height }, scenery, { horizon = height * 0.43 } = {}, theme) {
  const { art } = theme;
  const name = SCENERIES.includes(scenery) ? scenery : "valley";
  const look = art.sceneries[name];
  const scale = clamp(Math.min(width / 384, horizon / 300), 0.45, 1.35);
  const rise = Math.min(horizon * 0.5, 70 * scale + height * 0.04);
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.fillStyle = look.sky;
  ctx.fillRect(0, 0, width, height);
  sky(ctx, name, width, horizon, look, art.ink);
  ellipse(ctx, width * 0.1, horizon + rise * 0.35, width * 0.62, rise * 1.3, look.far);
  ellipse(ctx, width * 0.9, horizon + rise * 0.3, width * 0.64, rise * 1.15, look.near);
  ctx.fillStyle = look.ground;
  ctx.fillRect(0, horizon, width, height - horizon);
  if (name === "desert") cactus(ctx, width * 0.14, horizon - 30 * scale, scale, look, art.ink);
  else {
    tree(ctx, width * 0.12, horizon - 30 * scale, 0.85 * scale, look, art.ink);
    if (name === "valley") tree(ctx, width * 0.28, horizon - 18 * scale, 0.55 * scale, look, art.ink);
  }
  station(ctx, width * 0.76, horizon + 12 * scale, scale, look, art.ink);
  ctx.restore();
}

export function drawTrack(ctx, x, y, width, scale, theme) {
  const { rail } = theme.art;
  const sleepers = Math.max(1, Math.ceil(width / (24 * scale)));
  ctx.save();
  for (let sleeper = 0; sleeper <= sleepers; sleeper += 1) {
    const sx = x + (sleeper * width) / sleepers;
    line(ctx, [[sx, y - 7 * scale], [sx, y + 10 * scale]], rail.sleeper, 7 * scale);
  }
  line(ctx, [[x, y - 4 * scale], [x + width, y - 4 * scale]], rail.top, 5 * scale);
  line(ctx, [[x, y + 5 * scale], [x + width, y + 5 * scale]], rail.low, 5 * scale);
  line(ctx, [[x, y + 4 * scale], [x + width, y + 4 * scale]], rail.shine, 1.5 * scale);
  ctx.restore();
}
