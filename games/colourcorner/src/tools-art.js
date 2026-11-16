import { drawCard } from "../../../kit/src/canvas/index.js";
import { circle, ellipse, line, paint, polygon, roundedRect, starPath, withRim } from "../../../kit/src/canvas/pen.js";
import { drawPattern, drawStamp } from "./page-art.js";
import { STAMPS, WIDTHS } from "./work.js";

export const TOOL_ICONS = Object.freeze(["fill", "brush", "eraser", "brush0", "brush1", "brush2", "mirror", ...STAMPS.map((_, at) => `stamp${at}`), "paper0", "paper1", "paper2"]);

const PAPER_KEYS = ["light", "cream", "dark"];

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

export const GLYPHS = Object.freeze({
  back: (ctx, s, colour, width) => (trace(ctx, [[0.12, -0.3], [-0.18, 0], [0.12, 0.3]], s), stroked(ctx, colour, width)),
  prev: (ctx, s, colour, width) => (trace(ctx, [[0.1, -0.28], [-0.16, 0], [0.1, 0.28]], s), stroked(ctx, colour, width)),
  next: (ctx, s, colour, width) => (trace(ctx, [[-0.1, -0.28], [0.16, 0], [-0.1, 0.28]], s), stroked(ctx, colour, width)),
  undo(ctx, s, colour, width) {
    ctx.beginPath();
    ctx.arc(s * 0.04, s * 0.06, s * 0.26, -Math.PI * 0.9, Math.PI * 0.6);
    stroked(ctx, colour, width);
    trace(ctx, [[-0.32, -0.22], [-0.24, 0.02], [-0.02, -0.06]], s);
    stroked(ctx, colour, width);
  },
  send(ctx, s, colour, width) {
    trace(ctx, [[-0.36, -0.06], [0.38, -0.34], [0.08, 0.36], [-0.02, 0.06]], s, true);
    stroked(ctx, colour, width);
    trace(ctx, [[-0.02, 0.06], [0.38, -0.34]], s);
    stroked(ctx, colour, width);
  },
  edit(ctx, s, colour, width) {
    trace(ctx, [[0.32, -0.34], [-0.08, 0.1]], s);
    stroked(ctx, colour, width * 1.6);
    trace(ctx, [[-0.12, 0.08], [-0.34, 0.12], [-0.36, 0.34], [-0.1, 0.3]], s, true);
    stroked(ctx, colour, width);
  },
});

function bucket(ctx, u, colour, ink) {
  ctx.save();
  ctx.translate(-3 * u, -3 * u);
  ctx.rotate(-0.55);
  polygon(ctx, [[-21 * u, -15 * u], [10 * u, -15 * u], [18 * u, 12 * u], [-12 * u, 12 * u]], colour, ink, 3 * u);
  line(ctx, [[-20 * u, -20 * u], [10 * u, -20 * u]], ink, 5 * u);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(22 * u, 8 * u);
  ctx.quadraticCurveTo(34 * u, 24 * u, 22 * u, 29 * u);
  ctx.quadraticCurveTo(10 * u, 24 * u, 22 * u, 8 * u);
  paint(ctx, colour, ink, 2.5 * u);
}

function brush(ctx, u, colour, theme) {
  const { ink, tools } = theme.art;
  line(ctx, [[-20 * u, 22 * u], [17 * u, -22 * u]], ink, 11 * u);
  line(ctx, [[-17 * u, 18 * u], [14 * u, -19 * u]], tools.handle, 5 * u);
  ctx.beginPath();
  ctx.moveTo(-25 * u, 28 * u);
  ctx.quadraticCurveTo(-33 * u, 11 * u, -15 * u, 12 * u);
  ctx.quadraticCurveTo(-9 * u, 25 * u, -25 * u, 28 * u);
  paint(ctx, colour, ink, 2.5 * u);
}

function eraser(ctx, u, theme) {
  const { ink, tools } = theme.art;
  ctx.save();
  ctx.rotate(-0.55);
  roundedRect(ctx, -25 * u, -15 * u, 50 * u, 30 * u, 7 * u);
  paint(ctx, tools.eraser, ink, 3 * u);
  roundedRect(ctx, 5 * u, -15 * u, 20 * u, 30 * u, 7 * u);
  paint(ctx, tools.band, ink, 3 * u);
  ctx.restore();
}

function mirror(ctx, u, colour, theme) {
  const { ink, mirror: guide } = theme.art;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 3 * u, -4 * u);
    ctx.quadraticCurveTo(side * 30 * u, -34 * u, side * 30 * u, -6 * u);
    ctx.quadraticCurveTo(side * 26 * u, 22 * u, side * 3 * u, 6 * u);
    ctx.closePath();
    paint(ctx, colour, ink, 2.5 * u);
  }
  ctx.save();
  ctx.setLineDash([6 * u, 5 * u]);
  line(ctx, [[0, -30 * u], [0, 30 * u]], guide, 3 * u);
  ctx.restore();
}

