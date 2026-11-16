import { circle, line, paint, roundedRect, starPath } from "../../../kit/src/canvas/pen.js";

function leaf(ctx, x, y, size, colour, ink) {
  ctx.beginPath();
  ctx.moveTo(x + size * 0.34, y + size * 0.63);
  ctx.bezierCurveTo(x + size * 0.25, y + size * 0.34, x + size * 0.66, y + size * 0.25, x + size * 0.69, y + size * 0.34);
  ctx.bezierCurveTo(x + size * 0.72, y + size * 0.62, x + size * 0.43, y + size * 0.72, x + size * 0.34, y + size * 0.63);
  paint(ctx, colour, null, 0);
  line(ctx, [[x + size * 0.35, y + size * 0.66], [x + size * 0.62, y + size * 0.38]], ink, Math.max(1, size * 0.025));
}

function sun(ctx, x, y, size, colour) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  circle(ctx, cx, cy, size * 0.105, colour);
  for (let ray = 0; ray < 8; ray += 1) {
    const angle = (ray * Math.PI) / 4;
    const at = (reach) => [cx + Math.cos(angle) * size * reach, cy + Math.sin(angle) * size * reach];
    line(ctx, [at(0.18), at(0.25)], colour, Math.max(1.4, size * 0.045));
  }
}

function motif(ctx, family, x, y, size, colour, ink) {
  if (family === 0) circle(ctx, x + size / 2, y + size / 2, size * 0.12, colour);
  else if (family === 1) leaf(ctx, x, y, size, colour, ink);
  else if (family === 2) sun(ctx, x, y, size, colour);
  else {
    starPath(ctx, x + size / 2, y + size / 2, size * 0.22, size * 0.1);
    paint(ctx, colour, null, 0);
  }
}

export function drawTile(ctx, x, y, size, family, theme) {
  const { ink, white, tiles } = theme.art;
  const tile = tiles[family] ?? tiles[0];
  ctx.save();
  roundedRect(ctx, x + 1, y + 1, size - 2, size - 2, size * 0.12);
  paint(ctx, tile.fill, ink, Math.max(1.4, size * 0.045));
  ctx.globalAlpha = 0.48;
  line(ctx, [[x + size * 0.17, y + size * 0.25], [x + size * 0.17, y + size * 0.17], [x + size * 0.31, y + size * 0.17]], white, Math.max(1.5, size * 0.055));
  ctx.globalAlpha = 1;
  motif(ctx, tiles.indexOf(tile), x, y, size, tile.mark, ink);
  ctx.restore();
}

export function drawPiece(ctx, piece, x, y, cell, theme) {
  for (const [column, row] of piece.cells) drawTile(ctx, x + column * cell, y + row * cell, cell, piece.family, theme);
}

export function drawPieceCentred(ctx, piece, cx, cy, cell, theme) {
  drawPiece(ctx, piece, cx - (piece.width * cell) / 2, cy - (piece.height * cell) / 2, cell, theme);
}

export function drawLifted(ctx, piece, cx, cy, cell, theme, time) {
  const x = cx - (piece.width * cell) / 2;
  const y = cy - (piece.height * cell) / 2;
  const bob = Math.sin(time * 5) * cell * 0.025;
  ctx.save();
  ctx.translate(cell * 0.1, cell * 0.16 + bob);
  ctx.globalAlpha = 0.18;
  for (const [column, row] of piece.cells) {
    roundedRect(ctx, x + column * cell, y + row * cell, cell, cell, cell * 0.12);
    paint(ctx, theme.art.ink, null, 0);
  }
  ctx.restore();
  drawPiece(ctx, piece, x, y + bob, cell, theme);
}
