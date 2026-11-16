import { TAU, circle, clamp, ellipse, line, polygon } from "../../../kit/src/canvas/pen.js";

export function drawBalloon(ctx, x, y, size, { colour = 0, time = 0, string = size }, theme) {
  const { art } = theme;
  const fill = art.balloons[colour % art.balloons.length];
  const bob = Math.sin(time * 2 + colour * 1.7) * size * 0.035;
  ctx.save();
  ctx.translate(x, y);
  line(ctx, [[0, size * 0.66 + bob], [size * 0.06, size * 0.69 + string * 0.4], [0, size * 0.69 + string]], art.ink, Math.max(1.5, size * 0.025));
  ctx.translate(0, bob);
  ellipse(ctx, 0, 0, size * 0.43, size * 0.56, fill, art.ink, Math.max(2, size * 0.045));
  polygon(ctx, [[-size * 0.08, size * 0.53], [size * 0.08, size * 0.53], [0, size * 0.69]], fill, art.ink, 2);
  ellipse(ctx, -size * 0.14, -size * 0.2, size * 0.08, size * 0.16, art.white);
  if (colour % 3 === 1) {
    circle(ctx, size * 0.14, size * 0.08, size * 0.07, art.white);
    circle(ctx, -size * 0.04, size * 0.28, size * 0.055, art.white);
  } else if (colour % 3 === 2) {
    ctx.beginPath();
    ctx.ellipse(0, size * 0.08, size * 0.35, size * 0.12, 0, 0, Math.PI);
    ctx.strokeStyle = art.white;
    ctx.lineWidth = size * 0.07;
    ctx.stroke();
  }
  ctx.restore();
}

export function drawPop(ctx, x, y, size, progress, colour, theme) {
  const p = clamp(progress);
  if (p <= 0 || p >= 1) return;
  const { art } = theme;
  ctx.save();
  ctx.globalAlpha = 1 - p;
  ctx.beginPath();
  ctx.arc(x, y, size * (0.25 + p * 0.65), 0, TAU);
  ctx.strokeStyle = art.white;
  ctx.lineWidth = Math.max(2, size * 0.07 * (1 - p));
  ctx.stroke();
  for (let piece = 0; piece < 9; piece += 1) {
    const angle = (piece * TAU) / 9;
    const distance = size * (0.25 + p * 0.85);
    ctx.save();
    ctx.translate(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance + p * p * size * 0.25);
    ctx.rotate(angle + p * 2);
    polygon(ctx, [[-size * 0.07, -size * 0.04], [size * 0.09, 0], [-size * 0.04, size * 0.08]], piece % 3 ? art.balloons[colour % art.balloons.length] : art.marker.mine, art.ink, 1.5);
    ctx.restore();
  }
  ctx.restore();
}