function sheet(ctx, u, kind, theme) {
  const { ink, papers, tools } = theme.art;
  roundedRect(ctx, -20 * u, -26 * u, 40 * u, 52 * u, 6 * u);
  paint(ctx, papers[PAPER_KEYS[kind]], ink, 3 * u);
  if (kind === 2) {
    starPath(ctx, 0, 0, 10 * u);
    paint(ctx, tools.star, null);
  } else {
    line(ctx, [[-10 * u, -8 * u], [10 * u, -8 * u]], ink, 2 * u);
    if (kind === 1) line(ctx, [[-10 * u, 2 * u], [10 * u, 2 * u]], ink, 2 * u);
  }
}

function sized(ctx, u, size, colour, theme) {
  ctx.save();
  ctx.translate(-8 * u, 4 * u);
  ctx.scale(0.7, 0.7);
  brush(ctx, u, colour, theme);
  ctx.restore();
  circle(ctx, 18 * u, -16 * u, (WIDTHS[size] / 2) * u * 0.9, colour, theme.art.ink, 2 * u);
}

function icon(ctx, tool, u, colour, theme) {
  if (tool === "fill") bucket(ctx, u, colour, theme.art.ink);
  else if (tool === "brush") brush(ctx, u, colour, theme);
  else if (tool === "eraser") eraser(ctx, u, theme);
  else if (tool === "mirror") mirror(ctx, u, colour, theme);
  else if (tool.startsWith("brush")) sized(ctx, u, Number(tool.slice(5)), colour, theme);
  else if (tool.startsWith("stamp")) drawStamp(ctx, STAMPS[Number(tool.slice(5))], 0, 0, 48 * u, colour, theme);
  else if (tool.startsWith("paper")) sheet(ctx, u, Number(tool.slice(5)), theme);
}

export function drawTool(ctx, tool, area, theme, { chosen = false, pressed = false, colour = 0 } = {}) {
  drawCard(ctx, area, theme.ui, { chosen, pressed });
  ctx.save();
  ctx.translate(area.x + area.w / 2, area.y + area.h / 2);
  withRim(ctx, { ink: theme.art.ink, colour: theme.art.rim }, () => icon(ctx, tool, (Math.min(area.w, area.h) / 88) * 0.9, theme.art.paints[colour] ?? theme.art.paints[0], theme));
  ctx.restore();
}

export function drawPot(ctx, area, theme, { colour = 0, pattern = null, chosen = false, pressed = false } = {}) {
  const { art, ui } = theme;
  const x = area.x + area.w / 2;
  const y = area.y + area.h / 2;
  const r = area.w * (chosen ? 0.34 : 0.28) * (pressed ? 0.94 : 1);
  ctx.save();
  if (chosen) circle(ctx, x, y + r * 0.06, r + 7, null, ui.accent, 4);
  withRim(ctx, { ink: art.ink, colour: art.rim }, () => {
    ellipse(ctx, x, y + r * 0.18, r, r * 0.82, art.pot.rim, art.ink, theme.stroke.pot);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.88, r * 0.7, 0, 0, Math.PI * 2);
    if (pattern) {
      ctx.clip();
      ctx.translate(x, y);
      ctx.scale(0.55, 0.55);
      drawPattern(ctx, pattern, colour, [-r * 1.8, -r * 1.4, r * 1.8, r * 1.4], theme);
    } else paint(ctx, art.paints[colour] ?? art.paints[0]);
    ctx.restore();
    ellipse(ctx, x, y, r * 0.88, r * 0.7, null, art.ink, theme.stroke.pot);
  });
  ctx.beginPath();
  ctx.arc(x - r * 0.25, y - r * 0.15, r * 0.35, Math.PI, Math.PI * 1.65);
  stroked(ctx, art.pot.shine, Math.max(2, r * 0.11));
  ctx.restore();
}

export function drawMarker(ctx, x, y, size, theirs, theme, angle = theirs ? 0.4 : -0.4) {
  const { ink, markers } = theme.art;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  withRim(ctx, { ink, colour: theme.art.rim }, () => {
    roundedRect(ctx, -size * 0.17, -size * 0.48, size * 0.34, size * 0.78, theirs ? size * 0.04 : size * 0.15);
    paint(ctx, theirs ? markers.theirs : markers.mine, ink, 2.5);
    if (theirs) polygon(ctx, [[-size * 0.17, -size * 0.48], [size * 0.17, -size * 0.48], [size * 0.1, -size * 0.68], [-size * 0.1, -size * 0.62]], markers.cap, ink, 2.5);
    else ellipse(ctx, 0, -size * 0.5, size * 0.17, size * 0.2, markers.cap, ink, 2.5);
    roundedRect(ctx, -size * 0.19, size * 0.18, size * 0.38, size * 0.18, size * 0.05);
    paint(ctx, markers.cap, ink, 2.5);
  });
  ctx.restore();
}
