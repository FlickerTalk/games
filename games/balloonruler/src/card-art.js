import { drawDigits, formatNumber } from "../../../kit/src/canvas/bar.js";
import { circle, ellipse, line, paint, roundedRect } from "../../../kit/src/canvas/pen.js";

function dots(ctx, area, value, theme) {
  const count = Math.max(1, Math.round(value));
  const columns = count <= 4 ? 2 : count <= 9 ? 3 : 5;
  const rows = Math.ceil(count / columns);
  const gap = Math.min(area.w / (columns + 1), area.h / (rows + 1), 31);
  const top = area.y + area.h / 2 - ((rows - 1) * gap) / 2;
  for (let dot = 0; dot < count; dot += 1) {
    const row = Math.floor(dot / columns);
    const inRow = Math.min(columns, count - row * columns);
    circle(ctx, area.x + area.w / 2 + ((dot % columns) - (inRow - 1) / 2) * gap, top + row * gap, Math.min(10, gap * 0.32), theme.art.card.dot);
  }
}

function digits(ctx, area, value, theme, lang) {
  const words = formatNumber(value, lang);
  const size = Math.max(20, Math.min(area.h * 0.57, (area.w * 0.8) / ([...words].length * 0.62)));
  drawDigits(ctx, words, area.x + area.w / 2, area.y + area.h / 2 + 2, size, theme.ui.text, "center");
}

function fraction(ctx, area, { parts, filled }, theme) {
  const { ui } = theme;
  const width = area.w * 0.76;
  const height = Math.min(area.h * 0.3, 36);
  const left = area.x + (area.w - width) / 2;
  const top = area.y + (area.h - height) / 2;
  roundedRect(ctx, left, top, width, height, 9);
  paint(ctx, ui.track, null, 0);
  ctx.save();
  roundedRect(ctx, left, top, width, height, 9);
  ctx.clip();
  ctx.fillStyle = theme.art.card.bar;
  ctx.fillRect(left, top, (width * filled) / parts, height);
  ctx.restore();
  for (let cut = 1; cut < parts; cut += 1) line(ctx, [[left + (width * cut) / parts, top + 1], [left + (width * cut) / parts, top + height - 1]], ui.text, 2);
  roundedRect(ctx, left, top, width, height, 9);
  paint(ctx, null, ui.text, 2);
}

export function drawNumberCard(ctx, area, card, theme, { lang = "en" } = {}) {
  const { ui } = theme;
  ctx.save();
  roundedRect(ctx, area.x, area.y, area.w, area.h, ui.radius);
  paint(ctx, ui.surface, ui.border, ui.line);
  if (card.kind === "digit") digits(ctx, area, card.value, theme, lang);
  else if (card.kind === "fraction") fraction(ctx, area, card, theme);
  else dots(ctx, area, card.value, theme);
  ctx.restore();
}

const PICTURES = { short: { share: 0.5, marks: 3 }, medium: { share: 0.68, marks: 5 }, long: { share: 0.84, marks: 8 } };

export function drawRulerPicture(ctx, area, ruler, theme) {
  const { share, marks } = PICTURES[ruler] ?? PICTURES.short;
  const { ui, art } = theme;
  const width = area.w * share;
  const left = area.x + (area.w - width) / 2;
  const y = area.y + area.h * 0.66;
  const balloonX = left + width * 0.62;
  ctx.save();
  line(ctx, [[left, y], [left + width, y]], ui.text, 4);
  for (let mark = 0; mark <= marks; mark += 1) line(ctx, [[left + (width * mark) / marks, y - 7], [left + (width * mark) / marks, y + 7]], ui.text, 2);
  line(ctx, [[balloonX, area.y + area.h * 0.44], [balloonX, y]], ui.muted, 1.5);
  ellipse(ctx, balloonX, area.y + area.h * 0.32, area.w * 0.1, area.h * 0.14, art.balloons[0], art.ink, 2);
  ctx.restore();
}
