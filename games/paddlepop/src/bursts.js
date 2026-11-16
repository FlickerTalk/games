import { TAU, circle, clamp, line, paint, roundedRect } from "../../../kit/src/canvas/pen.js";
import { drawStarShape, rimmed } from "./paddles.js";

export function drawHitBurst(ctx, x, y, size, progress, theme) {
  const p = clamp(progress);
  if (p >= 1) return;
  const { burst, burstLight } = theme.art.effects;
  ctx.save();
  ctx.globalAlpha = 1 - p;
  for (let at = 0; at < 8; at += 1) {
    const turn = (at * TAU) / 8;
    const inner = size * (0.35 + p * 0.4);
    const outer = size * (0.75 + p * 0.6);
    line(ctx, [[x + Math.cos(turn) * inner, y + Math.sin(turn) * inner], [x + Math.cos(turn) * outer, y + Math.sin(turn) * outer]], at % 2 ? burst : burstLight, 5 * (1 - p) + 1);
  }
  ctx.restore();
}

export function drawGoalSplash(ctx, x, y, width, progress, theme, { down = false } = {}) {
  const p = clamp(progress);
  if (p >= 1) return;
  const { effects, star, ink, white } = theme.art;
  ctx.save();
  ctx.globalAlpha = 1 - p * 0.8;
  rimmed(ctx, theme, () => {
    for (let at = 0; at < 11; at += 1) {
      const spread = (at / 10 - 0.5) * width;
      const lift = Math.sin(p * Math.PI) * (35 + (at % 3) * 15);
      const px = x + spread * (0.5 + p * 0.5);
      const py = y + (down ? 1 : -1) * lift;
      if (at % 3 === 0) drawStarShape(ctx, px, py, 7 + (1 - p) * 5, star.body, ink, 2);
      else circle(ctx, px, py, 5 + (1 - p) * 4, at % 2 ? effects.splash : white, ink, 2);
    }
  });
  ctx.restore();
}

export function drawConfetti(ctx, area, progress, theme) {
  const p = clamp(progress);
  const colours = theme.art.effects.confetti;
  ctx.save();
  for (let at = 0; at < 24; at += 1) {
    const px = area.x + (((at * 47) % 101) / 100) * area.w;
    const py = area.y + p * (90 + (at % 5) * 18) - Math.sin(p * Math.PI) * (30 + (at % 4) * 12);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(p * 5 + at);
    roundedRect(ctx, -3, -6, 6, 12, 2);
    paint(ctx, colours[at % colours.length]);
    ctx.restore();
  }
  ctx.restore();
}

export function drawWideEffect(ctx, x, y, width, theme, time = 0) {
  const { star, ink } = theme.art;
  ctx.save();
  rimmed(ctx, theme, () => {
    for (const side of [-1, 1]) {
      const px = x + side * width * 0.56;
      line(ctx, [[px - side * 13, y], [px + side * 13, y]], star.body, 7);
      drawStarShape(ctx, px, y - 22 - Math.sin(time * 4) * 4, 9, star.body, ink, 2);
    }
  });
  ctx.restore();
}

export function drawDragHand(ctx, x, y, size, progress, theme) {
  const p = clamp(progress);
  const drag = (p < 0.2 ? p / 0.2 : p > 0.8 ? (1 - p) / 0.2 : 1) * size * 1.25;
  const { hand, cuff } = theme.art.effects;
  const { ink } = theme.art;
  ctx.save();
  ctx.translate(x + drag, y);
  ctx.rotate(-0.18);
  ctx.lineJoin = "round";
  rimmed(ctx, theme, () => {
    roundedRect(ctx, -size * 0.2, -size * 0.02, size * 0.64, size * 0.72, size * 0.25);
    paint(ctx, hand, ink, 3);
    roundedRect(ctx, -size * 0.13, -size * 0.72, size * 0.24, size * 0.85, size * 0.12);
    paint(ctx, hand, ink, 3);
    for (let at = 0; at < 3; at += 1) {
      roundedRect(ctx, size * (0.08 + at * 0.12), size * 0.06, size * 0.18, size * 0.42, size * 0.09);
      paint(ctx, hand, ink, 2);
    }
    roundedRect(ctx, -size * 0.26, size * 0.56, size * 0.78, size * 0.3, size * 0.1);
    paint(ctx, cuff, ink, 3);
  });
  ctx.restore();
}
