import { PALETTE } from './art-palette.js';
import { paint, roundedRect } from './art-shapes.js';

export function drawPresent(ctx, x, y, size, { time = 0, wobble = 0, open = 0 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(time * 9) * wobble * 0.08);
  roundedRect(ctx, -size * 0.39, -size * 0.24, size * 0.78, size * 0.62, size * 0.07);
  paint(ctx, PALETTE.robot, PALETTE.ink, Math.max(2.5, size * 0.035));
  roundedRect(ctx, -size * 0.07, -size * 0.24, size * 0.14, size * 0.62, size * 0.02);
  paint(ctx, PALETTE.player, PALETTE.ink, Math.max(1.5, size * 0.018));
  ctx.save();
  ctx.translate(open * size * 0.34, -open * size * 0.43);
  ctx.rotate(-open * 0.35);
  roundedRect(ctx, -size * 0.44, -size * 0.36, size * 0.88, size * 0.19, size * 0.06);
  paint(ctx, PALETTE.robotLight, PALETTE.ink, Math.max(2.5, size * 0.035));
  roundedRect(ctx, -size * 0.07, -size * 0.36, size * 0.14, size * 0.19, size * 0.02);
  paint(ctx, PALETTE.player, PALETTE.ink, Math.max(1.5, size * 0.018));
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.36);
    ctx.quadraticCurveTo(side * size * 0.34, -size * 0.63, side * size * 0.3, -size * 0.37);
    ctx.quadraticCurveTo(side * size * 0.17, -size * 0.27, 0, -size * 0.36);
    paint(ctx, PALETTE.playerLight, PALETTE.ink, Math.max(1.8, size * 0.022));
  }
  ctx.restore();
  ctx.restore();
}
