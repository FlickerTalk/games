import { clamp, line, paint, polygon, roundedRect, starPath } from "../../../kit/src/canvas/pen.js";

const DEPTH = 0.07;
const FLAT = 0.07;

export const tileDepth = (size) => size * DEPTH;

const at = (size, points) => points.map(([x, y]) => [x * size, y * size]);

function drawBlock(ctx, theme, size, face, width) {
  const radius = size * 0.18;
  roundedRect(ctx, 0, size * DEPTH, size, size, radius);
  paint(ctx, theme.board.base, theme.ink, width);
  roundedRect(ctx, 0, 0, size, size, radius);
  paint(ctx, face, theme.ink, width);
  const grain = Math.max(1, size * 0.025);
  line(ctx, at(size, [[0.16, 0.2], [0.34, 0.16]]), theme.board.base, grain);
  line(ctx, at(size, [[0.68, 0.82], [0.84, 0.76]]), theme.board.base, grain);
}

function drawSign(ctx, theme, size, look) {
  const width = Math.max(2, size * 0.05);
  if (look.sign === "diamond") {
    for (let stripe = 0; stripe < 4; stripe += 1) line(ctx, at(size, [[0.08 + stripe * 0.22, 0.92], [0.26 + stripe * 0.22, 0.74]]), look.detail, Math.max(2, size * 0.055));
    polygon(ctx, at(size, [[0.82, 0.1], [0.92, 0.2], [0.82, 0.3], [0.72, 0.2]]), theme.ink);
  } else if (look.sign === "star") {
    starPath(ctx, size * 0.82, size * 0.2, size * 0.115, size * 0.053);
    paint(ctx, theme.marks.white, theme.ink, Math.max(1, size * 0.014));
    line(ctx, at(size, [[0.17, 0.84], [0.83, 0.84]]), look.detail, width);
  } else {
    for (let dash = 0; dash < 3; dash += 1) line(ctx, at(size, [[0.18 + dash * 0.25, 0.84], [0.3 + dash * 0.25, 0.84]]), look.detail, width);
    line(ctx, at(size, [[0.74, 0.2], [0.9, 0.2]]), theme.marks.white, width);
  }
}

function drawLetter(ctx, theme, size, letter, colour) {
  ctx.font = `800 ${Math.round(size * 0.53)}px ${theme.font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = colour;
  ctx.fillText(letter.toUpperCase(), size / 2, size * 0.53);
}

export function drawTile(ctx, theme, x, y, size, { letter = "", mark = "", flip = 1, typing = false, alpha = 1 } = {}) {
  const turn = clamp(flip);
  const shown = turn >= 0.5 ? theme.tiles[mark] : null;
  const width = Math.max(1.5, size * 0.055);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x + size / 2, y + size / 2);
  ctx.scale(Math.max(FLAT, Math.abs(Math.cos(turn * Math.PI))), 1);
  ctx.translate(-size / 2, -size / 2);
  drawBlock(ctx, theme, size, shown?.face ?? theme.board.face, width);
  if (shown) drawSign(ctx, theme, size, shown);
  if (typing) {
    roundedRect(ctx, -size * 0.06, -size * 0.06, size * 1.12, size * 1.12, size * 0.22);
    paint(ctx, null, theme.ui.accent, Math.max(2, size * 0.06));
  }
  if (letter) drawLetter(ctx, theme, size, letter, shown?.letter ?? theme.ink);
  ctx.restore();
}
