import { ellipse, paint, roundedRect } from "../canvas/pen.js";

const RIM = 3;

export function boardFrame(size, { padding = 0.022, depth = 0.012, radius = 0.055, line = 0.009, least = 4 } = {}) {
  const stroke = Math.max(2.5, size * line);
  const margin = (stroke + RIM) / 2;
  const side = (size - 2 * margin) / (1 + depth);
  const outer = { x: (size - side) / 2, y: margin, w: side, h: side };
  const pad = Math.max(least, side * padding);
  return {
    outer,
    inner: { x: outer.x + pad, y: outer.y + pad, w: side - 2 * pad, h: side - 2 * pad },
    depth: side * depth,
    radius: side * radius,
    line: stroke,
  };
}

export function drawBoardFrame(ctx, frame, { wood, ink, rim = null }) {
  const { outer, depth, radius, line } = frame;
  ctx.save();
  if (rim) {
    roundedRect(ctx, outer.x, outer.y, outer.w, outer.h + depth, radius);
    paint(ctx, null, rim, line + RIM);
  }
  roundedRect(ctx, outer.x, outer.y + depth, outer.w, outer.h, radius);
  paint(ctx, ink, null, 0);
  roundedRect(ctx, outer.x, outer.y, outer.w, outer.h, radius);
  paint(ctx, wood, ink, line);
  ctx.restore();
}

export function drawPieceShadow(ctx, x, y, radius, { colour, lift = 0, strength = 0.3 }) {
  const rise = Math.min(1, lift / (radius * 1.5));
  ctx.save();
  ctx.globalAlpha *= strength * (1 - 0.55 * rise);
  ellipse(ctx, x + lift * 0.15, y + radius * 0.22 + lift * 0.7, radius * (1 + 0.25 * rise), radius * (0.92 + 0.2 * rise), colour);
  ctx.restore();
}
