import { TAU, circle, clamp, ellipse, line, paint, roundedRect, starPath } from "../../../kit/src/canvas/pen.js";
import { drawSmile, drawStarShape, rimmed } from "./paddles.js";

export function drawBall(ctx, x, y, radius, theme, { time = 0, second = false, angle = -Math.PI / 2, trail = true } = {}) {
  const look = second ? theme.art.second : theme.art.ball;
  const { ink } = theme.art;
  ctx.save();
  if (trail) {
    for (let at = 4; at >= 1; at -= 1) {
      const distance = at * radius * 0.85;
      circle(ctx, x - Math.cos(angle) * distance, y - Math.sin(angle) * distance, radius * (0.7 - at * 0.09), look.trail);
    }
  }
  rimmed(ctx, theme, () => circle(ctx, x, y, radius, look.body, ink, theme.stroke.base));
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(time * 2.5);
  if (second) {
    line(ctx, [[-radius * 0.75, -radius * 0.25], [radius * 0.75, -radius * 0.25]], look.mark, radius * 0.25);
    line(ctx, [[-radius * 0.65, radius * 0.36], [radius * 0.65, radius * 0.36]], look.mark, radius * 0.2);
  } else {
    starPath(ctx, 0, 0, radius * 0.58, radius * 0.27);
    paint(ctx, look.mark);
  }
  ctx.restore();
  circle(ctx, x - radius * 0.35, y - radius * 0.42, radius * 0.16, theme.art.white);
  ctx.restore();
}

function drops(ctx, x, y, radius, pop, fill, theme) {
  if (pop >= 1) return;
  for (let at = 0; at < 8; at += 1) {
    const turn = (at * TAU) / 8;
    const distance = radius * (0.8 + pop * 1.2);
    circle(ctx, x + Math.cos(turn) * distance, y + Math.sin(turn) * distance, radius * 0.15 * (1 - pop), fill, theme.art.ink, 2);
  }
}

export function drawBubble(ctx, x, y, radius, theme, { time = 0, pop = 0 } = {}) {
  const { bubble } = theme.art;
  ctx.save();
  rimmed(ctx, theme, () => {
    if (pop > 0) {
      drops(ctx, x, y, radius, clamp(pop), bubble.skin, theme);
      return;
    }
    const bob = Math.sin(time * 2.2 + x * 0.01) * 3;
    circle(ctx, x, y + bob, radius, bubble.skin, theme.art.ink, theme.stroke.base);
    circle(ctx, x, y + bob, radius * 0.76, bubble.inside, bubble.shine, 2);
    ctx.beginPath();
    ctx.arc(x - radius * 0.15, y + bob - radius * 0.15, radius * 0.5, Math.PI * 1.05, Math.PI * 1.55);
    ctx.strokeStyle = bubble.shine;
    ctx.lineWidth = 4;
    ctx.stroke();
  });
  ctx.restore();
}

function planet(ctx, radius, look, theme) {
  ctx.save();
  ctx.rotate(-0.28);
  ellipse(ctx, 0, 0, radius * 1.55, radius * 0.48, null, look.ring, 5);
  ctx.restore();
  circle(ctx, 0, 0, radius, look.body, theme.art.ink, theme.stroke.base);
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(0, radius - 2), 0, TAU);
  ctx.clip();
  ellipse(ctx, -radius * 0.2, -radius * 0.25, radius * 0.6, radius * 0.18, look.band);
  circle(ctx, radius * 0.35, radius * 0.3, radius * 0.18, look.spot);
  ctx.restore();
  circle(ctx, -radius * 0.25, -radius * 0.15, radius * 0.12, look.crater);
}

export function drawPlanetBumper(ctx, x, y, radius, theme, { time = 0, pop = 0 } = {}) {
  ctx.save();
  rimmed(ctx, theme, () => {
    if (pop > 0) {
      drops(ctx, x, y, radius, clamp(pop), theme.art.planet.ring, theme);
      return;
    }
    ctx.translate(x, y);
    ctx.rotate(Math.sin(time) * 0.06);
    planet(ctx, radius, theme.art.planet, theme);
  });
  ctx.restore();
}

export function drawStarPickup(ctx, x, y, size, theme, time = 0) {
  const { star, ink } = theme.art;
  ctx.save();
  ctx.translate(x, y + Math.sin(time * 3) * 3);
  rimmed(ctx, theme, () => {
    ctx.save();
    ctx.rotate(Math.sin(time * 2) * 0.12);
    drawStarShape(ctx, 0, 0, size, star.body, ink, theme.stroke.base);
    drawSmile(ctx, 0, size * 0.04, size * 0.8, ink);
    ctx.restore();
    for (let at = 0; at < 3; at += 1) {
      const turn = time + (at * TAU) / 3;
      drawStarShape(ctx, Math.cos(turn) * size * 1.5, Math.sin(turn) * size * 1.1, size * 0.14, star.spark, ink, 2);
    }
  });
  ctx.restore();
}

export function drawSnailPickup(ctx, x, y, size, theme, time = 0) {
  const { snail, ink } = theme.art;
  const s = theme.stroke.base;
  ctx.save();
  ctx.translate(x, y + Math.sin(time * 2) * 2);
  ctx.lineCap = "round";
  rimmed(ctx, theme, () => {
    roundedRect(ctx, -size * 0.7, size * 0.15, size * 1.35, size * 0.38, size * 0.18);
    paint(ctx, snail.body, ink, s);
    circle(ctx, -size * 0.12, -size * 0.05, size * 0.55, snail.shell, ink, s);
    ctx.beginPath();
    ctx.arc(-size * 0.12, -size * 0.05, size * 0.34, 0, TAU);
    ctx.strokeStyle = snail.swirl;
    ctx.lineWidth = 3;
    ctx.stroke();
    const head = size * 0.55;
    line(ctx, [[head, size * 0.18], [head + size * 0.1, -size * 0.27]], ink, 2);
    line(ctx, [[head - size * 0.2, size * 0.18], [head - size * 0.2, -size * 0.3]], ink, 2);
    circle(ctx, head + size * 0.1, -size * 0.3, size * 0.07, ink);
    circle(ctx, head - size * 0.2, -size * 0.33, size * 0.07, ink);
  });
  ctx.restore();
}

export function drawSlowEffect(ctx, x, y, radius, theme, time = 0) {
  ctx.save();
  ctx.strokeStyle = theme.art.snail.ring;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  for (let at = 0; at < 3; at += 1) {
    ctx.beginPath();
    ctx.arc(x, y, radius + at * 11, time * 0.3 + at, time * 0.3 + at + Math.PI * 0.8);
    ctx.stroke();
  }
  ctx.restore();
  drawSnailPickup(ctx, x, y, radius * 0.45, theme, time);
}
