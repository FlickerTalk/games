import { cellsOf, fits, place } from "./court.js";
import { pieceOf } from "./pieces.js";

const IDLE = Object.freeze({ phase: "idle" });
const REACH = 1.5;

export const idleDrag = () => IDLE;

export function liftPiece(slot, piece, point) {
  return { phase: "lifted", slot, piece, point, target: null };
}

function aim(piece, point, { court, cells, lift, beds }) {
  const { x, y, cell, size } = court;
  const column = (point.x - (piece.width * cell) / 2 - x) / cell;
  const row = (point.y - lift - (piece.height * cell) / 2 - y) / cell;
  const most = [size - piece.width, size - piece.height];
  if (column < -REACH || row < -REACH || column > most[0] + REACH || row > most[1] + REACH) return null;
  const board = { size, cells };
  const near = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const cx = Math.min(most[0], Math.max(0, Math.round(column))) + dx;
      const cy = Math.min(most[1], Math.max(0, Math.round(row))) + dy;
      if (cx >= 0 && cy >= 0 && cx <= most[0] && cy <= most[1]) near.push({ at: cy * size + cx, far: Math.hypot(cx - column, cy - row) });
    }
  }
  const found = near.sort((one, two) => one.far - two.far).find(({ at }) => fits(board, piece, at));
  if (!found) return null;
  const laid = place(board, piece, found.at, { beds });
  return { at: found.at, cells: cellsOf(board, piece, found.at), lines: laid.lines.map(({ kind, index }) => ({ kind, index })) };
}

export function moveDrag(drag, point, field) {
  if (drag.phase !== "lifted") return drag;
  return { ...drag, point, target: aim(pieceOf(drag.piece), point, field) };
}

export function dropDrag(drag) {
  if (drag.phase !== "lifted") return { drag: IDLE };
  if (drag.target) return { drag: IDLE, place: { slot: drag.slot, at: drag.target.at } };
  return { drag: IDLE, back: { slot: drag.slot, piece: drag.piece, point: drag.point } };
}

export function cancelDrag(drag) {
  if (drag.phase !== "lifted") return { drag: IDLE };
  return { drag: IDLE, back: { slot: drag.slot, piece: drag.piece, point: drag.point } };
}
