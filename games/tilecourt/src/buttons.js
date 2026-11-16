import { circle, line, paint, polygon, roundedRect } from "./pen.js";

function pause(ctx, s, colour) {
  for (const left of [-0.25, 0.08]) {
    roundedRect(ctx, s * left, -s * 0.32, s * 0.17, s * 0.64, s * 0.05);
    paint(ctx, colour, null, 0);
  }
}

function play(ctx, s, colour) {
  polygon(ctx, [[-s * 0.22, -s * 0.34], [s * 0.36, 0], [-s * 0.22, s * 0.34]], colour);
}

function speaker(ctx, s, colour, { level = "high" }, ui) {
  const body = [[-0.36, -0.14], [-0.14, -0.14], [0.08, -0.34], [0.08, 0.34], [-0.14, 0.14], [-0.36, 0.14]];
  polygon(ctx, body.map(([x, y]) => [x * s, y * s]), colour);
  if (level === "mute") {
    line(ctx, [[-s * 0.4, -s * 0.38], [s * 0.4, s * 0.38]], ui.off, Math.max(2, s * 0.1));
    return;
  }
  const arcs = level === "low" ? [0.22] : [0.22, 0.38];
  for (const reach of arcs) {
    ctx.beginPath();
    ctx.arc(s * 0.08, 0, s * reach, -0.75, 0.75);
    ctx.strokeStyle = colour;
    ctx.lineWidth = Math.max(2, s * 0.08);
    ctx.lineCap = "round";
    ctx.stroke();
  }
}

function music(ctx, s, colour, { off = false }, ui) {
  line(ctx, [[-s * 0.12, s * 0.2], [-s * 0.12, -s * 0.3], [s * 0.3, -s * 0.38], [s * 0.3, s * 0.12]], colour, Math.max(2, s * 0.09));
  circle(ctx, -s * 0.22, s * 0.22, s * 0.13, colour);
  circle(ctx, s * 0.2, s * 0.14, s * 0.13, colour);
  if (off) line(ctx, [[-s * 0.4, -s * 0.38], [s * 0.4, s * 0.38]], ui.off, Math.max(2, s * 0.1));
}

function turning(ctx, s, colour, clockwise) {
  const turn = clockwise ? 1 : -1;
  ctx.save();
  ctx.scale(turn, 1);
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.28, -Math.PI * 0.6, Math.PI * 1.25);
  ctx.strokeStyle = colour;
  ctx.lineWidth = Math.max(2, s * 0.1);
  ctx.lineCap = "round";
  ctx.stroke();
  polygon(ctx, [[s * 0.06, -s * 0.42], [s * 0.36, -s * 0.28], [s * 0.08, -s * 0.12]], colour);
  ctx.restore();
}

function home(ctx, s, colour) {
  line(ctx, [[-s * 0.36, -s * 0.02], [0, -s * 0.34], [s * 0.36, -s * 0.02]], colour, Math.max(2, s * 0.09));
  line(ctx, [[-s * 0.24, -s * 0.08], [-s * 0.24, s * 0.32], [s * 0.24, s * 0.32], [s * 0.24, -s * 0.08]], colour, Math.max(2, s * 0.09));
}

function check(ctx, s, colour) {
  line(ctx, [[-s * 0.32, 0], [-s * 0.08, s * 0.26], [s * 0.36, -s * 0.28]], colour, Math.max(3, s * 0.13));
}

function close(ctx, s, colour) {
  line(ctx, [[-s * 0.26, -s * 0.26], [s * 0.26, s * 0.26]], colour, Math.max(3, s * 0.12));
  line(ctx, [[s * 0.26, -s * 0.26], [-s * 0.26, s * 0.26]], colour, Math.max(3, s * 0.12));
}

function gift(ctx, s, colour) {
  roundedRect(ctx, -s * 0.3, -s * 0.12, s * 0.6, s * 0.44, s * 0.05);
  paint(ctx, null, colour, Math.max(2, s * 0.08));
  roundedRect(ctx, -s * 0.36, -s * 0.24, s * 0.72, s * 0.14, s * 0.04);
  paint(ctx, colour, null, 0);
  line(ctx, [[0, -s * 0.24], [0, s * 0.32]], colour, Math.max(2, s * 0.08));
  line(ctx, [[0, -s * 0.24], [-s * 0.16, -s * 0.38], [-s * 0.04, -s * 0.24]], colour, Math.max(2, s * 0.06));
  line(ctx, [[0, -s * 0.24], [s * 0.16, -s * 0.38], [s * 0.04, -s * 0.24]], colour, Math.max(2, s * 0.06));
}

function call(ctx, s, colour) {
  circle(ctx, -s * 0.1, -s * 0.12, s * 0.15, colour);
  ctx.beginPath();
  ctx.arc(-s * 0.1, s * 0.34, s * 0.26, Math.PI, 0);
  paint(ctx, colour, null, 0);
  for (const reach of [0.14, 0.26]) {
    ctx.beginPath();
    ctx.arc(s * 0.12, -s * 0.12, s * reach, -0.7, 0.7);
    ctx.strokeStyle = colour;
    ctx.lineWidth = Math.max(2, s * 0.06);
    ctx.stroke();
  }
}

function mosaic(ctx, s, colour) {
  for (const [x, y] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
    roundedRect(ctx, x * s * 0.34 + s * 0.02, y * s * 0.34 + s * 0.02, s * 0.3, s * 0.3, s * 0.06);
    paint(ctx, x === y ? colour : null, colour, Math.max(1.5, s * 0.06));
  }
}

function hint(ctx, s, colour) {
  circle(ctx, 0, -s * 0.08, s * 0.24, null, colour, Math.max(2, s * 0.08));
  roundedRect(ctx, -s * 0.12, s * 0.16, s * 0.24, s * 0.16, s * 0.04);
  paint(ctx, colour, null, 0);
}

const DRAW = {
  pause,
  play,
  speaker,
  music,
  again: (ctx, s, colour) => turning(ctx, s, colour, true),
  rotate: (ctx, s, colour) => turning(ctx, s, colour, false),
  home,
  check,
  close,
  gift,
  call,
  mosaic,
  hint,
};

export const GLYPHS = Object.freeze(Object.keys(DRAW));

export function drawGlyph(ctx, glyph, x, y, size, colour, theme, options = {}) {
  ctx.save();
  ctx.translate(x, y);
  (DRAW[glyph] ?? check)(ctx, size, colour, options, theme.ui);
  ctx.restore();
}

export function drawButton(ctx, glyph, x, y, diameter, theme, { fill, pressed = false, ...options } = {}) {
  const { ui } = theme;
  const radius = diameter / 2;
  ctx.save();
  circle(ctx, x, y + (pressed ? 2 : 4), radius, ui.shadow);
  circle(ctx, x, y + (pressed ? 2 : 0), radius - 1, pressed ? ui.pressed : (fill ?? ui.button), ui.ink, Math.max(2.5, radius * 0.07));
  drawGlyph(ctx, glyph, x, y + (pressed ? 2 : 0), diameter * 0.62, ui.icon, theme, options);
  ctx.restore();
}
