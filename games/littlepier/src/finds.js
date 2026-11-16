import { clamp, line, paint, roundedRect, starPath } from "../../../kit/src/canvas/pen.js";

export function heartPath(ctx, x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.38);
  ctx.bezierCurveTo(x - size * 0.65, y, x - size * 0.5, y - size * 0.48, x, y - size * 0.16);
  ctx.bezierCurveTo(x + size * 0.5, y - size * 0.48, x + size * 0.65, y, x, y + size * 0.38);
  ctx.closePath();
}

function boot(ctx, art) {
  const { finds, ink } = art;
  ctx.beginPath();
  ctx.moveTo(-17, -34);
  ctx.lineTo(12, -34);
  ctx.lineTo(9, 10);
  ctx.bezierCurveTo(26, 8, 38, 19, 31, 30);
  ctx.lineTo(-17, 30);
  ctx.closePath();
  paint(ctx, finds.boot, ink, 3);
  roundedRect(ctx, -20, -37, 36, 10, 4);
  paint(ctx, finds.bootTop, ink, 3);
  line(ctx, [[-13, 18], [5, 18]], finds.stripe, 3);
}

function chest(ctx, art, open) {
  const { finds, ink } = art;
  roundedRect(ctx, -34, -10, 68, 39, 7);
  paint(ctx, finds.chest, ink, 3);
  ctx.save();
  ctx.translate(0, -10);
  ctx.rotate(-open * 0.7);
  roundedRect(ctx, -34, -24, 68, 24, 10);
  paint(ctx, finds.lid, ink, 3);
  ctx.restore();
  roundedRect(ctx, -7, -8, 14, 19, 4);
  paint(ctx, finds.lock, ink, 3);
  line(ctx, [[-33, 7], [33, 7]], finds.band, 3);
  if (open > 0.2) {
    starPath(ctx, 0, -32 - open * 8, 12);
    paint(ctx, art.star, ink, 3);
  }
}

function bottle(ctx, art, time) {
  const { finds, ink } = art;
  ctx.rotate(-0.18 + Math.sin(time * 2) * 0.04);
  roundedRect(ctx, -19, -30, 38, 60, 12);
  paint(ctx, finds.glass, ink, 3);
  roundedRect(ctx, -10, -39, 20, 13, 3);
  paint(ctx, finds.cork, ink, 3);
  roundedRect(ctx, -13, -13, 26, 27, 3);
  paint(ctx, finds.paper, finds.band, 2);
  heartPath(ctx, 0, 0, 16);
  paint(ctx, finds.picture, null, 0);
}

export function drawFind(ctx, x, y, size, kind, theme, { time = 0, open = 0 } = {}) {
  const { art } = theme;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 80, size / 80);
  ctx.lineJoin = "round";
  if (kind === "chest") chest(ctx, art, clamp(open));
  else if (kind === "bottle") bottle(ctx, art, time);
  else boot(ctx, art);
  ctx.restore();
}
