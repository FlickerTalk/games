import { circle, line, paint, roundedRect, starPath } from "../../../kit/src/canvas/pen.js";
import { ART } from "./theme.js";

export function drawBadge(ctx, theme, x, y, size, side, { active = false } = {}) {
  const look = theme.sides[side];
  const width = Math.max(1.5, size * 0.06);
  ctx.save();
  ctx.translate(x, y);
  if (active) circle(ctx, 0, 0, size * 0.62, null, look.body, Math.max(2, size * 0.07));
  if (look.mark === "star") {
    roundedRect(ctx, -size * 0.45, -size * 0.45, size * 0.9, size * 0.9, size * 0.2);
    paint(ctx, look.body, theme.ink, width);
    starPath(ctx, 0, size * 0.02, size * 0.25, size * 0.11);
    paint(ctx, theme.marks.white, theme.ink, Math.max(1, size * 0.03));
  } else {
    circle(ctx, 0, 0, size * 0.46, look.body, theme.ink, width);
    for (const bar of [-0.1, 0.12]) line(ctx, [[-size * 0.24, size * bar], [size * 0.24, size * bar]], theme.marks.white, Math.max(2, size * 0.07));
  }
  ctx.restore();
}

export function drawTurnOutline(ctx, theme, box, side) {
  const pad = Math.min(6, Math.max(3, box.w * 0.025));
  ctx.save();
  ctx.globalAlpha *= 0.85;
  roundedRect(ctx, box.x - pad, box.y - pad, box.w + pad * 2, box.h + pad * 2, Math.max(6, box.w * 0.06));
  paint(ctx, null, theme.sides[side].deep, Math.max(2, box.w * 0.012));
  ctx.restore();
}

export function drawPendingClock(ctx, theme, x, y, size) {
  const radius = size / 2 - 1;
  ctx.save();
  circle(ctx, x, y, radius, theme.marks.white, theme.ink, 1.5);
  line(ctx, [[x, y - radius * 0.6], [x, y], [x + radius * 0.45, y + radius * 0.25]], theme.ink, 1.5);
  ctx.restore();
}

const round = (value) => Math.round(value * 100) / 100;

function starPoints(outer, inner) {
  return Array.from({ length: 10 }, (_, point) => {
    const radius = point % 2 ? inner : outer;
    const angle = -Math.PI / 2 + (point * Math.PI) / 5;
    return `${round(Math.cos(angle) * radius)},${round(Math.sin(angle) * radius + 0.5)}`;
  }).join(" ");
}

export function sideMark(side) {
  const { body, mark } = ART.sides[side];
  const { ink } = ART;
  const { white } = ART.marks;
  const drawn =
    mark === "star"
      ? `<rect x="-20" y="-20" width="40" height="40" rx="9" fill="${body}" stroke="${ink}" stroke-width="2.6"/><polygon points="${starPoints(11, 5)}" fill="${white}" stroke="${ink}" stroke-width="1.4" stroke-linejoin="round"/>`
      : `<circle r="20" fill="${body}" stroke="${ink}" stroke-width="2.6"/><path d="M-10.5 -4.5H10.5M-10.5 5.5H10.5" stroke="${white}" stroke-width="3.4" stroke-linecap="round"/>`;
  return `<svg viewBox="-24 -24 48 48" aria-hidden="true">${drawn}</svg>`;
}
