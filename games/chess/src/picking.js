import { Chess } from "chess.js";
import { cellsOf, colourOf, nameOf } from "./squares.js";

const NONE = Object.freeze({ legal: [], own: [], movable: [], targets: [] });

const sideToMove = (fen) => (fen.split(" ")[1] === "w" ? 0 : 1);

function targetsOf(legal, from) {
  const found = new Map();
  for (const move of legal) {
    if (move.from !== from || found.has(move.to)) continue;
    found.set(move.to, { square: move.to, capture: Boolean(move.captured), promotion: Boolean(move.promotion) });
  }
  return [...found.values()].sort((one, two) => one.square.localeCompare(two.square));
}

export function choices(fen, side, canPlay, from = null) {
  if (!canPlay || side === null || side === undefined || side !== sideToMove(fen)) return NONE;
  const legal = new Chess(fen).moves({ verbose: true });
  const own = cellsOf(fen).flatMap((piece, cell) => (colourOf(piece) === side ? [nameOf(cell)] : []));
  const movable = [...new Set(legal.map((move) => move.from))];
  return { legal, own, movable, targets: from ? targetsOf(legal, from) : [] };
}

function reach(offer, from, square) {
  const target = offer.targets.find((one) => one.square === square);
  if (!from || !target) return null;
  return target.promotion ? { move: null, promote: { from, to: square } } : { move: `${from}${square}`, promote: null };
}

export function tap(offer, from, square) {
  const none = { from: null, move: null, promote: null, miss: null };
  if (from === square) return none;
  const reached = reach(offer, from, square);
  if (reached) return { ...none, ...reached };
  if (offer.movable.includes(square)) return { ...none, from: square };
  if (offer.own.includes(square)) return { ...none, miss: square };
  return { ...none, from };
}

export function dropOn(offer, from, square) {
  return reach(offer, from, square);
}
