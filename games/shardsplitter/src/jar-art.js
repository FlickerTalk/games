import { clamp, line, paint, roundedRect, starPath } from "../../../kit/src/canvas/pen.js";

export function drawJar(ctx, x, y, size, fill, theme, time = 0) {
  const { jar, ink } = theme.art;
  const amount = clamp(fill);
  const w = size * 0.72;
  const h = size * 0.8;
  const top = y - size / 2 + size * 0.16;
  const stroke = Math.max(2, size * 0.045);
  ctx.save();
  roundedRect(ctx, x - w / 2, top, w, h, size * 0.18);
  paint(ctx, jar.glass, ink, stroke);
  if (amount > 0) {
    ctx.save();
    roundedRect(ctx, x - w / 2 + stroke, top + stroke, w - 2 * stroke, h - 2 * stroke, size * 0.14);
    ctx.clip();
    ctx.fillStyle = jar.fill;
    ctx.fillRect(x - w / 2, top + h - amount * h, w, amount * h);
    ctx.restore();
  }
  roundedRect(ctx, x - size * 0.44, y - size / 2 + stroke / 2, size * 0.88, size * 0.16, size * 0.05);
  paint(ctx, jar.lid, ink, stroke);
  line(ctx, [[x - w * 0.24, top + h * 0.22], [x - w * 0.24, top + h * 0.6]], jar.shine, Math.max(2, size * 0.05));
  if (amount >= 1) {
    starPath(ctx, x, top + h * 0.5 + Math.sin(time * 4) * size * 0.03, size * 0.2);
    paint(ctx, jar.star, ink, Math.max(1.5, size * 0.03));
  }
  ctx.restore();
}
