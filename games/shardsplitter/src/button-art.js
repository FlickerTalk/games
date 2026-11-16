import { line, paint, roundedRect } from "../../../kit/src/canvas/pen.js";

function digits(ctx, words, x, y, size, colour, font) {
  ctx.font = `800 ${Math.round(size)}px ${font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.direction = "ltr";
  ctx.fillStyle = colour;
  ctx.fillText(words, x, y);
}

function capMark(ctx, x, y, size, colour, ui) {
  ctx.beginPath();
  ctx.arc(x, y - size * 0.2, size * 0.26, Math.PI, 0);
  ctx.lineTo(x + size * 0.32, y - size * 0.16);
  ctx.lineTo(x - size * 0.26, y - size * 0.16);
  ctx.closePath();
  paint(ctx, colour, ui.text, ui.line);
  line(ctx, [[x - size * 0.3, y + size * 0.3], [x + size * 0.3, y - size * 0.02]], ui.text, Math.max(3, size * 0.05));
}

export function drawDivisorButton(ctx, target, divisor, theme, { pressed = false, blocked = false, dim = false, capTint = 0 } = {}) {
  const { ui, font, art } = theme;
  const size = Math.min(target.w, target.h);
  const x = target.x + target.w / 2;
  const y = target.y + target.h / 2;
  ctx.save();
  if (dim) ctx.globalAlpha = 0.45;
  roundedRect(ctx, target.x + 3, target.y + 3, target.w - 6, target.h - 6, size * 0.24);
  paint(ctx, pressed ? ui.pressed : ui.surface2, blocked ? ui.border : ui.accent, pressed ? ui.line * 2 : ui.line);
  if (blocked) {
    digits(ctx, String(divisor), x, y + size * 0.16, Math.max(26, size * 0.32), ui.muted, font);
    capMark(ctx, x, y, size, art.caps[capTint % art.caps.length], ui);
  } else digits(ctx, String(divisor), x, y + size * 0.02, Math.max(26, size * 0.44), ui.text, font);
  ctx.restore();
}

export function drawChip(ctx, chip, divisor, theme, { active = false, struck = false, blocked = false } = {}) {
  const { ui, font, text } = theme;
  const x = chip.x + chip.w / 2;
  const y = chip.y + chip.h / 2;
  ctx.save();
  roundedRect(ctx, chip.x + 1, chip.y + 1, chip.w - 2, chip.h - 2, 10);
  paint(ctx, struck ? ui.accent : ui.surface, active || struck ? ui.accent : ui.border, active ? ui.line * 1.5 : ui.line);
  digits(ctx, String(divisor), x, y + 1, text.chip, struck ? ui.onAccent : blocked ? ui.muted : ui.text, font);
  if (blocked) line(ctx, [[chip.x + 8, chip.y + chip.h - 8], [chip.x + chip.w - 8, chip.y + 8]], ui.muted, 3);
  ctx.restore();
}
