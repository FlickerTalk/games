import { TAU, circle, clamp, paint, polygon, starPath } from "../../../kit/src/canvas/pen.js";

export const FAR_SCALE = 0.52;

function classic(ctx, radius, { art, stroke }) {
  circle(ctx, 0, 0, radius, art.ball.body, art.ink, stroke.base);
  const points = Array.from({ length: 5 }, (_, at) => [Math.cos(-Math.PI / 2 + (at * TAU) / 5) * radius * 0.35, Math.sin(-Math.PI / 2 + (at * TAU) / 5) * radius * 0.35]);
  polygon(ctx, points, art.ball.dark);
  for (let at = 0; at < 5; at += 1) {
    const angle = -Math.PI / 2 + (at * TAU) / 5;
    circle(ctx, Math.cos(angle) * radius * 0.74, Math.sin(angle) * radius * 0.74, radius * 0.16, art.ball.dark);
  }
}

function beachball(ctx, size, { art, stroke }) {
  circle(ctx, 0, 0, size / 2, art.ball.body, art.ink, stroke.base);
  const slices = [art.ball.coral, art.ball.sun, art.ball.cyan];
  for (let at = 0; at < 6; at += 1) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, size * 0.47, (at * TAU) / 6, ((at + 1) * TAU) / 6);
    ctx.closePath();
    paint(ctx, slices[at % 3], null, 0);
  }
  circle(ctx, 0, 0, size * 0.12, art.ball.body);
}

function starball(ctx, size, { art, stroke }) {
  circle(ctx, 0, 0, size / 2, art.ball.cyan, art.ink, stroke.base);
  starPath(ctx, 0, 0, size * 0.36);
  paint(ctx, art.ball.star, art.ink, stroke.thin);
}

export function drawBall(ctx, x, y, size, variant, theme, { rotation = 0 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  if (variant === "beachball") beachball(ctx, size, theme);
  else if (variant === "star") starball(ctx, size, theme);
  else classic(ctx, size / 2, theme);
  ctx.restore();
}

export function drawBallTrail(ctx, points, size, theme) {
  if (points.length < 2) return;
  ctx.save();
  points.forEach(([x, y], at) => {
    const share = (at + 1) / points.length;
    ctx.globalAlpha = share * 0.42;
    circle(ctx, x, y, size * share * 0.5, theme.art.ball.trail);
  });
  ctx.restore();
}

export const depthScale = (progress) => 1 - clamp(progress) * (1 - FAR_SCALE);
