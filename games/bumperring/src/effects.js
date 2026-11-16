import { TAU, clamp, ellipse, line, paint, roundedRect, starPath } from "../../../kit/src/canvas/pen.js";
import { rimmed } from "./rim.js";

function spikes(ctx, outer, inner, points) {
  ctx.beginPath();
  for (let at = 0; at < points * 2; at += 1) {
    const radius = at % 2 ? inner : outer;
    const turn = -Math.PI / 2 + (at * Math.PI) / points;
    if (at === 0) ctx.moveTo(Math.cos(turn) * radius, Math.sin(turn) * radius);
    else ctx.lineTo(Math.cos(turn) * radius, Math.sin(turn) * radius);
  }
  ctx.closePath();
}

export function drawBumpStar(ctx, x, y, size, progress, theme) {
  const p = clamp(progress);
  if (p >= 1) return;
  const scale = Math.max(0.05, Math.sin(p * Math.PI) * 1.15);
  const { effects, ink } = theme.art;
  ctx.save();
  ctx.translate(x, y - p * size * 0.25);
  ctx.rotate(p * 0.5);
  ctx.scale(scale, scale);
  ctx.lineJoin = "round";
  spikes(ctx, size * 0.5, size * 0.24, 8);
  rimmed(ctx, theme, () => paint(ctx, effects.star, ink, 3));
  spikes(ctx, size * 0.24, size * 0.12, 8);
  paint(ctx, effects.starLight, null, 0);
  ctx.restore();
}

export function drawSplash(ctx, x, y, size, progress, theme) {
  const p = clamp(progress);
  if (p >= 1) return;
  const { effects, ink } = theme.art;
  ctx.save();
  ctx.globalAlpha = 1 - p * p;
  ellipse(ctx, x, y, size * (0.18 + p * 0.45), size * (0.05 + p * 0.1), null, effects.splash, 4);
  rimmed(ctx, theme, () => {
    for (let at = 0; at < 7; at += 1) {
      const turn = Math.PI + (at * Math.PI) / 6;
      const reach = Math.sin(p * Math.PI) * size * (0.38 + (at % 3) * 0.08);
      const dy = Math.sin(turn) * reach - Math.sin(p * Math.PI) * size * 0.28;
      ellipse(ctx, x + Math.cos(turn) * reach, y + dy, size * 0.045, size * 0.075, effects.splash, ink, 2);
    }
  });
  ctx.restore();
}

export function drawBurst(ctx, x, y, size, progress, theme) {
  const p = clamp(progress);
  if (p >= 1) return;
  const { burst, burstAlt } = theme.art.effects;
  ctx.save();
  ctx.globalAlpha = 1 - p;
  for (let at = 0; at < 8; at += 1) {
    const turn = (at * TAU) / 8;
    const inner = size * (0.2 + p * 0.2);
    const outer = size * (0.35 + p * 0.35);
    line(ctx, [[x + Math.cos(turn) * inner, y + Math.sin(turn) * inner], [x + Math.cos(turn) * outer, y + Math.sin(turn) * outer]], at % 2 ? burst : burstAlt, 4);
  }
  ctx.restore();
}

export function drawConfetti(ctx, area, progress, theme) {
  const p = clamp(progress);
  const colours = theme.art.effects.confetti;
  ctx.save();
  for (let at = 0; at < 24; at += 1) {
    const px = area.x + (((at * 47) % 101) / 101) * area.w;
    const py = area.y + (((at * 31) % 97) / 97) * area.h * 0.35 + p * area.h * 0.6;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(p * TAU + at);
    if (at % 3 === 0) {
      starPath(ctx, 0, 0, 6, 3);
      paint(ctx, colours[at % colours.length]);
    } else {
      roundedRect(ctx, -3, -6, 6, 12, 2);
      paint(ctx, colours[at % colours.length]);
    }
    ctx.restore();
  }
  ctx.restore();
}

export function drawUmbrella(ctx, x, y, size, theme, time = 0) {
  const { effects, ink } = theme.art;
  ctx.save();
  ctx.translate(x, y + Math.sin(time * 3) * size * 0.04);
  ctx.lineJoin = "round";
  rimmed(ctx, theme, () => {
    line(ctx, [[0, 0], [0, size * 0.55]], ink, 3);
    line(ctx, [[0, -size * 0.45], [0, -size * 0.55]], ink, 3);
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.45, Math.PI, TAU);
    for (let at = 0; at < 3; at += 1) ctx.arc(size * (0.3 - at * 0.3), 0, size * 0.15, 0, Math.PI, true);
    ctx.closePath();
    paint(ctx, effects.umbrella, ink, 3);
  });
  ctx.restore();
}

export function drawTapHand(ctx, x, y, size, progress, theme) {
  const p = ((progress % 1) + 1) % 1;
  const press = p < 0.45 ? Math.sin((p / 0.45) * Math.PI) : 0;
  const { effects, ink, white } = theme.art;
  ctx.save();
  ctx.translate(x, y + press * size * 0.12);
  if (p > 0.2 && p < 0.55) {
    ctx.globalAlpha = 1 - (p - 0.2) / 0.35;
    ellipse(ctx, -size * 0.04, -size * 0.5, size * (0.12 + p * 0.4), size * (0.12 + p * 0.4), null, white, 4);
    ctx.globalAlpha = 1;
  }
  ctx.rotate(-0.2);
  ctx.lineJoin = "round";
  rimmed(ctx, theme, () => {
    roundedRect(ctx, -size * 0.17, -size * 0.52, size * 0.25, size * 0.65, size * 0.12);
    paint(ctx, effects.hand, ink, 3);
    roundedRect(ctx, -size * 0.18, -size * 0.06, size * 0.48, size * 0.42, size * 0.18);
    paint(ctx, effects.hand, ink, 3);
    ellipse(ctx, size * 0.23, size * 0.05, size * 0.18, size * 0.1, effects.hand, ink, 3);
    roundedRect(ctx, -size * 0.2, size * 0.28, size * 0.52, size * 0.18, size * 0.06);
    paint(ctx, effects.cuff, ink, 3);
  });
  ctx.restore();
}
