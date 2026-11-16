import { TAU, circle, ellipse, line, paint, polygon, roundedRect, starPath } from "../../../kit/src/canvas/pen.js";

export function drawGlove(ctx, x, y, size, theme, { facing = 1, colour = theme.art.glove.body } = {}) {
  const { ink, glove } = theme.art;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale((facing * size) / 34, size / 34);
  roundedRect(ctx, -17, -13, 27, 26, 10);
  paint(ctx, colour, ink, 3);
  ellipse(ctx, -9, 9, 9, 7, colour, ink, 3);
  roundedRect(ctx, -23, -10, 9, 20, 3);
  paint(ctx, glove.cuff, ink, 3);
  line(ctx, [[-4, -7], [4, -7]], glove.cuff, 2.5);
  ctx.restore();
}

export function drawBoot(ctx, x, y, size, theme, { facing = 1, colour = theme.art.boot.body } = {}) {
  const { ink, boot } = theme.art;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale((facing * size) / 38, size / 38);
  ctx.beginPath();
  ctx.moveTo(-12, -17);
  ctx.lineTo(3, -17);
  ctx.lineTo(5, 2);
  ctx.lineTo(18, 6);
  ctx.quadraticCurveTo(22, 15, 12, 16);
  ctx.lineTo(-12, 16);
  ctx.closePath();
  paint(ctx, colour, ink, 3);
  line(ctx, [[-10, 9], [13, 9]], boot.sole, 3);
  ctx.restore();
}

export function coil(ctx, from, to, y, swing, turns) {
  const steps = turns * 6;
  ctx.beginPath();
  for (let at = 0; at <= steps; at += 1) {
    const px = from + ((to - from) * at) / steps;
    const py = y + Math.sin((at * Math.PI) / 3) * swing;
    if (at) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
}

export function drawFlyingPart(ctx, x, y, size, theme, { type = "bolt", progress = 0, rotation = 0 } = {}) {
  const { ink, metal } = theme.art;
  ctx.save();
  ctx.translate(x, y - Math.sin(progress * Math.PI) * size);
  ctx.rotate(rotation + progress * Math.PI * 3);
  ctx.scale(size / 32, size / 32);
  if (type === "spring") {
    ctx.lineCap = "round";
    coil(ctx, -15, 15, 0, 7, 6);
    paint(ctx, null, ink, 6);
    paint(ctx, null, metal.hub, 2.5);
  } else {
    polygon(ctx, [[-13, -6], [3, -6], [9, -11], [15, -5], [10, 1], [3, 1], [-2, 11], [-9, 10], [-6, 1], [-13, 1]], metal.hub, ink, 3);
    circle(ctx, -8, -2, 3, ink);
  }
  ctx.restore();
}

function star(ctx, x, y, size, turn, fill, ink, width) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(turn);
  starPath(ctx, 0, 0, size / 2);
  paint(ctx, fill, ink, width);
  ctx.restore();
}

export function drawImpactStar(ctx, x, y, size, theme, progress) {
  const { ink, effects } = theme.art;
  const scale = 0.55 + Math.sin(Math.min(1, Math.max(0, progress)) * Math.PI) * 0.55;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  star(ctx, 0, 0, size, 0.1 + progress * 0.35, effects.star, ink, 3);
  circle(ctx, 0, 0, size * 0.14, effects.spark);
  ctx.restore();
}

export function drawConfetti(ctx, x, y, width, theme, progress, seed = 0) {
  const { ink, effects } = theme.art;
  ctx.save();
  for (let at = 0; at < 18; at += 1) {
    const angle = at * 2.4 + seed;
    const distance = (18 + ((at % 6) * width) / 8) * progress;
    ctx.save();
    ctx.translate(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance + progress * progress * 65);
    ctx.rotate(angle + progress * 4);
    roundedRect(ctx, -3, -6, 6, 12, 2);
    paint(ctx, effects.confetti[at % effects.confetti.length], ink, 1.5);
    ctx.restore();
  }
  ctx.restore();
}

export function drawDizzyStars(ctx, x, y, size, theme, time) {
  const { ink, effects } = theme.art;
  ctx.save();
  for (let at = 0; at < 3; at += 1) {
    const angle = time * 2.4 + (at * TAU) / 3;
    star(ctx, x + Math.cos(angle) * size * 0.55, y + Math.sin(angle) * size * 0.16, Math.max(12, size * 0.26), angle, effects.star, ink, 2);
  }
  ctx.restore();
}

export function drawMotionLines(ctx, x, y, size, theme, direction = 1) {
  const { motion } = theme.art.effects;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(direction, 1);
  for (const [from, row] of [[-0.5, -0.25], [-0.65, 0], [-0.5, 0.25]]) line(ctx, [[size * from, size * row], [-size * 0.1, size * row]], motion, 4);
  ctx.restore();
}

export function drawGhostMarker(ctx, x, y, size, theme, time) {
  const { ink, effects } = theme.art;
  ctx.save();
  ctx.translate(x, y + Math.sin(time * 3) * 3);
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.moveTo(-size * 0.38, size * 0.35);
  ctx.lineTo(-size * 0.38, -size * 0.05);
  ctx.arc(0, -size * 0.05, size * 0.38, Math.PI, 0);
  ctx.lineTo(size * 0.38, size * 0.35);
  ctx.lineTo(size * 0.18, size * 0.2);
  ctx.lineTo(0, size * 0.35);
  ctx.lineTo(-size * 0.18, size * 0.2);
  ctx.closePath();
  paint(ctx, effects.ghost, ink, 2.5);
  circle(ctx, -size * 0.13, -size * 0.06, 2.5, ink);
  circle(ctx, size * 0.13, -size * 0.06, 2.5, ink);
  ctx.restore();
}

export function drawShield(ctx, x, y, size, theme, time) {
  const { ink, shield } = theme.art;
  const radius = size / 2;
  const pulse = 1 + Math.sin(time * 5) * 0.025;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);
  ctx.globalAlpha = 0.88;
  ctx.beginPath();
  ctx.arc(0, 0, radius, -Math.PI * 0.62, Math.PI * 0.62);
  ctx.quadraticCurveTo(radius * 0.31, 0, 0, -radius * 0.94);
  ctx.closePath();
  paint(ctx, shield.body, ink, 3);
  ctx.beginPath();
  ctx.arc(2, 0, radius * 0.73, -Math.PI * 0.55, Math.PI * 0.55);
  ctx.lineCap = "round";
  paint(ctx, null, shield.light, 5);
  ctx.restore();
}
