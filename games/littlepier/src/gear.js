import { TAU, circle, clamp, ease, ellipse, mix, paint, polygon, roundedRect, starPath } from "../../../kit/src/canvas/pen.js";
import { drawCreature } from "./creatures.js";
import { drawFind, heartPath } from "./finds.js";
import { isFind } from "./pond.js";

const live = (t) => t > 0 && t < 1;

export function drawCharm(ctx, x, y, size, charm, theme, time = 0) {
  const { art } = theme;
  const width = Math.max(1.5, size * 0.09);
  ctx.save();
  ctx.translate(x, y + Math.sin(time * 3) * size * 0.04);
  if (charm === "heart") {
    heartPath(ctx, 0, 0, size);
    paint(ctx, art.charms.heart, art.ink, width);
  } else if (charm === "flower") {
    for (let petal = 0; petal < 5; petal += 1) {
      const angle = (petal * TAU) / 5;
      circle(ctx, Math.cos(angle) * size * 0.25, Math.sin(angle) * size * 0.25, size * 0.19, art.charms.flower, art.ink, width);
    }
    circle(ctx, 0, 0, size * 0.17, art.charms.flowerHeart, art.ink, width);
  } else {
    ctx.rotate(time * 0.25);
    starPath(ctx, 0, 0, size / 2, size * 0.24);
    paint(ctx, art.charms.star, art.ink, width);
  }
  ctx.restore();
}

function curve(ctx, tip, hook, size) {
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.quadraticCurveTo(tip.x + (hook.x - tip.x) * 0.08, (tip.y + hook.y) / 2, hook.x, hook.y - size * 0.35);
}

export function drawLineAndHook(ctx, tip, hook, size, charm, theme, { time = 0, flick = false } = {}) {
  const { art } = theme;
  ctx.save();
  curve(ctx, tip, hook, size);
  paint(ctx, null, art.ink, Math.max(2, size * 0.1));
  curve(ctx, tip, hook, size);
  paint(ctx, null, flick ? art.hook.flick : art.hook.line, Math.max(1, size * 0.045));
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(hook.x, hook.y, size * 0.34, -Math.PI * 0.55, Math.PI * 0.8);
  paint(ctx, null, art.ink, size * 0.13);
  ctx.beginPath();
  ctx.arc(hook.x, hook.y, size * 0.34, -Math.PI * 0.55, Math.PI * 0.8);
  paint(ctx, null, art.hook.metal, size * 0.065);
  drawCharm(ctx, hook.x, hook.y - size * 0.55, size * 0.65, charm, theme, time);
  ctx.restore();
}

export function drawBucket(ctx, x, y, size, theme, { peeking = [], time = 0 } = {}) {
  const { art } = theme;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 80, size / 80);
  ctx.beginPath();
  ctx.arc(0, -9, 34, Math.PI, TAU);
  paint(ctx, null, art.ink, 5);
  polygon(ctx, [[-33, -14], [33, -14], [25, 34], [-25, 34]], art.bucket.body, art.ink, 3);
  ellipse(ctx, 0, -14, 33, 9, art.bucket.rim, art.ink, 3);
  ellipse(ctx, 0, -12, 28, 6, art.bucket.water);
  peeking.slice(0, 2).forEach((kind, at) => {
    const offset = peeking.length > 1 ? (at ? 12 : -12) : 0;
    drawCreature(ctx, offset, -24 - Math.sin(time * 3 + at) * 2, 34, kind, theme, { time, smile: true, direction: at ? -1 : 1 });
  });
  roundedRect(ctx, -37, -18, 74, 9, 4);
  paint(ctx, art.bucket.body, art.ink, 3);
  ctx.restore();
}

export function drawSplash(ctx, x, y, size, progress, theme) {
  const p = clamp(progress);
  if (!live(p)) return;
  const { art } = theme;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 1 - p;
  for (let drop = 0; drop < 6; drop += 1) {
    const angle = Math.PI + (drop * Math.PI) / 5;
    const distance = size * (0.25 + p * 0.75);
    ellipse(ctx, Math.cos(angle) * distance, Math.sin(angle) * distance, size * 0.08, size * 0.14, art.splash.drop);
  }
  ctx.beginPath();
  ctx.ellipse(0, 0, size * p, size * 0.25 * p, 0, 0, TAU);
  paint(ctx, null, art.splash.ring, 3);
  ctx.restore();
}

export function arcPoint(from, to, progress, height) {
  const p = clamp(progress);
  return { x: mix(from.x, to.x, p), y: mix(from.y, to.y, p) - Math.sin(p * Math.PI) * height, angle: (p - 0.5) * 1.2 };
}

export function drawStarFlight(ctx, from, to, size, progress, theme) {
  const p = clamp(progress);
  if (!live(p)) return;
  const { art } = theme;
  for (let star = 0; star < 5; star += 1) {
    const local = clamp(p * 1.4 - star * 0.08);
    if (!live(local)) continue;
    const travel = ease(local);
    const x = mix(from.x, to.x, travel);
    const y = mix(from.y, to.y, travel) - Math.sin(local * Math.PI) * size * 2;
    const radius = (size * (1 - local * 0.45)) / 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(local * 2 + star);
    starPath(ctx, 0, 0, radius);
    paint(ctx, art.star, art.ink, Math.max(1.5, radius * 0.18));
    ctx.restore();
  }
}

function visitor(ctx, what, x, y, size, theme, { time, angle = 0, direction = 1, open = 0 }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (isFind(what)) drawFind(ctx, 0, 0, size, what, theme, { time, open });
  else drawCreature(ctx, 0, 0, size, what, theme, { time, direction, smile: true });
  ctx.restore();
}

function sticker(ctx, moment, p, theme, time) {
  const travel = ease(p);
  const x = mix(moment.from.x, moment.to.x, travel);
  const y = mix(moment.from.y, moment.to.y, travel) - Math.sin(p * Math.PI) * 30;
  const size = mix(moment.size, moment.size * 0.45, travel);
  circle(ctx, x, y, size * 0.58, theme.art.white, theme.art.ink, 2);
  drawCreature(ctx, x, y, size * 0.9, moment.what, theme, { time, smile: true });
}

const MOMENTS = {
  splash: (ctx, moment, p, theme) => drawSplash(ctx, moment.x, moment.y, moment.size, p, theme),
  stars: (ctx, moment, p, theme) => drawStarFlight(ctx, moment.from, moment.to, 22, p, theme),
  sticker,
  jump(ctx, moment, p, theme, time) {
    const at = arcPoint(moment.from, moment.to, p, Math.max(40, moment.size));
    visitor(ctx, moment.what, at.x, at.y, moment.size, theme, { time, angle: at.angle });
  },
  release(ctx, moment, p, theme, time) {
    const at = arcPoint(moment.from, moment.to, p, moment.size * 0.8);
    visitor(ctx, moment.what, at.x, at.y, moment.size * 0.9, theme, { time, angle: -at.angle, direction: moment.to.x < moment.from.x ? -1 : 1 });
  },
  find(ctx, moment, p, theme, time) {
    ctx.save();
    ctx.globalAlpha = 1 - p ** 4;
    visitor(ctx, moment.what, moment.at.x, moment.at.y - moment.size * 0.5 * ease(p), moment.size, theme, { time, open: p * 1.5 });
    ctx.restore();
  },
};

export function drawMoments(ctx, moments, theme, time) {
  for (const moment of moments) {
    const draw = MOMENTS[moment.kind];
    const p = (time * 1000 - moment.start) / moment.duration;
    if (draw && p >= 0 && p < 1) draw(ctx, moment, p, theme, time);
  }
}
