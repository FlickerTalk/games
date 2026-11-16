import { TAU, clamp, ellipse, line, paint, polygon, roundedRect } from "../../../kit/src/canvas/pen.js";
import { BALLOONS } from "./arena.js";
import { rimmed } from "./rim.js";

const PIECES = 7;

function balloon(ctx, x, y, colour, theme, squared, scale = 1) {
  const { ink, balloons } = theme.art;
  if (squared) {
    roundedRect(ctx, x - 9 * scale, y - 12 * scale, 18 * scale, 25 * scale, 8 * scale);
    paint(ctx, colour, ink, 2);
  } else ellipse(ctx, x, y, 10 * scale, 13 * scale, colour, ink, 2);
  polygon(ctx, [[x - 3 * scale, y + 12 * scale], [x + 3 * scale, y + 12 * scale], [x, y + 17 * scale]], balloons.knot, ink, 1);
}

// drawn in the aircraft's own box of 120, nose up, behind its tail
export function drawTailBalloons(ctx, count, theme, { time = 0, squared = false } = {}) {
  const { ink, balloons } = theme.art;
  const colours = squared ? balloons.squared : balloons.round;
  for (let at = 0; at < Math.min(BALLOONS, count); at += 1) {
    const x = (at - 1) * 23 + Math.sin(time * 3 + at) * 3;
    const y = 62 + Math.abs(at - 1) * 7;
    line(ctx, [[(at - 1) * 5, 38], [x, y - 12]], ink, 1.5);
    balloon(ctx, x, y, colours[at], theme, squared);
  }
}

export function drawBalloonPop(ctx, x, y, size, progress, theme, colour = theme.art.balloons.knot) {
  const p = clamp(progress);
  if (p <= 0 || p >= 1) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 1 - p;
  for (let at = 0; at < PIECES; at += 1) {
    const turn = (at * TAU) / PIECES;
    const far = size * (0.15 + p * 0.55);
    ctx.save();
    ctx.translate(Math.cos(turn) * far, Math.sin(turn) * far);
    ctx.rotate(turn + p * 3);
    polygon(ctx, [[-4, -6], [6, -3], [3, 7]], colour, theme.art.ink, 1);
    ctx.restore();
  }
  ctx.restore();
}

export function drawParachute(ctx, x, y, size, theme, { time = 0 } = {}) {
  const { ink, effects } = theme.art;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 90, size / 90);
  ctx.rotate(Math.sin(time * 3) * 0.06);
  ctx.lineJoin = "round";
  rimmed(ctx, theme, () => {
    ctx.beginPath();
    ctx.moveTo(-40, -12);
    ctx.quadraticCurveTo(0, -65, 40, -12);
    ctx.quadraticCurveTo(20, -25, 0, -12);
    ctx.quadraticCurveTo(-20, -25, -40, -12);
    paint(ctx, effects.parachute, ink, 3);
    line(ctx, [[-37, -11], [-15, 24]], ink, 2);
    line(ctx, [[37, -11], [15, 24]], ink, 2);
    roundedRect(ctx, -21, 17, 42, 29, 5);
    paint(ctx, effects.flag, ink, 3);
  });
  ellipse(ctx, -8, 28, 2.5, 3, ink);
  ellipse(ctx, 8, 28, 2.5, 3, ink);
  ctx.beginPath();
  ctx.arc(0, 31, 8, 0.2, Math.PI - 0.2);
  paint(ctx, null, ink, 2);
  ctx.restore();
}

export function drawTally(ctx, area, count, theme, { squared = false } = {}) {
  const { ui, art } = theme;
  const colours = squared ? art.balloons.squared : art.balloons.round;
  const step = area.w / (BALLOONS + 0.4);
  const scale = Math.min(1, area.h / 40);
  ctx.save();
  roundedRect(ctx, area.x, area.y, area.w, area.h, area.h / 2);
  paint(ctx, ui.surface, ui.border, ui.line);
  for (let at = 0; at < BALLOONS; at += 1) {
    const x = area.x + area.w / 2 + (at - 1) * step;
    const y = area.y + area.h / 2 - 2 * scale;
    if (at < count) balloon(ctx, x, y, colours[0], theme, squared, scale * 0.85);
    else if (squared) {
      roundedRect(ctx, x - 7.5 * scale, y - 10 * scale, 15 * scale, 21 * scale, 7 * scale);
      paint(ctx, null, ui.muted, 1.5);
    } else ellipse(ctx, x, y, 8.5 * scale, 11 * scale, null, ui.muted, 1.5);
  }
  ctx.restore();
}
