import { circle, ellipse, line, paint, polygon, roundedRect } from "../../../kit/src/canvas/pen.js";
import { drawRank } from "../../../kit/src/cards/faces.js";

const corner = (box) => box.w * 0.08;

export function drawGlow(ctx, theme, box, { chosen = false } = {}) {
  const width = chosen ? Math.max(3, box.w * 0.06) : Math.max(2, box.w * 0.035);
  const out = width / 2 + 1;
  ctx.save();
  roundedRect(ctx, box.x - out, box.y - out, box.w + out * 2, box.h + out * 2, corner(box) + out);
  paint(ctx, null, chosen ? theme.marks.chosen : theme.marks.glow, width);
  ctx.restore();
}

export function drawShade(ctx, theme, box) {
  ctx.save();
  ctx.globalAlpha = 0.42;
  roundedRect(ctx, box.x, box.y, box.w, box.h, corner(box));
  paint(ctx, theme.marks.shade);
  ctx.restore();
}

export function drawEmptySpot(ctx, theme, box, colour) {
  const width = Math.max(1.5, box.w * 0.03);
  ctx.save();
  ctx.setLineDash([box.w * 0.08, box.w * 0.07]);
  roundedRect(ctx, box.x + width / 2, box.y + width / 2, box.w - width, box.h - width, corner(box));
  paint(ctx, null, colour, width);
  ctx.setLineDash([]);
  ctx.restore();
}

export function drawPendingClock(ctx, theme, box) {
  const radius = Math.max(5, box.w * 0.13);
  const [cx, cy] = [box.x + box.w - radius - 3, box.y + radius + 3];
  ctx.save();
  circle(ctx, cx, cy, radius, theme.marks.clock, theme.ink, 1.5);
  line(ctx, [[cx, cy - radius * 0.6], [cx, cy], [cx + radius * 0.45, cy + radius * 0.25]], theme.ink, 1.5);
  ctx.restore();
}

export const countWidth = (count, height) => Math.max(height, Math.max(15, height * 0.66) * 0.62 * String(count).length + height * 0.5);

export function drawCount(ctx, theme, count, at, y, height, { end = false, active = false } = {}) {
  const size = Math.max(15, height * 0.66);
  const width = countWidth(count, height);
  const x = end ? at - width : at;
  const edge = active ? 2 : 1;
  ctx.save();
  roundedRect(ctx, x + edge / 2, y - height / 2 + edge / 2, width - edge, height - edge, height / 2);
  paint(ctx, theme.ui.surface, active ? theme.ui.accent : theme.ui.border, edge);
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = theme.ui.text;
  ctx.fillText(String(count), x + width / 2, y + size * 0.04);
  ctx.restore();
}

export function drawBracket(ctx, colour, x, y, width, drop) {
  ctx.save();
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(x, y + drop);
  ctx.lineTo(x, y);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width, y + drop);
  ctx.strokeStyle = colour;
  ctx.lineWidth = Math.max(2, drop * 0.4);
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.restore();
}

export function drawBubble(ctx, theme, rank, x, y, size, { tail = -1 } = {}) {
  const half = size / 2;
  const reach = size * 0.24;
  ctx.save();
  polygon(ctx, [[x - size * 0.16, y + tail * half * 0.9], [x - size * 0.02, y + tail * (half + reach)], [x + size * 0.12, y + tail * half * 0.9]], theme.ui.surface, theme.ui.border, 1.5);
  roundedRect(ctx, x - half, y - half, size, size, size * 0.3);
  paint(ctx, theme.ui.surface, theme.ui.border, 1.5);
  drawRank(ctx, rank, x, y, size * 0.56, theme.ui.text);
  ctx.restore();
}

export function drawFish(ctx, theme, x, y, size) {
  const stroke = Math.max(1.5, size * 0.045);
  ctx.save();
  polygon(ctx, [[x - size * 0.2, y], [x - size * 0.44, y - size * 0.2], [x - size * 0.44, y + size * 0.2]], theme.marks.fish, theme.ink, stroke);
  ellipse(ctx, x + size * 0.08, y, size * 0.34, size * 0.21, theme.marks.fish, theme.ink, stroke);
  circle(ctx, x + size * 0.24, y - size * 0.05, Math.max(1.5, size * 0.035), theme.ink);
  ctx.restore();
}

export function drawMiniCards(ctx, theme, x, y, height, count) {
  const width = height * 0.7;
  const step = width * 0.55;
  const left = x - (width + step * (count - 1)) / 2;
  ctx.save();
  for (let at = 0; at < count; at += 1) {
    roundedRect(ctx, left + at * step, y - height / 2, width, height, width * 0.15);
    paint(ctx, theme.deck.paper, theme.ink, Math.max(1, height * 0.06));
  }
  ctx.restore();
}

export function drawProgress(ctx, theme, box, value, limit) {
  const done = Math.min(1, Math.max(0, value / limit));
  ctx.save();
  roundedRect(ctx, box.x, box.y, box.w, box.h, box.h / 2);
  paint(ctx, theme.ui.track, theme.ui.border, 1);
  if (done * box.w > box.h) {
    roundedRect(ctx, box.x, box.y, box.w * done, box.h, box.h / 2);
    paint(ctx, theme.ui.accent);
  }
  ctx.restore();
}

const ICONS = {
  lay(ctx, theme, x, y, r) {
    drawMiniCards(ctx, theme, x, y - r * 0.1, r * 0.72, 3);
    drawBracket(ctx, theme.ui.text, x - r * 0.5, y + r * 0.42, r, -r * 0.14);
  },
  sort(ctx, theme, x, y, r) {
    [0.25, 0.45, 0.65].forEach((reach, at) => line(ctx, [[x - r * 0.5, y + (at - 1) * r * 0.36], [x - r * 0.5 + r * 1.55 * reach, y + (at - 1) * r * 0.36]], theme.ui.text, Math.max(2, r * 0.13)));
  },
  back(ctx, theme, x, y, r) {
    line(ctx, [[x + r * 0.18, y - r * 0.4], [x - r * 0.22, y], [x + r * 0.18, y + r * 0.4]], theme.ui.text, Math.max(2, r * 0.13));
  },
};

export function drawAction(ctx, theme, kind, x, y, r) {
  ctx.save();
  circle(ctx, x, y, r - 1, theme.ui.surface, theme.ui.border, 1.5);
  ICONS[kind](ctx, theme, x, y, r);
  ctx.restore();
}

export function drawTile(ctx, theme, box, { chosen = false } = {}) {
  const edge = chosen ? 3 : 1.5;
  ctx.save();
  roundedRect(ctx, box.x + edge / 2, box.y + edge / 2, box.w - edge, box.h - edge, Math.min(box.w, box.h) * 0.1);
  paint(ctx, theme.ui.surface, chosen ? theme.ui.accent : theme.ui.border, edge);
  ctx.restore();
}
