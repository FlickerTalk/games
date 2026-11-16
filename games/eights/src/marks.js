import { TAU, circle, clamp, line, paint, roundedRect } from "../../../kit/src/canvas/pen.js";
import { drawSuit } from "./faces.js";

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

export function drawLastMark(ctx, theme, box) {
  const gap = Math.max(3, box.w * 0.07);
  const arm = Math.min(box.w, box.h) * 0.2;
  const width = Math.max(2, box.w * 0.035);
  const [left, top, right, bottom] = [box.x - gap, box.y - gap, box.x + box.w + gap, box.y + box.h + gap];
  ctx.save();
  for (const [x, y, dx, dy] of [[left, top, 1, 1], [right, top, -1, 1], [left, bottom, 1, -1], [right, bottom, -1, -1]]) {
    line(ctx, [[x + dx * arm, y], [x, y], [x, y + dy * arm]], theme.marks.last, width);
  }
  ctx.restore();
}

export function drawSuitChip(ctx, theme, suit, x, y, radius, progress = 1) {
  const p = clamp(progress);
  if (p <= 0) return;
  const pop = p < 1 ? 1 - (1 - p) ** 3 + Math.sin(p * Math.PI) * 0.12 : 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pop, pop);
  circle(ctx, 0, 0, radius, theme.marks.chip, theme.ink, Math.max(1.5, radius * 0.08));
  ctx.setLineDash([radius * 0.18, radius * 0.18]);
  circle(ctx, 0, 0, radius * 1.18, null, theme.marks.glow, Math.max(1.5, radius * 0.08));
  ctx.setLineDash([]);
  drawSuit(ctx, theme, suit, 0, 0, radius * 1.25);
  ctx.restore();
}

export const countWidth = (count, height) => Math.max(height, Math.max(15, height * 0.66) * 0.62 * String(count).length + height * 0.5);

export function drawCount(ctx, theme, count, at, y, height, { end = false } = {}) {
  const text = String(count);
  const size = Math.max(15, height * 0.66);
  const width = countWidth(count, height);
  const x = end ? at - width : at;
  ctx.save();
  roundedRect(ctx, x, y - height / 2, width, height, height / 2);
  paint(ctx, theme.ui.surface, theme.ui.border, 1);
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = theme.ui.text;
  ctx.fillText(text, x + width / 2, y + size * 0.04);
  ctx.restore();
}

export function drawPassMark(ctx, theme, x, y, size) {
  const r = size / 2;
  const stroke = Math.max(2, size * 0.06);
  ctx.save();
  circle(ctx, x, y, r - 0.75, theme.ui.surface, theme.ui.border, 1.5);
  line(ctx, [[x - r * 0.45, y], [x + r * 0.35, y]], theme.ui.text, stroke);
  line(ctx, [[x + r * 0.08, y - r * 0.27], [x + r * 0.38, y], [x + r * 0.08, y + r * 0.27]], theme.ui.text, stroke);
  line(ctx, [[x - r * 0.45, y - r * 0.3], [x - r * 0.45, y + r * 0.3]], theme.ui.text, stroke);
  ctx.restore();
}

export function drawEmptySpot(ctx, theme, box) {
  const width = Math.max(1.5, box.w * 0.03);
  ctx.save();
  ctx.setLineDash([box.w * 0.08, box.w * 0.07]);
  roundedRect(ctx, box.x + width / 2, box.y + width / 2, box.w - width, box.h - width, corner(box));
  paint(ctx, null, theme.table.line, width);
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

export function drawPicker(ctx, theme, { panel, chips }) {
  ctx.save();
  roundedRect(ctx, panel.x + 0.5, panel.y + 0.5, panel.w - 1, panel.h - 1, Math.min(16, panel.h / 2));
  paint(ctx, theme.ui.surface, theme.ui.border, 1);
  for (const { suit, x, y, r } of chips) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    paint(ctx, theme.marks.chip, theme.ui.border, 1);
    drawSuit(ctx, theme, suit, x, y, r * 1.2);
  }
  ctx.restore();
}
