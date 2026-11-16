import { circle, roundedRect } from "./pen.js";

function stroked(ctx, colour, width) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

function trace(ctx, points, s, closed = false) {
  ctx.beginPath();
  points.forEach(([x, y], at) => (at ? ctx.lineTo(x * s, y * s) : ctx.moveTo(x * s, y * s)));
  if (closed) ctx.closePath();
}

function strike(ctx, s, colour, width) {
  trace(ctx, [[-0.4, 0.4], [0.4, -0.4]], s);
  stroked(ctx, colour, width);
}

function pause(ctx, s, colour, width) {
  for (const x of [-0.14, 0.14]) {
    trace(ctx, [[x, -0.3], [x, 0.3]], s);
    stroked(ctx, colour, width * 1.6);
  }
}

function play(ctx, s, colour, width) {
  trace(ctx, [[-0.2, -0.3], [0.32, 0], [-0.2, 0.3]], s, true);
  stroked(ctx, colour, width);
}

function speaker(ctx, s, colour, width, { level = "high" }) {
  trace(ctx, [[-0.38, -0.12], [-0.18, -0.12], [0.02, -0.32], [0.02, 0.32], [-0.18, 0.12], [-0.38, 0.12]], s, true);
  stroked(ctx, colour, width);
  if (level === "mute") {
    trace(ctx, [[0.16, -0.14], [0.4, 0.14]], s);
    stroked(ctx, colour, width);
    trace(ctx, [[0.4, -0.14], [0.16, 0.14]], s);
    stroked(ctx, colour, width);
    return;
  }
  for (const reach of level === "low" ? [0.18] : [0.18, 0.34]) {
    ctx.beginPath();
    ctx.arc(s * 0.04, 0, s * reach, -0.8, 0.8);
    stroked(ctx, colour, width);
  }
}

function music(ctx, s, colour, width, { off = false }) {
  trace(ctx, [[-0.1, 0.22], [-0.1, -0.26], [0.3, -0.34], [0.3, 0.14]], s);
  stroked(ctx, colour, width);
  for (const [x, y] of [[-0.21, 0.24], [0.19, 0.16]]) {
    ctx.beginPath();
    ctx.ellipse(x * s, y * s, s * 0.11, s * 0.08, 0, 0, Math.PI * 2);
    stroked(ctx, colour, width);
  }
  if (off) strike(ctx, s, colour, width);
}

function again(ctx, s, colour, width) {
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.28, -Math.PI * 0.35, Math.PI * 1.25);
  stroked(ctx, colour, width);
  trace(ctx, [[0.04, -0.4], [0.18, -0.24], [0.0, -0.12]], s);
  stroked(ctx, colour, width);
}

function home(ctx, s, colour, width) {
  trace(ctx, [[-0.36, -0.02], [0, -0.34], [0.36, -0.02]], s);
  stroked(ctx, colour, width);
  trace(ctx, [[-0.24, -0.1], [-0.24, 0.32], [0.24, 0.32], [0.24, -0.1]], s);
  stroked(ctx, colour, width);
}

function check(ctx, s, colour, width) {
  trace(ctx, [[-0.32, 0.02], [-0.08, 0.26], [0.34, -0.26]], s);
  stroked(ctx, colour, width);
}

function close(ctx, s, colour, width) {
  for (const points of [[[-0.3, -0.3], [0.3, 0.3]], [[0.3, -0.3], [-0.3, 0.3]]]) {
    trace(ctx, points, s);
    stroked(ctx, colour, width);
  }
}

function call(ctx, s, colour, width) {
  ctx.beginPath();
  ctx.arc(-s * 0.1, -s * 0.12, s * 0.14, 0, Math.PI * 2);
  stroked(ctx, colour, width);
  ctx.beginPath();
  ctx.arc(-s * 0.1, s * 0.32, s * 0.2, Math.PI * 1.1, Math.PI * 1.9);
  stroked(ctx, colour, width);
  for (const reach of [0.14, 0.26]) {
    ctx.beginPath();
    ctx.arc(s * 0.12, -s * 0.12, s * reach, -0.7, 0.7);
    stroked(ctx, colour, width);
  }
}

function looks(ctx, s, colour, width) {
  for (const [x, y] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
    roundedRect(ctx, (x * 0.36 + 0.03) * s, (y * 0.36 + 0.03) * s, s * 0.3, s * 0.3, s * 0.06);
    stroked(ctx, colour, width);
  }
}

const DRAW = { pause, play, speaker, music, again, home, check, close, call, looks };

export const GLYPHS = Object.freeze(Object.keys(DRAW));

export const glyphSize = (diameter) => Math.max(24, Math.round(diameter * 0.5));

export function drawGlyph(ctx, glyph, x, y, size, colour, options = {}) {
  const width = Math.max(options.line ?? 2, size * 0.08);
  ctx.save();
  ctx.translate(x, y);
  if (typeof glyph === "function") glyph(ctx, size, colour, width, options);
  else (DRAW[glyph] ?? check)(ctx, size, colour, width, options);
  ctx.restore();
}

function look(ui, { primary, pressed }) {
  if (pressed) return { fill: ui.pressed, edge: ui.accent, icon: primary ? ui.accent : ui.text };
  if (primary) return { fill: ui.accent, edge: ui.accent, icon: ui.onAccent };
  return { fill: ui.surface, edge: ui.border, icon: ui.text };
}

export function drawRoundButton(ctx, glyph, x, y, diameter, ui, { primary = false, pressed = false, ...options } = {}) {
  const { fill, edge, icon } = look(ui, { primary, pressed });
  ctx.save();
  circle(ctx, x, y, diameter / 2 - ui.line / 2, fill, edge, ui.line);
  drawGlyph(ctx, glyph, x, y, glyphSize(diameter), icon, { ...options, line: ui.line });
  ctx.restore();
}

export function drawMark(ctx, glyph, x, y, size, ui) {
  ctx.save();
  circle(ctx, x, y, size / 2 - ui.line / 2, ui.accent, ui.page, ui.line);
  drawGlyph(ctx, glyph, x, y, size * 0.66, ui.onAccent, { line: ui.line });
  ctx.restore();
}
