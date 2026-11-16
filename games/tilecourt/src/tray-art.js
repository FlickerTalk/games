import { paint, roundedRect } from "./pen.js";
import { pieceOf } from "./pieces.js";
import { drawPieceCentred } from "./tiles.js";

const INSET = 4;
const ROOM = 16;

export function slotCell(piece, slot, cell) {
  return Math.min(cell * 0.6, (slot.w - 2 * ROOM) / (piece.width + 0.4), (slot.h - 2 * ROOM) / (piece.height + 0.4));
}

function card(ctx, slot, theme) {
  const { ui, stroke } = theme;
  roundedRect(ctx, slot.x + INSET, slot.y + INSET, slot.w - 2 * INSET, slot.h - 2 * INSET, ui.radius.slot);
  paint(ctx, ui.card, ui.ink, stroke.base);
}

export function drawTray(ctx, slots, pieces, cell, theme, { time = 0, lifted = -1, stuck = false } = {}) {
  ctx.save();
  slots.forEach((slot, at) => {
    card(ctx, slot, theme);
    const piece = at === lifted ? null : pieceOf(pieces[at]);
    if (!piece) return;
    const size = slotCell(piece, slot, cell);
    ctx.save();
    ctx.translate(slot.x + slot.w / 2, slot.y + slot.h / 2);
    if (stuck) ctx.rotate(Math.sin(time * 7 + at) * 0.06);
    drawPieceCentred(ctx, piece, 0, 0, size, theme);
    ctx.restore();
  });
  ctx.restore();
}
