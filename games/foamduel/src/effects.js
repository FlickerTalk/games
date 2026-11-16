import { TAU, circle, clamp, ease, hash, paint, polygon, roundedRect } from "../../../kit/src/canvas/pen.js";

const between = (progress) => {
  const p = clamp(progress);
  return p > 0 && p < 1 ? p : null;
};

export function drawSwoosh(ctx, x, y, size, progress, theme, { facing = 1, shape = "broad" } = {}) {
  const p = between(progress);
  if (p === null) return;
  const { foam, effects, ink } = theme.art;
  const arcs = [[0.55 + p * 0.12, 2.25, ink, 0.16], [0.55 + p * 0.12, 2.25, foam.blades[shape] ?? foam.blades.broad, 0.1], [0.43, 1.85, effects.swoosh, 0.035]];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, 1);
  ctx.globalAlpha = Math.sin(p * Math.PI);
  ctx.lineCap = "round";
  for (const [reach, sweep, colour, width] of arcs) {
    ctx.beginPath();
    ctx.arc(0, 0, size * reach * 0.7, -1.4, -1.4 + p * sweep);
    ctx.strokeStyle = colour;
    ctx.lineWidth = size * width;
    ctx.stroke();
  }
  ctx.restore();
}

export function drawPop(ctx, x, y, size, progress, theme, side) {
  const p = between(progress);
  if (p === null) return;
  const { balloons, effects, ink } = theme.art;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 1 - p;
  ctx.beginPath();
  ctx.arc(0, 0, size * (0.12 + ease(p) * 0.48), 0, TAU);
  ctx.strokeStyle = effects.ring;
  ctx.lineWidth = Math.max(1, size * 0.07 * (1 - p));
  ctx.stroke();
  for (let at = 0; at < 9; at += 1) {
    const turn = (at * TAU) / 9 + hash(at + 4) * 0.25;
    const far = size * ease(p) * (0.3 + hash(at + 9) * 0.3);
    ctx.save();
    ctx.translate(Math.cos(turn) * far, Math.sin(turn) * far + p * p * size * 0.2);
    ctx.rotate(turn + p * 3);
    polygon(ctx, [[-size * 0.07, -size * 0.04], [size * 0.09, 0], [-size * 0.04, size * 0.07]], at % 3 ? balloons[side] ?? balloons.mine : effects.spark, ink, Math.max(1, size * 0.025));
    ctx.restore();
  }
  ctx.restore();
}

export function drawDust(ctx, x, y, size, progress, theme) {
  const p = between(progress);
  if (p === null) return;
  ctx.save();
  ctx.globalAlpha = (1 - p) * 0.75;
  for (let at = 0; at < 5; at += 1) {
    const puff = size * (0.12 + hash(at + 3) * 0.08) * (1 - p * 0.4);
    circle(ctx, x + (at - 2) * size * 0.2 * ease(p), y - size * (0.1 + hash(at) * 0.25) * p - puff, puff, theme.art.effects.dust);
  }
  ctx.restore();
}

export function drawConfetti(ctx, area, progress, theme) {
  const p = between(progress);
  if (p === null) return;
  const colours = theme.art.effects.confetti;
  ctx.save();
  ctx.globalAlpha = Math.min(1, (1 - p) * 3);
  for (let at = 0; at < 24; at += 1) {
    ctx.save();
    ctx.translate(area.x + (((at * 47) % 101) / 100) * area.w, area.y + p * (90 + (at % 5) * 18) - Math.sin(p * Math.PI) * (30 + (at % 4) * 12));
    ctx.rotate(p * 5 + at);
    roundedRect(ctx, -3, -6, 6, 12, 2);
    paint(ctx, colours[at % colours.length]);
    ctx.restore();
  }
  ctx.restore();
}
