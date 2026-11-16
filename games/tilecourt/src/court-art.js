import { EMPTY } from "./court.js";
import { paint, roundedRect } from "../../../kit/src/canvas/pen.js";
import { drawTile } from "./tiles.js";

function sockets(ctx, { x, y, cell, size }, art) {
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      roundedRect(ctx, x + column * cell + 1, y + row * cell + 1, cell - 2, cell - 2, Math.max(3, cell * 0.08));
      paint(ctx, (row + column) % 2 ? art.stone : art.stoneLight, art.grout, Math.max(1, cell * 0.025));
    }
  }
}

function beds(ctx, { x, y, cell, size }, art, width) {
  for (let row = 0; row < size; row += 3) {
    for (let column = 0; column < size; column += 3) {
      roundedRect(ctx, x + column * cell + 3, y + row * cell + 3, cell * 3 - 6, cell * 3 - 6, 7);
      paint(ctx, null, art.bed, width);
    }
  }
}

export function drawCourt(ctx, where, cells, theme, { beds: withBeds = false } = {}) {
  const { x, y, cell, size } = where;
  const span = cell * size;
  const { art, stroke } = theme;
  ctx.save();
  roundedRect(ctx, x - 5, y - 5, span + 10, span + 10, 12);
  paint(ctx, art.edge, art.ink, stroke.base);
  sockets(ctx, where, art);
  if (withBeds) beds(ctx, where, art, stroke.base);
  cells.forEach((family, at) => {
    if (family !== EMPTY) drawTile(ctx, x + (at % size) * cell, y + Math.floor(at / size) * cell, cell, family, theme);
  });
  ctx.restore();
}

export function drawOutline(ctx, { x, y, cell, size }, cells, valid, theme, time) {
  const { art } = theme;
  ctx.save();
  ctx.setLineDash?.([cell * 0.22, cell * 0.13]);
  if ("lineDashOffset" in ctx) ctx.lineDashOffset = -time * cell * 0.35;
  for (const at of cells) {
    roundedRect(ctx, x + (at % size) * cell + 3, y + Math.floor(at / size) * cell + 3, cell - 6, cell - 6, cell * 0.12);
    paint(ctx, null, valid ? art.valid : art.invalid, Math.max(3, cell * 0.075));
  }
  ctx.restore();
}

function areaOf({ kind, index }, { x, y, cell, size }) {
  const span = cell * size;
  if (kind === "row") return [x, y + index * cell, span, cell];
  if (kind === "column") return [x + index * cell, y, cell, span];
  const across = size / 3;
  return [x + (index % across) * cell * 3, y + Math.floor(index / across) * cell * 3, cell * 3, cell * 3];
}

export function drawGlow(ctx, where, lines, theme, time) {
  ctx.save();
  ctx.globalAlpha = 0.4 + (Math.sin(time * 4) + 1) * 0.12;
  ctx.fillStyle = theme.art.glow;
  for (const line of lines) ctx.fillRect(...areaOf(line, where));
  ctx.restore();
}
